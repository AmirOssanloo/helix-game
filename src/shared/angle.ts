import type { Vec2 } from "./vec";

/** Angles are radians, counter-clockwise from +X, in the range [−π, π). */

const TWO_PI = Math.PI * 2;

/** `angle` folded into [−π, π). π itself wraps to −π, so the seam has one spelling. */
export const wrapAngle = (angle: number): number =>
  angle - TWO_PI * Math.floor((angle + Math.PI) / TWO_PI);

/** The signed turn from `from` to `to` the shorter way round. Its magnitude never exceeds π. */
export const shortestArc = (from: number, to: number): number =>
  wrapAngle(to - from);

/** The angle of the ray from `from` to `to`. Zero when the two points coincide. */
export const bearing = (from: Readonly<Vec2>, to: Readonly<Vec2>): number =>
  wrapAngle(Math.atan2(to.y - from.y, to.x - from.x));
