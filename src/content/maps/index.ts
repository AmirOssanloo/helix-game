import type { MapDef } from "@domain/public";
import { arenaDef } from "./arena.def";
import { longRoadDef } from "./long-road.def";

/** Every map, in the order the content tier validates them. A map not listed here does not exist. */
export const maps: readonly MapDef[] = [arenaDef, longRoadDef];
