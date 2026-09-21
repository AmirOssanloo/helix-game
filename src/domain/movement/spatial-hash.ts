import type { EntityId, Vec2 } from "@shared/public";
import { assert, unpackIndex } from "@shared/public";
import type { PoolView } from "../entities/pool";
import { UNIT_CAPACITY } from "../entities/unit";

/** Unit ids one cell holds. A cell at capacity refuses the next insert and counts the miss. */
export const CELL_CAPACITY = 64;

/**
 * Cells the hash can hold at once. Every indexed unit occupies exactly one cell and an empty
 * cell is freed, so one cell per unit slot is enough for a cell never to be refused.
 */
const CELL_COUNT = UNIT_CAPACITY;

/** The table holds at most this share of its slots, so a probe ends after a few steps. */
const MAX_TABLE_LOAD = 0.5;

/** Bits of a packed key that hold one cell coordinate. Two coordinates fill a 32-bit key. */
const COORDINATE_BITS = 16;

const COORDINATE_MASK = (1 << COORDINATE_BITS) - 1;

/** An odd multiplier that spreads neighbouring keys over the table. */
const KEY_MULTIPLIER = 0x9e3779b1;

const NO_CELL = -1;

const NO_KEY = -1;

const NO_ID = -1;

/** What the hash reads of a unit when it rebuilds: where the unit is. */
export type Positioned = {
  curr: Readonly<Vec2>;
};

/** One occupied cell as `readCell` reports it: its integer coordinates and how many units it holds. */
export type HashCell = {
  cellX: number;
  cellY: number;
  count: number;
};

/** An empty record for `readCell` to fill, made once by whoever walks the cells. */
export const createHashCell = (): HashCell => ({
  cellX: 0,
  cellY: 0,
  count: 0,
});

/**
 * The read side of the hash: what a view of the world exposes. `SpatialHash` satisfies it, so
 * a `Readonly` world view can name the hash without exposing `insert`, `remove`, and `move`.
 * Every query writes candidate ids into `out`, from index zero, and returns how many; the
 * caller does the exact test.
 */
export type SpatialHashView = Readonly<{
  cellSize: number;
  count: number;
  misses: number;
  /** Cells the hash can hold at once; `readCell` walks the indices below it. */
  cellSlots: number;
  /** Writes the cell at `index` into `out` and returns `true`, or returns `false` for a free cell, so an overlay walks every occupied cell without allocating. */
  readCell: (index: number, out: HashCell) => boolean;
  queryCircle: (
    x: number,
    y: number,
    radius: number,
    out: EntityId[],
  ) => number;
  querySegment: (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
    out: EntityId[],
  ) => number;
  queryRectangle: (
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    out: EntityId[],
  ) => number;
}>;

/** A buffer for query results, sized once. A query never writes past it. */
export const createCandidateBuffer = (capacity: number): EntityId[] => {
  const buffer: EntityId[] = [];

  for (let index = 0; index < capacity; index += 1) {
    buffer.push(NO_ID);
  }

  return buffer;
};

/** The smallest power of two that keeps the table under its load with every cell in use. */
const tableSizeFor = (cellCount: number): number => {
  let size = 1;

  while (size * MAX_TABLE_LOAD < cellCount) {
    size *= 2;
  }

  return size;
};

/**
 * One integer from two cell coordinates. Each coordinate keeps its low bits, so cells more
 * than 2^15 apart on one axis share a key; that is a world 4 million units across.
 */
const packKey = (cellX: number, cellY: number): number =>
  (((cellX & COORDINATE_MASK) << COORDINATE_BITS) |
    (cellY & COORDINATE_MASK)) >>>
  0;

/** The signed coordinate `bits` holds: the inverse of the masking `packKey` does, for a cell walk to report where a cell is. */
const signExtend = (bits: number): number =>
  (bits << (32 - COORDINATE_BITS)) >> (32 - COORDINATE_BITS);

/**
 * The index of what is near: a uniform grid of square cells keyed by integer coordinates,
 * each cell a fixed-capacity list of unit ids. The cells, the table that finds a cell by its
 * key, and every buffer are created once here and never grow; an operation allocates nothing.
 *
 * A unit is in at most one cell. `insert` indexes it, `remove` forgets it, and `move` puts it
 * where it is now, which is a no-op while it stays in its cell. Every query walks the cells it
 * covers in cell order, ascending row then ascending column, and copies each cell's ids in
 * slot order, so a replay finds the same candidate first. The table's layout never touches
 * that order.
 */
export class SpatialHash implements SpatialHashView {
  private size: number;

  private readonly tableMask: number;

  /** Per table slot: the key of the cell it points at, or `NO_KEY`. */
  private readonly tableKeys: number[];

