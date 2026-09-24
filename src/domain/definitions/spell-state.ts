import { assert } from "@shared/public";
import type { SpellDef } from "./spell-def";
import { readTunable } from "./tuning-state";

/**
 * One spell as run scope holds it: the definition as content wrote it, and every duration
 * on it converted into whole ticks. This is the one conversion for a spell, run once per
 * spell when a world is created, so no system ever multiplies by the tick rate.
 */
export type SpellRecord = Readonly<{
  def: SpellDef;
  castPointTicks: number;
  backswingTicks: number;
  /** Indexed by level from zero, one entry per entry of the definition's cooldown table. */
  cooldownTicks: readonly number[];
}>;

/** `seconds` as a whole number of ticks at `simHz`. */
const toTicks = (seconds: number, simHz: number): number =>
  Math.round(seconds * simHz);

/** `def` as run scope holds it at `simHz`: the one conversion for a spell, run when a world is created and when a tuning command changes one of its numbers. */
export const createSpellRecord = (
  def: SpellDef,
  simHz: number,
): SpellRecord => {
  const cooldownTicks: number[] = [];

  for (let index = 0; index < def.cooldownSeconds.length; index += 1) {
    const seconds = def.cooldownSeconds[index];

    if (seconds !== undefined) {
      cooldownTicks.push(toTicks(seconds, simHz));
    }
  }

  return {
    def,
    castPointTicks: toTicks(def.castPointSeconds, simHz),
    backswingTicks: toTicks(def.backswingSeconds, simHz),
    cooldownTicks,
  };
};

/**
 * Run scope's spell table from the registry: every spell by id, each with its durations in
 * ticks under the tuning state's step rate, for the composer to look a recipe up in and the
 * cast pipeline to read timing and cost from. Allocated once, here. A duplicate id is a
 * broken invariant, since the content tier refuses one.
 */
export const createSpellTable = (
  spells: readonly SpellDef[],
  tuning: ReadonlyMap<string, number>,
): Map<string, SpellRecord> => {
  const table = new Map<string, SpellRecord>();
  const simHz = readTunable(tuning, "sim_hz");

  for (let index = 0; index < spells.length; index += 1) {
    const spell = spells[index];

    if (spell !== undefined) {
      table.set(spell.id, createSpellRecord(spell, simHz));
    }
  }

  return table;
};

/** The entry of a level table at `level`, counted from one. A level past the table is a broken invariant, since content validates every table's length against the cap. */
export const entryAtLevel = (
  table: readonly number[],
  level: number,
): number => {
  const entry = table[level - 1];

  assert(entry !== undefined, "Every level table has an entry for every level");

  return entry;
};
