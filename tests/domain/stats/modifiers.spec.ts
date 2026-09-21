import { describe, expect, it } from "vitest";
import type { ModifierEntry } from "@domain/public";
import { addModifier, modifiedValue, removeModifiers } from "@domain/public";

/** A modifier table with the given rows live and the rest empty. */
const table = (
  size: number,
  ...rows: Partial<ModifierEntry>[]
): ModifierEntry[] => {
  const entries: ModifierEntry[] = [];

  for (let row = 0; row < size; row += 1) {
    entries.push({ kind: null, stat: null, flat: 0, percent: 0, ...rows[row] });
  }

  return entries;
};

describe("addModifier", () => {
  it("writes the source into the first empty row", () => {
    const rows = table(3, { kind: "status", stat: "armour", flat: 1 });

    expect(addModifier(rows, "orb", "max_health", 0, 0.1)).toBe(true);
    expect(rows[1]).toEqual({
      kind: "orb",
      stat: "max_health",
      flat: 0,
      percent: 0.1,
    });
    expect(rows[2]?.stat).toBeNull();
  });

  it("refuses when every row is taken, and changes nothing", () => {
    const rows = table(
      2,
      { kind: "status", stat: "armour", flat: 1 },
      { kind: "orb", stat: "max_mana", flat: 2 },
    );
    const before = structuredClone(rows);

    expect(addModifier(rows, "item", "max_health", 5, 0)).toBe(false);
    expect(rows).toEqual(before);
  });
});

describe("removeModifiers", () => {
  it("empties every row of the kind and no other", () => {
    const rows = table(
      4,
      { kind: "orb", stat: "movement_speed", percent: 0.006 },
      { kind: "status", stat: "armour", flat: -2 },
      { kind: "orb", stat: "health_regen", flat: 1 },
    );

    removeModifiers(rows, "orb");

    expect(rows[0]).toEqual({ kind: null, stat: null, flat: 0, percent: 0 });
    expect(rows[1]).toEqual({
      kind: "status",
      stat: "armour",
      flat: -2,
      percent: 0,
    });
    expect(rows[2]).toEqual({ kind: null, stat: null, flat: 0, percent: 0 });
  });

  it("frees a row a later source can take", () => {
    const rows = table(1, { kind: "orb", stat: "max_health", flat: 10 });

    removeModifiers(rows, "orb");

    expect(addModifier(rows, "item", "armour", 1, 0)).toBe(true);
  });
});

describe("modifiedValue", () => {
  it("is the base with no rows for the stat", () => {
    expect(modifiedValue(280, table(2), "movement_speed")).toBe(280);
  });

  it("adds every flat amount before applying the summed percentage", () => {
    expect(
      modifiedValue(
        100,
        table(
          3,
          { kind: "item", stat: "max_health", flat: 20 },
          { kind: "item", stat: "max_health", flat: 30 },
          { kind: "orb", stat: "max_health", percent: 0.5 },
        ),
        "max_health",
      ),
    ).toBeCloseTo(225);
  });

  it("sums percentages inside one multiplier: three sources of 0.6% give 1.8%", () => {
    expect(
      modifiedValue(
        280,
        table(
          3,
          { kind: "orb", stat: "movement_speed", percent: 0.006 },
          { kind: "orb", stat: "movement_speed", percent: 0.006 },
          { kind: "orb", stat: "movement_speed", percent: 0.006 },
        ),
        "movement_speed",
      ),
    ).toBeCloseTo(285.04);
  });

  it("ignores rows for another stat and empty rows", () => {
    expect(
      modifiedValue(
        100,
        table(
          2,
          { kind: "item", stat: "armour", flat: 50, percent: 0.5 },
          { flat: 50, percent: 0.5 },
        ),
        "max_health",
      ),
    ).toBe(100);
  });
});
