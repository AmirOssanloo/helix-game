import type { Resources } from "../entities/unit";

/**
 * What reduces a hit: physical damage by armour, magical by magic resistance, pure by
 * nothing. The mitigation formulas arrive with the attack; until then every type passes
 * through whole, and the type is carried so a log recorded now replays under them.
 */
export type DamageType = "physical" | "magical" | "pure";

/** Every damage type, in the order the panel lists them, for a boundary check on a payload. */
export const DAMAGE_TYPES: readonly DamageType[] = [
  "physical",
  "magical",
  "pure",
];

/** Whether `value` names a damage type, for a payload no panel should produce and a replay file might. */
export const isDamageType = (value: string): value is DamageType =>
  DAMAGE_TYPES.includes(value as DamageType);

/**
 * Takes `amount` of `type` from `resources`, never below zero. Mitigation is a pass-through
 * until the combat rules arrive: every type costs its full amount. The death system reads
 * the zero at the end of the tick.
 */
export const takeDamage = (
  resources: Resources,
  amount: number,
  type: DamageType,
): void => {
  void type;
  resources.health = Math.max(0, resources.health - amount);
};
