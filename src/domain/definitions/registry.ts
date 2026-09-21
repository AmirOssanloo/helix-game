import type { FormDef } from "./form-def";
import type { HeroDef } from "./hero-def";
import type { TuningDef } from "./tuning-def";

/**
 * The assembled, validated content a world receives at creation. The content layer builds the
 * real one from every definition; a test builds one from the two or three it needs.
 */
export type Registry = Readonly<{
  /** The tuning table in the designer's units, converted and copied into run scope when the world is created. */
  tuning: TuningDef;
  /** The hero: its forms by id, and how it levels. */
  hero: HeroDef;
  /** Every form, in the designer's units; the hero definition says which of them it takes and in what order. */
  forms: readonly FormDef[];
}>;
