import { ORB_IDS } from "../definitions/spell-def";
import type { OrbId } from "../definitions/spell-def";

/** The level a spell is cast at when its recipe names no orb the caster levels. */
const FIRST_LEVEL = 1;

/**
 * The level a spell is cast at, from the caster's `orbLevels` in slot-key order and the
 * spell's `recipe`: the lowest level among the orbs the recipe names, so a spell that scales
 * with two orbs strengthens only when both are raised, and one whose recipe is one orb three
 * times reads that orb's level. Never below the first level: an orb is pressed only once it
 * has a level, so a composed spell's orbs all have one, and a caster that levels no orbs
 * casts at the first.
 */
export const spellLevelOf = (
  orbLevels: readonly number[],
  recipe: readonly OrbId[],
): number => {
  let lowest = Number.POSITIVE_INFINITY;

  for (let index = 0; index < recipe.length; index += 1) {
    const orb = recipe[index];
    const level =
      orb === undefined ? 0 : (orbLevels[ORB_IDS.indexOf(orb)] ?? 0);

    lowest = Math.min(lowest, level);
  }

  return Math.max(FIRST_LEVEL, Number.isFinite(lowest) ? lowest : FIRST_LEVEL);
};
