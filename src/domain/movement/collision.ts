import type { Rect, Vec2 } from "@shared/public";

/**
 * The angle between one coincident pair's separation and the next's. The golden angle never
 * repeats a direction for a small seed, so a pile dropped on one point fans out around the
 * point instead of lining every pair up on one axis.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Moves two discs apart when they overlap: along the line between their centres, each by half
 * the overlap, so afterwards they just touch. Neither disc's speed or facing is involved; this
 * is a positional correction. Two discs on the same point have no centre line, so they separate
 * along a direction `tieSeed` fixes, which keeps a replay exact and a pile spreading.
 *
 * Returns whether the discs overlapped.
 */
export const separateDiscs = (
  a: Vec2,
  radiusA: number,
  b: Vec2,
  radiusB: number,
  tieSeed: number,
): boolean => {
  const minimum = radiusA + radiusB;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared >= minimum * minimum) {
    return false;
  }

  let directionX = Math.cos(tieSeed * GOLDEN_ANGLE);
  let directionY = Math.sin(tieSeed * GOLDEN_ANGLE);
  let overlap = minimum;

  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);

    directionX = dx / distance;
    directionY = dy / distance;
    overlap = minimum - distance;
  }

  const push = overlap / 2;

  a.x -= directionX * push;
  a.y -= directionY * push;
  b.x += directionX * push;
  b.y += directionY * push;

  return true;
};

/** Whether the point lies on or inside the rectangle. A point on an edge counts as inside, since it has no nearest outside point. */
const isInside = (x: number, y: number, rect: Readonly<Rect>): boolean =>
  x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;

/**
 * Moves a disc out of a rectangle it overlaps, so afterwards it just touches. A disc whose
 * centre is inside leaves by the nearest edge; an equal distance to two edges is broken in the
 * fixed order left, right, top, bottom. A disc whose centre is outside but within its radius of
 * the rectangle moves straight away from the nearest point on the rectangle, which past a
 * corner is the corner itself.
 *
 * Returns whether the disc overlapped.
 */
export const pushOutOfRect = (
  centre: Vec2,
  radius: number,
  rect: Readonly<Rect>,
): boolean => {
  if (isInside(centre.x, centre.y, rect)) {
    const toLeft = centre.x - rect.minX;
    const toRight = rect.maxX - centre.x;
    const toTop = centre.y - rect.minY;
    const toBottom = rect.maxY - centre.y;

    if (toLeft <= toRight && toLeft <= toTop && toLeft <= toBottom) {
      centre.x = rect.minX - radius;
    } else if (toRight <= toTop && toRight <= toBottom) {
      centre.x = rect.maxX + radius;
    } else if (toTop <= toBottom) {
      centre.y = rect.minY - radius;
    } else {
      centre.y = rect.maxY + radius;
    }

    return true;
  }

  const nearestX = Math.min(Math.max(centre.x, rect.minX), rect.maxX);
  const nearestY = Math.min(Math.max(centre.y, rect.minY), rect.maxY);
  const dx = centre.x - nearestX;
  const dy = centre.y - nearestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared >= radius * radius) {
    return false;
  }

  const distance = Math.sqrt(distanceSquared);

  centre.x = nearestX + (dx / distance) * radius;
  centre.y = nearestY + (dy / distance) * radius;

  return true;
};
