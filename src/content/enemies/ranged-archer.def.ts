import type { EnemyDef } from "@domain/public";

/**
 * The ranged archer: it holds at its attack range and fires a homing arrow at the hero's
 * projectile speed, a hundred short of the hero's own range so the hero wins the trade by
 * stepping back. It casts nothing, but carries a mana pool as deep as Siphon's largest burn, so
 * every level of the burn's table has something to take from a real enemy. Every number is a
 * starting value design retunes here.
 */
export const rangedArcherDef = {
  id: "ranged_archer",
  health: 100, // tunable
  healthRegen: 0.2, // tunable
  mana: 550, // tunable; balance pass 1
  manaRegen: 1, // tunable
  armour: 1, // tunable
  magicResistance: 0,
  movementSpeed: 225, // tunable
  turnRate: 0.6, // tunable
  body: {
    collisionRadius: 32, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 24, // tunable
    range: 500, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.8, // tunable
    projectileSpeed: 900, // tunable
    projectileRadius: 10, // tunable
    atlasFrame: "disc",
    tint: 0x5cb85c, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 1500, // tunable
  experience: 50, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: null,
  bossAbilities: [],
  statuses: [],
  behaviour: "ranged_holder",
  atlasFrame: "square_dot",
  tint: 0x5cb85c, // tunable
} as const satisfies EnemyDef;
