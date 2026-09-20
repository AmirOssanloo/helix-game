import { tuningTable } from "@content/public";
import type { Registry, TuningDef } from "@domain/public";

/** What a test's registry holds. The tuning table defaults to the content table, so a spec names only the keys it changes. */
export type MakeRegistryOptions = Readonly<{
  tuning?: Partial<TuningDef>;
}>;

/** A registry of exactly what a simulation test hands its world: the tuning table with any override on top, and nothing else. */
export const makeRegistry = (options: MakeRegistryOptions = {}): Registry => ({
  tuning: { ...tuningTable, ...options.tuning },
});
