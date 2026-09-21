import type { CooldownSnapshot } from "../abilities/cooldowns";
import {
  createCooldownSnapshot,
  finalCooldownTicks,
  isCooldownReady,
  snapshotCooldownSources,
  startCooldown,
} from "../abilities/cooldowns";
import { hasMana, spendMana } from "../abilities/mana";
import type { SpellRecord } from "../definitions/spell-state";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { DebugFlags, FormRecord } from "../entities/world-state";
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

/** Scratch for what the modifier table takes off the composer's clock, reused for every first invoke. */
const snapshot: CooldownSnapshot = createCooldownSnapshot();

/** The sum of every orb skill's level, which the composer's clock shortens by. */
export const totalOrbLevels = (levels: readonly number[]): number => {
  let total = 0;

  for (let orb = 0; orb < levels.length; orb += 1) {
    total += levels[orb] ?? 0;
  }

  return total;
};

/**
 * The composer's own clock in ticks at `orbLevels` total orb levels, before any percentage:
 * the base less the per-level reduction for each, never below zero. Both tunables are whole
 * ticks by the time a world reads them. This is the flat term of the cooldown pipeline, which
 * only the composer has; the pipeline applies the percentages on top.
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
 * The Invoke rule over `hero` and its active `form`, at tick `now`. A short buffer or a
 * buffer no spell answers to is refused. A spell already in the newest slot changes nothing;
 * one in an older slot is promoted, free of mana and of the clock, so the player can bring
 * it to the primary key as fast as they press. Otherwise it is a first invoke: refused while
 * the composer's clock runs or the form lacks the mana, unless the panel has switched either
 * off, and else the mana is spent, the clock starts from the total orb levels with the
 * percentage the hero holds at this moment baked in, and the slots shift to take the spell.
 */
export const invoke = (
  hero: Unit,
  form: FormRecord,
  spells: ReadonlyMap<string, SpellRecord>,
  tuning: ReadonlyMap<string, number>,
  flags: Readonly<DebugFlags>,
  now: Tick,
): InvokeOutcome => {
  const state = form.kit;

  if (!isBufferFull(state)) {
    return "buffer_not_full";
  }

  const id = composeSpell(state, form.def.abilities, spells);

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

  if (!isCooldownReady(hero.cooldowns, INVOKE_ID, now, flags)) {
    return "on_cooldown";
  }

  const cost = readTunable(tuning, "invoke_mana");

  if (!hasMana(form.resources, cost, flags)) {
    return "not_enough_mana";
  }

  spendMana(form.resources, cost, flags);
  startCooldown(
    hero.cooldowns,
    INVOKE_ID,
    now,
    finalCooldownTicks(
      invokeCooldownTicks(tuning, totalOrbLevels(state.orbLevels)),
      snapshotCooldownSources(hero.modifiers, snapshot),
    ),
  );
  insertPrepared(state, id);

  return "invoked";
};
