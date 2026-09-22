import { shortestArc } from "@shared/public";
import type { ShapeDef } from "../definitions/effect-def";

/**
 * The exact test for the three areas an effect names: a circle by radius, a rectangle by its
 * length along a facing and its width across it, and a cone by its half angle and its length.
 * Every one is placed in the world — a centre or an apex, and for the two turned shapes a
 * facing — and answers one question about one point: is it covered.
 *
 * Pure arithmetic over plain numbers, so a caller tests a candidate the spatial hash proposed
 * without a world and a spec walks the boundaries without one either. The boundary counts as
 * covered in all three, so a unit standing exactly on the edge is hit. Beside them, the one
 * measure a definition's shape is read for without placing it: how far it reaches.
 */

/** A length or an angle given whole is used from the centre, which is half of it. */
const HALF = 2;

const RADIANS_PER_DEGREE = Math.PI / 180;

/** Half of the full angle a cone definition writes, in radians, which is what `coneCovers` takes. */
export const coneHalfAngle = (angleDegrees: number): number =>
  (angleDegrees * RADIANS_PER_DEGREE) / HALF;

/** Whether the point is within `radius` of the centre. */
export const circleCovers = (
  centreX: number,
  centreY: number,
  radius: number,
  x: number,
  y: number,
): boolean => {
  const dx = x - centreX;
  const dy = y - centreY;

  return dx * dx + dy * dy <= radius * radius;
};

/**
 * Whether the point is inside the rectangle centred on (`centreX`, `centreY`), `length` along
 * `facing` and `width` across it. The point is turned into the rectangle's own frame, where
 * the test is two comparisons against the half extents.
 */
export const rectangleCovers = (
  centreX: number,
  centreY: number,
  facing: number,
  length: number,
  width: number,
  x: number,
  y: number,
): boolean => {
  const dx = x - centreX;
  const dy = y - centreY;
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  const along = dx * cos + dy * sin;
  const across = dy * cos - dx * sin;

  return Math.abs(along) <= length / HALF && Math.abs(across) <= width / HALF;
};

/**
 * Whether the point is inside the cone with its apex at (`apexX`, `apexY`), opening
 * `halfAngle` either side of `facing` and reaching `length`. The apex itself is covered: it
 * is at no distance and every bearing from it is the facing.
 */
export const coneCovers = (
  apexX: number,
  apexY: number,
  facing: number,
  halfAngle: number,
  length: number,
  x: number,
  y: number,
): boolean => {
  const dx = x - apexX;
  const dy = y - apexY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > length * length) {
    return false;
  }

  if (distanceSquared === 0) {
    return true;
  }

  return Math.abs(shortestArc(facing, Math.atan2(dy, dx))) <= halfAngle;
};

/**
 * How far `shape` reaches from where it is placed: the radius of the smallest circle around
 * it. It is what a query asks the spatial hash for before the exact test narrows the answer,
 * and what a view asks to know whether the shape is on screen at all.
 */
export const shapeExtent = (shape: ShapeDef): number => {
  switch (shape.kind) {
    case "circle":
      return shape.radius;

    case "rectangle":
      return (
        Math.sqrt(shape.length * shape.length + shape.width * shape.width) /
        HALF
      );

    case "cone":
      return shape.length;
  }
};
