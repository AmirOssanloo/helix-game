import { assert } from "@shared/public";
import type { FormRecord } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";
import { attributesAt, deriveStats } from "../stats/derived";
import type { Attributes, FormDef, Stats } from "./form-def";
import type { HeroDef } from "./hero-def";

/**
 * `def` with every per-second rate divided into a per-tick one. This is the one conversion
 * for a form, run once per form when a world is created, so no system ever divides by the
 * tick rate. Everything else is read as written.
 */
const toSimulationUnits = (def: FormDef, simHz: number): FormDef => ({
  ...def,
  conversions: {
    ...def.conversions,
    healthRegenPerStrength: def.conversions.healthRegenPerStrength / simHz,
    manaRegenPerIntelligence: def.conversions.manaRegenPerIntelligence / simHz,
  },
  baseStats: {
    ...def.baseStats,
    healthRegen: def.baseStats.healthRegen / simHz,
    manaRegen: def.baseStats.manaRegen / simHz,
  },
});

/** The first level's derived values with no modifier, which a fresh form's resources are filled to. */
const fullAtLevelOne = (def: FormDef): Stats => {
  const attributes: Attributes = { strength: 0, agility: 0, intelligence: 0 };
  const stats: Stats = {
    maxHealth: 0,
    healthRegen: 0,
    maxMana: 0,
    manaRegen: 0,
    armour: 0,
    attackSpeed: 0,
    magicResistance: 0,
  };

  return deriveStats(def, attributesAt(def, 1, attributes), [], stats);
};

/** One form's record: its definition in simulation units, full health and mana at level one, every orb skill at level zero, and no armory. */
const createFormRecord = (def: FormDef, simHz: number): FormRecord => {
  const converted = toSimulationUnits(def, simHz);
  const full = fullAtLevelOne(converted);
  const orbLevels: number[] = [];

  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    orbLevels.push(0);
  }

  return {
    def: converted,
    resources: { health: full.maxHealth, mana: full.maxMana },
    kit: { orbLevels },
    armory: null,
  };
};

/**
 * Run scope's form records from the registry: one per id the hero definition lists, in that
 * order, each converted into simulation units. Allocated once, here. An id with no form is a
 * broken invariant, since the content tier resolves every one.
 */
export const createFormRecords = (
  hero: HeroDef,
  forms: readonly FormDef[],
  simHz: number,
): FormRecord[] => {
  const records: FormRecord[] = [];

  for (let index = 0; index < hero.forms.length; index += 1) {
    const id = hero.forms[index];
    const def = forms.find((form) => form.id === id);

    assert(
      def !== undefined,
      "Every form id the hero definition lists resolves to a form",
    );
    records.push(createFormRecord(def, simHz));
  }

  return records;
};
