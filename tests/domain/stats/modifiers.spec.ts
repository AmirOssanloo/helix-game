import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  ModifierEntry,
  ModifierTable,
  Stat,
  Stats,
  StatTotals,
} from "@domain/public";
import { STATUS_TABLE_SIZE } from "@domain/queries";
import {
  addModifier,
  addToTotals,
  applyModifiers,
  clearStatTotals,
  createStatTotals,
  deriveFromBaseOver,
  MODIFIER_TABLE_SIZE,
  modifiedValue,
  removeModifiers,
  STAT_SOURCES,
} from "@domain/rules";

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
    totals: createStatTotals(),
    liveModifierRows: modifiers.filter((entry) => entry.stat !== null).length,
    modifierMisses: 0,
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

  it("refuses a row when every row is taken, counts the miss, and changes nothing else", () => {
    const holder = held(
      2,
      { kind: "status", stat: "armour", flat: 1 },
      { kind: "orb", stat: "max_mana", flat: 2 },
    );
    const before = structuredClone(holder);

    expect(addModifier(holder, "status", "max_health", 5, 0)).toBe(false);
    expect(addModifier(holder, "status", "armour", 1, 0)).toBe(false);
    expect(holder.modifierMisses).toBe(2);
    expect({ ...holder, modifierMisses: 0 }).toEqual(before);
  });

  it("counts a miss from every source kind alike", () => {
    const holder = held(1, { kind: "summon", stat: "max_health", flat: 1 });

    addModifier(holder, "status", "armour", 1, 0);
    addModifier(holder, "orb", "movement_speed", 0, 0.1);
    addModifier(holder, "summon", "attack_damage", 1, 0);

    expect(holder.modifierMisses).toBe(3);
    expect(holder.liveModifierRows).toBe(1);
  });
});

