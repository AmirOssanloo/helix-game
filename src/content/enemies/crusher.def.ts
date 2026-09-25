import type { EnemyDef } from "@domain/public";

/**
 * The crusher: a slow, armoured enemy with the large body that slams the ground once the hero
 * stands beside it, damaging it and throwing it clear. The corridor is closed to it, as to the
 * tank. An elite charges the gap; a boss heals itself below half its health first. Every number
 * is a starting value design retunes here.
 */
export const crusherDef = {
  id: "crusher",
  health: 1000, // tunable
  healthRegen: 2, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 6, // tunable
  magicResistance: 0.1, // tunable
  movementSpeed: 210, // tunable
  turnRate: 0.35, // tunable
  body: {
    collisionRadius: 50, // tunable
    boundRadius: 44, // tunable
    selectionRadius: 56, // tunable
  },
  attack: {
    damage: 30, // tunable
    range: 100, // tunable
    acquireRadius: 600, // tunable
    pointSeconds: 0.6, // tunable
    backswingSeconds: 0.6, // tunable
    baseAttackTimeSeconds: 1.9, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x7a7a8c, // tunable
  },
  aggroRadius: 600, // tunable
  leashRadius: 1200, // tunable
  experience: 110, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [
    { id: "slam", condition: { kind: "target_within", distance: 250 } }, // tunable
  ],
  eliteAbility: { id: "charge", condition: { kind: "always" } },
  bossAbilities: [
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
    { id: "charge", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x7a7a8c, // tunable
} as const satisfies EnemyDef;
