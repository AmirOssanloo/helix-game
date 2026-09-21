import type { DeepReadonly } from "@shared/public";
import type { KitState } from "../entities/world-state";

/** The prepared slot holding `id`, newest first from zero, or `-1` when no slot does. */
export const indexOfPrepared = (
  state: DeepReadonly<KitState>,
  id: string,
): number => {
  for (let index = 0; index < state.prepared.length; index += 1) {
    if (state.prepared[index] === id) {
      return index;
    }
  }

  return -1;
};

/**
 * The insert of a first invoke: every prepared spell moves one slot older, the oldest leaves,
 * and `id` takes the newest slot. Returns the id that left, or `null` when the oldest slot
 * was empty. The one that left keeps its clock; only the slots forget it.
 */
export const insertPrepared = (state: KitState, id: string): string | null => {
  const last = state.prepared.length - 1;
  const evicted = state.prepared[last];

  for (let index = last; index > 0; index -= 1) {
    const newer = state.prepared[index - 1];

    state.prepared[index] = newer === undefined ? null : newer;
  }

  state.prepared[0] = id;

  return evicted === undefined ? null : evicted;
};

/** The swap of a re-invoke: the spell at `index` trades places with the newest, so it is on the primary key. Nothing else moves. */
export const promotePrepared = (state: KitState, index: number): void => {
  const promoted = state.prepared[index];
  const newest = state.prepared[0];

  if (promoted === undefined || newest === undefined) {
    return;
  }

  state.prepared[0] = promoted;
  state.prepared[index] = newest;
};
