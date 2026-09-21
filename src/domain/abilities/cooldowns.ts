import type { ModifierEntry } from "../entities/unit";
import type { DebugFlags } from "../entities/world-state";
import type { Tick } from "../tick";

/** The stat whose modifier rows the pipeline reads when a clock starts. */
const COOLDOWN_STAT = "cooldown_reduction";

/**
 * What the modifier table said about cooldowns at the moment a clock started: the flat ticks
 * taken off the base before the percentages, the product of one less each percentage, and
 * the flat ticks taken off after them. Read once at commit and baked into the clock, so a
 * source that leaves or arrives afterwards changes nothing already running. One record per
 * caller, filled in place.
 */
export type CooldownSnapshot = {
  flat: number;
  multiplier: number;
  currentFlat: number;
};

/** A snapshot with nothing in it: no reduction of any kind. */
export const createCooldownSnapshot = (): CooldownSnapshot => ({
  flat: 0,
  multiplier: 1,
  currentFlat: 0,
});

/**
 * Writes what `modifiers` currently takes off a cooldown into `out`: every row for the stat
 * adds its flat ticks to the flat term and its fraction to the product. Percentages multiply,
 * so two sources of a tenth each leave eighty-one hundredths of the clock, not eighty. No
 * source writes the term taken off after the percentages yet; it is here so the formula is
 * the spec's.
 */
export const snapshotCooldownSources = (
  modifiers: readonly ModifierEntry[],
  out: CooldownSnapshot,
): CooldownSnapshot => {
  out.flat = 0;
  out.multiplier = 1;
  out.currentFlat = 0;

  for (let row = 0; row < modifiers.length; row += 1) {
    const entry = modifiers[row];

    if (entry === undefined || entry.stat !== COOLDOWN_STAT) {
      continue;
    }

    out.flat += entry.flat;
    out.multiplier *= 1 - entry.percent;
  }

  return out;
};

/**
 * The cooldown pipeline: `(base − Σflat) × Π(1 − pct) − Σcurrent_flat`, in whole ticks and
 * never below zero. `base` is the ability's own clock at its level, already in ticks; for
 * the composer it is the tunable base less the per-orb-level reduction, which is the flat
 * term the composer alone has.
 */
export const finalCooldownTicks = (
  base: number,
  snapshot: Readonly<CooldownSnapshot>,
): number =>
  Math.max(
    0,
    Math.round(
      (base - snapshot.flat) * snapshot.multiplier - snapshot.currentFlat,
    ),
  );

/**
 * Starts `abilityId`'s clock on `cooldowns` at tick `now` for `ticks`. The clock is the tick
 * the ability is ready again, so nothing that happens afterwards, a level, an orb, a
 * reduction arriving or leaving, can rewrite it: the next start computes afresh.
 */
export const startCooldown = (
  cooldowns: Map<string, Tick>,
  abilityId: string,
  now: Tick,
  ticks: number,
): void => {
  cooldowns.set(abilityId, now + ticks);
};

/** The ticks left on `abilityId`'s clock at `now`, zero when it is ready or was never started. */
export const remainingCooldownTicks = (
  cooldowns: ReadonlyMap<string, Tick>,
  abilityId: string,
  now: Tick,
): number => Math.max(0, (cooldowns.get(abilityId) ?? 0) - now);

/** Whether `abilityId` may start at `now`: its clock has run out, or the panel has switched cooldowns off. */
export const isCooldownReady = (
  cooldowns: ReadonlyMap<string, Tick>,
  abilityId: string,
  now: Tick,
  flags: Readonly<DebugFlags>,
): boolean =>
  flags.noCooldowns || remainingCooldownTicks(cooldowns, abilityId, now) === 0;
