import type { Registry } from "@domain/public";

/** What a test's registry holds. Every field has an empty default, so a spec names only what it reads. */
export type MakeRegistryOptions = Readonly<{
  tuning?: ReadonlyMap<string, number>;
}>;

/** A registry of exactly what a simulation test hands its world: nothing by default. */
export const makeRegistry = (options: MakeRegistryOptions = {}): Registry => ({
  tuning: options.tuning ?? new Map(),
});
