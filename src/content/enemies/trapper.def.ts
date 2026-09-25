import type { EnemyDef } from "@domain/public";

/**
 * The trapper: a ranged enemy that throws a net to root the hero where it stands, holding it for
 * the rest of its pack. The archer's body and pace, a little tougher, a lighter shot. An elite also
 * looses a heavy arrow; a boss looses the arrow and brings adds. Every number is a starting value
 * design retunes here.
 */
export const trapperDef = {
  id: "trapper",
  health: 320, // tunable
  healthRegen: 0.5, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 2, // tunable
  magicResistance: 0,
  movementSpeed: 260, // tunable
  turnRate: 0.6, // tunable
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 16, // tunable
    range: 500, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.8, // tunable
    projectileSpeed: 900, // tunable
    projectileRadius: 10, // tunable
    atlasFrame: "disc",
    tint: 0x2e8b7a, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 1500, // tunable
  experience: 55, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [{ id: "root_net", condition: { kind: "always" } }],
  eliteAbility: { id: "arrow", condition: { kind: "always" } },
  bossAbilities: [
    { id: "arrow", condition: { kind: "always" } },
    { id: "summon_adds", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "ranged_holder",
  atlasFrame: "square_dot",
  tint: 0x2e8b7a, // tunable
} as const satisfies EnemyDef;
