import type { AnyCommand, CommandOrder } from "@domain/public";
import { compareCommandOrder, slotOf } from "@domain/public";
import { assert } from "@shared/public";

/** Commands one tick can hold. Input arrives a few per frame; the panel's bursts stay well under this. */
export const COMMAND_BUFFER_CAPACITY = 256;

/** One preallocated slot: the command and its sort key, filled at submit. */
type Entry = CommandOrder & {
  command: AnyCommand | null;
};

const createEntry = (): Entry => ({
  command: null,
  timestamp: 0,
  slot: null,
  arrival: 0,
});

/**
 * Where a command waits between submit and the tick that consumes it. Every entry is made once,
 * in the constructor, and the sort at tick start moves entries in place, so a full session
 * allocates nothing here after creation.
 *
 * The buffer stores the command by reference and reads only its `timestamp` and its slot, so
 * a command is a value the buffer never changes.
 */
export class CommandBuffer {
  readonly capacity: number;

  private readonly entries: Entry[];

  private size = 0;

  private dropCount = 0;

  constructor(capacity: number = COMMAND_BUFFER_CAPACITY) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("A command buffer needs a capacity of at least one");
    }

    this.capacity = capacity;
    this.entries = [];

    for (let index = 0; index < capacity; index += 1) {
      this.entries.push(createEntry());
    }
  }

  /** Commands waiting for the next tick. */
  get count(): number {
    return this.size;
  }

  /** Submits refused because the buffer was full, since creation. */
  get dropped(): number {
    return this.dropCount;
  }

  /** Accepts `command` into the next slot, or refuses it with `false` when the buffer is full. */
  submit(command: AnyCommand): boolean {
    if (this.size === this.capacity) {
      this.dropCount += 1;

      return false;
    }

    const entry = this.entryAt(this.size);

    entry.command = command;
    entry.timestamp = command.timestamp;
    entry.slot = slotOf(command);
    entry.arrival = this.size;
    this.size += 1;

    return true;
  }

  /**
   * Puts the waiting commands into the order the tick consumes them: by timestamp, then slot
   * priority, then arrival. An insertion sort, because a tick holds a handful of commands and
   * the sort must not allocate.
   */
  sort(): void {
    for (let index = 1; index < this.size; index += 1) {
      const moving = this.entryAt(index);
      let hole = index;

      while (
        hole > 0 &&
        compareCommandOrder(this.entryAt(hole - 1), moving) > 0
      ) {
        this.entries[hole] = this.entryAt(hole - 1);
        hole -= 1;
      }

      this.entries[hole] = moving;
    }
  }

  /** The waiting command at `index`, in the current order, or `null` outside [0, `count`). */
  at(index: number): AnyCommand | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      return null;
    }

    return this.entryAt(index).command;
  }

  /** Forgets every waiting command. The entries stay allocated for the next tick. */
  clear(): void {
    for (let index = 0; index < this.size; index += 1) {
      this.entryAt(index).command = null;
    }

    this.size = 0;
  }

  private entryAt(index: number): Entry {
    const entry = this.entries[index];

    assert(entry !== undefined, "Every index below capacity has an entry");

    return entry;
  }
}
