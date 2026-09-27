import type { ListKind } from "../definition-kind";
import { checkAbility } from "../effect-checks";
import { ORB_IDS } from "../orb-id";
import { arrayOfLength, objectOf, oneOf } from "../schema";
import type { SpellDef } from "../spell-def";
import { createSpellRecord } from "../spell-state";
import { abilityFields } from "./ability.kind";

/** A recipe is this many orbs. */
const RECIPE_LENGTH = 3;

/**
 * Every spell a form's ability list may name, keyed into run scope by id when the world is
 * created: an ability with a recipe of three orbs. Its frames are in the list and its effect
 * list is checked as a cast's own. A retune rebuilds its record in the spell table.
 */
export const spellKind: ListKind<"spells", SpellDef, "spell"> = {
  field: "spells",
  shape: "list",
  folder: "spells",
  namespace: "a spell or ability",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: (levels) =>
    objectOf<SpellDef>({
      ...abilityFields(levels),
      recipe: arrayOfLength(oneOf(ORB_IDS), RECIPE_LENGTH),
    }),
  check: checkAbility,
  tuning: {
    kind: "spell",
    title: "Spells",
    rebuild: (run, id, def, simHz): void => {
      run.spells.set(id, createSpellRecord(def, simHz));
    },
  },
};
