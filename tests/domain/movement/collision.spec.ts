import { describe, expect, it } from "vitest";
import { pushOutOfRect, separateDiscs } from "@domain/public";
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
