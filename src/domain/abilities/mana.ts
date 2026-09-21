import type { Resources } from "../entities/unit";
import type { DebugFlags } from "../entities/world-state";

/** Whether `resources` covers `cost`, or the panel has switched mana off. */
export const hasMana = (
  resources: Readonly<Resources>,
  cost: number,
  flags: Readonly<DebugFlags>,
): boolean => flags.infiniteMana || resources.mana >= cost;

/**
 * Takes `cost` from `resources`. With infinite mana on, nothing is taken. The caller checks
 * `hasMana` first; spending what the form lacks is a broken invariant, so the pool is never
 * driven below zero here.
 */
export const spendMana = (
  resources: Resources,
  cost: number,
  flags: Readonly<DebugFlags>,
): void => {
  if (flags.infiniteMana) {
    return;
  }

  resources.mana -= cost;
};
