import { describe, expect, it } from "vitest";
import {
  circleCovers,
  coneCovers,
  coneHalfAngle,
  rectangleCovers,
} from "@domain/public";

/** A quarter turn, which is what every spec here places a shape at when it is not facing +X. */
const QUARTER_TURN = Math.PI / 2;

/** The shapes every case below is measured against. */
const RADIUS = 100;
const LENGTH = 400;
const WIDTH = 200;
const FULL_ANGLE = 90;

describe("circleCovers", () => {
  it("covers the centre and a point at the radius, and not one past it", () => {
    expect(circleCovers(0, 0, RADIUS, 0, 0)).toBe(true);
    expect(circleCovers(0, 0, RADIUS, RADIUS, 0)).toBe(true);
    expect(circleCovers(0, 0, RADIUS, RADIUS + 1, 0)).toBe(false);
  });

  it("measures from its own centre in every direction", () => {
    expect(circleCovers(500, -500, RADIUS, 500, -500 - RADIUS)).toBe(true);
    expect(circleCovers(500, -500, RADIUS, 500, -500 - RADIUS - 1)).toBe(false);
  });

  it("covers a point on the diagonal only inside the radius, not inside the square", () => {
    expect(circleCovers(0, 0, RADIUS, RADIUS, RADIUS)).toBe(false);
  });
});

describe("rectangleCovers", () => {
  it("covers its own corner and not a point just outside it", () => {
    expect(rectangleCovers(0, 0, 0, LENGTH, WIDTH, LENGTH / 2, WIDTH / 2)).toBe(
      true,
    );
    expect(
      rectangleCovers(0, 0, 0, LENGTH, WIDTH, LENGTH / 2 + 1, WIDTH / 2),
    ).toBe(false);
    expect(
      rectangleCovers(0, 0, 0, LENGTH, WIDTH, LENGTH / 2, WIDTH / 2 + 1),
    ).toBe(false);
  });

  it("reaches half its length behind the centre as well as in front", () => {
    expect(rectangleCovers(0, 0, 0, LENGTH, WIDTH, -LENGTH / 2, 0)).toBe(true);
    expect(rectangleCovers(0, 0, 0, LENGTH, WIDTH, -LENGTH / 2 - 1, 0)).toBe(
      false,
    );
  });

  it("turns with its facing, so length and width swap at a quarter turn", () => {
    expect(
      rectangleCovers(0, 0, QUARTER_TURN, LENGTH, WIDTH, 0, LENGTH / 2),
    ).toBe(true);
    expect(
      rectangleCovers(0, 0, QUARTER_TURN, LENGTH, WIDTH, LENGTH / 2, 0),
    ).toBe(false);
  });
});

describe("coneCovers", () => {
  const halfAngle = coneHalfAngle(FULL_ANGLE);

  it("takes half of the angle a definition writes, in radians", () => {
    expect(halfAngle).toBeCloseTo(Math.PI / 4);
  });

  it("covers its apex, where every bearing is the facing", () => {
    expect(coneCovers(0, 0, 0, halfAngle, LENGTH, 0, 0)).toBe(true);
  });

  it("covers a point at its length along the facing and not one past it", () => {
    expect(coneCovers(0, 0, 0, halfAngle, LENGTH, LENGTH, 0)).toBe(true);
    expect(coneCovers(0, 0, 0, halfAngle, LENGTH, LENGTH + 1, 0)).toBe(false);
  });

  it("covers a point on the edge of its angle and not one outside it", () => {
    expect(coneCovers(0, 0, 0, halfAngle, LENGTH, 100, 100)).toBe(true);
    expect(coneCovers(0, 0, 0, halfAngle, LENGTH, 100, 101)).toBe(false);
  });

  it("turns with its facing and reaches only forward of it", () => {
    expect(coneCovers(0, 0, QUARTER_TURN, halfAngle, LENGTH, 0, 100)).toBe(
      true,
    );
    expect(coneCovers(0, 0, QUARTER_TURN, halfAngle, LENGTH, 0, -100)).toBe(
      false,
    );
  });
});
