import type { DeepReadonly } from "@shared/public";
import { assert } from "@shared/public";
import type { TuningKey } from "../definitions/tuning-def";
import {
  EMBER_DAMAGE_KEYS,
  QUARTZ_REGEN_KEYS,
  WHORL_CDR_KEYS,
  WHORL_SPEED_KEYS,
} from "../definitions/tuning-def";
import { readTunable } from "../definitions/tuning-state";
import type { Stat, Unit } from "../entities/unit";
import type { KitState } from "../entities/world-state";
import { addModifier, removeModifiers } from "../stats/modifiers";

/** The stat each orb's instances change, by orb index. */
const PASSIVE_STATS: readonly Stat[] = [
  "health_regen",
  "movement_speed",
  "attack_damage",
];

/** Each orb's level table, by orb index. Quartz and Ember grant a flat amount; Whorl a fraction. */
const PASSIVE_KEYS: readonly (readonly TuningKey[])[] = [
  QUARTZ_REGEN_KEYS,
  WHORL_SPEED_KEYS,
  EMBER_DAMAGE_KEYS,
];

/** The one orb whose table is a fraction of the stat rather than a flat amount of it, and the one with a second passive: a fraction off every cooldown that starts while it is held. */
const WHORL = 1;

/** The stat Whorl's second passive changes. */
const WHORL_CDR_STAT: Stat = "cooldown_reduction";

/**
 * Rewrites the orb rows of `unit`'s modifier table from the buffer: every row an orb wrote
 * leaves, then each held instance writes one row at its orb's current level, and a Whorl
 * instance a second one for its cooldown reduction. Run every tick, it makes a swapped-out
 * instance take its passive with it and a raised orb level reach every instance out, both on
 * the tick it happened. An instance whose level has no table entry contributes nothing.
 */
export const refreshOrbPassives = (
  unit: Unit,
  state: DeepReadonly<KitState>,
  tuning: ReadonlyMap<string, number>,
): void => {
  removeModifiers(unit.modifiers, "orb");

  for (let index = 0; index < state.orbCount; index += 1) {
    const orb = state.orbs[index];
    const level = orb === undefined ? undefined : state.orbLevels[orb];
    const stat = orb === undefined ? undefined : PASSIVE_STATS[orb];
    const keys = orb === undefined ? undefined : PASSIVE_KEYS[orb];
    const key =
      level === undefined || keys === undefined ? undefined : keys[level - 1];

    if (orb === undefined || stat === undefined || key === undefined) {
      continue;
    }

    const amount = readTunable(tuning, key);
    const added =
      orb === WHORL
        ? addModifier(unit.modifiers, "orb", stat, 0, amount)
        : addModifier(unit.modifiers, "orb", stat, amount, 0);

    assert(added, "The modifier table has a row for every held orb instance");

    if (orb !== WHORL || level === undefined) {
      continue;
    }

    const cdrKey = WHORL_CDR_KEYS[level - 1];

    if (cdrKey === undefined) {
      continue;
    }

    const cdrAdded = addModifier(
      unit.modifiers,
      "orb",
      WHORL_CDR_STAT,
      0,
      readTunable(tuning, cdrKey),
    );

    assert(cdrAdded, "The modifier table has a row for every Whorl passive");
  }
};
