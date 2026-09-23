import type { EntityId } from "@shared/public";
import type { Tick } from "../tick";

/**
 * Where a unit its behaviour drives stands in the shared enemy state machine. Idle stands at
 * home and wanders; Aggro is the tick it notices the hero and alerts its pack, and is left on
 * that same tick; Chase walks toward where it wants to stand; Attack swings; Return walks home
 * ignoring the hero; Dead is the corpse. This is the fight the unit is in, not the step of its
 * order: the order state says whether it is turning, walking, or in an attack point, and the
 * machine issues the orders that put it there.
 */
export type AiState = "idle" | "aggro" | "chase" | "attack" | "return" | "dead";

/**
 * What the machine remembers of one unit between ticks. `provoked` is raised by the damage
 * door when something hit the unit and read on the unit's next driving tick. The wander tick
 * is `null` until the machine schedules the first wander after an arrival at home, which is
 * where each unit's cadence is staggered from its neighbours'; the re-path tick is when a
 * chase may ask for a path again.
 */
export type AiRecord = {
  state: AiState;
  provoked: boolean;
  wanderAtTick: Tick | null;
  wanders: number;
  repathAtTick: Tick;
};

/** A record at home and at rest, which is what a fresh slot holds. */
export const createAiRecord = (): AiRecord => ({
  state: "idle",
  provoked: false,
  wanderAtTick: null,
  wanders: 0,
  repathAtTick: 0,
});

/** Every field back to the value a fresh slot has. */
export const clearAiRecord = (ai: AiRecord): void => {
  ai.state = "idle";
  ai.provoked = false;
  ai.wanderAtTick = null;
  ai.wanders = 0;
  ai.repathAtTick = 0;
};

/**
 * Something hit the unit: the machine reads it on the unit's next driving tick, which is what
 * aggro on damage is. Damage from nobody, a debug kill or a burn with no caster, provokes
 * nothing.
 */
export const provoke = (ai: AiRecord, sourceId: EntityId | null): void => {
  if (sourceId !== null) {
    ai.provoked = true;
  }
};

/** The death system took the unit: the machine holds it in Dead until its slot is released. */
export const enterDead = (ai: AiRecord): void => {
  ai.state = "dead";
  ai.provoked = false;
};
