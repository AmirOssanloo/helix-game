import type { EnemyDef } from "@domain/public";

/**
 * The frost raider: a quick melee enemy whose every hit slows the hero, so walking away from it
 * stops working once it lands one. A little slower than the hero until then, the small body. An
 * elite charges the gap; a boss also heals itself below half its health. Every number is a
 * starting value design retunes here.
 */
export const frostRaiderDef = {
  id: "frost_raider",
  health: 60, // tunable
  healthRegen: 0.1, // tunable
  mana: 0,
  manaRegen: 0,
  armour: 1, // tunable
  magicResistance: 0.25, // tunable
  movementSpeed: 240, // tunable
  turnRate: 0.7, // tunable
  body: {
    collisionRadius: 20, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 30, // tunable
    range: 100, // tunable
    acquireRadius: 800, // tunable
    pointSeconds: 0.3, // tunable
    backswingSeconds: 0.3, // tunable
    baseAttackTimeSeconds: 1.1, // tunable
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0x7fd3e8, // tunable
  },
  aggroRadius: 800, // tunable
  leashRadius: 1800, // tunable
  experience: 38, // tunable
  indestructible: false,
  tier: "normal",
  abilities: [],
  eliteAbility: { id: "charge", condition: { kind: "always" } },
  bossAbilities: [
    { id: "self_heal", condition: { kind: "health_below", fraction: 0.5 } }, // tunable
    { id: "charge", condition: { kind: "always" } },
  ],
  statuses: ["frost_attack"],
  behaviour: "melee_chaser",
  atlasFrame: "square",
  tint: 0x7fd3e8, // tunable
} as const satisfies EnemyDef;
