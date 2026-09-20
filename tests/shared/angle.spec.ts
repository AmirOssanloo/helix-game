import { describe, expect, it } from "vitest";
import { bearing, shortestArc, wrapAngle } from "@shared/public";

const PI = Math.PI;
const EPSILON = 1e-6;

describe("wrapAngle", () => {
  it.each([
    { angle: 0, wrapped: 0 },
    { angle: PI / 2, wrapped: PI / 2 },
    { angle: -PI / 2, wrapped: -PI / 2 },
    { angle: PI, wrapped: -PI },
    { angle: -PI, wrapped: -PI },
    { angle: PI + EPSILON, wrapped: -PI + EPSILON },
    { angle: -PI - EPSILON, wrapped: PI - EPSILON },
    { angle: 2 * PI, wrapped: 0 },
    { angle: -2 * PI, wrapped: 0 },
    { angle: 3 * PI, wrapped: -PI },
    { angle: -3 * PI, wrapped: -PI },
    { angle: 7 * PI + 0.5, wrapped: -PI + 0.5 },
  ])("folds $angle into [−π, π) as $wrapped", ({ angle, wrapped }) => {
    expect(wrapAngle(angle)).toBeCloseTo(wrapped, 12);
  });
});

describe("shortestArc", () => {
  it.each([
    { from: 0, to: PI / 2, arc: PI / 2 },
    { from: PI / 2, to: 0, arc: -PI / 2 },
    { from: (3 * PI) / 4, to: (-3 * PI) / 4, arc: PI / 2 },
    { from: (-3 * PI) / 4, to: (3 * PI) / 4, arc: -PI / 2 },
    { from: PI / 4, to: PI / 4, arc: 0 },
    { from: 0, to: 2 * PI, arc: 0 },
    { from: 0, to: PI, arc: -PI },
  ])("turns from $from to $to by $arc", ({ from, to, arc }) => {
    expect(shortestArc(from, to)).toBeCloseTo(arc, 12);
  });

  it.each([
    { from: 0, to: PI + EPSILON },
    { from: 0, to: -PI - EPSILON },
    { from: PI - EPSILON, to: -PI + EPSILON },
    { from: 5 * PI, to: -5 * PI },
    { from: 0.1, to: 0.1 + 3 * PI },
  ])("never turns more than π going from $from to $to", ({ from, to }) => {
    expect(Math.abs(shortestArc(from, to))).toBeLessThanOrEqual(PI);
  });
});

describe("bearing", () => {
  const origin = { x: 0, y: 0 };

  it.each([
    { from: origin, to: { x: 1, y: 0 }, angle: 0 },
    { from: origin, to: { x: 0, y: 1 }, angle: PI / 2 },
    { from: origin, to: { x: -1, y: 0 }, angle: -PI },
    { from: origin, to: { x: 0, y: -1 }, angle: -PI / 2 },
    { from: { x: 2, y: 2 }, to: { x: 3, y: 3 }, angle: PI / 4 },
    { from: { x: 5, y: -5 }, to: { x: 5, y: -5 }, angle: 0 },
  ])("points from $from to $to at $angle", ({ from, to, angle }) => {
    expect(bearing(from, to)).toBeCloseTo(angle, 12);
  });
});
