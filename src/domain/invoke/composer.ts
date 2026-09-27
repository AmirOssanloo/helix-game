import type { DeepReadonly } from "@shared/public";
import { ORB_IDS } from "../definitions/orb-id";
import type { SpellRecord } from "../definitions/spell-state";
import type { KitState } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";

/** How many of the buffer's live orb instances are `orb`. */
const heldCount = (state: DeepReadonly<KitState>, orb: number): number => {
  let count = 0;

  for (let index = 0; index < state.orbCount; index += 1) {
    if (state.orbs[index] === orb) {
      count += 1;
    }
  }

  return count;
};

/** How many of `recipe`'s entries name `orb`. An id that is no orb counts for nothing. */
const recipeCount = (recipe: readonly string[], orb: number): number => {
  const id = ORB_IDS[orb];
  let count = 0;

  for (let index = 0; index < recipe.length; index += 1) {
    if (recipe[index] === id) {
      count += 1;
    }
  }

  return count;
};

/** Whether `recipe` holds the same count of each orb as the buffer does. */
const sameCounts = (
  state: DeepReadonly<KitState>,
  recipe: readonly string[],
): boolean => {
  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    if (heldCount(state, orb) !== recipeCount(recipe, orb)) {
      return false;
    }
  }

  return true;
};

/**
 * The spell the buffer composes: the first of `abilities` whose recipe holds the same count
 * of each orb as the buffer does, arrangement ignored, or `null` when none does. The buffer
 * is read as a count, so Q, Q, E and E, Q, Q are one key.
 */
export const composeSpell = (
  state: DeepReadonly<KitState>,
  abilities: readonly string[],
  spells: ReadonlyMap<string, SpellRecord>,
): string | null => {
  for (let index = 0; index < abilities.length; index += 1) {
    const id = abilities[index];
    const spell = id === undefined ? undefined : spells.get(id);

    if (spell === undefined) {
      continue;
    }

    if (sameCounts(state, spell.def.recipe)) {
      return spell.def.id;
    }
  }

  return null;
};