/** Every spawn-unit entry anywhere in `value`, nested lists included. */
const spawnEntries = (value: unknown): { bonuses: readonly unknown[] }[] => {
  if (Array.isArray(value)) {
    return value.flatMap(spawnEntries);
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const own =
    "kind" in value && value.kind === "spawn_unit" && "bonuses" in value
      ? [value as { bonuses: readonly unknown[] }]
      : [];

  return [...own, ...Object.values(value).flatMap(spawnEntries)];
};

describe("the modifier table's capacity", () => {
  const mostStatusRows = Math.max(
    ...contentRegistry.statuses.map((status) => status.modifiers.length),
  );
  /** Each held instance writes one row, and a Whorl instance a second for its cooldown reduction. */
  const orbRows = contentRegistry.tuning.orb_capacity * 2;
  const mostBonuses = Math.max(
    ...spawnEntries([contentRegistry.spells, contentRegistry.abilities]).map(
      (entry) => entry.bonuses.length,
    ),
  );

  it("holds the hero's worst case today: every status row at the most modifiers, every orb instance a Whorl", () => {
    const holder = held(MODIFIER_TABLE_SIZE);

    for (let row = 0; row < STATUS_TABLE_SIZE * mostStatusRows; row += 1) {
      expect(addModifier(holder, "status", "armour", -1, 0)).toBe(true);
    }

    for (let row = 0; row < orbRows; row += 1) {
      expect(addModifier(holder, "orb", "cooldown_reduction", 0, 0.1)).toBe(
        true,
      );
    }

    expect(holder.modifierMisses).toBe(0);
    expect(holder.liveModifierRows).toBe(
      STATUS_TABLE_SIZE * mostStatusRows + orbRows,
    );
  });

  it("holds a summon's worst case: every status row at the most modifiers and the most bonuses an entry writes", () => {
    expect(mostBonuses).toBeGreaterThan(0);
    expect(
      STATUS_TABLE_SIZE * mostStatusRows + mostBonuses,
    ).toBeLessThanOrEqual(MODIFIER_TABLE_SIZE);
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
    expect(addModifier(holder, "status", "armour", 1, 0)).toBe(true);
    expect(holder.liveModifierRows).toBe(1);
  });
});

describe("modifiedValue", () => {
  it("is the base with no rows for the stat", () => {
    expect(modifiedValue(280, held(2), "movement_speed")).toBe(280);
  });

  it("adds every flat amount before applying the summed percentage", () => {
    expect(
      modifiedValue(
        100,
        held(
          3,
          { kind: "status", stat: "max_health", flat: 20 },
          { kind: "status", stat: "max_health", flat: 30 },
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
        held(
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
        held(
          2,
          { kind: "status", stat: "armour", flat: 50, percent: 0.5 },
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
  const holder = held(
    8,
    { kind: "status", stat: "armour", flat: -2, percent: 0.1 },
    { kind: "orb", stat: "max_health", flat: 30, percent: 0.07 },
    { kind: "status", stat: "magic_resistance", flat: -0.1 },
    { kind: "orb", stat: "movement_speed", percent: 0.5 },
    { kind: "status", stat: "attack_speed", flat: 40 },
    { kind: "status", stat: "max_health", percent: 0.03 },
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
    const out = applyModifiers(base, holder, { ...base });

    for (const [key, stat] of keys) {
      expect(out[key]).toBe(modifiedValue(base[key], holder, stat));
    }
  });

  it("is the base over a table with no live row", () => {
    expect(applyModifiers(base, held(4), { ...base })).toEqual(base);
  });

  it("reads a live row that follows emptied ones", () => {
    const sparse = held(
      4,
      { kind: "orb", stat: "armour", flat: 1 },
      { kind: "status", stat: "armour", flat: 2 },
      { kind: "orb", stat: "armour", flat: 3 },
      { kind: "status", stat: "armour", flat: 4 },
    );

    removeModifiers(sparse, "orb");

    expect(applyModifiers(base, sparse, { ...base }).armour).toBe(
      base.armour + 2 + 4,
    );
  });
});

describe("the armory's totals as a source", () => {
  const base: Readonly<Stats> = {
    maxHealth: 500,
    healthRegen: 0.1,
    maxMana: 200,
    manaRegen: 0.05,
    armour: 3,
    attackSpeed: 100,
    magicResistance: 0.25,
  };

  /** A table whose totals the case writes, as an armory's rewrite would, with its rows as given. */
  const wearing = (
    ...rows: Partial<ModifierEntry>[]
  ): { table: ModifierTable; totals: StatTotals } => {
    const totals = createStatTotals();
    const modifiers = table(4, ...rows);

    return {
      table: {
        modifiers,
        totals,
        liveModifierRows: modifiers.filter((entry) => entry.stat !== null)
          .length,
        modifierMisses: 0,
      },
      totals,
    };
  };

  it("adds its flat sum before the percentages and its percentage inside the one multiplier, beside the rows", () => {
    const { table: worn, totals } = wearing({
      kind: "status",
      stat: "max_health",
      flat: 20,
      percent: 0.1,
    });

    addToTotals(totals, "max_health", 50, 0);
    addToTotals(totals, "max_health", 0, 0.1);

    expect(modifiedValue(100, worn, "max_health")).toBeCloseTo(
      (100 + 20 + 50) * (1 + 0.1 + 0.1),
    );
    expect(modifiedValue(100, worn, "armour")).toBe(100);
  });

  it("reaches every derived value through the same pipeline as a single read", () => {
    const { table: worn, totals } = wearing();

    addToTotals(totals, "armour", 4, 0);
    addToTotals(totals, "max_mana", 0, 0.25);
    addToTotals(totals, "health_regen", 0.02, 0);

    const out = applyModifiers(base, worn, { ...base });

    expect(out.armour).toBe(base.armour + 4);
    expect(out.maxMana).toBe(base.maxMana * 1.25);
    expect(out.healthRegen).toBeCloseTo(base.healthRegen + 0.02);
    expect(out.maxHealth).toBe(base.maxHealth);

    for (const source of STAT_SOURCES) {
      expect(out[source.key]).toBe(
        modifiedValue(base[source.key], worn, source.modifier),
      );
    }
  });

  it("is derived from with no live row, since the copy of the base is taken only when the totals sum no line either", () => {
    const { table: worn, totals } = wearing();
    const out = { ...base };

    addToTotals(totals, "armour", 4, 0);
    deriveFromBaseOver(STAT_SOURCES, base, worn, out);

    expect(out.armour).toBe(base.armour + 4);
  });

  it("leaves the values as they were once the totals are cleared, the rows untouched", () => {
    const { table: worn, totals } = wearing({
      kind: "orb",
      stat: "armour",
      flat: 2,
    });
    const before = applyModifiers(base, worn, { ...base });

    addToTotals(totals, "armour", 10, 0);
    addToTotals(totals, "armour", 0, 0.5);

    expect(applyModifiers(base, worn, { ...base }).armour).toBe(
      (base.armour + 2 + 10) * 1.5,
    );

    clearStatTotals(totals);

    expect(applyModifiers(base, worn, { ...base })).toEqual(before);
    expect(worn.liveModifierRows).toBe(1);
  });
});
