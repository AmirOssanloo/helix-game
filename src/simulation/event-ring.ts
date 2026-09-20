import type { DomainEvent } from "@domain/public";
import { copyDomainEvent, createDomainEvent } from "@domain/public";
import { assert } from "@shared/public";

/** Events the ring keeps before the oldest is overwritten. A render frame drains at most three ticks' worth. */
export const EVENT_RING_CAPACITY = 1024;

/**
 * Where one reader is in the ring: the sequence number of the next event it has not read. The
 * presentation and the developer panel each keep one, so neither consumes the other's events.
 */
export type EventReader = {
  cursor: number;
};

/** A reader at the start of the ring. It sees every event still in the ring on its first read. */
export const createEventReader = (): EventReader => ({ cursor: 0 });

/**
 * The events a tick announced, in a preallocated ring. Systems copy an event into the next
 * slot; nothing is constructed per event. Once full, a write overwrites the oldest entry and
 * counts it, so a reader that falls behind loses events visibly rather than silently.
 *
 * Every event has a sequence number, its position in the run of writes since creation. The
 * ring holds the last `capacity` of them; `cursor` is the next one to be written.
 */
export class EventRing {
  readonly capacity: number;

  private readonly slots: DomainEvent[];

  private writeCursor = 0;

  private overwriteCount = 0;

  constructor(capacity: number = EVENT_RING_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("An event ring needs a capacity of at least one");
    }

    this.capacity = capacity;
    this.slots = [];

    for (let index = 0; index < capacity; index += 1) {
      this.slots.push(createDomainEvent());
    }
  }

  /** The sequence number the next write takes: writes so far, overwrites included. */
  get cursor(): number {
    return this.writeCursor;
  }

  /** The sequence number of the oldest event still in the ring. */
  get oldest(): number {
    return this.writeCursor > this.capacity
      ? this.writeCursor - this.capacity
      : 0;
  }

  /** Events lost to a full ring, since creation. The instrumentation reads it. */
  get overwrites(): number {
    return this.overwriteCount;
  }

  /** Copies `event` into the next slot, over the oldest event when the ring is full. */
  write(event: Readonly<DomainEvent>): void {
    if (this.writeCursor >= this.capacity) {
      this.overwriteCount += 1;
    }

    copyDomainEvent(this.slotAt(this.writeCursor % this.capacity), event);
    this.writeCursor += 1;
  }

  /** The event with sequence number `sequence`, or `null` once it has been overwritten or before it is written. */
  at(sequence: number): Readonly<DomainEvent> | null {
    if (
      !Number.isInteger(sequence) ||
      sequence < this.oldest ||
      sequence >= this.writeCursor
    ) {
      return null;
    }

    return this.slotAt(sequence % this.capacity);
  }

  /** Events written since `reader` last read, counting only the ones still in the ring. */
  pending(reader: EventReader): number {
    const from = reader.cursor > this.oldest ? reader.cursor : this.oldest;

    return this.writeCursor - from;
  }

  /**
   * The next event `reader` has not seen, advancing it, or `null` when it is caught up. A
   * reader that fell behind the ring resumes at the oldest event still held.
   */
  read(reader: EventReader): Readonly<DomainEvent> | null {
    if (reader.cursor < this.oldest) {
      reader.cursor = this.oldest;
    }

    const event = this.at(reader.cursor);

    if (event === null) {
      return null;
    }

    reader.cursor += 1;

    return event;
  }

  /** Forgets every event and the overwrite count. The slots stay allocated. */
  clear(): void {
    this.writeCursor = 0;
    this.overwriteCount = 0;
  }

  private slotAt(index: number): DomainEvent {
    const slot = this.slots[index];

    assert(slot !== undefined, "Every index below capacity has a slot");

    return slot;
  }
}
