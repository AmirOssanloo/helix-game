import type { Schema } from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";
import {
  glacierPlaceEffect,
  glacierPlaceFields,
  glacierPlaceNested,
} from "./glacier-place.effect";
import { siphonBurnEffect, siphonBurnFields } from "./siphon-burn.effect";
import { updraftCarryEffect, updraftCarryFields } from "./updraft-carry.effect";

/**
 * A bespoke effect: it reads the world, the cast context, and the fields the entry that
 * named it carries, and nothing else, which the signature enforces. The fields passed its
 * schema when content was loaded, so it reads them without checking.
 */
export type NamedEffect = (
  world: World,
  cast: Cast,
  fields: Readonly<Record<string, unknown>>,
) => void;

/**
 * One effect entry a named effect's fields carry, and the field path it sits at. The
 * registry checks it as an entry of its own — its shape against the schema that knows the
 * orb level cap, then every key, status id, and frame inside it — which no function beside
 * an effect can do for itself.
 */
export type NestedEffect = Readonly<{
  path: string;
  entry: unknown;
}>;

/** Every effect entry a named effect's fields carry. An effect whose fields carry none returns nothing. */
export type NamedEffectNesting = (
  fields: Readonly<Record<string, unknown>>,
) => readonly NestedEffect[];

/**
 * One registered named effect: the schema of the fields a definition's `named` entry
 * carries for it, declared beside the function, the effect entries those fields carry, and
 * the function itself. The registry validates the fields against the schema and each nested
 * entry against the effect schema when content is loaded, so the function reads them
 * without checking.
 */
export type NamedEffectEntry = Readonly<{
  fields: Schema<Readonly<Record<string, unknown>>>;
  nested: NamedEffectNesting;
  run: NamedEffect;
}>;

/** The nesting of an effect whose fields carry no effect entry of their own. */
const NO_NESTING: NamedEffectNesting = () => [];

/** Every named effect by the key a definition names it with. A key not here does not exist; the content tier refuses it. */
const effects: ReadonlyMap<string, NamedEffectEntry> = new Map<
  string,
  NamedEffectEntry
>([
  [
    "glacier_place",
    {
      fields: glacierPlaceFields,
      nested: glacierPlaceNested,
      run: glacierPlaceEffect,
    },
  ],
  [
    "siphon_burn",
    { fields: siphonBurnFields, nested: NO_NESTING, run: siphonBurnEffect },
  ],
  [
    "updraft_carry",
    {
      fields: updraftCarryFields,
      nested: NO_NESTING,
      run: updraftCarryEffect,
    },
  ],
]);

/** Every named effect key, in registration order, for the content tier to name what a bad key could have been. */
export const NAMED_EFFECT_KEYS: readonly string[] = [...effects.keys()];

/** The named effect registered under `key`, or `null` when none is. */
export const resolveNamedEffect = (key: string): NamedEffectEntry | null =>
  effects.get(key) ?? null;
