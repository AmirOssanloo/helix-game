/**
 * What one unit's attack is, in the designer's units: what it lands, how far it reaches, how
 * far it looks for something to hit, the two stages either side of the shot, the time from
 * one shot to the next before attack speed scales it, and the projectile it fires. The hero
 * definition and every archetype carry one, so the attack rule reads one shape whoever is
 * swinging.
 *
 * Seconds and per-second speeds are converted into ticks and per-tick steps once, when the
 * world is created, so nothing multiplies by the step rate at the moment of a shot.
 */
export type AttackDef = Readonly<{
  damage: number;
  /** Centre to centre, before the attacker's and the target's bound radii are added to it. */
  range: number;
  /** How far an attack-move, and a behaviour that acquires, looks for something to attack. */
  acquireRadius: number;
  pointSeconds: number;
  backswingSeconds: number;
  /** The time from one shot to the next at an unhurried attack speed. */
  baseAttackTimeSeconds: number;
  /** World units per second. A shot is a homing projectile; nothing attacks in melee yet. */
  projectileSpeed: number;
  projectileRadius: number;
  /** The frame the projectile is drawn with, and the colour it is drawn in. */
  atlasFrame: string;
  tint: number;
}>;
