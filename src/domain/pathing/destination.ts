import type { Rect, Vec2 } from "@shared/public";
import { assert, clamp } from "@shared/public";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import type { WalkabilityView } from "../map/walkability";
import {
  columnOf,
  isCellBlocked,
  radiusClassOf,
  rowOf,
} from "../map/walkability";

/**
 * How many times the resolver pushes a point out of every inflated obstacle before it gives
 * up on geometry and snaps to the grid. Two obstacles whose inflations overlap can hand a
 * point back and forth; the grid, which already knows their union, settles it.
 */
const PUSH_OUT_PASSES = 4;

/**
 * Moves a point strictly inside `rect` inflated by `inflation` to the nearest edge of the
 * inflated rectangle, ties broken left, right, top, bottom as the collision rule breaks them.
 * Returns whether the point was inside.
 */
const pushPointOutOfRect = (
  point: Vec2,
  rect: Readonly<Rect>,
  inflation: number,
): boolean => {
  const minX = rect.minX - inflation;
  const maxX = rect.maxX + inflation;
  const minY = rect.minY - inflation;
  const maxY = rect.maxY + inflation;

  if (
    point.x <= minX ||
    point.x >= maxX ||
    point.y <= minY ||
    point.y >= maxY
  ) {
    return false;
  }

  const toLeft = point.x - minX;
  const toRight = maxX - point.x;
  const toTop = point.y - minY;
  const toBottom = maxY - point.y;

  if (toLeft <= toRight && toLeft <= toTop && toLeft <= toBottom) {
    point.x = minX;
  } else if (toRight <= toTop && toRight <= toBottom) {
    point.x = maxX;
  } else if (toTop <= toBottom) {
    point.y = minY;
  } else {
    point.y = maxY;
  }

  return true;
};

/** Whether a search can reach the cell: it is open, or one of its four edge neighbours is, so a path ends in it from beside it. */
const isCellReachable = (
  grid: WalkabilityView,
  radiusClass: number,
  column: number,
  row: number,
): boolean =>
  !isCellBlocked(grid, radiusClass, column, row) ||
  !isCellBlocked(grid, radiusClass, column + 1, row) ||
  !isCellBlocked(grid, radiusClass, column - 1, row) ||
  !isCellBlocked(grid, radiusClass, column, row + 1) ||
  !isCellBlocked(grid, radiusClass, column, row - 1);

/** The squared distance from (`x`, `y`) to the nearest point of the cell. */
const distanceSquaredToCell = (
  grid: WalkabilityView,
  column: number,
  row: number,
  x: number,
  y: number,
): number => {
  const minX = grid.originX + column * grid.cellSize;
  const minY = grid.originY + row * grid.cellSize;
  const dx = x - clamp(x, minX, minX + grid.cellSize);
  const dy = y - clamp(y, minY, minY + grid.cellSize);

  return dx * dx + dy * dy;
};

/** The best cell the ring search has seen, reused across calls so the search allocates nothing. */
const nearest = { column: -1, row: -1, distanceSquared: Infinity };

/** Takes the cell as the nearest so far when it is open and closer to (`x`, `y`) than the one held. */
const considerCell = (
  grid: WalkabilityView,
  radiusClass: number,
  column: number,
  row: number,
  x: number,
  y: number,
): void => {
  if (isCellBlocked(grid, radiusClass, column, row)) {
    return;
  }

  const distanceSquared = distanceSquaredToCell(grid, column, row, x, y);

  if (distanceSquared < nearest.distanceSquared) {
    nearest.distanceSquared = distanceSquared;
    nearest.column = column;
    nearest.row = row;
  }
};

/**
 * Moves `point` to the nearest point of the open cell nearest to it on the class layer,
 * searching outward ring by ring from the cell under it in a fixed order and stopping once no
 * further ring can hold a closer cell. Returns whether any cell on the layer is open.
 */
