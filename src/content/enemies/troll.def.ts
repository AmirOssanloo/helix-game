import type { EnemyDef } from "@domain/public";

/**
 * The troll: a hardy melee enemy that heals itself once it is below half its health, so it has to
 * be finished, not worn down. The hero's body, slower than the hero, high regeneration. An elite
 * also slams beside the hero; a boss slams and charges. Every number is a starting value design
 * retunes here.
 */
export const trollDef = {
  id: "troll",
  health: 650, // tunable
  healthRegen: 3, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 3, // tunable
  magicResistance: 0.1, // tunable
  movementSpeed: 235, // tunable
  turnRate: 0.45, // tunable
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 26, // tunable
    range: 100, // tunable
    acquireRadius: 650, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.6, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x9aa33b, // tunable
  },
  aggroRadius: 650, // tunable
  leashRadius: 1400, // tunable
  experience: 85, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
  ],
  eliteAbility: {
    id: "slam",
    condition: { kind: "target_within", distance: 250 },
  }, // tunable
  bossAbilities: [
    { id: "slam", condition: { kind: "target_within", distance: 250 } }, // tunable
    { id: "charge", condition: { kind: "always" } },
  ],
  statuses: [],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x9aa33b, // tunable
} as const satisfies EnemyDef;
