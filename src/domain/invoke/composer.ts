import type { DeepReadonly } from "@shared/public";
import type { SpellDef } from "../definitions/spell-def";
import { ORB_IDS } from "../definitions/spell-def";
import type { KitState } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";
import { countOrbs } from "./buffer";

/** Scratch for the buffer's count of each orb, reused for every compose. */
const held: number[] = [];

/** Scratch for a recipe's count of each orb, reused for every spell compared. */
const wanted: number[] = [];

for (let orb = 0; orb < ORB_COUNT; orb += 1) {
  held.push(0);
  wanted.push(0);
}

/** Writes how many of each orb `recipe` names into `out`. An id that is no orb counts for nothing. */
const countRecipe = (recipe: readonly string[], out: number[]): number[] => {
  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    out[orb] = 0;
  }

  for (let index = 0; index < recipe.length; index += 1) {
    const orb = ORB_IDS.indexOf(recipe[index] as (typeof ORB_IDS)[number]);

    if (orb !== -1) {
      out[orb] = (out[orb] ?? 0) + 1;
    }
  }

  return out;
};

const sameCounts = (a: readonly number[], b: readonly number[]): boolean => {
  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    if (a[orb] !== b[orb]) {
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
  spells: ReadonlyMap<string, SpellDef>,
): string | null => {
  countOrbs(state, held);

  for (let index = 0; index < abilities.length; index += 1) {
    const id = abilities[index];
    const spell = id === undefined ? undefined : spells.get(id);

    if (spell === undefined) {
      continue;
    }

    if (sameCounts(held, countRecipe(spell.recipe, wanted))) {
      return spell.id;
    }
  }

  return null;
};
