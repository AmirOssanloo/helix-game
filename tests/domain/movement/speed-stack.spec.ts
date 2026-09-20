import { describe, expect, it } from "vitest";
import type { ModifierEntry } from "@domain/public";
import { movementSpeed } from "@domain/public";

/** A modifier table with the given rows live and the rest empty. */
const table = (...rows: Partial<ModifierEntry>[]): ModifierEntry[] => {
  const entries: ModifierEntry[] = [];

  for (let row = 0; row < 4; row += 1) {
    entries.push({ stat: null, flat: 0, percent: 0, ...rows[row] });
  }

  return entries;
};

const speed = (base: number, rows: ModifierEntry[]): number =>
  movementSpeed(base, rows, 100, 550);

describe("movementSpeed", () => {
  it("is the base with no modifiers", () => {
    expect(speed(280, table())).toBe(280);
  });

  it("adds a flat amount before applying a percentage", () => {
    expect(
      speed(
        280,
        table(
          { stat: "movement_speed", flat: 20 },
          { stat: "movement_speed", percent: 0.1 },
        ),
      ),
    ).toBeCloseTo(330);
  });

  it("sums percentages inside one multiplier: three sources of 0.6% give 1.8%", () => {
    expect(
      speed(
        280,
        table(
          { stat: "movement_speed", percent: 0.006 },
          { stat: "movement_speed", percent: 0.006 },
          { stat: "movement_speed", percent: 0.006 },
        ),
      ),
    ).toBeCloseTo(285.04);
  });

  it("ignores an empty row", () => {
    expect(speed(280, table({ flat: 50, percent: 0.5 }))).toBe(280);
  });

  it.each([
    ["holds a speed below the minimum at the minimum", 50, 100],
    ["leaves a speed at the minimum alone", 100, 100],
    ["leaves a speed at the maximum alone", 550, 550],
    ["holds a speed above the maximum at the maximum", 600, 550],
  ])("%s", (_name, base, expected) => {
    expect(speed(base, table())).toBe(expected);
  });

  it("clamps after the modifiers, so a slow below the minimum reads the minimum", () => {
    expect(speed(280, table({ stat: "movement_speed", percent: -0.9 }))).toBe(
      100,
    );
  });
});
