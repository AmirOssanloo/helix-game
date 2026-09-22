import { describe, expect, it } from "vitest";
import { NO_CONTACT, sweepDisc } from "@domain/public";

/** The segment every case sweeps along, unless it says another: a hundred units east of the origin. */
const LENGTH = 100;

/** The disc that flies, and the disc that stands. A point projectile is the one with no radius. */
const FLYING_RADIUS = 6;
const STILL_RADIUS = 24;

/** The reach of the two together: where their edges meet is where they touch. */
const REACH = FLYING_RADIUS + STILL_RADIUS;

/** Sweeps the standard segment against a still disc at (`x`, `y`) of `radius`. */
const sweep = (x: number, y: number, radius = STILL_RADIUS): number =>
  sweepDisc(0, 0, LENGTH, 0, FLYING_RADIUS, x, y, radius);

describe("sweeping a disc along a segment", () => {
  it("touches a disc on the line at the fraction where their edges meet", () => {
    expect(sweep(LENGTH / 2, 0)).toBeCloseTo((LENGTH / 2 - REACH) / LENGTH);
  });

  it("touches a disc beside the line where it reaches across", () => {
    const off = REACH / 2;
    const along = LENGTH / 2 - Math.sqrt(REACH * REACH - off * off);

    expect(sweep(LENGTH / 2, off)).toBeCloseTo(along / LENGTH);
  });

  it("grazes a disc exactly a reach off the line", () => {
    expect(sweep(LENGTH / 2, REACH)).toBeCloseTo(LENGTH / 2 / LENGTH);
  });

  it("misses a disc a hair further off the line than it reaches", () => {
    expect(sweep(LENGTH / 2, REACH + 0.001)).toBe(NO_CONTACT);
  });

  it("touches at the start of the segment when it begins inside the disc", () => {
    expect(sweep(0, 0)).toBe(0);
  });

  it("touches at the start when it begins exactly touching", () => {
    expect(sweep(REACH, 0)).toBe(0);
  });

  it("reaches a disc whose edge is exactly at the end of the segment", () => {
    expect(sweep(LENGTH + REACH, 0)).toBeCloseTo(1);
  });

  it("misses a disc just past the end of the segment", () => {
    expect(sweep(LENGTH + REACH + 0.001, 0)).toBe(NO_CONTACT);
  });

  it("misses a disc behind the start of the segment", () => {
    expect(sweep(-REACH - 0.001, 0)).toBe(NO_CONTACT);
  });

  it("misses everything it does not already touch when it does not move", () => {
    expect(sweepDisc(0, 0, 0, 0, FLYING_RADIUS, 50, 0, STILL_RADIUS)).toBe(
      NO_CONTACT,
    );
    expect(sweepDisc(0, 0, 0, 0, FLYING_RADIUS, 0, 0, STILL_RADIUS)).toBe(0);
  });

  it("hits the nearer of two discs on the line at the earlier fraction", () => {
    expect(sweep(40, 0)).toBeLessThan(sweep(80, 0));
  });

  it("passes a disc of no size that the line misses, and hits one it crosses", () => {
    expect(sweepDisc(0, 0, LENGTH, 0, 0, LENGTH / 2, 0.001, 0)).toBe(
      NO_CONTACT,
    );
    expect(sweepDisc(0, 0, LENGTH, 0, 0, LENGTH / 2, 0, 0)).toBeCloseTo(0.5);
  });
});
