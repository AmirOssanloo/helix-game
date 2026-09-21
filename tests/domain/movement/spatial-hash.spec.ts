import { describe, expect, it } from "vitest";
import type { HashCell, SpatialHash } from "@domain/public";
import {
  CELL_CAPACITY,
  createCandidateBuffer,
  createHashCell,
  createSpatialHash,
  createUnitPool,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import { packId } from "@shared/public";

/** Cells of a round size, so a position reads as its cell at a glance. */
const CELL = 100;

const id = (index: number): EntityId => packId(index, 0);

/** The ids a query wrote, as a plain array a matcher can read. */
const collect = (out: EntityId[], count: number): EntityId[] =>
  out.slice(0, count);

const circle = (
  hash: SpatialHash,
  x: number,
  y: number,
  radius: number,
): EntityId[] => {
  const out = createCandidateBuffer(UNIT_CAPACITY);

  return collect(out, hash.queryCircle(x, y, radius, out));
};

const segment = (
  hash: SpatialHash,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
): EntityId[] => {
  const out = createCandidateBuffer(UNIT_CAPACITY);

  return collect(out, hash.querySegment(ax, ay, bx, by, radius, out));
};

const rectangle = (
  hash: SpatialHash,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): EntityId[] => {
  const out = createCandidateBuffer(UNIT_CAPACITY);

  return collect(out, hash.queryRectangle(minX, minY, maxX, maxY, out));
};

/** Every occupied cell a walk over the hash reports, in slot order. */
const occupiedCells = (hash: SpatialHash): HashCell[] => {
  const cells: HashCell[] = [];

  for (let index = 0; index < hash.cellSlots; index += 1) {
    const cell = createHashCell();

    if (hash.readCell(index, cell)) {
      cells.push(cell);
    }
  }

  return cells;
};

/** Fills the cell at the origin to capacity with ids from zero. */
const fillOriginCell = (hash: SpatialHash): void => {
  for (let index = 0; index < CELL_CAPACITY; index += 1) {
    hash.insert(id(index), 10, 10);
  }
};

describe("SpatialHash", () => {
  it("returns every unit in a cell the circle touches and none in a cell it does not", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);
    hash.insert(id(2), 150, 50);
    hash.insert(id(3), 50, 150);
    hash.insert(id(4), 150, 150);
    hash.insert(id(5), 250, 250);

    const found = circle(hash, 90, 90, 12);

    expect(found).toEqual([id(1), id(2), id(3)]);
  });

  it("finds a moved unit in its new cell and not in its old one", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);

    hash.move(id(1), 250, 50);

    expect(circle(hash, 250, 50, 10)).toEqual([id(1)]);
    expect(circle(hash, 50, 50, 10)).toEqual([]);
    expect(hash.count).toBe(1);
  });

  it("returns candidates in cell order, ascending row then column, then slot order", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(5), 150, 150);
    hash.insert(id(2), 50, 50);
    hash.insert(id(7), 60, 60);
    hash.insert(id(1), 150, 50);
    hash.insert(id(3), 50, 150);

    const found = rectangle(hash, 0, 0, 199, 199);

    expect(found).toEqual([id(2), id(7), id(1), id(3), id(5)]);
  });

  it("returns the same candidates in the same order for two hashes built from the same positions", () => {
    const first = createSpatialHash(CELL);
    const second = createSpatialHash(CELL);

    for (const hash of [first, second]) {
      hash.insert(id(9), 20, 20);
      hash.insert(id(4), 30, 30);
      hash.insert(id(6), 120, 20);
      hash.move(id(9), 130, 30);
      hash.insert(id(8), 40, 40);
    }

    expect(rectangle(first, 0, 0, 199, 99)).toEqual(
      rectangle(second, 0, 0, 199, 99),
    );
    expect(rectangle(first, 0, 0, 199, 99)).toEqual([
      id(4),
      id(8),
      id(6),
      id(9),
    ]);
  });

  it("refuses an insert into a cell at capacity and counts the miss", () => {
    const hash = createSpatialHash(CELL);
    fillOriginCell(hash);

    const accepted = hash.insert(id(CELL_CAPACITY), 20, 20);

    expect(accepted).toBe(false);
    expect(hash.misses).toBe(1);
    expect(hash.count).toBe(CELL_CAPACITY);
    expect(circle(hash, 10, 10, 1)).toHaveLength(CELL_CAPACITY);
  });

  it("returns nothing for a removed unit and ignores an id it does not hold", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);
    hash.insert(id(2), 60, 60);

    hash.remove(id(1));
    hash.remove(id(1));
    hash.remove(packId(2, 1));

    expect(circle(hash, 50, 50, 20)).toEqual([id(2)]);
    expect(hash.count).toBe(1);
  });

  it("returns the units in the cells a segment crosses and none in the cells beside it", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);
    hash.insert(id(2), 250, 50);
    hash.insert(id(3), 50, 150);
    hash.insert(id(4), 250, 150);
    hash.insert(id(5), 150, 150);

    const found = segment(hash, 10, 50, 290, 170, 0);

    expect(found).toEqual([id(1), id(5), id(4)]);
  });

  it("widens a segment query by the cells a disc of its radius reaches", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);
    hash.insert(id(2), 250, 50);
    hash.insert(id(3), 50, 150);
    hash.insert(id(4), 250, 150);
    hash.insert(id(5), 150, 150);

    const found = segment(hash, 10, 50, 290, 170, CELL);

    expect(found).toEqual([id(1), id(2), id(3), id(5), id(4)]);
  });

  it("returns the units in the cells a rectangle covers", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), 50, 50);
    hash.insert(id(2), 150, 50);
    hash.insert(id(3), 250, 50);
    hash.insert(id(4), 50, 150);

    expect(rectangle(hash, 0, 0, 150, 50)).toEqual([id(1), id(2)]);
    expect(rectangle(hash, 300, 300, 400, 400)).toEqual([]);
  });

  it("keys negative coordinates to their own cells", () => {
    const hash = createSpatialHash(CELL);
    hash.insert(id(1), -50, -50);
    hash.insert(id(2), 50, 50);

    expect(circle(hash, -50, -50, 10)).toEqual([id(1)]);
    expect(rectangle(hash, -100, -100, -1, -1)).toEqual([id(1)]);
  });

  it("puts a unit whose new cell is full outside the hash until a later move finds room", () => {
    const hash = createSpatialHash(CELL);
    fillOriginCell(hash);
    hash.insert(id(CELL_CAPACITY), 150, 10);

    hash.move(id(CELL_CAPACITY), 20, 20);

    expect(hash.count).toBe(CELL_CAPACITY);
    expect(hash.misses).toBe(1);
    expect(circle(hash, 150, 10, 1)).toEqual([]);

    hash.move(id(CELL_CAPACITY), 150, 10);

    expect(circle(hash, 150, 10, 1)).toEqual([id(CELL_CAPACITY)]);
  });

  it("rebuilds from a pool's live units at a new cell size and forgets what it held", () => {
    const hash = createSpatialHash(CELL);
    const pool = createUnitPool();
    const first = pool.acquire();
    const second = pool.acquire();
    hash.insert(id(7), 500, 500);

    if (first === null || second === null) {
      throw new Error("A fresh pool has room for two units");
    }

    first.curr.x = 40;
    first.curr.y = 40;
    second.curr.x = 120;
    second.curr.y = 40;

    hash.rebuild(50, pool);

    expect(hash.cellSize).toBe(50);
    expect(hash.count).toBe(2);
    expect(circle(hash, 500, 500, 10)).toEqual([]);
    expect(rectangle(hash, 0, 0, 149, 49)).toEqual([
      pool.idAt(0),
      pool.idAt(1),
    ]);
    expect(rectangle(hash, 100, 0, 149, 49)).toEqual([pool.idAt(1)]);
  });

  it("reports every occupied cell with its coordinates and count, negative coordinates included", () => {
    const hash = createSpatialHash(CELL);

    hash.insert(id(1), 10, 10);
    hash.insert(id(2), 20, 20);
    hash.insert(id(3), -150, 250);

    expect(occupiedCells(hash)).toEqual([
      { cellX: 0, cellY: 0, count: 2 },
      { cellX: -2, cellY: 2, count: 1 },
    ]);
  });

  it("reports nothing for a cell freed by its last unit leaving", () => {
    const hash = createSpatialHash(CELL);

    hash.insert(id(1), 10, 10);
    hash.remove(id(1));

    expect(occupiedCells(hash)).toEqual([]);
  });
});
