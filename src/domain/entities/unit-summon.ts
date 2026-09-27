import type { EntityId } from "@shared/public";
import type { Tick } from "../tick";

/**
 * What ties a summon to the unit that summoned it: its owner, which it follows and dies
 * with, and the tick it expires on. A unit nothing summoned holds `null` in both.
 */
export type SummonState = {
  ownerId: EntityId | null;
  /** The tick a summon expires on; `null` for a unit that lives until it dies. */
  expiresAtTick: Tick | null;
};

/** Owned by nothing and expiring never, which is what a fresh slot holds. */
export const createSummonState = (): SummonState => ({
  ownerId: null,
  expiresAtTick: null,
});

/** Every field back to the value a fresh slot has, in place. */
export const clearSummonState = (summon: SummonState): void => {
  summon.ownerId = null;
  summon.expiresAtTick = null;
};
