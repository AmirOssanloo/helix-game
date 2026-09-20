import { describe, expect, it } from "vitest";
import { isInsideCone, turnToward } from "@domain/public";

const TWO_PI = Math.PI * 2;

describe("turnToward", () => {
  it.each([
    ["the first tick of a three-tick ramp", 0, 0.2],
    ["the second tick of a three-tick ramp", 1, 0.4],
    ["the third tick, where the ramp reaches the full rate", 2, 0.6],
    ["a later tick, never above the full rate", 5, 0.6],
  ])("steps by the ramped rate on %s", (_name, turnTicks, expected) => {
    expect(turnToward(0, 2, 0.6, 3, turnTicks)).toBeCloseTo(expected);
  });

  it("steps by the full rate on the first tick when the ramp is one tick", () => {
    expect(turnToward(0, 2, 0.6, 1, 0)).toBeCloseTo(0.6);
  });

  it("steps by the full rate on the first tick when the ramp is zero ticks", () => {
    expect(turnToward(0, 2, 0.6, 0, 0)).toBeCloseTo(0.6);
  });

  it("lands exactly on the target when the remaining arc is inside the step, never past it", () => {
    expect(turnToward(0, 0.5, 0.6, 1, 0)).toBe(0.5);
  });

  it("lands on the target when the remaining arc equals the step", () => {
    expect(turnToward(0, 0.6, 0.6, 1, 0)).toBe(0.6);
  });

  it("turns the negative way when the target is clockwise", () => {
    expect(turnToward(0, -2, 0.6, 1, 0)).toBeCloseTo(-0.6);
  });

  it("takes the shorter arc across the seam at ±π", () => {
    expect(turnToward(3, -2.5, 0.6, 1, 0)).toBeCloseTo(3.6 - TWO_PI);
  });

  it("leaves a facing that already matches the target where it is", () => {
    expect(turnToward(1.25, 1.25, 0.6, 3, 0)).toBe(1.25);
  });

  it("turns toward an exact about-face without overshooting it", () => {
    let facing = 0;

    for (let tick = 0; tick < 10; tick += 1) {
      facing = turnToward(facing, -Math.PI, 0.6, 3, tick);
    }

    expect(facing).toBe(-Math.PI);
  });
});

describe("isInsideCone", () => {
  it.each([
    ["a bearing well inside the cone", 0, 0.1, 0.2, true],
    ["a bearing on the boundary", 0, 0.2, 0.2, true],
    ["a bearing just outside the cone", 0, 0.21, 0.2, false],
    ["a bearing on the other side of the seam", -3.1, 3.1, 0.2, true],
    ["a bearing behind the unit", 0, Math.PI, 0.2, false],
  ])("decides %s", (_name, facing, toTarget, halfAngle, expected) => {
    expect(isInsideCone(facing, toTarget, halfAngle)).toBe(expected);
  });
});
