import type { MapDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/** A map definition with a counted id, `map_1`, `map_2`, the same every run, and no obstacles until a spec names some. */
export const makeMapDef = defineFactory<MapDef>((sequence) => ({
  id: `map_${sequence}`,
  obstacles: [],
}));
