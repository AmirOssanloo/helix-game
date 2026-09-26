import type { MapDef } from "@domain/public";
import { arenaDef } from "./arena.def";
import { longRoadDef } from "./long-road.def";

/** Every map, in the order the content tier validates them. A map not listed here does not exist. */
export const maps: readonly MapDef[] = [arenaDef, longRoadDef];

/** The map a fresh session starts on. The panel's map list reaches every other. It is named here, apart from the order of `maps`, since that order is part of what every recorded log was checked against. */
export const startingMap: MapDef = longRoadDef;
