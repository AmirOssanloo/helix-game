/**
 * Two-dimensional vector arithmetic without allocation. A function that produces a vector
 * writes into `out` and returns it, so a system keeps a few scratch vectors and reuses them
 * instead of creating one per operation. `out` may be one of the inputs.
 */

/** A mutable pair of coordinates. */
export type Vec2 = {
  x: number;
  y: number;
};

/** Writes `x` and `y` into `out`. The way a scratch vector is reset before use. */
export const set = (out: Vec2, x: number, y: number): Vec2 => {
  out.x = x;
  out.y = y;

  return out;
};

export const add = (a: Readonly<Vec2>, b: Readonly<Vec2>, out: Vec2): Vec2 => {
  out.x = a.x + b.x;
  out.y = a.y + b.y;

  return out;
};

export const sub = (a: Readonly<Vec2>, b: Readonly<Vec2>, out: Vec2): Vec2 => {
  out.x = a.x - b.x;
  out.y = a.y - b.y;

  return out;
};

export const scale = (v: Readonly<Vec2>, factor: number, out: Vec2): Vec2 => {
  out.x = v.x * factor;
  out.y = v.y * factor;

  return out;
};

export const length = (v: Readonly<Vec2>): number =>
  Math.sqrt(v.x * v.x + v.y * v.y);

/** The unit vector along `v`, or zero when `v` is zero, since a zero vector points nowhere. */
export const normalize = (v: Readonly<Vec2>, out: Vec2): Vec2 => {
  const magnitude = length(v);

  if (magnitude === 0) {
    return set(out, 0, 0);
  }

  return scale(v, 1 / magnitude, out);
};

export const dot = (a: Readonly<Vec2>, b: Readonly<Vec2>): number =>
  a.x * b.x + a.y * b.y;

/** The squared distance, so a comparison against a radius needs no square root. */
export const distanceSquared = (
  a: Readonly<Vec2>,
  b: Readonly<Vec2>,
): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return dx * dx + dy * dy;
};
