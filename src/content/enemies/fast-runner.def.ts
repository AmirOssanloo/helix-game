import type { EnemyDef } from "@domain/public";

/**
 * The fast runner: faster than the hero so it cannot be walked away from forever, the smallest
 * body so it is drawn as the small square and passes a grunt in the corridor, and the first of
 * a pack to arrive and to die. It closes to contact and hits quickly and lightly, with no
 * projectile. Every number is a starting value design retunes here.
 */
export const fastRunnerDef = {
  id: "fast_runner",
  health: 220, // tunable
  healthRegen: 0.5, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 340, // tunable
  turnRate: 0.8, // tunable
  body: {
    collisionRadius: 16, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 10, // tunable
    range: 100, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.3, // tunable
    backswingSeconds: 0.3, // tunable
    baseAttackTimeSeconds: 1, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0xf2c14e, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 2000, // tunable
  experience: 30, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: null,
  bossAbilities: [],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0xf2c14e, // tunable
} as const satisfies EnemyDef;
