import type { Rect } from "@shared/public";

/**
 * How far inside an inflated rectangle a segment may run and still count as clear. Collision
 * leaves a disc touching a wall at exactly its radius, and floating arithmetic can put that
 * touch a rounding error inside; without this hair, a unit standing against a wall would have
 * no line of sight along it.
 */
const TOUCH_TOLERANCE = 1e-6;

/**
 * Whether the segment from (`ax`, `ay`) to (`bx`, `by`) enters the open rectangle `rect`
 * inflated by `inflation` on every side. The slab test: the segment is clipped to each axis's
 * interval in turn, and it crosses when a positive length of it survives both. Touching an
 * edge, sliding along it, or passing exactly through a corner is not a crossing.
 */
export const segmentCrossesRect = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: Readonly<Rect>,
  inflation: number,
): boolean => {
  const minX = rect.minX - inflation + TOUCH_TOLERANCE;
  const maxX = rect.maxX + inflation - TOUCH_TOLERANCE;
  const minY = rect.minY - inflation + TOUCH_TOLERANCE;
  const maxY = rect.maxY + inflation - TOUCH_TOLERANCE;

  if (minX >= maxX || minY >= maxY) {
    return false;
  }

  const dx = bx - ax;
  const dy = by - ay;
  let enter = 0;
  let exit = 1;

  if (dx === 0) {
    if (ax <= minX || ax >= maxX) {
      return false;
    }
  } else {
    const first = (minX - ax) / dx;
    const second = (maxX - ax) / dx;

    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }

  if (dy === 0) {
    if (ay <= minY || ay >= maxY) {
      return false;
    }
  } else {
    const first = (minY - ay) / dy;
    const second = (maxY - ay) / dy;

    enter = Math.max(enter, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }

  return enter < exit;
};

/**
 * Whether a disc of `radius` can walk straight from (`ax`, `ay`) to (`bx`, `by`) without
 * overlapping an obstacle: the segment crosses none of the rectangles inflated by the radius.
 * The bounds are not tested; both ends lie inside them, and so does everything between.
 */
export const hasLineOfSight = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
  obstacles: readonly Rect[],
): boolean => {
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];

    if (
      obstacle !== undefined &&
      segmentCrossesRect(ax, ay, bx, by, obstacle, radius)
    ) {
      return false;
    }
  }

  return true;
};
