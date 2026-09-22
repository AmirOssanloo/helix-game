import type { OrbId } from "./orb-id";
import { ORB_IDS } from "./orb-id";

/**
 * A number that scales with one orb: one value per orb level from one to the cap, and the
 * orb whose level indexes it. Whatever ran the effect snapshotted the three orb levels when
 * it began, and every table it reads is indexed by that snapshot, never by the hero's
 * current levels. Cooldown and mana are not written this way: they are plain arrays indexed
 * by the lowest level among the orbs in the recipe.
 */
export type LevelTable = Readonly<{
  orb: OrbId;
  byLevel: readonly number[];
}>;

/** A field a definition may write as one number for every level or as a table. */
export type Scalar = number | LevelTable;

/** The level a table is read at when the orb behind it has none: an applier that levels no orb reads the first entry. */
const FIRST_LEVEL = 1;

/**
 * The entry of `table` at the level `orbLevels` holds for the orb the table names, never
 * below the first and zero past the table's end. `orbLevels` is one level per orb in orb
 * order, as the cast context snapshotted them, so a table is read at the levels the effect
 * was run with and not at the hero's current ones.
 */
export const tableAtOrbLevels = (
  table: LevelTable,
  orbLevels: readonly number[],
): number => {
  const held = orbLevels[ORB_IDS.indexOf(table.orb)] ?? 0;
  const level = Math.max(FIRST_LEVEL, held);

  return table.byLevel[level - FIRST_LEVEL] ?? 0;
};

/** A scalar's value at `orbLevels`: the number itself, or the table read at the level its orb holds. */
export const scalarAtOrbLevels = (
  scalar: Scalar,
  orbLevels: readonly number[],
): number =>
  typeof scalar === "number" ? scalar : tableAtOrbLevels(scalar, orbLevels);
