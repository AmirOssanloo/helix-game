import type { SpellDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * A spell definition with a counted id, `spell_1`, `spell_2`, the same every run, composed
 * from three Quartz. A spec overrides the recipe it is about.
 */
export const makeSpellDef = defineFactory<SpellDef>((sequence) => ({
  id: `spell_${sequence}`,
  recipe: ["quartz", "quartz", "quartz"],
}));
