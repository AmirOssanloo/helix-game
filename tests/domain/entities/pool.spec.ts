import { describe, expect, it } from "vitest";
import { Pool } from "@domain/public";
import { unpackGeneration, unpackIndex } from "@shared/public";

type Marker = {
  value: number;
};

const CAPACITY = 3;

const makePool = (): Pool<Marker> =>
  new Pool(
    CAPACITY,
    () => ({ value: 0 }),
    (marker) => {
      marker.value = 0;
    },
  );

/** Acquires every slot, so a spec can start from a full pool. */
const fillPool = (pool: Pool<Marker>): void => {
  for (let slot = 0; slot < CAPACITY; slot += 1) {
    pool.acquire();
  }
};

describe("Pool", () => {
  it("refuses a capacity below one", () => {
    expect(
      () =>
        new Pool(
          0,
          () => ({ value: 0 }),
          () => {},
        ),
    ).toThrow();
  });

  it("starts empty with no misses", () => {
    const pool = makePool();

    expect(pool.count).toBe(0);
    expect(pool.end).toBe(0);
    expect(pool.misses).toBe(0);
    expect(pool.at(0)).toBeNull();
  });

  it("acquires slots zero, one, two in order from a fresh pool", () => {
    const pool = makePool();

    const first = pool.acquire();
    const second = pool.acquire();

    expect(first).toBe(pool.at(0));
    expect(second).toBe(pool.at(1));
    expect(pool.idAt(0)).not.toBeNull();
    expect(pool.count).toBe(2);
    expect(pool.end).toBe(2);
  });

  it("returns null one past capacity and counts the miss", () => {
    const pool = makePool();
    fillPool(pool);

    const refused = pool.acquire();

    expect(refused).toBeNull();
    expect(pool.count).toBe(CAPACITY);
    expect(pool.misses).toBe(1);
  });

  it("resolves a live id to the object it was acquired as", () => {
    const pool = makePool();
    const marker = pool.acquire();
    const id = pool.idAt(0);

    if (id === null) {
      throw new Error("The first acquired slot has an id");
    }

    expect(pool.resolve(id)).toBe(marker);
  });

  it("reuses a released slot with a new generation and resolves the old id to null", () => {
    const pool = makePool();
    pool.acquire();
    const oldId = pool.idAt(0);

    if (oldId === null) {
      throw new Error("The first acquired slot has an id");
    }

    pool.release(oldId);
    pool.acquire();
    const newId = pool.idAt(0);

    if (newId === null) {
      throw new Error("The reacquired slot has an id");
    }

    expect(unpackIndex(newId)).toBe(0);
    expect(unpackGeneration(oldId)).toBe(0);
    expect(unpackGeneration(newId)).toBe(1);
    expect(pool.resolve(oldId)).toBeNull();
    expect(pool.resolve(newId)).not.toBeNull();
  });

  it("clears the object on release and drops the live count", () => {
    const pool = makePool();
    const marker = pool.acquire();
    const id = pool.idAt(0);

    if (marker === null || id === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    marker.value = 42;
    pool.release(id);

    expect(marker.value).toBe(0);
    expect(pool.count).toBe(0);
    expect(pool.at(0)).toBeNull();
  });

  it("ignores a release of a stale id", () => {
    const pool = makePool();
    pool.acquire();
    const oldId = pool.idAt(0);

    if (oldId === null) {
      throw new Error("The first acquired slot has an id");
    }

    pool.release(oldId);
    const marker = pool.acquire();

    if (marker === null) {
      throw new Error("The reacquire succeeds");
    }

    marker.value = 7;
    pool.release(oldId);

    expect(marker.value).toBe(7);
    expect(pool.count).toBe(1);
    expect(pool.resolve(oldId)).toBeNull();
  });

  it("visits live slots in index order and skips a released one", () => {
    const pool = makePool();
    const first = pool.acquire();
    pool.acquire();
    const third = pool.acquire();
    const middleId = pool.idAt(1);

    if (middleId === null) {
      throw new Error("The middle slot has an id");
    }

    pool.release(middleId);

    expect(pool.end).toBe(3);
    expect(pool.at(0)).toBe(first);
    expect(pool.at(1)).toBeNull();
    expect(pool.at(2)).toBe(third);
    expect(pool.at(3)).toBeNull();
  });

  it("shrinks the iteration bound when the highest live slot is released", () => {
    const pool = makePool();
    pool.acquire();
    pool.acquire();
    pool.acquire();
    const middleId = pool.idAt(1);
    const lastId = pool.idAt(2);

    if (middleId === null || lastId === null) {
      throw new Error("Every acquired slot has an id");
    }

    pool.release(middleId);
    pool.release(lastId);

    expect(pool.end).toBe(1);
    expect(pool.count).toBe(1);
  });

  it("releases every slot at once, invalidates every id, and acquires from slot zero again", () => {
    const pool = makePool();
    fillPool(pool);
    const firstId = pool.idAt(0);
    const lastId = pool.idAt(2);

    if (firstId === null || lastId === null) {
      throw new Error("A full pool has an id in every slot");
    }

    pool.releaseAll();
    const reacquired = pool.acquire();

    expect(pool.count).toBe(1);
    expect(pool.end).toBe(1);
    expect(reacquired).toBe(pool.at(0));
    expect(pool.resolve(firstId)).toBeNull();
    expect(pool.resolve(lastId)).toBeNull();
  });

  it("returns null from at and idAt outside the live range", () => {
    const pool = makePool();
    pool.acquire();

    expect(pool.at(-1)).toBeNull();
    expect(pool.at(0.5)).toBeNull();
    expect(pool.at(CAPACITY)).toBeNull();
    expect(pool.idAt(1)).toBeNull();
  });

  it("hands out the index of the slot acquire would hand out next", () => {
    const pool = makePool();

    const index = pool.acquireIndex();

    expect(index).toBe(0);
    expect(pool.at(index)).toEqual({ value: 0 });
    expect(pool.idAt(index)).not.toBeNull();
    expect(pool.count).toBe(1);
  });

  it("hands out -1 and counts a miss when full", () => {
    const pool = makePool();
    fillPool(pool);

    expect(pool.acquireIndex()).toBe(-1);
    expect(pool.misses).toBe(1);
  });
});
