import type { EnemyDef } from "@domain/public";

/**
 * The tank: three grunts' health behind heavy armour and some magic resistance, so the damage
 * types read apart on it and it is a target for spells rather than for the attack. The largest
 * body, drawn as the large square, which the arena's corridor is closed to. Slow to move, slow
 * to turn, slow to notice, and quick to give up. It closes to contact and hits hardest, with
 * no projectile. Every number is a starting value design retunes here.
 */
export const tankDef = {
  id: "tank",
  health: 1200, // tunable
  healthRegen: 3, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 8, // tunable
  magicResistance: 0.25, // tunable
  movementSpeed: 200, // tunable
  turnRate: 0.3, // tunable
  body: {
    collisionRadius: 50, // tunable
    boundRadius: 44, // tunable
    selectionRadius: 56, // tunable
  },
  attack: {
    damage: 36, // tunable
    range: 100, // tunable
    acquireRadius: 600, // tunable
    pointSeconds: 0.6, // tunable
    backswingSeconds: 0.6, // tunable
    baseAttackTimeSeconds: 2, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0xa9743b, // tunable
  },
  aggroRadius: 600, // tunable
  leashRadius: 1200, // tunable
  experience: 120, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0xa9743b, // tunable
} as const satisfies EnemyDef;
