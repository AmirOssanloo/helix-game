import { describe, expect, it } from "vitest";
import type { Vec2 } from "@shared/public";
import {
  add,
  distanceSquared,
  dot,
  length,
  normalize,
  scale,
  set,
  sub,
} from "@shared/public";

const vec = (x: number, y: number): Vec2 => ({ x, y });

describe("set", () => {
  it("writes both coordinates into the target and returns it", () => {
    const out = vec(9, 9);

    const result = set(out, 1, -2);

    expect(result).toBe(out);
    expect(out).toEqual({ x: 1, y: -2 });
  });
});

describe("add", () => {
  it.each([
    { a: vec(1, 2), b: vec(3, 4), sum: vec(4, 6) },
    { a: vec(0, 0), b: vec(0, 0), sum: vec(0, 0) },
    { a: vec(-1.5, 2), b: vec(1.5, -2), sum: vec(0, 0) },
  ])("writes $a plus $b as $sum into the target", ({ a, b, sum }) => {
    const out = vec(0, 0);

    const result = add(a, b, out);

    expect(result).toBe(out);
    expect(out).toEqual(sum);
  });

  it("accepts the target as an input", () => {
    const a = vec(1, 2);

    add(a, a, a);

    expect(a).toEqual({ x: 2, y: 4 });
  });
});

describe("sub", () => {
  it.each([
    { a: vec(3, 4), b: vec(1, 2), difference: vec(2, 2) },
    { a: vec(1, 2), b: vec(3, 4), difference: vec(-2, -2) },
    { a: vec(1, 1), b: vec(1, 1), difference: vec(0, 0) },
  ])(
    "writes $a minus $b as $difference into the target",
    ({ a, b, difference }) => {
      const out = vec(0, 0);

      const result = sub(a, b, out);

      expect(result).toBe(out);
      expect(out).toEqual(difference);
    },
  );
});

describe("scale", () => {
  it.each([
    { v: vec(1, -2), factor: 3, scaled: vec(3, -6) },
    { v: vec(1, 2), factor: 0, scaled: vec(0, 0) },
    { v: vec(4, 6), factor: 0.5, scaled: vec(2, 3) },
    { v: vec(1, 1), factor: -1, scaled: vec(-1, -1) },
  ])(
    "writes $v times $factor as $scaled into the target",
    ({ v, factor, scaled }) => {
      const out = vec(0, 0);

      const result = scale(v, factor, out);

      expect(result).toBe(out);
      expect(out).toEqual(scaled);
    },
  );
});

describe("length", () => {
  it.each([
    { v: vec(3, 4), magnitude: 5 },
    { v: vec(0, 0), magnitude: 0 },
    { v: vec(-1, 0), magnitude: 1 },
    { v: vec(0, -2), magnitude: 2 },
  ])("measures $v as $magnitude", ({ v, magnitude }) => {
    expect(length(v)).toBe(magnitude);
  });
});

describe("normalize", () => {
  it("writes the unit vector along the input into the target", () => {
    const out = vec(0, 0);

    const result = normalize(vec(3, 4), out);

    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(0.6, 12);
    expect(out.y).toBeCloseTo(0.8, 12);
  });

  it("leaves a unit vector as it is", () => {
    const out = vec(0, 0);

    normalize(vec(0, -1), out);

    expect(out).toEqual({ x: 0, y: -1 });
  });

  it("writes zero for the zero vector instead of dividing by zero", () => {
    const out = vec(5, 5);

    normalize(vec(0, 0), out);

    expect(out).toEqual({ x: 0, y: 0 });
  });
});

describe("dot", () => {
  it.each([
    { a: vec(1, 0), b: vec(0, 1), product: 0 },
    { a: vec(2, 3), b: vec(4, 5), product: 23 },
    { a: vec(1, 0), b: vec(-1, 0), product: -1 },
    { a: vec(0, 0), b: vec(7, 7), product: 0 },
  ])("multiplies $a and $b to $product", ({ a, b, product }) => {
    expect(dot(a, b)).toBe(product);
  });
});

describe("distanceSquared", () => {
  it.each([
    { a: vec(0, 0), b: vec(3, 4), squared: 25 },
    { a: vec(3, 4), b: vec(0, 0), squared: 25 },
    { a: vec(1, 1), b: vec(1, 1), squared: 0 },
    { a: vec(-1, -1), b: vec(1, 1), squared: 8 },
  ])("measures $a to $b as $squared", ({ a, b, squared }) => {
    expect(distanceSquared(a, b)).toBe(squared);
  });
});
