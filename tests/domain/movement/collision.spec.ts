import { describe, expect, it } from "vitest";
import {
  keepInsideRect,
  pushOutOfRect,
  separateDiscs,
  separateFromHeld,
} from "@domain/public";
import type { Rect, Vec2 } from "@shared/public";

const HULL = 27;

/** The rectangle every push-out case stands against: 200 wide from x 100, 400 tall from y 0. */
const WALL: Rect = { minX: 100, minY: 0, maxX: 300, maxY: 400 };

const at = (x: number, y: number): Vec2 => ({ x, y });

const distance = (a: Readonly<Vec2>, b: Readonly<Vec2>): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

describe("separateDiscs", () => {
  it("pushes an overlapping pair apart half each along the centre line", () => {
    const a = at(0, 0);
    const b = at(40, 0);

    const overlapped = separateDiscs(a, HULL, b, HULL, 0);

    expect(overlapped).toBe(true);
    expect(a).toEqual({ x: -7, y: 0 });
    expect(b).toEqual({ x: 47, y: 0 });
  });

  it("leaves a pair resting at exactly the sum of their radii", () => {
    const a = at(0, 0);
    const b = at(54, 0);

    const overlapped = separateDiscs(a, HULL, b, HULL, 0);

    expect(overlapped).toBe(false);
    expect(a).toEqual({ x: 0, y: 0 });
    expect(b).toEqual({ x: 54, y: 0 });
  });

  it("leaves a pair further apart than their radii", () => {
    const a = at(0, 0);
    const b = at(60, 0);

    expect(separateDiscs(a, HULL, b, HULL, 0)).toBe(false);
    expect(a).toEqual({ x: 0, y: 0 });
    expect(b).toEqual({ x: 60, y: 0 });
  });

  it("separates a diagonal pair along the line between their centres until they touch", () => {
    const a = at(0, 0);
    const b = at(30, 40);

    separateDiscs(a, HULL, b, HULL, 0);

    expect(a.x).toBeCloseTo(-1.2);
    expect(a.y).toBeCloseTo(-1.6);
    expect(b.x).toBeCloseTo(31.2);
    expect(b.y).toBeCloseTo(41.6);
    expect(distance(a, b)).toBeCloseTo(54);
  });

  it("uses each disc's own radius, still moving each by half the overlap", () => {
    const a = at(0, 0);
    const b = at(20, 0);

    separateDiscs(a, 10, b, 30, 0);

    expect(a).toEqual({ x: -10, y: 0 });
    expect(b).toEqual({ x: 30, y: 0 });
  });

  it("separates a pair on the same point along +X when the tie seed is zero", () => {
    const a = at(5, 5);
    const b = at(5, 5);

    separateDiscs(a, HULL, b, HULL, 0);

    expect(a).toEqual({ x: 5 - HULL, y: 5 });
    expect(b).toEqual({ x: 5 + HULL, y: 5 });
  });

  it("separates a pair on the same point along a different direction for a different tie seed, still until they touch", () => {
    const a = at(5, 5);
    const b = at(5, 5);

    separateDiscs(a, HULL, b, HULL, 1);

    expect(distance(a, b)).toBeCloseTo(54);
    expect(a.y).not.toBe(5);
  });
});

describe("separateFromHeld", () => {
  it("moves the grounded disc the whole overlap and leaves the held one where it is", () => {
    const moving = at(40, 0);
    const held = at(0, 0);

    const overlapped = separateFromHeld(moving, HULL, held, HULL, 0);

    expect(overlapped).toBe(true);
    expect(held).toEqual({ x: 0, y: 0 });
    expect(moving).toEqual({ x: 54, y: 0 });
  });

  it("leaves a pair that does not overlap alone", () => {
    const moving = at(60, 0);
    const held = at(0, 0);

    expect(separateFromHeld(moving, HULL, held, HULL, 0)).toBe(false);
    expect(moving).toEqual({ x: 60, y: 0 });
  });

  it("moves a disc on the held one's point out by the whole reach, along the tie seed's direction", () => {
    const moving = at(5, 5);
    const held = at(5, 5);

    separateFromHeld(moving, HULL, held, HULL, 0);

    expect(held).toEqual({ x: 5, y: 5 });
    expect(distance(moving, held)).toBeCloseTo(HULL + HULL);
  });
});

describe("pushOutOfRect", () => {
  it("leaves a disc clear of the rectangle where it is", () => {
    const centre = at(50, 50);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(false);
    expect(centre).toEqual({ x: 50, y: 50 });
  });

  it("leaves a disc just touching an edge where it is", () => {
    const centre = at(73, 50);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(false);
    expect(centre).toEqual({ x: 73, y: 50 });
  });

  it("moves a disc whose centre is inside out by its nearest edge, to just touching", () => {
    const centre = at(110, 50);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(true);
    expect(centre).toEqual({ x: 73, y: 50 });
  });

  it("moves a disc straddling a corner out by the nearer of the two edges", () => {
    const nearerLeft = at(105, 8);
    const nearerTop = at(108, 5);

    pushOutOfRect(nearerLeft, HULL, WALL);
    pushOutOfRect(nearerTop, HULL, WALL);

    expect(nearerLeft).toEqual({ x: 73, y: 8 });
    expect(nearerTop).toEqual({ x: 108, y: -27 });
  });

  it("breaks an equal distance to two edges in the fixed order left, right, top, bottom", () => {
    const leftOrTop = at(110, 10);
    const rightOrBottom = at(290, 390);

    pushOutOfRect(leftOrTop, HULL, WALL);
    pushOutOfRect(rightOrBottom, HULL, WALL);

    expect(leftOrTop).toEqual({ x: 73, y: 10 });
    expect(rightOrBottom).toEqual({ x: 327, y: 390 });
  });

  it("moves a disc whose centre is on an edge out by that edge", () => {
    const centre = at(100, 50);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(true);
    expect(centre).toEqual({ x: 73, y: 50 });
  });

  it("moves a disc overlapping an edge from outside straight back until it touches", () => {
    const centre = at(90, 50);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(true);
    expect(centre).toEqual({ x: 73, y: 50 });
  });

  it("moves a disc overlapping a corner from outside away from the corner along the diagonal", () => {
    const centre = at(94, -8);

    expect(pushOutOfRect(centre, HULL, WALL)).toBe(true);
    expect(centre.x).toBeCloseTo(83.8);
    expect(centre.y).toBeCloseTo(-21.6);
  });
});

describe("keepInsideRect", () => {
  const BOUNDS: Rect = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };

  it("leaves a disc that is inside where it is", () => {
    const centre = at(500, 500);

    const moved = keepInsideRect(centre, HULL, BOUNDS);

    expect(moved).toBe(false);
    expect(centre).toEqual({ x: 500, y: 500 });
  });

  it("leaves a disc touching the edge from the inside where it is", () => {
    const centre = at(HULL, 500);

    const moved = keepInsideRect(centre, HULL, BOUNDS);

    expect(moved).toBe(false);
    expect(centre).toEqual({ x: HULL, y: 500 });
  });

  it("brings a disc past an edge back to touching it", () => {
    const centre = at(1010, 500);

    const moved = keepInsideRect(centre, HULL, BOUNDS);

    expect(moved).toBe(true);
    expect(centre).toEqual({ x: 1000 - HULL, y: 500 });
  });

  it("brings a disc past a corner back on both axes", () => {
    const centre = at(-40, 1200);

    const moved = keepInsideRect(centre, HULL, BOUNDS);

    expect(moved).toBe(true);
    expect(centre).toEqual({ x: HULL, y: 1000 - HULL });
  });
});
