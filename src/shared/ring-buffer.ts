/**
 * A fixed-capacity ring over preallocated slots. Once full, a write overwrites the oldest
 * entry, and nothing allocates after construction.
 *
 * `cursor` counts every write since construction or the last `clear`, so a reader that keeps
 * its own copy can tell how many entries arrived since it last looked and how many of those
 * the ring has already overwritten.
 */
export class RingBuffer<T> {
  readonly capacity: number;

  /** Writes so far. The next write lands in slot `cursor % capacity`. */
  cursor = 0;

  private readonly slots: T[];

  /** `fill` makes each slot's starting value, once per slot, so object slots do not share one object. */
  constructor(capacity: number, fill: (index: number) => T) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("A ring buffer needs a capacity of at least one");
    }

    this.capacity = capacity;
    this.slots = [];

    for (let index = 0; index < capacity; index += 1) {
      this.slots.push(fill(index));
    }
  }

  /** Live entries: every write until the ring is full, then `capacity`. */
  get count(): number {
    return this.cursor < this.capacity ? this.cursor : this.capacity;
  }

  /** Stores `value` in the next slot, over the oldest entry when the ring is full. */
  write(value: T): void {
    this.slots[this.cursor % this.capacity] = value;
    this.cursor += 1;
  }

  /** The entry `offset` places after the oldest live one, or `null` outside [0, `count`). */
  at(offset: number): T | null {
    if (!Number.isInteger(offset) || offset < 0 || offset >= this.count) {
      return null;
    }

    const oldest = this.cursor - this.count;
    const slot = this.slots[(oldest + offset) % this.capacity];

    return slot === undefined ? null : slot;
  }

  /** Forgets every entry. The slots keep their last values; nothing is allocated. */
  clear(): void {
    this.cursor = 0;
  }
}
