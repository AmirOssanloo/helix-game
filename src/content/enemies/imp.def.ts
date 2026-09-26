import type { EnemyDef } from "@domain/public";

/**
 * The imp: the add a summoner brings, never placed in a pack of its own. Small, quick, and
 * frail, it runs at the hero beside its summoner and dies to one of the hero's attacks. It
 * grants no experience, so a summoner cannot be farmed for what it brings, and it leaves with
 * its summoner or when its lifetime runs out. Every number is a starting value design retunes
 * here.
 */
export const impDef = {
  id: "imp",
  health: 25, // tunable
  healthRegen: 0,
  mana: 0,
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 265, // tunable
  turnRate: 0.8, // tunable
  body: {
    collisionRadius: 20, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 20, // tunable
    range: 100, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.3, // tunable
    backswingSeconds: 0.3, // tunable
    baseAttackTimeSeconds: 1, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x9b6fd1, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 2000, // tunable
  experience: 0,
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: null,
  bossAbilities: [],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x9b6fd1, // tunable
} as const satisfies EnemyDef;
