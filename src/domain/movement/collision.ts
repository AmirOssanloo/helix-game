import type { Rect, Vec2 } from "@shared/public";

/**
 * The angle between one coincident pair's separation and the next's. The golden angle never
 * repeats a direction for a small seed, so a pile dropped on one point fans out around the
 * point instead of lining every pair up on one axis.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Moves two discs apart when they overlap, along the line between their centres, `a` by
 * `shareA` of the overlap and `b` by the rest, so afterwards they just touch. Two discs on the
 * same point have no centre line, so they separate along a direction `tieSeed` fixes.
 */
const separate = (
  a: Vec2,
  radiusA: number,
  b: Vec2,
  radiusB: number,
  tieSeed: number,
  shareA: number,
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

  const pushA = overlap * shareA;
  const pushB = overlap - pushA;

  a.x -= directionX * pushA;
  a.y -= directionY * pushA;
  b.x += directionX * pushB;
  b.y += directionY * pushB;

  return true;
};

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
): boolean => separate(a, radiusA, b, radiusB, tieSeed, 0.5);

/**
 * Moves the disc `moving` out of the disc `held` when they overlap, by the whole overlap along
 * the line between their centres, and leaves `held` where it is: a unit in the air is a disc
 * nothing moves. A pair on one point separates along the direction `tieSeed` fixes, as
 * `separateDiscs` does.
 *
 * Returns whether the discs overlapped.
 */
export const separateFromHeld = (
  moving: Vec2,
  radiusMoving: number,
  held: Vec2,
  radiusHeld: number,
  tieSeed: number,
): boolean => separate(moving, radiusMoving, held, radiusHeld, tieSeed, 1);

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

/**
 * Moves a disc back inside a rectangle it has crossed the edge of, so afterwards it just
 * touches the edge from the inside: the bounds are walls. Each axis is clamped on its own, so
 * a disc past a corner returns to the corner.
 *
 * Returns whether the disc was outside.
 */
export const keepInsideRect = (
  centre: Vec2,
  radius: number,
  rect: Readonly<Rect>,
): boolean => {
  let moved = false;

  if (centre.x < rect.minX + radius) {
    centre.x = rect.minX + radius;
    moved = true;
  } else if (centre.x > rect.maxX - radius) {
    centre.x = rect.maxX - radius;
    moved = true;
  }

  if (centre.y < rect.minY + radius) {
    centre.y = rect.minY + radius;
    moved = true;
  } else if (centre.y > rect.maxY - radius) {
    centre.y = rect.maxY - radius;
    moved = true;
  }

  return moved;
};
