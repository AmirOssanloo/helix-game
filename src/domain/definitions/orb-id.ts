/** The three orbs by id, as content names them in a recipe and on a level table. The index of each is its slot key's order: Q, W, E. */
export type OrbId = "quartz" | "whorl" | "ember";

/** Every orb id, in slot-key order. An orb index anywhere in the domain is an index into this list. */
export const ORB_IDS: readonly OrbId[] = ["quartz", "whorl", "ember"];
