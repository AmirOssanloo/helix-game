import type { EntityId } from "@shared/public";
import {
  assert,
  nextGeneration,
  packId,
  unpackGeneration,
  unpackIndex,
} from "@shared/public";

/**
 * The read side of a pool: what a view of the world exposes. `Pool` satisfies it, so a
 * `Readonly` world view can name a pool without exposing `acquire` and `release`.
 */
export type PoolView<T> = Readonly<{
  capacity: number;
  count: number;
  end: number;
  misses: number;
  at: (index: number) => Readonly<T> | null;
  resolve: (id: EntityId) => Readonly<T> | null;
  idAt: (index: number) => EntityId | null;
}>;

/**
 * A fixed-capacity pool of one plain-object shape. Every slot is created once, in the
 * constructor, and nothing allocates afterwards: `acquire` hands out a slot, `release` hands it
 * back, and a free slot always sits in the neutral state `clear` leaves it in.
 *
 * An id packs the slot index and the slot's generation. `release` bumps the generation, so an
 * id held across the release resolves to `null` instead of to whatever occupies the slot next.
 *
 * Released slots leave holes, which keeps every index stable while an entity lives, so a
 * system iterates from zero to `end` and skips a slot `at` returns `null` for:
 *
 * ```ts
 * for (let i = 0; i < pool.end; i += 1) {
 *   const slot = pool.at(i)
 *   if (slot === null) { continue }
 *   // read, decide, write
 * }
 * ```
 *
 * The free list is a stack with the lowest index on top, so a fresh pool acquires slots 0, 1,
 * 2 in order and the slot released last is the one reused first.
 */
export class Pool<T extends object> implements PoolView<T> {
  readonly capacity: number;

  private readonly slots: T[];

  private readonly generations: number[];

  private readonly live: boolean[];

  private readonly free: number[];

  private readonly clearSlot: (slot: T) => void;

  private freeCount: number;

  private liveCount = 0;

  private endIndex = 0;

  private missCount = 0;

  /** `create` makes each slot once; `clear` returns a slot to the neutral state without allocating. */
  constructor(
    capacity: number,
    create: (index: number) => T,
    clear: (slot: T) => void,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new Error("A pool needs a capacity of at least one");
    }

    this.capacity = capacity;
    this.clearSlot = clear;
    this.slots = [];
    this.generations = [];
    this.live = [];
    this.free = [];

    for (let index = 0; index < capacity; index += 1) {
      this.slots.push(create(index));
      this.generations.push(0);
      this.live.push(false);
    }

    for (let index = capacity - 1; index >= 0; index -= 1) {
      this.free.push(index);
    }

    this.freeCount = capacity;
  }

  /** Live entities. */
  get count(): number {
    return this.liveCount;
  }

  /** One past the highest live index: the bound for index iteration. Zero when the pool is empty. */
  get end(): number {
    return this.endIndex;
  }

  /** Acquires refused because the pool was full, since creation. The instrumentation reads it. */
  get misses(): number {
    return this.missCount;
  }

  /** The next free slot in its neutral state, or `null` when the pool is full. A full pool never grows. */
  acquire(): T | null {
    const index = this.acquireIndex();

    if (index === -1) {
      return null;
    }

    return this.slotAt(index);
  }

  /**
   * `acquire`, returning the slot's index instead of the slot, for a caller that needs the id
   * of what it just acquired: `at` and `idAt` read both. `-1` when the pool is full.
   */
  acquireIndex(): number {
    if (this.freeCount === 0) {
      this.missCount += 1;

      return -1;
    }

    this.freeCount -= 1;

    const index = this.free[this.freeCount];

    assert(index !== undefined, "The free list holds an index below its count");

    this.live[index] = true;
    this.liveCount += 1;

    if (index >= this.endIndex) {
      this.endIndex = index + 1;
    }

    return index;
  }

  /** Clears the slot `id` names, bumps its generation, and frees it. A stale or unknown id changes nothing. */
  release(id: EntityId): void {
    const index = this.liveIndexOf(id);

    if (index === -1) {
      return;
    }

    this.releaseIndex(index);
  }

  /** Releases every live slot and resets the free list, so the next acquire starts at slot zero again. */
  releaseAll(): void {
    for (let index = 0; index < this.endIndex; index += 1) {
      if (this.live[index] === true) {
        this.releaseIndex(index);
      }
    }

    for (let index = 0; index < this.capacity; index += 1) {
      this.free[index] = this.capacity - 1 - index;
    }

    this.freeCount = this.capacity;
    this.endIndex = 0;
  }

  /** The live entity `id` names, or `null` when the id is stale or unknown. */
  resolve(id: EntityId): T | null {
    const index = this.liveIndexOf(id);

    if (index === -1) {
      return null;
    }

    return this.slotAt(index);
  }

  /** The live entity at `index`, or `null` when the slot is free or outside [0, `end`). */
  at(index: number): T | null {
    if (!this.isLive(index)) {
      return null;
    }

    return this.slotAt(index);
  }

  /** The id of the live entity at `index`, or `null` when the slot is free or outside [0, `end`). */
  idAt(index: number): EntityId | null {
    if (!this.isLive(index)) {
      return null;
    }

    return packId(index, this.generationAt(index));
  }

  private isLive(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= this.endIndex) {
      return false;
    }

    return this.live[index] === true;
  }

  private liveIndexOf(id: EntityId): number {
    const index = unpackIndex(id);

    if (!this.isLive(index)) {
      return -1;
    }

    if (this.generationAt(index) !== unpackGeneration(id)) {
      return -1;
    }

    return index;
  }

  private releaseIndex(index: number): void {
    this.clearSlot(this.slotAt(index));
    this.live[index] = false;
    this.generations[index] = nextGeneration(this.generationAt(index));
    this.free[this.freeCount] = index;
    this.freeCount += 1;
    this.liveCount -= 1;

    while (this.endIndex > 0 && this.live[this.endIndex - 1] !== true) {
      this.endIndex -= 1;
    }
  }

  private slotAt(index: number): T {
    const slot = this.slots[index];

    assert(slot !== undefined, "Every index below capacity has a slot");

    return slot;
  }

  private generationAt(index: number): number {
    const generation = this.generations[index];

    assert(
      generation !== undefined,
      "Every index below capacity has a generation",
    );

    return generation;
  }
}
