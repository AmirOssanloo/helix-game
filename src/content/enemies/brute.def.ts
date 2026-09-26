import type { EnemyDef } from "@domain/public";

/**
 * The brute: a heavy melee enemy whose swing stuns the hero on a rhythm, so standing beside it
 * costs the kit for a moment every few seconds. Slower than the hero, drawn the hero's size,
 * three of the hero's attacks like a grunt but a heavier hit, and worth nearly two. An elite slams once the hero is inside the slam's
 * circle; a boss also brings adds and charges the hero, so a boss brute is a bash, a slam, adds,
 * and a charge. Every number is a starting value design retunes here.
 */
export const bruteDef = {
  id: "brute",
  health: 85, // tunable
  healthRegen: 0.2, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 4, // tunable
  magicResistance: 0,
  movementSpeed: 225, // tunable
  turnRate: 0.4, // tunable
  body: {
    collisionRadius: 32, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 46, // tunable
    range: 100, // tunable
    acquireRadius: 650, // tunable
    pointSeconds: 0.5, // tunable
    backswingSeconds: 0.5, // tunable
    baseAttackTimeSeconds: 1.6, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x8c2f39, // tunable
  },
  aggroRadius: 650, // tunable
  leashRadius: 1400, // tunable
  experience: 90, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: {
    id: "slam",
    condition: { kind: "target_within", distance: 250 },
  }, // tunable
  bossAbilities: [
    { id: "slam", condition: { kind: "target_within", distance: 250 } }, // tunable
    { id: "summon_adds", condition: { kind: "always" } },
    { id: "charge", condition: { kind: "always" } },
  ],
  statuses: ["bash"],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x8c2f39, // tunable
} as const satisfies EnemyDef;
