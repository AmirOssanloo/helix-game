import type { EntityId } from "@shared/public";
import { assert, unpackIndex } from "@shared/public";

/** What a pool asks of a view kind: take an entity, and let go of it. */
export type View<E> = {
  bind: (id: EntityId, entity: E) => void;
  release: () => void;
};

const NONE = -1;

/**
 * A fixed set of views of one kind, each bound to an entity by id for as long as the entity
 * is inside the camera rectangle. Made at scene `create` with every view it will ever hold;
 * a bind when none is free is refused and counted, never grown.
 *
 * A frame is a mark and a sweep: `beginFrame`, then `keep` for every entity inside the
 * rectangle, which binds a free view to a newcomer and marks the view either way, then
 * `releaseUnkept` for the views no `keep` named. An id is found by its slot index, so a
 * bind, a lookup, and a release are each a few array reads and nothing allocates.
 */
export class ViewPool<E, V extends View<E>> {
  private readonly views: readonly V[];

  /** Per view: the id it is bound to, or `NONE`. */
  private readonly boundIds: number[];

  /** Per view: the frame it was last kept in. */
  private readonly marks: number[];

  /** Per entity slot: the index of the view bound to it, or `NONE`. */
  private readonly viewOfSlot: number[];

  private readonly free: number[];

  private freeCount: number;

  private frame = 0;

  private missCount = 0;

  private boundCount = 0;

  /** `views` are every view the pool will ever hold; `entityCapacity` is the pool capacity of the entity kind they draw. */
  constructor(views: readonly V[], entityCapacity: number) {
    this.views = views;
    this.boundIds = [];
    this.marks = [];
    this.free = [];

    for (let index = views.length - 1; index >= 0; index -= 1) {
      this.boundIds.push(NONE);
      this.marks.push(0);
      this.free.push(index);
    }

    this.freeCount = views.length;
    this.viewOfSlot = [];

    for (let slot = 0; slot < entityCapacity; slot += 1) {
      this.viewOfSlot.push(NONE);
    }
  }

  /** Views the pool holds, bound or free. */
  get size(): number {
    return this.views.length;
  }

  /** Views bound right now. */
  get bound(): number {
    return this.boundCount;
  }

  /** Binds refused because every view was bound, since creation. The scene writes it to a ring. */
  get misses(): number {
    return this.missCount;
  }

  /** The view bound to `id`, or `null`. A stale id, or one a later entity's view sits under, finds nothing. */
  viewOf(id: EntityId): V | null {
    const index = this.viewIndexOf(id);

    return index === NONE ? null : this.viewAt(index);
  }

  /** Starts a frame: nothing is kept yet. */
  beginFrame(): void {
    this.frame += 1;
  }

  /**
   * Keeps `id` on screen this frame: the view already bound to it, or a free one bound to it
   * now, marked either way. `null`, and a miss, when the entity is new and no view is free.
   * A view still bound to the slot's previous entity is released first: that id is gone for
   * good, so its view is free for the newcomer without waiting for the sweep.
   */
  keep(id: EntityId, entity: E): V | null {
    let index = this.viewIndexOf(id);

    if (index === NONE) {
      this.releaseStale(id);
      index = this.bind(id, entity);

      if (index === NONE) {
        return null;
      }
    }

    this.marks[index] = this.frame;

    return this.viewAt(index);
  }

  /** Releases every view `keep` did not name this frame: its entity left the rectangle or the world. */
  releaseUnkept(): void {
    for (let index = 0; index < this.views.length; index += 1) {
      if (this.boundIds[index] !== NONE && this.marks[index] !== this.frame) {
        this.release(index);
      }
    }
  }

  /** Releases every bound view, for a map load or a shutdown. */
  releaseAll(): void {
    for (let index = 0; index < this.views.length; index += 1) {
      if (this.boundIds[index] !== NONE) {
        this.release(index);
      }
    }
  }

  private bind(id: EntityId, entity: E): number {
    if (this.freeCount === 0) {
      this.missCount += 1;

      return NONE;
    }

    this.freeCount -= 1;

    const index = this.free[this.freeCount];

    assert(index !== undefined, "The free list holds a view below its count");

    this.boundIds[index] = id;
    this.viewOfSlot[unpackIndex(id)] = index;
    this.boundCount += 1;
    this.viewAt(index).bind(id, entity);

    return index;
  }

  /** Releases the view bound to the previous entity of `id`'s slot, if one is still held. */
  private releaseStale(id: EntityId): void {
    const held = this.viewOfSlot[unpackIndex(id)];

    if (held !== undefined && held !== NONE && this.boundIds[held] !== id) {
      this.release(held);
    }
  }

  private release(index: number): void {
    const id = this.boundIds[index];

    assert(id !== undefined && id !== NONE, "A released view is bound");

    const slot = unpackIndex(id);

    // A newer entity in the same slot may already own the slot's entry; it keeps it.
    if (this.viewOfSlot[slot] === index) {
      this.viewOfSlot[slot] = NONE;
    }

    this.boundIds[index] = NONE;
    this.free[this.freeCount] = index;
    this.freeCount += 1;
    this.boundCount -= 1;
    this.viewAt(index).release();
  }

  private viewIndexOf(id: EntityId): number {
    const index = this.viewOfSlot[unpackIndex(id)];

    if (index === undefined || index === NONE || this.boundIds[index] !== id) {
      return NONE;
    }

    return index;
  }

  private viewAt(index: number): V {
    const view = this.views[index];

    assert(view !== undefined, "Every index below size has a view");

    return view;
  }
}