  /** Per table slot: the cell index the key points at, or `NO_CELL`. */
  private readonly tableCells: number[];

  /** Per cell: its key while in use, or `NO_KEY` while free. */
  private readonly cellKeys: number[];

  private readonly cellCounts: number[];

  /** Every cell's ids, `CELL_CAPACITY` per cell, one after another. */
  private readonly cellIds: number[];

  private readonly freeCells: number[];

  private freeCellCount: number;

  /** Per unit slot: the cell the unit is in, or `NO_CELL`. */
  private readonly cellOfUnit: number[];

  /** Per unit slot: the id indexed there, or `NO_ID`, so a stale id is told from a live one. */
  private readonly idOfUnit: number[];

  private indexedCount = 0;

  private missCount = 0;

  constructor(cellSize: number) {
    assert(
      Number.isFinite(cellSize) && cellSize > 0,
      "A spatial hash needs a positive cell size",
    );

    this.size = cellSize;

    const tableSize = tableSizeFor(CELL_COUNT);

    this.tableMask = tableSize - 1;
    this.tableKeys = [];
    this.tableCells = [];

    for (let slot = 0; slot < tableSize; slot += 1) {
      this.tableKeys.push(NO_KEY);
      this.tableCells.push(NO_CELL);
    }

    this.cellKeys = [];
    this.cellCounts = [];
    this.cellIds = [];
    this.freeCells = [];

    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      this.cellKeys.push(NO_KEY);
      this.cellCounts.push(0);

      for (let slot = 0; slot < CELL_CAPACITY; slot += 1) {
        this.cellIds.push(NO_ID);
      }
    }

    for (let cell = CELL_COUNT - 1; cell >= 0; cell -= 1) {
      this.freeCells.push(cell);
    }

    this.freeCellCount = CELL_COUNT;
    this.cellOfUnit = [];
    this.idOfUnit = [];

