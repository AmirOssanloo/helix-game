import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";

/**
 * One driver of an enemy or a summon, run once per tick for every live unit whose
 * definition names it by key: it chooses the unit's target and where it wants to stand by
 * issuing orders through the shared state machine, and decides nothing else.
 */
export type Behaviour = (world: World, unit: Unit) => void;
