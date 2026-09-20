import { assert } from "@shared/public";
import type { WalkabilityView } from "../map/walkability";
import {
  cellIndex,
  columnOfIndex,
  isCellBlocked,
  rowOfIndex,
} from "../map/walkability";

/** The cost of a diagonal step between cells, against one for a step along an edge. */
const DIAGONAL_COST = Math.SQRT2;

/** The eight neighbours of a cell, in the fixed order every search visits them: the four edges, then the four corners. */
const NEIGHBOUR_COLUMNS: readonly number[] = [1, -1, 0, 0, 1, 1, -1, -1];
const NEIGHBOUR_ROWS: readonly number[] = [0, 0, 1, -1, 1, -1, 1, -1];
const EDGE_NEIGHBOURS = 4;

/** The stamp after which the search's arrays are wiped, so a stamp never wraps onto a stale one. */
const LAST_STAMP = 0xffffffff;

/** A cell the current search has opened. */
const OPEN = 0;

/** A cell the current search has expanded. */
const CLOSED = 1;

/**
 * The working memory of A* over one grid, allocated once for the grid's cell count and reused
 * by every search: per-cell arrays stamped with the search that last touched them, so no array
 * is cleared between searches, and a binary heap of open cells keyed by their estimated total
 * cost. `result` holds the cells of the last found path, from the first step after the start
 * to the goal.
 */
export type PathSearch = {
  /** How many cells the arrays are sized for. A grid with more cells needs `fitPathSearch`. */
  capacity: number;
  /** The number of the current search. A cell whose `stamp` differs has not been touched by it. */
  stamp: number;
  stamps: Uint32Array;
  states: Uint8Array;
  costs: Float64Array;
  parents: Int32Array;
  priorities: Float64Array;
  /** Each cell's position in `heap` while it is open. */
  heapSlots: Int32Array;
  heap: Int32Array;
  heapCount: number;
  result: Int32Array;
  resultCount: number;
};

/** A search sized for `capacity` cells. */
export const createPathSearch = (capacity: number): PathSearch => {
  assert(
    Number.isInteger(capacity) && capacity > 0,
    "A path search covers at least one cell",
  );

  return {
    capacity,
    stamp: 0,
    stamps: new Uint32Array(capacity),
    states: new Uint8Array(capacity),
    costs: new Float64Array(capacity),
    parents: new Int32Array(capacity),
    priorities: new Float64Array(capacity),
    heapSlots: new Int32Array(capacity),
    heap: new Int32Array(capacity),
    heapCount: 0,
    result: new Int32Array(capacity),
    resultCount: 0,
  };
};

/**
 * Makes `search` large enough for `capacity` cells, reallocating only when it is not. A map
 * load and a change to the grid's tunables call it; a search on a grid that fits is untouched,
 * so nothing allocates in steady state.
 */
export const fitPathSearch = (search: PathSearch, capacity: number): void => {
  if (capacity <= search.capacity) {
    return;
  }

  const grown = createPathSearch(capacity);

  search.capacity = grown.capacity;
  search.stamp = 0;
  search.stamps = grown.stamps;
  search.states = grown.states;
  search.costs = grown.costs;
  search.parents = grown.parents;
  search.priorities = grown.priorities;
  search.heapSlots = grown.heapSlots;
  search.heap = grown.heap;
  search.heapCount = 0;
  search.result = grown.result;
  search.resultCount = 0;
};

/** Whether the open cell `a` comes out of the heap before `b`: the lower estimate first, the lower cell index on a tie. */
const isBefore = (search: PathSearch, a: number, b: number): boolean => {
  const priorityA = search.priorities[a] ?? Infinity;
  const priorityB = search.priorities[b] ?? Infinity;

  if (priorityA !== priorityB) {
    return priorityA < priorityB;
  }

  return a < b;
};

const heapCellAt = (search: PathSearch, slot: number): number => {
  const cell = search.heap[slot];

  assert(cell !== undefined, "A heap slot below the count holds a cell");

  return cell;
};

const placeInHeap = (search: PathSearch, slot: number, cell: number): void => {
  search.heap[slot] = cell;
  search.heapSlots[cell] = slot;
};

const siftUp = (search: PathSearch, startSlot: number): void => {
  let slot = startSlot;
  const cell = heapCellAt(search, slot);

  while (slot > 0) {
    const parentSlot = (slot - 1) >> 1;
    const parent = heapCellAt(search, parentSlot);

    if (!isBefore(search, cell, parent)) {
      break;
    }

    placeInHeap(search, slot, parent);
    slot = parentSlot;
  }

  placeInHeap(search, slot, cell);
};

const siftDown = (search: PathSearch, startSlot: number): void => {
  let slot = startSlot;
  const cell = heapCellAt(search, slot);
  const count = search.heapCount;

  for (;;) {
    const leftSlot = slot * 2 + 1;

    if (leftSlot >= count) {
      break;
    }

    const rightSlot = leftSlot + 1;
    let childSlot = leftSlot;

    if (
      rightSlot < count &&
      isBefore(
        search,
        heapCellAt(search, rightSlot),
        heapCellAt(search, leftSlot),
      )
    ) {
      childSlot = rightSlot;
    }

    const child = heapCellAt(search, childSlot);

    if (!isBefore(search, child, cell)) {
      break;
    }

    placeInHeap(search, slot, child);
    slot = childSlot;
  }

  placeInHeap(search, slot, cell);
};