const snapToNearestOpenCell = (
  grid: WalkabilityView,
  radiusClass: number,
  point: Vec2,
): boolean => {
  const x = point.x;
  const y = point.y;
  const centreColumn = clamp(columnOf(grid, x), 0, grid.columns - 1);
  const centreRow = clamp(rowOf(grid, y), 0, grid.rows - 1);
  const rings = Math.max(grid.columns, grid.rows);

  nearest.column = -1;
  nearest.row = -1;
  nearest.distanceSquared = Infinity;

  for (let ring = 0; ring <= rings; ring += 1) {
    const reach = (ring - 1) * grid.cellSize;

    if (
      nearest.column !== -1 &&
      reach > 0 &&
      reach * reach >= nearest.distanceSquared
    ) {
      break;
    }

    if (ring === 0) {
      considerCell(grid, radiusClass, centreColumn, centreRow, x, y);

      continue;
    }

    for (let offset = -ring; offset <= ring; offset += 1) {
      considerCell(
        grid,
        radiusClass,
        centreColumn + offset,
        centreRow - ring,
        x,
        y,
      );
      considerCell(
        grid,
        radiusClass,
        centreColumn + offset,
        centreRow + ring,
        x,
        y,
      );
    }

    for (let offset = -ring + 1; offset <= ring - 1; offset += 1) {
      considerCell(
        grid,
        radiusClass,
        centreColumn - ring,
        centreRow + offset,
        x,
        y,
      );
      considerCell(
        grid,
        radiusClass,
        centreColumn + ring,
        centreRow + offset,
        x,
        y,
      );
    }
  }

  if (nearest.column === -1) {
    return false;
  }

  const minX = grid.originX + nearest.column * grid.cellSize;
  const minY = grid.originY + nearest.row * grid.cellSize;

  point.x = clamp(x, minX, minX + grid.cellSize);
  point.y = clamp(y, minY, minY + grid.cellSize);

  return true;
};

/**
 * Writes into `out` the nearest legal destination to (`x`, `y`) for a unit of the radius
 * class: a point outside the map is clamped inside the bounds by the class radius, since the
 * bounds are walls; a point on an obstacle moves to the nearest edge of the obstacle inflated
 * by the class radius. When geometry leaves the point where no search can end, inside
 * overlapping inflations or in a cell the grid closes on every side, the point snaps to the
 * nearest open cell instead. Returns `out`.
 */
export const resolveDestination = (
  grid: WalkabilityView,
  radiusClass: number,
  bounds: Readonly<Rect>,
  obstacles: readonly Rect[],
  x: number,
  y: number,
  out: Vec2,
): Vec2 => {
  const radius = grid.classRadii[radiusClass];

  assert(
    radius !== undefined,
    "A destination resolves on a class the grid has",
  );

  out.x = clamp(x, bounds.minX + radius, bounds.maxX - radius);
  out.y = clamp(y, bounds.minY + radius, bounds.maxY - radius);

  let inside = false;

  for (let pass = 0; pass < PUSH_OUT_PASSES; pass += 1) {
    inside = false;

    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];

      if (obstacle !== undefined && pushPointOutOfRect(out, obstacle, radius)) {
        inside = true;
      }
    }

    if (!inside) {
      break;
    }
  }

  if (
    inside ||
    !isCellReachable(
      grid,
      radiusClass,
      columnOf(grid, out.x),
      rowOf(grid, out.y),
    )
  ) {
    snapToNearestOpenCell(grid, radiusClass, out);
  }

  return out;
};

/**
 * The legal point (`x`, `y`) resolves to for `unit` on the loaded map: a point on an obstacle
 * lands on its nearest walkable edge for the unit's radius class, a point outside the map on
 * the nearest point inside. Written into `out`.
 */
export const resolveDestinationFor = (
  world: World,
  unit: Readonly<Unit>,
  x: number,
  y: number,
  out: Vec2,
): Vec2 => {
  const grid = world.map.walkability;

  return resolveDestination(
    grid,
    radiusClassOf(grid, unit.collisionRadius),
    world.map.bounds,
    world.map.obstacles,
    x,
    y,
    out,
  );
};
