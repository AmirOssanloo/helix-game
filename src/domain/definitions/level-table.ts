import type { OrbId } from "./orb-id";

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
