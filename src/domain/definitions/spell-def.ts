/** The three orbs by id, as content names them in a recipe. The index of each is its slot key's order: Q, W, E. */
export type OrbId = "quartz" | "whorl" | "ember";

/** Every orb id, in slot-key order. An orb index anywhere in the domain is an index into this list. */
export const ORB_IDS: readonly OrbId[] = ["quartz", "whorl", "ember"];

/**
 * One of the hero's spells, as far as the composer needs it: its id and the orbs that compose
 * it, written as the buffer would hold them. Order in the recipe is irrelevant; the composer
 * reads it as a count of each orb. Targeting, timing, cost, and effects join this shape with
 * the cast pipeline.
 */
export type SpellDef = Readonly<{
  id: string;
  recipe: readonly OrbId[];
}>;
