import { describe, expect, it } from "vitest";
import { HASH_RANGE, hash4 } from "@shared/public";

/** How many inputs each sample below walks. */
const SAMPLE = 2000;

/** Four integers for sample `index`, spread over the ranges a seed, an id, a tick, and a purpose take. */
const inputsAt = (index: number): [number, number, number, number] => [
  (index * 2_654_435_761) % 0x100000000,
  index * 65_537,
  index * 31,
  index % 7,
];

describe("hash4", () => {
  it("gives the same integer for the same four inputs", () => {
    for (let index = 0; index < SAMPLE; index += 1) {
      const [a, b, c, d] = inputsAt(index);

      expect(hash4(a, b, c, d)).toBe(hash4(a, b, c, d));
    }
  });

  it("gives an integer in [0, 2^24) for every input, a full unsigned seed and a negative one included", () => {
    expect(HASH_RANGE).toBe(2 ** 24);

    const results = [
      hash4(0, 0, 0, 0),
      hash4(0xffffffff, 0x7fffffff, 1_000_000, 1),
      hash4(-1, -2, -3, -4),
    ];

    for (let index = 0; index < SAMPLE; index += 1) {
      const [a, b, c, d] = inputsAt(index);

      results.push(hash4(a, b, c, d));
    }

    for (const result of results) {
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(HASH_RANGE);
    }
  });

  it.each([0, 1, 2, 3])(
    "gives a different integer when argument %i alone differs by one",
    (argument) => {
      for (let index = 0; index < SAMPLE; index += 1) {
        const inputs = inputsAt(index);
        const moved = [...inputs] as [number, number, number, number];

        moved[argument] = (moved[argument] ?? 0) + 1;

        expect(hash4(...moved)).not.toBe(hash4(...inputs));
      }
    },
  );

  it("depends on the order of its arguments", () => {
    expect(hash4(1, 2, 3, 4)).not.toBe(hash4(4, 3, 2, 1));
    expect(hash4(1, 2, 0, 0)).not.toBe(hash4(2, 1, 0, 0));
  });

  it("spreads a run of ticks over the whole range, so a chance drawn from it lands near its share", () => {
    const chance = 0.08;
    let under = 0;

    for (let tick = 0; tick < SAMPLE * 10; tick += 1) {
      if (hash4(1, 65_537, tick, 1) < chance * HASH_RANGE) {
        under += 1;
      }
    }

    expect(under / (SAMPLE * 10)).toBeCloseTo(chance, 2);
  });
});