const pushHeap = (search: PathSearch, cell: number): void => {
  const slot = search.heapCount;

  search.heapCount += 1;
  placeInHeap(search, slot, cell);
  siftUp(search, slot);
};

const popHeap = (search: PathSearch): number => {
  const first = heapCellAt(search, 0);
  const lastSlot = search.heapCount - 1;

  search.heapCount = lastSlot;

  if (lastSlot > 0) {
    placeInHeap(search, 0, heapCellAt(search, lastSlot));
    siftDown(search, 0);
  }

  return first;
};

/** Begins a search: the next stamp, an empty heap, and a wipe of the stamps when they would otherwise wrap. */
const beginSearch = (search: PathSearch): void => {
  if (search.stamp >= LAST_STAMP) {
    search.stamps.fill(0);
    search.stamp = 0;
  }

  search.stamp += 1;
  search.heapCount = 0;
  search.resultCount = 0;
};

/** The octile distance between two cells: what the remaining cost is at least, with diagonal steps allowed. */
const estimate = (
  columnA: number,
  rowA: number,
  columnB: number,
  rowB: number,
): number => {
  const dx = Math.abs(columnA - columnB);
  const dy = Math.abs(rowA - rowB);

  return dx + dy + (DIAGONAL_COST - 2) * Math.min(dx, dy);
};

/** Opens `cell` from `parent` at `cost`, or lowers its cost if it is already open and this way is cheaper. */
const relax = (
  search: PathSearch,
  cell: number,
  parent: number,
  cost: number,
  remaining: number,
): void => {
  const touched = search.stamps[cell] === search.stamp;

  if (touched && search.states[cell] === CLOSED) {
    return;
  }

  if (touched && cost >= (search.costs[cell] ?? Infinity)) {
    return;
  }

  search.costs[cell] = cost;
  search.parents[cell] = parent;
  search.priorities[cell] = cost + remaining;

  if (touched) {
    const slot = search.heapSlots[cell];

    assert(slot !== undefined, "An open cell has a heap slot");

    siftUp(search, slot);

    return;
  }

  search.stamps[cell] = search.stamp;
  search.states[cell] = OPEN;
  pushHeap(search, cell);
};

/** Writes the cells from the first step after `start` to `goal` into `result`, in walking order, by following the parents back. */
const writeResult = (search: PathSearch, start: number, goal: number): void => {
  let count = 0;

  for (let cell = goal; cell !== start; cell = search.parents[cell] ?? start) {
    count += 1;
  }

  search.resultCount = count;

  let cell = goal;

  for (let slot = count - 1; slot >= 0; slot -= 1) {
    search.result[slot] = cell;
    cell = search.parents[cell] ?? start;
  }
};

/**
 * A* from the cell (`startColumn`, `startRow`) to (`goalColumn`, `goalRow`) on the class layer
 * of `grid`, with the octile estimate and diagonal steps that never cut a blocked corner. The
 * start cell is expanded whatever its flag, since a unit pushed against a wall stands in a
 * cell the grid closes; the goal cell may be entered whatever its flag, since a resolved
 * destination is a legal point in a cell the grid may close around it. Every other cell on the
 * path is open. Returns whether a path was found; the cells are then in `result`, and a start
 * on the goal cell is found with no cells at all.
 */
export const searchPath = (
  search: PathSearch,
  grid: WalkabilityView,
  radiusClass: number,
  startColumn: number,
  startRow: number,
  goalColumn: number,
  goalRow: number,
): boolean => {
  assert(
    grid.columns * grid.rows <= search.capacity,
    "A path search is sized for the grid it searches",
  );

  const start = cellIndex(grid, startColumn, startRow);
  const goal = cellIndex(grid, goalColumn, goalRow);

  beginSearch(search);

  if (start === goal) {
    return true;
  }

  relax(
    search,
    start,
    start,
    0,
    estimate(startColumn, startRow, goalColumn, goalRow),
  );

  while (search.heapCount > 0) {
    const current = popHeap(search);

    if (current === goal) {
      writeResult(search, start, goal);

      return true;
    }

    search.states[current] = CLOSED;

    const column = columnOfIndex(grid, current);
    const row = rowOfIndex(grid, current);
    const cost = search.costs[current] ?? 0;

    for (
      let direction = 0;
      direction < NEIGHBOUR_COLUMNS.length;
      direction += 1
    ) {
      const dc = NEIGHBOUR_COLUMNS[direction] ?? 0;
      const dr = NEIGHBOUR_ROWS[direction] ?? 0;
      const nextColumn = column + dc;
      const nextRow = row + dr;

      if (
        nextColumn < 0 ||
        nextColumn >= grid.columns ||
        nextRow < 0 ||
        nextRow >= grid.rows
      ) {
        continue;
      }

      const next = cellIndex(grid, nextColumn, nextRow);

      if (
        next !== goal &&
        isCellBlocked(grid, radiusClass, nextColumn, nextRow)
      ) {
        continue;
      }

      const isDiagonal = direction >= EDGE_NEIGHBOURS;

      if (
        isDiagonal &&
        (isCellBlocked(grid, radiusClass, nextColumn, row) ||
          isCellBlocked(grid, radiusClass, column, nextRow))
      ) {
        continue;
      }

      relax(
        search,
        next,
        current,
        cost + (isDiagonal ? DIAGONAL_COST : 1),
        estimate(nextColumn, nextRow, goalColumn, goalRow),
      );
    }
  }

  return false;
};
