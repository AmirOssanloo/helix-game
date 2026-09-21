import { describe, expect, it } from "vitest";
import type { Attributes, ModifierEntry, Stats } from "@domain/public";
import { attributesAt, deriveStats } from "@domain/public";
import { makeFormDef } from "../../helpers";

/** Round numbers a row is checked against by hand: every point of strength is 20 health and 0.1 regeneration, every point of intelligence 10 mana and 0.05 regeneration. */
const def = makeFormDef.build({
  attributes: { strength: 10, agility: 10, intelligence: 10 },
  attributeGains: { strength: 1, agility: 1, intelligence: 1 },
  conversions: {
    healthPerStrength: 20,
    healthRegenPerStrength: 0.1,
    manaPerIntelligence: 10,
    manaRegenPerIntelligence: 0.05,
    armourPerAgility: 0.2,
    attackSpeedPerAgility: 1,
  },
  baseStats: {
    maxHealth: 100,
    healthRegen: 0.25,
    maxMana: 50,
    manaRegen: 0,
    armour: 0,
    attackSpeed: 100,
    magicResistance: 0.25,
  },
});

const freshAttributes = (): Attributes => ({
  strength: 0,
  agility: 0,
  intelligence: 0,
});

const freshStats = (): Stats => ({
  maxHealth: 0,
  healthRegen: 0,
  maxMana: 0,
  manaRegen: 0,
  armour: 0,
  attackSpeed: 0,
  magicResistance: 0,
});

/** A modifier table with the given rows live and the rest empty. */
const table = (...rows: Partial<ModifierEntry>[]): ModifierEntry[] => {
  const entries: ModifierEntry[] = [];

  for (let row = 0; row < 4; row += 1) {
    entries.push({ kind: null, stat: null, flat: 0, percent: 0, ...rows[row] });
  }

  return entries;
};

const derivedAt = (level: number, modifiers: ModifierEntry[] = []): Stats =>
  deriveStats(
    def,
    attributesAt(def, level, freshAttributes()),
    modifiers,
    freshStats(),
  );

describe("attributesAt", () => {
  it.each([
    [1, { strength: 10, agility: 10, intelligence: 10 }],
    [11, { strength: 20, agility: 20, intelligence: 20 }],
    [21, { strength: 30, agility: 30, intelligence: 30 }],
  ])(
    "at level %i is the base plus the gains per level after the first",
    (level, expected) => {
      expect(attributesAt(def, level, freshAttributes())).toEqual(expected);
    },
  );
});

describe("deriveStats", () => {
  it.each([
    [
      1,
      {
        maxHealth: 300,
        healthRegen: 1.25,
        maxMana: 150,
        manaRegen: 0.5,
        armour: 2,
        attackSpeed: 110,
        magicResistance: 0.25,
      },
    ],
    [
      11,
      {
        maxHealth: 500,
        healthRegen: 2.25,
        maxMana: 250,
        manaRegen: 1,
        armour: 4,
        attackSpeed: 120,
        magicResistance: 0.25,
      },
    ],
    [
      21,
      {
        maxHealth: 700,
        healthRegen: 3.25,
        maxMana: 350,
        manaRegen: 1.5,
        armour: 6,
        attackSpeed: 130,
        magicResistance: 0.25,
      },
    ],
  ])(
    "at level %i derives every value from the attributes",
    (level, expected) => {
      const stats = derivedAt(level);

      for (const [stat, value] of Object.entries(expected)) {
        expect(stats[stat as keyof Stats]).toBeCloseTo(value);
      }
    },
  );

  it("runs a value through its modifier rows: flat before percentage", () => {
    const stats = derivedAt(
      1,
      table(
        { kind: "item", stat: "max_health", flat: 50 },
        { kind: "orb", stat: "max_health", percent: 0.1 },
      ),
    );

    expect(stats.maxHealth).toBeCloseTo(385);
  });

  it("leaves every other value alone when one is modified", () => {
    const stats = derivedAt(
      1,
      table({ kind: "orb", stat: "armour", flat: 3, percent: 0.5 }),
    );

    expect(stats.armour).toBeCloseTo(7.5);
    expect(stats.maxHealth).toBeCloseTo(300);
    expect(stats.attackSpeed).toBeCloseTo(110);
  });

  it("modifies the magic resistance base, which no attribute drives", () => {
    const stats = derivedAt(
      1,
      table({ kind: "status", stat: "magic_resistance", flat: -0.1 }),
    );

    expect(stats.magicResistance).toBeCloseTo(0.15);
  });
});
