import type { Rect } from "@shared/public";
import { assert } from "@shared/public";
import type { RadiusClassKey } from "../definitions/tuning-def";
import { readTunable } from "../definitions/tuning-state";

/** The radius classes in ascending order: small, hero, large. A grid holds one layer per class. */
export const RADIUS_CLASS_KEYS: readonly RadiusClassKey[] = [
  "radius_class:0",
  "radius_class:1",
  "radius_class:2",
];

const OPEN = 0;

const BLOCKED = 1;

/**
 * The walkability grid: one square cell per `cellSize` world units over the map's bounds, with
 * one layer per radius class. A cell is open in a class when a disc of that class's radius can
 * stand anywhere in the cell without overlapping an obstacle or leaving the bounds, so pathing
 * on the class's layer never proposes a cell the unit cannot occupy. The cells are derived
 * once per map load and sized to the bounds; nothing writes them afterwards.
 */
export type WalkabilityGrid = {
  cellSize: number;
  columns: number;
  rows: number;
  /** The world position of the grid's first cell: the bounds' minimum corner. */
  originX: number;
  originY: number;
  /** The radius each layer was inflated by, ascending, in world units. */
  classRadii: Float64Array;
  /** One byte per cell per class, `1` blocked and `0` open, laid out layer by layer, row by row. */
  cells: Uint8Array;
};

/** The read side of the grid, which a read-only world view exposes and every query takes. */
export type WalkabilityView = Readonly<{
  cellSize: number;
  columns: number;
  rows: number;
  originX: number;
  originY: number;
  classRadii: ArrayLike<number>;
  cells: ArrayLike<number>;
}>;

/** The radius of every class from the tuning state, in the order of the class keys. */
export const readRadiusClasses = (
  tuning: ReadonlyMap<string, number>,
): number[] => {
  const radii: number[] = [];

  for (let index = 0; index < RADIUS_CLASS_KEYS.length; index += 1) {
    const key = RADIUS_CLASS_KEYS[index];

    if (key !== undefined) {
      radii.push(readTunable(tuning, key));
    }
  }

  return radii;
};

/** How many cells of `cellSize` cover `extent` world units: the last cell may reach past the bounds. */
const cellsToCover = (extent: number, cellSize: number): number =>
  Math.ceil(extent / cellSize);

const cellIndexOf = (
  grid: WalkabilityView,
  radiusClass: number,
  column: number,
  row: number,
): number => (radiusClass * grid.rows + row) * grid.columns + column;

/**
 * Marks blocked, on one layer, every cell whose interior overlaps the open rectangle given by
 * its edges. An edge exactly on a cell boundary does not block the cell beyond it, since a
 * disc touching a wall does not overlap it. An infinite edge runs the marking to the grid's
 * edge on that side.
 */
const blockOverlapping = (
  grid: WalkabilityGrid,
  radiusClass: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void => {
  const size = grid.cellSize;
  const firstColumn = Math.max(0, Math.floor((minX - grid.originX) / size));
  const lastColumn = Math.min(
    grid.columns - 1,
    Math.ceil((maxX - grid.originX) / size) - 1,
  );
  const firstRow = Math.max(0, Math.floor((minY - grid.originY) / size));
  const lastRow = Math.min(
    grid.rows - 1,
    Math.ceil((maxY - grid.originY) / size) - 1,
  );

  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      grid.cells[cellIndexOf(grid, radiusClass, column, row)] = BLOCKED;
    }
  }
};

/**
 * Derives the grid for a map's `bounds` and `obstacles`: `cellSize` square cells covering the
 * bounds, one layer per entry of `classRadii`. On each layer, every obstacle inflated by the
 * class radius blocks the cells it overlaps, and so does a strip of that radius inside each
 * side of the bounds, since the bounds are walls. Allocated once here, at the size the bounds
 * need; a map load and a change to the grid's tunables are not steady state.
 */
export const deriveWalkabilityGrid = (
  bounds: Readonly<Rect>,
  obstacles: readonly Rect[],
  cellSize: number,
  classRadii: readonly number[],
): WalkabilityGrid => {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  assert(
    Number.isFinite(cellSize) && cellSize > 0,
    "A walkability grid needs a positive cell size",
  );
  assert(width > 0 && height > 0, "A map's bounds enclose an area");
  assert(classRadii.length > 0, "A walkability grid has at least one class");

  const columns = cellsToCover(width, cellSize);
  const rows = cellsToCover(height, cellSize);
  const grid: WalkabilityGrid = {
    cellSize,
    columns,
    rows,
    originX: bounds.minX,
    originY: bounds.minY,
    classRadii: new Float64Array(classRadii.length),
    cells: new Uint8Array(classRadii.length * rows * columns),
  };

  for (let radiusClass = 0; radiusClass < classRadii.length; radiusClass += 1) {
    const radius = classRadii[radiusClass];
    const previous = radiusClass === 0 ? 0 : grid.classRadii[radiusClass - 1];

    assert(
      radius !== undefined && previous !== undefined && radius >= previous,
      "Radius classes ascend from zero",
    );

    grid.classRadii[radiusClass] = radius;

    blockOverlapping(
      grid,
      radiusClass,
      -Infinity,
      -Infinity,
      bounds.minX + radius,
      Infinity,
    );
    blockOverlapping(
      grid,
      radiusClass,
      bounds.maxX - radius,
      -Infinity,
      Infinity,
      Infinity,
    );
    blockOverlapping(
      grid,
      radiusClass,
      -Infinity,
      -Infinity,
      Infinity,
      bounds.minY + radius,
    );
    blockOverlapping(
      grid,
      radiusClass,
      -Infinity,
      bounds.maxY - radius,
      Infinity,
      Infinity,
    );

    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];

      if (obstacle !== undefined) {
        blockOverlapping(
          grid,
          radiusClass,
          obstacle.minX - radius,
          obstacle.minY - radius,
          obstacle.maxX + radius,
          obstacle.maxY + radius,
        );
      }
    }
  }

  return grid;
};

