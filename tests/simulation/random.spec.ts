import { describe, expect, it } from "vitest";
import {
  createRandomState,
  nextFloat,
  nextInt,
  seedRandom,
} from "@simulation/public";

describe("random source", () => {
  it("produces the same sequence from the same seed", () => {
    const first = createRandomState(42);
    const second = createRandomState(42);

    const firstDraws = [nextFloat(first), nextFloat(first), nextFloat(first)];
    const secondDraws = [
      nextFloat(second),
      nextFloat(second),
      nextFloat(second),
    ];

    expect(firstDraws).toEqual(secondDraws);
  });

  it("produces different sequences from different seeds", () => {
    const first = createRandomState(1);
    const second = createRandomState(2);

    expect(nextFloat(first)).not.toBe(nextFloat(second));
  });

  it("keeps the seed and advances the state on every draw", () => {
    const random = createRandomState(7);
    const stateBefore = random.state;

    nextFloat(random);

    expect(random.seed).toBe(7);
    expect(random.state).not.toBe(stateBefore);
  });

  it("draws floats in [0, 1)", () => {
    const random = createRandomState(3);
    const draws = [nextFloat(random), nextFloat(random), nextFloat(random)];

    for (const draw of draws) {
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    }
  });

  it("draws integers in [0, bound)", () => {
    const random = createRandomState(5);
    const draws = [
      nextInt(random, 4),
      nextInt(random, 4),
      nextInt(random, 4),
      nextInt(random, 4),
    ];

    for (const draw of draws) {
      expect(Number.isInteger(draw)).toBe(true);
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(4);
    }
  });

  it("draws only zero when the bound is one", () => {
    const random = createRandomState(5);

    expect(nextInt(random, 1)).toBe(0);
  });

  it("refuses a bound below one", () => {
    const random = createRandomState(5);

    expect(() => nextInt(random, 0)).toThrow();
  });

  it("is not stuck on the seed zero", () => {
    const random = createRandomState(0);

    expect(nextFloat(random)).not.toBe(nextFloat(random));
  });

  it("restarts the sequence when reseeded in place", () => {
    const random = createRandomState(9);
    const firstDraw = nextFloat(random);
    nextFloat(random);

    seedRandom(random, 9);

    expect(nextFloat(random)).toBe(firstDraw);
  });
});
