import type { AttackDef } from "./attack-def";

/**
 * The attack speed a unit wears before anything hastens it: a hundred is one base attack
 * time, as the form definitions write it, so a hundred and ten is a tenth faster. Every
 * attack speed on a unit is in these units, whether it came from a form's attributes or
 * from a definition.
 */
export const BASE_ATTACK_SPEED = 100;

/**
 * One unit's attack as run scope holds it: the definition as content wrote it, its two
 * stages and its attack time in whole ticks, and its projectile's speed in world units per
 * tick. This is the one conversion for an attack, run once per definition when a world is
 * created.
 */
export type AttackRecord = Readonly<{
  def: AttackDef;
  pointTicks: number;
  backswingTicks: number;
  /** Ticks from one shot to the next before attack speed scales them. */
  baseAttackTicks: number;
  /** World units per tick. */
  projectileSpeed: number;
}>;

/** `record`'s attack in ticks at `attackSpeed`: the base attack time scaled by how much faster than unhurried the unit is. */
export const attackTicks = (
  record: AttackRecord,
  attackSpeed: number,
): number =>
  Math.round((record.baseAttackTicks * BASE_ATTACK_SPEED) / attackSpeed);

/** `def` with its seconds read for the tick and its projectile speed for the step, at `simHz`. */
export const createAttackRecord = (
  def: AttackDef,
  simHz: number,
): AttackRecord => ({
  def,
  pointTicks: Math.round(def.pointSeconds * simHz),
  backswingTicks: Math.round(def.backswingSeconds * simHz),
  baseAttackTicks: Math.round(def.baseAttackTimeSeconds * simHz),
  projectileSpeed: def.projectileSpeed / simHz,
});