    for (let unit = 0; unit < UNIT_CAPACITY; unit += 1) {
      this.cellOfUnit.push(NO_CELL);
      this.idOfUnit.push(NO_ID);
    }
  }

  /** The side of a cell in world units. */
  get cellSize(): number {
    return this.size;
  }

  /** Units the hash holds. */
  get count(): number {
    return this.indexedCount;
  }

  /** Inserts refused by a full cell, since creation. The instrumentation reads it. */
  get misses(): number {
    return this.missCount;
  }

  get cellSlots(): number {
    return CELL_COUNT;
  }

  readCell(index: number, out: HashCell): boolean {
    const key = this.cellKeys[index];
    const count = this.cellCounts[index];

    if (key === undefined || key === NO_KEY || count === undefined) {
      return false;
    }

    out.cellX = signExtend(key >>> COORDINATE_BITS);
    out.cellY = signExtend(key & COORDINATE_MASK);
    out.count = count;

    return true;
  }

  /**
   * Indexes `id` at a position it is not yet indexed at. `false` when the cell is full; the
   * unit is then outside the hash until a later `move` finds room.
   */
  insert(id: EntityId, x: number, y: number): boolean {
    assert(
      this.idOfUnit[unpackIndex(id)] === NO_ID,
      "A unit is inserted into the hash once; afterwards it moves",
    );

    return this.place(id, x, y);
  }

  /** Forgets `id`. An id the hash does not hold changes nothing. */
  remove(id: EntityId): void {
    const unit = unpackIndex(id);

    if (this.idOfUnit[unit] !== id) {
      return;
    }

    this.forget(unit);
  }

  /**
   * Puts `id` in the cell that holds its position now. Nothing changes while it stays in its
   * cell. A unit the hash does not hold, or holds under a stale id from the same slot, is
   * indexed afresh, so a sweep over every live unit leaves the hash exact.
   */
  move(id: EntityId, x: number, y: number): void {
    const unit = unpackIndex(id);
    const cell = this.cellOfUnit[unit];

    if (this.idOfUnit[unit] === id && cell !== undefined && cell !== NO_CELL) {
      if (this.cellKeys[cell] === packKey(this.cellOf(x), this.cellOf(y))) {
        return;
      }
    }

    if (this.idOfUnit[unit] !== NO_ID) {
      this.forget(unit);
    }

    this.place(id, x, y);
  }

  /** Forgets everything, takes `cellSize`, and indexes every live unit of `units` in index order. */
  rebuild(cellSize: number, units: PoolView<Positioned>): void {
    assert(
      Number.isFinite(cellSize) && cellSize > 0,
      "A spatial hash needs a positive cell size",
    );

    for (let slot = 0; slot <= this.tableMask; slot += 1) {
      this.tableKeys[slot] = NO_KEY;
      this.tableCells[slot] = NO_CELL;
    }

    for (let cell = 0; cell < CELL_COUNT; cell += 1) {
      this.cellKeys[cell] = NO_KEY;
      this.cellCounts[cell] = 0;
      this.freeCells[cell] = CELL_COUNT - 1 - cell;
    }

    this.freeCellCount = CELL_COUNT;

    for (let unit = 0; unit < UNIT_CAPACITY; unit += 1) {
      this.cellOfUnit[unit] = NO_CELL;
      this.idOfUnit[unit] = NO_ID;
    }

    this.indexedCount = 0;
    this.size = cellSize;

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);
      const id = units.idAt(index);

      if (unit !== null && id !== null) {
        this.place(id, unit.curr.x, unit.curr.y);
      }
    }
  }

  /** The ids in every cell the circle touches, including a cell it only clips at a corner. */
  queryCircle(x: number, y: number, radius: number, out: EntityId[]): number {
    const minColumn = this.cellOf(x - radius);
    const maxColumn = this.cellOf(x + radius);
    const minRow = this.cellOf(y - radius);
    const maxRow = this.cellOf(y + radius);
    const radiusSquared = radius * radius;
    let written = 0;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        if (this.cellTouchesCircle(column, row, x, y, radiusSquared)) {
          written = this.copyCell(packKey(column, row), out, written);
        }
      }
    }

    return written;
  }

  /**
   * The ids in every cell within `radius` of the segment from a to b: the cells the segment
   * crosses, widened by the cells a disc of that radius on it could reach into.
   */
  querySegment(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
    out: EntityId[],
  ): number {
    const margin = Math.ceil(radius / this.size);
    const minColumn = this.cellOf(Math.min(ax, bx));
    const maxColumn = this.cellOf(Math.max(ax, bx));
    const minRow = this.cellOf(Math.min(ay, by));
    const maxRow = this.cellOf(Math.max(ay, by));
    const dx = bx - ax;
    const dy = by - ay;
    let written = 0;

    for (let row = minRow - margin; row <= maxRow + margin; row += 1) {
      const coreRow = Math.min(Math.max(row, minRow), maxRow);
      let firstColumn = minColumn;
      let lastColumn = maxColumn;

      if (dy !== 0) {
        const enter = Math.min(Math.max((coreRow * this.size - ay) / dy, 0), 1);
        const exit = Math.min(
          Math.max(((coreRow + 1) * this.size - ay) / dy, 0),
          1,
        );
        const enterX = ax + dx * enter;
        const exitX = ax + dx * exit;

        firstColumn = Math.max(minColumn, this.cellOf(Math.min(enterX, exitX)));
        lastColumn = Math.min(maxColumn, this.cellOf(Math.max(enterX, exitX)));
      }

      for (
        let column = firstColumn - margin;
        column <= lastColumn + margin;
        column += 1
      ) {
        written = this.copyCell(packKey(column, row), out, written);
      }
    }

    return written;
  }

  /** The ids in every cell the axis-aligned rectangle covers or touches. */
  queryRectangle(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    out: EntityId[],
  ): number {
    const minColumn = this.cellOf(minX);
    const maxColumn = this.cellOf(maxX);
    const minRow = this.cellOf(minY);
    const maxRow = this.cellOf(maxY);
    let written = 0;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        written = this.copyCell(packKey(column, row), out, written);
      }
    }

    return written;
  }

  private cellOf(coordinate: number): number {
    return Math.floor(coordinate / this.size);
  }

  private cellTouchesCircle(
    column: number,
    row: number,
    x: number,
    y: number,
    radiusSquared: number,
  ): boolean {
    const nearestX = Math.min(
      Math.max(x, column * this.size),
      (column + 1) * this.size,
    );
    const nearestY = Math.min(
      Math.max(y, row * this.size),
      (row + 1) * this.size,
    );
    const dx = x - nearestX;
    const dy = y - nearestY;

    return dx * dx + dy * dy <= radiusSquared;
  }

  private hashKey(key: number): number {
    return (Math.imul(key, KEY_MULTIPLIER) >>> 0) & this.tableMask;
  }

  /** The table slot holding `key`, or the empty slot where it would go. */
  private slotOf(key: number): number {
    let slot = this.hashKey(key);

    while (this.tableKeys[slot] !== NO_KEY && this.tableKeys[slot] !== key) {
      slot = (slot + 1) & this.tableMask;
    }

    return slot;
  }

  private cellAt(key: number): number {
    const cell = this.tableCells[this.slotOf(key)];

    assert(cell !== undefined, "Every table slot has a cell entry");

    return cell;
  }

  /** The cell for `key`, claimed from the free cells when the key is new; `NO_CELL` when none is free. */
  private claimCell(key: number): number {
    const slot = this.slotOf(key);
    const found = this.tableCells[slot];

    assert(found !== undefined, "Every table slot has a cell entry");

    if (found !== NO_CELL) {
      return found;
    }

    if (this.freeCellCount === 0) {
      return NO_CELL;
    }

    this.freeCellCount -= 1;

    const cell = this.freeCells[this.freeCellCount];

    assert(cell !== undefined, "The free list holds a cell below its count");

    this.cellKeys[cell] = key;
    this.cellCounts[cell] = 0;
    this.tableKeys[slot] = key;
    this.tableCells[slot] = cell;

    return cell;
  }

  /** Frees an empty cell and closes the gap its table slot leaves, so every later probe still finds its key. */
  private releaseCell(cell: number): void {
    const key = this.cellKeys[cell];

    assert(key !== undefined && key !== NO_KEY, "A released cell is in use");

    let gap = this.slotOf(key);

    this.tableKeys[gap] = NO_KEY;
    this.tableCells[gap] = NO_CELL;
    this.cellKeys[cell] = NO_KEY;
    this.freeCells[this.freeCellCount] = cell;
    this.freeCellCount += 1;

    let slot = (gap + 1) & this.tableMask;

    while (this.tableKeys[slot] !== NO_KEY) {
      const slotKey = this.tableKeys[slot];

      assert(slotKey !== undefined, "Every table slot has a key entry");

      const home = this.hashKey(slotKey);
      const homeBetween =
        gap <= slot ? gap < home && home <= slot : gap < home || home <= slot;

      if (!homeBetween) {
        const slotCell = this.tableCells[slot];

        assert(slotCell !== undefined, "Every table slot has a cell entry");

        this.tableKeys[gap] = slotKey;
        this.tableCells[gap] = slotCell;
        this.tableKeys[slot] = NO_KEY;
        this.tableCells[slot] = NO_CELL;
        gap = slot;
      }

      slot = (slot + 1) & this.tableMask;
    }
  }

  /** Appends `id` to the cell at the position. `false`, and a miss, when the cell is full. */
  private place(id: EntityId, x: number, y: number): boolean {
    const cell = this.claimCell(packKey(this.cellOf(x), this.cellOf(y)));

    assert(cell !== NO_CELL, "One cell per unit slot is never exhausted");

    const count = this.cellCounts[cell];

    assert(count !== undefined, "Every cell has a count");

    if (count === CELL_CAPACITY) {
      this.missCount += 1;

      return false;
    }

    const unit = unpackIndex(id);

    this.cellIds[cell * CELL_CAPACITY + count] = id;
    this.cellCounts[cell] = count + 1;
    this.cellOfUnit[unit] = cell;
    this.idOfUnit[unit] = id;
    this.indexedCount += 1;

    return true;
  }

  /** Takes the unit slot's id out of its cell, closing the gap with the cell's last id, and frees an emptied cell. */
  private forget(unit: number): void {
    const cell = this.cellOfUnit[unit];
    const id = this.idOfUnit[unit];

    assert(
      cell !== undefined && cell !== NO_CELL && id !== undefined,
      "A forgotten unit is in a cell",
    );

    const count = this.cellCounts[cell];

    assert(count !== undefined && count > 0, "A unit's cell holds it");

    const first = cell * CELL_CAPACITY;
    const last = first + count - 1;

    for (let slot = first; slot <= last; slot += 1) {
      if (this.cellIds[slot] === id) {
        const lastId = this.cellIds[last];

        assert(lastId !== undefined, "A cell's ids fill its count");

        this.cellIds[slot] = lastId;
        this.cellIds[last] = NO_ID;

        break;
      }
    }

    this.cellCounts[cell] = count - 1;
    this.cellOfUnit[unit] = NO_CELL;
    this.idOfUnit[unit] = NO_ID;
    this.indexedCount -= 1;

    if (count - 1 === 0) {
      this.releaseCell(cell);
    }
  }

  /** Copies the ids of the cell `key` names, if one exists, into `out` from `written` on. */
  private copyCell(key: number, out: EntityId[], written: number): number {
    const cell = this.cellAt(key);

    if (cell === NO_CELL) {
      return written;
    }

    const count = this.cellCounts[cell];

    assert(count !== undefined, "Every cell has a count");
    assert(
      written + count <= out.length,
      "A candidate buffer holds every unit a query can return",
    );

    const first = cell * CELL_CAPACITY;
    let next = written;

    for (let slot = first; slot < first + count; slot += 1) {
      const id = this.cellIds[slot];

      assert(id !== undefined, "A cell's ids fill its count");

      out[next] = id;
      next += 1;
    }

    return next;
  }
}

/** A hash with no units on cells of `cellSize`. Every buffer it will ever use is made here. */
export const createSpatialHash = (cellSize: number): SpatialHash =>
  new SpatialHash(cellSize);
