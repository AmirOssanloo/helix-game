import type { EnemyDef } from "@domain/public";

/**
 * The fast runner: the quickest of the first four, still slower than the hero, and dead to one of
 * the hero's attacks, so it is met rather than kited; the smallest body so it is drawn as the small
 * square and two stand abreast in the corridor, and the first of a pack to arrive and to die. It closes to contact and hits quickly and lightly, with no
 * projectile. Every number is a starting value design retunes here.
 */
export const fastRunnerDef = {
  id: "fast_runner",
  health: 25, // tunable
  healthRegen: 0.1, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 250, // tunable
  turnRate: 0.8, // tunable
  body: {
    collisionRadius: 20, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 18, // tunable
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
