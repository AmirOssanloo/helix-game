import type { DeepReadonly } from "@shared/public";
import type { KitState } from "../entities/world-state";
import { ORB_COUNT } from "../entities/world-state";

/** What an orb press returns: the instance was appended, or the orb has no level to press yet. */
export type OrbPressResult = "added" | "orb_not_learned";

/** How many instances the buffer holds at most: the tunable it was sized from when the record was created. */
export const orbCapacity = (state: DeepReadonly<KitState>): number =>
  state.orbs.length;

/** Whether every slot of the buffer is live, which the composer needs before it reads one. */
export const isBufferFull = (state: DeepReadonly<KitState>): boolean =>
  state.orbCount >= orbCapacity(state);

/** The held instance at `index` in age order, oldest first, or `null` past the live ones. */
export const orbAt = (
  state: DeepReadonly<KitState>,
  index: number,
): number | null => {
  const orb = state.orbs[index];

  return index < state.orbCount && orb !== undefined ? orb : null;
};

/**
 * Appends one instance of `orb` to the newest end. When the buffer is full, the oldest
 * instance leaves first: FIFO on the instance list, so which token dies depends on age, not
 * on element. One instance per press; a held key is the mapper's to collapse.
 */
export const addOrb = (state: KitState, orb: number): void => {
  const capacity = orbCapacity(state);

  if (state.orbCount >= capacity) {
    for (let index = 1; index < capacity; index += 1) {
      const younger = state.orbs[index];

      if (younger !== undefined) {
        state.orbs[index - 1] = younger;
      }
    }

    state.orbs[capacity - 1] = orb;

    return;
  }

  state.orbs[state.orbCount] = orb;
  state.orbCount += 1;
};

/**
 * An orb press: refused, with the buffer untouched, while the orb has no level, since an
 * instance carries a passive read from its level's table; appended otherwise.
 */
export const pressOrb = (state: KitState, orb: number): OrbPressResult => {
  const level = state.orbLevels[orb];

  if (level === undefined || level < 1) {
    return "orb_not_learned";
  }

  addOrb(state, orb);

  return "added";
};

/** Writes how many held instances there are of each orb into `out`, one entry per orb in slot-key order. */
export const countOrbs = (
  state: DeepReadonly<KitState>,
  out: number[],
): number[] => {
  for (let orb = 0; orb < ORB_COUNT; orb += 1) {
    out[orb] = 0;
  }

  for (let index = 0; index < state.orbCount; index += 1) {
    const orb = state.orbs[index];

    if (orb !== undefined) {
      out[orb] = (out[orb] ?? 0) + 1;
    }
  }

  return out;
};
