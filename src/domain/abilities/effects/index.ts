import type { Schema } from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";

/** A bespoke effect: it reads the world and the cast context and nothing else, which the signature enforces. */
export type NamedEffect = (world: World, cast: Cast) => void;

/**
 * One registered named effect: the schema of the fields a definition's `named` entry
 * carries for it, declared beside the function, and the function itself. The registry
 * validates the fields against the schema when content is loaded, so the function reads
 * them without checking.
 */
export type NamedEffectEntry = Readonly<{
  fields: Schema<Readonly<Record<string, unknown>>>;
  run: NamedEffect;
}>;

/** Every named effect by the key a definition names it with. A key not here does not exist; the content tier refuses it. */
const effects: ReadonlyMap<string, NamedEffectEntry> = new Map<
  string,
  NamedEffectEntry
>();

/** Every named effect key, in registration order, for the content tier to name what a bad key could have been. */
export const NAMED_EFFECT_KEYS: readonly string[] = [...effects.keys()];

/** The named effect registered under `key`, or `null` when none is. */
export const resolveNamedEffect = (key: string): NamedEffectEntry | null =>
  effects.get(key) ?? null;
