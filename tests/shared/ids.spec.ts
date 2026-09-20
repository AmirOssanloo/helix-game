import { describe, expect, it } from "vitest";
import {
  GENERATION_BITS,
  INDEX_BITS,
  MAX_GENERATION,
  MAX_INDEX,
  nextGeneration,
  packId,
  unpackGeneration,
  unpackIndex,
} from "@shared/public";

describe("packId", () => {
  it.each([
    { index: 0, generation: 0 },
    { index: 511, generation: 1 },
    { index: 7, generation: 3 },
    { index: MAX_INDEX, generation: 0 },
    { index: 0, generation: MAX_GENERATION },
    { index: MAX_INDEX, generation: MAX_GENERATION },
  ])(
    "packs index $index and generation $generation so both unpack unchanged",
    ({ index, generation }) => {
      const id = packId(index, generation);

      expect(unpackIndex(id)).toBe(index);
      expect(unpackGeneration(id)).toBe(generation);
    },
  );

  it("changes the id when the generation of the same slot is bumped", () => {
    const before = packId(42, 1);

    const after = packId(42, nextGeneration(1));

    expect(after).not.toBe(before);
    expect(unpackIndex(after)).toBe(unpackIndex(before));
  });

  it("gives distinct slots distinct ids in the same generation", () => {
    expect(packId(1, 0)).not.toBe(packId(2, 0));
  });

  it("stays a non-negative integer at the largest index and generation", () => {
    const id = packId(MAX_INDEX, MAX_GENERATION);

    expect(Number.isSafeInteger(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(2 ** (INDEX_BITS + GENERATION_BITS));
  });

  it.each([
    { index: -1, generation: 0 },
    { index: MAX_INDEX + 1, generation: 0 },
    { index: 0, generation: -1 },
    { index: 0, generation: MAX_GENERATION + 1 },
  ])(
    "refuses index $index and generation $generation outside the bit split",
    ({ index, generation }) => {
      expect(() => packId(index, generation)).toThrow();
    },
  );
});

describe("nextGeneration", () => {
  it("advances by one", () => {
    expect(nextGeneration(0)).toBe(1);
  });

  it("wraps to zero past the largest generation the bits hold", () => {
    expect(nextGeneration(MAX_GENERATION)).toBe(0);
  });
});
