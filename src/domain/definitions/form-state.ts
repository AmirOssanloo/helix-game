import { assert } from "@shared/public";
import { createStatTotals } from "../entities/stat-totals";
import type { FormRecord } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";
import { createArmory } from "../items/armory";
import { attributesAt, deriveStats } from "../stats/derived";
import type { ModifierTable } from "../stats/modifiers";
import type { FormDef, Stats } from "./form-def";
import { createAttributes } from "./form-def";
import type { HeroDef } from "./hero-def";
import { createStats } from "./stat-keys";
import { readTunable } from "./tuning-state";

/**
 * `def` with every per-second rate divided into a per-tick one. This is the one conversion
 * for a form, run once per form when a world is created and again when a tuning command
 * changes one of its numbers, so no system ever divides by the tick rate. Everything else is
 * read as written. The base is a record of derived values like any unit's, so the one
 * derivation reads every base on one shape.
 */
export const formInSimulationUnits = (
  def: FormDef,
  simHz: number,
): FormDef => ({
  ...def,
  conversions: {
    ...def.conversions,
    healthRegenPerStrength: def.conversions.healthRegenPerStrength / simHz,
    manaRegenPerIntelligence: def.conversions.manaRegenPerIntelligence / simHz,
  },
  baseStats: Object.assign(createStats(), def.baseStats, {
    healthRegen: def.baseStats.healthRegen / simHz,
    manaRegen: def.baseStats.manaRegen / simHz,
  }),
});

/**
 * The first level's derived values with no modifier, which a fresh form's resources are
 * filled to: a form at level one wears no modifier source. Run at world creation, so the
 * empty table is made here rather than shared.
 */
const fullAtLevelOne = (def: FormDef): Stats => {
  const attributes = createAttributes();
  const stats = createStats();
  const none: ModifierTable = {
    modifiers: [],
    totals: createStatTotals(),
    liveModifierRows: 0,
    modifierMisses: 0,
  };

  return deriveStats(def, attributesAt(def, 1, attributes), none, stats);
};

/**
 * One form's record: its definition in simulation units, full health and mana at level one,
 * every orb skill at level zero, an empty orb buffer and empty prepared slots sized from the
 * tuning table, and an empty armory.
 */
const createFormRecord = (
  def: FormDef,
  tuning: ReadonlyMap<string, number>,
): FormRecord => {
  const converted = formInSimulationUnits(def, readTunable(tuning, "sim_hz"));
  const full = fullAtLevelOne(converted);
  const orbLevels: number[] = [];
  const orbs: number[] = [];
  const prepared: (string | null)[] = [];
  const orbCapacity = readTunable(tuning, "orb_capacity");
  const preparedSlots = readTunable(tuning, "prepared_slots");

  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    orbLevels.push(0);
  }

  for (let index = 0; index < orbCapacity; index += 1) {
    orbs.push(0);
  }

  for (let index = 0; index < preparedSlots; index += 1) {
    prepared.push(null);
  }

  return {
    def: converted,
    resources: { health: full.maxHealth, mana: full.maxMana },
    kit: { orbLevels, orbs, orbCount: 0, prepared },
    armory: createArmory(),
  };
};

/**
 * Run scope's form records from the registry: one per id the hero definition lists, in that
 * order, each converted into simulation units under the tuning state's step rate and with
 * its kit's buffers at the tuning state's capacities. Allocated once, here. An id with no
 * form is a broken invariant, since the content tier resolves every one.
 */
export const createFormRecords = (
  hero: HeroDef,
  forms: readonly FormDef[],
  tuning: ReadonlyMap<string, number>,
): FormRecord[] => {
  const records: FormRecord[] = [];

  for (let index = 0; index < hero.forms.length; index += 1) {
    const id = hero.forms[index];
    const def = forms.find((form) => form.id === id);

    assert(
      def !== undefined,
      "Every form id the hero definition lists resolves to a form",
    );
    records.push(createFormRecord(def, tuning));
  }

  return records;
};
