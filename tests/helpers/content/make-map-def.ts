import type { MapDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/** How far the default test map reaches from the origin on each side, so a spec arranged around the origin never meets a wall. */
const TEST_MAP_REACH = 8192;

/** A map definition with a counted id, `map_1`, `map_2`, the same every run: a wide square around the origin, spawning at the origin, with no obstacles until a spec names some. */
export const makeMapDef = defineFactory<MapDef>((sequence) => ({
  id: `map_${sequence}`,
  bounds: {
    minX: -TEST_MAP_REACH,
    minY: -TEST_MAP_REACH,
    maxX: TEST_MAP_REACH,
    maxY: TEST_MAP_REACH,
  },
  obstacles: [],
  spawnPoint: { x: 0, y: 0 },
  spawns: [],
}));
