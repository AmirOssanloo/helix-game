import type { MapDef, Registry } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { createWorld } from "@simulation/public";
import { makeMapDef } from "../content/make-map-def";
import { makeRegistry } from "../content/make-registry";

/** What a simulation test hands the world it creates. The seed is explicit; the rest defaults to empty. */
export type MakeWorldOptions = Readonly<{
  seed: number;
  registry?: Registry;
  map?: MapDef;
}>;

/** Creates a small world for a simulation test: an explicit seed, an empty registry, and a bare map by default. */
export const makeWorld = (options: MakeWorldOptions): Simulation =>
  createWorld({
    seed: options.seed,
    registry: options.registry ?? makeRegistry(),
    map: options.map ?? makeMapDef.build(),
  });
