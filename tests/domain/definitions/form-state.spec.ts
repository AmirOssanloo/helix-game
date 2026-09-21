import { describe, expect, it } from "vitest";
import type { HeroDef } from "@domain/public";
import { createFormRecords, ORB_COUNT } from "@domain/public";
import { makeFormDef } from "../../helpers";

const SIM_HZ = 30;

const first = makeFormDef.build({
  conversions: {
    healthPerStrength: 20,
    healthRegenPerStrength: 0.3,
    manaPerIntelligence: 10,
    manaRegenPerIntelligence: 0.6,
    armourPerAgility: 0.2,
    attackSpeedPerAgility: 1,
  },
  baseStats: {
    maxHealth: 100,
    healthRegen: 3,
    maxMana: 50,
    manaRegen: 6,
    armour: 0,
    attackSpeed: 100,
    magicResistance: 0.25,
  },
});
const second = makeFormDef.build();

const hero = (forms: readonly string[]): HeroDef => ({
  forms,
  maxLevel: 30,
  experienceThresholds: [0],
  startingSkillPoints: 1,
  skillPointsPerLevel: 1,
  maxOrbLevel: 7,
});

describe("createFormRecords", () => {
  it("makes one record per id the hero lists, in the hero's order", () => {
    const records = createFormRecords(
      hero([second.id, first.id]),
      [first, second],
      SIM_HZ,
    );

    expect(records.map((record) => record.def.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("divides every per-second rate into a per-tick one, once", () => {
    const [record] = createFormRecords(hero([first.id]), [first], SIM_HZ);

    expect(record?.def.conversions.healthRegenPerStrength).toBeCloseTo(0.01);
    expect(record?.def.conversions.manaRegenPerIntelligence).toBeCloseTo(0.02);
    expect(record?.def.baseStats.healthRegen).toBeCloseTo(0.1);
    expect(record?.def.baseStats.manaRegen).toBeCloseTo(0.2);
  });

  it("reads everything that is not a rate as written", () => {
    const [record] = createFormRecords(hero([first.id]), [first], SIM_HZ);

    expect(record?.def.body).toEqual(first.body);
    expect(record?.def.conversions.healthPerStrength).toBe(20);
    expect(record?.def.baseStats.maxHealth).toBe(100);
    expect(record?.def.abilities).toEqual(first.abilities);
  });

  it("fills health and mana to the first level's maximums", () => {
    const [record] = createFormRecords(hero([first.id]), [first], SIM_HZ);

    expect(record?.resources).toEqual({ health: 300, mana: 150 });
  });

  it("starts every orb skill at level zero, with no armory", () => {
    const [record] = createFormRecords(hero([first.id]), [first], SIM_HZ);

    expect(record?.kit.orbLevels).toHaveLength(ORB_COUNT);
    expect(record?.kit.orbLevels.every((level) => level === 0)).toBe(true);
    expect(record?.armory).toBeNull();
  });

  it("makes no record for a hero with no forms", () => {
    expect(createFormRecords(hero([]), [first], SIM_HZ)).toEqual([]);
  });

  it("treats an id no form answers to as a broken invariant", () => {
    expect(() =>
      createFormRecords(hero(["nobody"]), [first], SIM_HZ),
    ).toThrow();
  });
});
