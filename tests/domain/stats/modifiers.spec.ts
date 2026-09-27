import { describe, expect, it } from "vitest";
import type { ModifierEntry, ModifierTable, Stat, Stats } from "@domain/public";
import {
  addModifier,
  applyModifiers,
  modifiedValue,
  removeModifiers,
} from "@domain/public";

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

/** `table`'s rows with the count of those holding a stat, as a unit carries them. */
const held = (
  size: number,
  ...rows: Partial<ModifierEntry>[]
): ModifierTable => {
  const modifiers = table(size, ...rows);

  return {
    modifiers,
    liveModifierRows: modifiers.filter((entry) => entry.stat !== null).length,
  };
};

describe("addModifier", () => {
  it("writes the source into the first empty row", () => {
    const holder = held(3, { kind: "status", stat: "armour", flat: 1 });
    const rows = holder.modifiers;

    expect(addModifier(holder, "orb", "max_health", 0, 0.1)).toBe(true);
    expect(holder.liveModifierRows).toBe(2);
    expect(rows[1]).toEqual({
      kind: "orb",
      stat: "max_health",
      flat: 0,
      percent: 0.1,
    });
    expect(rows[2]?.stat).toBeNull();
  });

  it("refuses when every row is taken, and changes nothing", () => {
    const holder = held(
      2,
      { kind: "status", stat: "armour", flat: 1 },
      { kind: "orb", stat: "max_mana", flat: 2 },
    );
    const before = structuredClone(holder);

    expect(addModifier(holder, "item", "max_health", 5, 0)).toBe(false);
    expect(holder).toEqual(before);
  });
});

describe("removeModifiers", () => {
  it("empties every row of the kind and no other", () => {
    const holder = held(
      4,
      { kind: "orb", stat: "movement_speed", percent: 0.006 },
      { kind: "status", stat: "armour", flat: -2 },
      { kind: "orb", stat: "health_regen", flat: 1 },
    );
    const rows = holder.modifiers;

    removeModifiers(holder, "orb");

    expect(holder.liveModifierRows).toBe(1);
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
    const holder = held(1, { kind: "orb", stat: "max_health", flat: 10 });

    removeModifiers(holder, "orb");

    expect(holder.liveModifierRows).toBe(0);
    expect(addModifier(holder, "item", "armour", 1, 0)).toBe(true);
    expect(holder.liveModifierRows).toBe(1);
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

describe("applyModifiers", () => {
  const base: Readonly<Stats> = {
    maxHealth: 500,
    healthRegen: 0.1,
    maxMana: 200,
    manaRegen: 0.05,
    armour: 3,
    attackSpeed: 100,
    magicResistance: 0.25,
  };
  const rows = table(
    8,
    { kind: "status", stat: "armour", flat: -2, percent: 0.1 },
    { kind: "orb", stat: "max_health", flat: 30, percent: 0.07 },
    { kind: "item", stat: "magic_resistance", flat: -0.1 },
    { kind: "orb", stat: "movement_speed", percent: 0.5 },
    { kind: "status", stat: "attack_speed", flat: 40 },
    { kind: "item", stat: "max_health", percent: 0.03 },
    { kind: "orb", stat: "mana_regen", flat: 0.01, percent: 0.2 },
  );
  const keys: readonly [keyof Stats, Stat][] = [
    ["maxHealth", "max_health"],
    ["healthRegen", "health_regen"],
    ["maxMana", "max_mana"],
    ["manaRegen", "mana_regen"],
    ["armour", "armour"],
    ["attackSpeed", "attack_speed"],
    ["magicResistance", "magic_resistance"],
  ];

  it("gives every derived value exactly what the pipeline gives it, in one pass", () => {
    const out = applyModifiers(base, rows, { ...base });

    for (const [key, stat] of keys) {
      expect(out[key]).toBe(modifiedValue(base[key], rows, stat));
    }
  });

  it("is the base over a table with no live row", () => {
    expect(applyModifiers(base, table(4), { ...base })).toEqual(base);
  });
});