/** Whether `grid` is the one `bounds` derives at its cell size: the same corner and the same number of cells each way. */
export const walkabilityCovers = (
  grid: WalkabilityView,
  bounds: Readonly<Rect>,
): boolean =>
  grid.originX === bounds.minX &&
  grid.originY === bounds.minY &&
  grid.columns === cellsToCover(bounds.maxX - bounds.minX, grid.cellSize) &&
  grid.rows === cellsToCover(bounds.maxY - bounds.minY, grid.cellSize);

/**
 * Whether `grid` was derived under the cell size and class radii the tuning state holds now.
 * Reads the tunables one by one, so the check a system makes every tick allocates nothing.
 */
export const walkabilityIsCurrent = (
  grid: WalkabilityView,
  tuning: ReadonlyMap<string, number>,
): boolean => {
  if (grid.cellSize !== readTunable(tuning, "walkability_cell_size")) {
    return false;
  }

  if (grid.classRadii.length !== RADIUS_CLASS_KEYS.length) {
    return false;
  }

  for (let index = 0; index < RADIUS_CLASS_KEYS.length; index += 1) {
    const key = RADIUS_CLASS_KEYS[index];

    if (
      key !== undefined &&
      grid.classRadii[index] !== readTunable(tuning, key)
    ) {
      return false;
    }
  }

  return true;
};

/** How many cells one layer holds: what a search over the grid sizes its arrays to. */
export const cellCount = (grid: WalkabilityView): number =>
  grid.columns * grid.rows;

/** The cell's index within one layer, `row` by `column`; what a search over the grid uses as a node. */
export const cellIndex = (
  grid: WalkabilityView,
  column: number,
  row: number,
): number => row * grid.columns + column;

/** The column of a within-layer cell index. */
export const columnOfIndex = (grid: WalkabilityView, index: number): number =>
  index % grid.columns;

/** The row of a within-layer cell index. */
export const rowOfIndex = (grid: WalkabilityView, index: number): number =>
  (index - (index % grid.columns)) / grid.columns;

/** The world x at the centre of `column`. */
export const cellCentreX = (grid: WalkabilityView, column: number): number =>
  grid.originX + (column + 1 / 2) * grid.cellSize;

/** The world y at the centre of `row`. */
export const cellCentreY = (grid: WalkabilityView, row: number): number =>
  grid.originY + (row + 1 / 2) * grid.cellSize;

/** The column the world x lies in. Past the grid on either side the result is outside `0` to `columns - 1`. */
export const columnOf = (grid: WalkabilityView, x: number): number =>
  Math.floor((x - grid.originX) / grid.cellSize);

/** The row the world y lies in. Past the grid on either side the result is outside `0` to `rows - 1`. */
export const rowOf = (grid: WalkabilityView, y: number): number =>
  Math.floor((y - grid.originY) / grid.cellSize);

/** Whether a disc of the class may stand in the cell. A cell outside the grid is blocked. */
export const isCellBlocked = (
  grid: WalkabilityView,
  radiusClass: number,
  column: number,
  row: number,
): boolean => {
  if (
    column < 0 ||
    column >= grid.columns ||
    row < 0 ||
    row >= grid.rows ||
    radiusClass < 0 ||
    radiusClass >= grid.classRadii.length
  ) {
    return true;
  }

  return grid.cells[cellIndexOf(grid, radiusClass, column, row)] !== OPEN;
};

/** Whether the cell under the world point is blocked for the class. */
export const isBlockedAt = (
  grid: WalkabilityView,
  radiusClass: number,
  x: number,
  y: number,
): boolean =>
  isCellBlocked(grid, radiusClass, columnOf(grid, x), rowOf(grid, y));

/**
 * The layer a unit of `radius` paths on: the smallest class whose radius holds the unit, so
 * the layer never opens a cell the unit does not fit in. A unit wider than the largest class
 * paths on the largest layer, which is the closest the grid has.
 */
export const radiusClassOf = (
  grid: WalkabilityView,
  radius: number,
): number => {
  for (let index = 0; index < grid.classRadii.length; index += 1) {
    const classRadius = grid.classRadii[index];

    if (classRadius !== undefined && classRadius >= radius) {
      return index;
    }
  }

  return grid.classRadii.length - 1;
};
