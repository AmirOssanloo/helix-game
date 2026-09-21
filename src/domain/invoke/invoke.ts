import type { SpellDef } from "../definitions/spell-def";
import { readTunable } from "../definitions/tuning-state";
import type { Resources } from "../entities/unit";
import type { KitState } from "../entities/world-state";
import type { Tick } from "../tick";
import { isBufferFull } from "./buffer";
import { composeSpell } from "./composer";
import { indexOfPrepared, insertPrepared, promotePrepared } from "./slots";

/** The composer's own ability id: the key its clock is kept under and the id its slot describes. */
export const INVOKE_ID = "invoke";

/** Why an invoke was refused. */
export type InvokeRefusal =
  "buffer_not_full" | "no_spell_for_recipe" | "on_cooldown" | "not_enough_mana";

/**
 * What an invoke did: a first invoke wrote the spell into the newest slot, a swap promoted it
 * from an older slot, an unchanged one found it already newest, or it was refused with the
 * slots, the mana, and the clock untouched.
 */
export type InvokeOutcome = "invoked" | "swapped" | "unchanged" | InvokeRefusal;

/** The sum of every orb skill's level, which the composer's clock shortens by. */
export const totalOrbLevels = (levels: readonly number[]): number => {
  let total = 0;

  for (let orb = 0; orb < levels.length; orb += 1) {
    total += levels[orb] ?? 0;
  }

  return total;
};

/**
 * The composer's clock in ticks at `orbLevels` total orb levels: the base less the per-level
 * reduction for each, never below zero. Both tunables are whole ticks by the time a world
 * reads them. The Whorl percentage joins this with the cooldown pipeline.
 */
export const invokeCooldownTicks = (
  tuning: ReadonlyMap<string, number>,
  orbLevels: number,
): number =>
  Math.max(
    0,
    readTunable(tuning, "invoke_cd_base") -
      readTunable(tuning, "invoke_cd_per_orb_level") * orbLevels,
  );

/**
 * The Invoke rule over one form's kit state, at tick `now`. A short buffer or a buffer no
 * spell answers to is refused. A spell already in the newest slot changes nothing; one in an
 * older slot is promoted, free of mana and of the clock, so the player can bring it to the
 * primary key as fast as they press. Otherwise it is a first invoke: refused while the
 * composer's clock runs or the form lacks the mana, and else the mana is spent, the clock
 * starts from the total orb levels, and the slots shift to take the spell.
 */
export const invoke = (
  state: KitState,
  resources: Resources,
  cooldowns: Map<string, Tick>,
  abilities: readonly string[],
  spells: ReadonlyMap<string, SpellDef>,
  tuning: ReadonlyMap<string, number>,
  now: Tick,
): InvokeOutcome => {
  if (!isBufferFull(state)) {
    return "buffer_not_full";
  }

  const id = composeSpell(state, abilities, spells);

  if (id === null) {
    return "no_spell_for_recipe";
  }

  const held = indexOfPrepared(state, id);

  if (held === 0) {
    return "unchanged";
  }

  if (held > 0) {
    promotePrepared(state, held);

    return "swapped";
  }

  if (now < (cooldowns.get(INVOKE_ID) ?? 0)) {
    return "on_cooldown";
  }

  const cost = readTunable(tuning, "invoke_mana");

  if (resources.mana < cost) {
    return "not_enough_mana";
  }

  resources.mana -= cost;
  cooldowns.set(
    INVOKE_ID,
    now + invokeCooldownTicks(tuning, totalOrbLevels(state.orbLevels)),
  );
  insertPrepared(state, id);

  return "invoked";
};
