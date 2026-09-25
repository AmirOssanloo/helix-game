import type { DomainEvent, EventSlot } from "@domain/public";
import { copyDomainEvent, createDomainEvent } from "@domain/public";
import { assert } from "@shared/public";

/**
 * Events the ring keeps before the oldest is overwritten. The heaviest tick at the live cap,
 * every enemy chasing through twenty zones with a hundred shots in flight, announces some 430
 * events; this holds nineteen such ticks, so the open panel, which reads about every eight,
 * can slip a whole refresh behind a busy frame and lose nothing. The stress test holds it to that.
 */
export const EVENT_RING_CAPACITY = 8192;

/**
 * Where one reader is in the ring: the sequence number of the next event it has not read, and
 * the run of writes that number belongs to. The presentation and the developer panel each keep
 * one, so neither consumes the other's events.
 */
export type EventReader = {
  cursor: number;
  generation: number;
};

/** A reader at the start of the ring. It sees every event still in the ring on its first read. */
export const createEventReader = (): EventReader => ({
  cursor: 0,
  generation: 0,
});

/**
 * The events a tick announced, in a preallocated ring. Systems copy an event into the next
 * slot; nothing is constructed per event. Once full, a write overwrites the oldest entry, and
 * a reader that falls behind loses events visibly rather than silently: the ring counts every
 * event a reader finds overwritten before it read it.
 *
 * Every event has a sequence number, its position in the run of writes since creation or the
 * last clear. The ring holds the last `capacity` of them; `cursor` is the next one to be
 * written. A clear starts a new run, and a reader from an earlier run starts the new one at
 * its beginning.
 */
export class EventRing {
  readonly capacity: number;

  private readonly slots: EventSlot[];

  private writeCursor = 0;

  private run = 0;

  private lostCount = 0;

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

  /**
   * Events a reader found overwritten before it read them, summed over readers, since creation
   * or the last clear. An event every reader has read is overwritten without being counted.
   * The instrumentation reads it.
   */
  get overwrites(): number {
    return this.lostCount;
  }

  /** Copies `event` into the next slot, over the oldest event when the ring is full. */
  write(event: Readonly<DomainEvent>): void {
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
    const cursor = reader.generation === this.run ? reader.cursor : 0;
    const from = cursor > this.oldest ? cursor : this.oldest;

    return this.writeCursor - from;
  }

  /**
   * The next event `reader` has not seen, advancing it, or `null` when it is caught up. A
   * reader that fell behind the ring resumes at the oldest event still held, and what it
   * missed is counted.
   */
  read(reader: EventReader): Readonly<DomainEvent> | null {
    if (reader.generation !== this.run) {
      reader.generation = this.run;
      reader.cursor = 0;
    }

    if (reader.cursor < this.oldest) {
      this.lostCount += this.oldest - reader.cursor;
      reader.cursor = this.oldest;
    }

    const event = this.at(reader.cursor);

    if (event === null) {
      return null;
    }

    reader.cursor += 1;

    return event;
  }

  /**
   * Moves `reader` past every event written so far, reading none and counting none. For a
   * reader that stopped reading on purpose, such as a panel that was folded, and starts again
   * from now.
   */
  skip(reader: EventReader): void {
    reader.generation = this.run;
    reader.cursor = this.writeCursor;
  }

  /** Forgets every event and the overwrite count, and starts a new run. The slots stay allocated. */
  clear(): void {
    this.writeCursor = 0;
    this.lostCount = 0;
    this.run += 1;
  }

  private slotAt(index: number): EventSlot {
    const slot = this.slots[index];

    assert(slot !== undefined, "Every index below capacity has a slot");

    return slot;
  }
}
