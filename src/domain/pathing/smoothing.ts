import type { Rect } from "@shared/public";
import { assert } from "@shared/public";
import type { Path } from "../entities/unit";
import { PATH_CAPACITY } from "../entities/unit";
import type { WalkabilityView } from "../map/walkability";
import {
  cellCentreX,
  cellCentreY,
  columnOfIndex,
  rowOfIndex,
} from "../map/walkability";
import { hasLineOfSight } from "./line-of-sight";

/** The x of the waypoint the search's `index`th cell stands for: its centre, or the destination itself for the last. */
const candidateX = (
  grid: WalkabilityView,
  cells: ArrayLike<number>,
  cellCount: number,
  index: number,
  goalX: number,
): number => {
  if (index >= cellCount - 1) {
    return goalX;
  }

  return cellCentreX(grid, columnOfIndex(grid, cells[index] ?? 0));
};

/** The y of the waypoint the search's `index`th cell stands for: its centre, or the destination itself for the last. */
const candidateY = (
  grid: WalkabilityView,
  cells: ArrayLike<number>,
  cellCount: number,
  index: number,
  goalY: number,
): number => {
  if (index >= cellCount - 1) {
    return goalY;
  }

  return cellCentreY(grid, rowOfIndex(grid, cells[index] ?? 0));
};

/**
 * Writes into `path` the waypoints a unit of `radius` walks from (`startX`, `startY`) along
 * the search's cells to (`goalX`, `goalY`), dropping every cell centre the unit can walk
 * straight past: from each waypoint, the next is the furthest candidate in line of sight, so
 * a path across an open room is one segment and a path around a corner turns once at it. The
 * step to the very next candidate is always taken when nothing further is visible, since a
 * step between neighbouring open cells is walkable by construction. A path longer than the
 * buffer holds is cut at the buffer; the unit plans again from its last waypoint.
 */
export const writeSmoothedPath = (
  path: Path,
  grid: WalkabilityView,
  cells: ArrayLike<number>,
  cellCount: number,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  radius: number,
  obstacles: readonly Rect[],
): void => {
  const candidates = Math.max(cellCount, 1);
  let fromX = startX;
  let fromY = startY;
  let next = 0;

  path.count = 0;
  path.next = 0;

  while (next < candidates && path.count < PATH_CAPACITY) {
    let chosen = next;

    for (let index = candidates - 1; index > next; index -= 1) {
      const x = candidateX(grid, cells, cellCount, index, goalX);
      const y = candidateY(grid, cells, cellCount, index, goalY);

      if (hasLineOfSight(fromX, fromY, x, y, radius, obstacles)) {
        chosen = index;

        break;
      }
    }

    const point = path.points[path.count];

    assert(
      point !== undefined,
      "The path buffer has a slot below its capacity",
    );

    point.x = candidateX(grid, cells, cellCount, chosen, goalX);
    point.y = candidateY(grid, cells, cellCount, chosen, goalY);
    path.count += 1;
    fromX = point.x;
    fromY = point.y;
    next = chosen + 1;
  }
};
