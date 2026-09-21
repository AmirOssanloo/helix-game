import { forms, heroDef, tuningTable } from "@content/public";
import type { FormDef, HeroDef, Registry, TuningDef } from "@domain/public";

/** What a test's registry holds. Everything defaults to the content layer's, so a spec names only what it changes. */
export type MakeRegistryOptions = Readonly<{
  tuning?: Partial<TuningDef>;
  hero?: HeroDef;
  forms?: readonly FormDef[];
}>;

/** A registry of exactly what a simulation test hands its world: the tuning table with any override on top, the hero, and its forms. */
export const makeRegistry = (options: MakeRegistryOptions = {}): Registry => ({
  tuning: { ...tuningTable, ...options.tuning },
  hero: options.hero ?? heroDef,
  forms: options.forms ?? forms,
});
