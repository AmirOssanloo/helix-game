import { forms, heroDef, spells, tuningTable } from "@content/public";
import type {
  FormDef,
  HeroDef,
  Registry,
  SpellDef,
  TuningDef,
} from "@domain/public";

/** What a test's registry holds. Everything defaults to the content layer's, so a spec names only what it changes. */
export type MakeRegistryOptions = Readonly<{
  tuning?: Partial<TuningDef>;
  hero?: HeroDef;
  forms?: readonly FormDef[];
  spells?: readonly SpellDef[];
}>;

/** A registry of exactly what a simulation test hands its world: the tuning table with any override on top, the hero, its forms, and its spells. */
export const makeRegistry = (options: MakeRegistryOptions = {}): Registry => ({
  tuning: { ...tuningTable, ...options.tuning },
  hero: options.hero ?? heroDef,
  forms: options.forms ?? forms,
  spells: options.spells ?? spells,
});
