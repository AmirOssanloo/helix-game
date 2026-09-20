import { describe, expect, it } from "vitest";
import { clamp } from "@shared/public";

describe("clamp", () => {
  it.each([
    { value: 5, min: 0, max: 10, held: 5 },
    { value: 0, min: 0, max: 10, held: 0 },
    { value: 10, min: 0, max: 10, held: 10 },
    { value: -1, min: 0, max: 10, held: 0 },
    { value: 11, min: 0, max: 10, held: 10 },
    { value: 3, min: -2, max: -1, held: -1 },
  ])(
    "holds $value inside [$min, $max] as $held",
    ({ value, min, max, held }) => {
      expect(clamp(value, min, max)).toBe(held);
    },
  );
});
