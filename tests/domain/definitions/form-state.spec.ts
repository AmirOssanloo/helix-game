import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { HeroDef } from "@domain/public";
import {
  createFormRecords,
  createTuningState,
  ORB_COUNT,
} from "@domain/public";
import { makeAttackDef, makeFormDef } from "../../helpers";

/** The tuning table at 30 Hz, three orbs, and two prepared slots, in simulation units. */
const TUNING = createTuningState({
  ...tuningTable,
  sim_hz: 30,
  orb_capacity: 3,
  prepared_slots: 2,
});

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
  attack: makeAttackDef.build(),
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
      TUNING,
    );

    expect(records.map((record) => record.def.id)).toEqual([
      second.id,
      first.id,
    ]);
  });

  it("divides every per-second rate into a per-tick one, once", () => {
    const [record] = createFormRecords(hero([first.id]), [first], TUNING);

    expect(record?.def.conversions.healthRegenPerStrength).toBeCloseTo(0.01);
    expect(record?.def.conversions.manaRegenPerIntelligence).toBeCloseTo(0.02);
    expect(record?.def.baseStats.healthRegen).toBeCloseTo(0.1);
    expect(record?.def.baseStats.manaRegen).toBeCloseTo(0.2);
  });

  it("reads everything that is not a rate as written", () => {
    const [record] = createFormRecords(hero([first.id]), [first], TUNING);

    expect(record?.def.body).toEqual(first.body);
    expect(record?.def.conversions.healthPerStrength).toBe(20);
    expect(record?.def.baseStats.maxHealth).toBe(100);
    expect(record?.def.abilities).toEqual(first.abilities);
  });

  it("fills health and mana to the first level's maximums", () => {
    const [record] = createFormRecords(hero([first.id]), [first], TUNING);

    expect(record?.resources).toEqual({ health: 300, mana: 150 });
  });

  it("starts every orb skill at level zero, with no armory", () => {
    const [record] = createFormRecords(hero([first.id]), [first], TUNING);

    expect(record?.kit.orbLevels).toHaveLength(ORB_COUNT);
    expect(record?.kit.orbLevels.every((level) => level === 0)).toBe(true);
    expect(record?.armory).toBeNull();
  });

  it("sizes the orb buffer and the prepared slots from the tuning table, both empty", () => {
    const [record] = createFormRecords(hero([first.id]), [first], TUNING);

    expect(record?.kit.orbs).toHaveLength(3);
    expect(record?.kit.orbCount).toBe(0);
    expect(record?.kit.prepared).toEqual([null, null]);
  });

  it("makes no record for a hero with no forms", () => {
    expect(createFormRecords(hero([]), [first], TUNING)).toEqual([]);
  });

  it("treats an id no form answers to as a broken invariant", () => {
    expect(() =>
      createFormRecords(hero(["nobody"]), [first], TUNING),
    ).toThrow();
  });
});
