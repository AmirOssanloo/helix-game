import type { AbilityDef } from "./ability-def";
import type { OrbId } from "./orb-id";

/**
 * One of the hero's spells: an ability with a recipe. The recipe is the orbs that compose
 * it, written as the buffer would hold them; order is irrelevant, since the composer reads
 * it as a count of each orb, and the lowest level among its orbs indexes the cooldown and
 * mana tables.
 */
export type SpellDef = AbilityDef & Readonly<{ recipe: readonly OrbId[] }>;
