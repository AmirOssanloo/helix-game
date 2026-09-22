import type { EnemyDef } from "@domain/public";

/**
 * The training dummy: it stands where it is put, never moves, never attacks, and never dies.
 * Damage leaves it at one health and the number still shows the whole hit, so every spell and
 * every attack can be read off it. It carries a mana pool deep enough for a burn at any orb
 * level to take its whole table off it, and regenerates neither pool, so what a spell took is
 * still readable afterwards. Every field it does not use holds its neutral value, which for a
 * body that never acts is most of them. Every number is a starting value design retunes here.
 */
export const trainingDummyDef = {
  id: "training_dummy",
  health: 1000, // tunable
  healthRegen: 0,
  mana: 1000, // tunable
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 0,
  turnRate: 0,
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attack: {
    damage: 0,
    range: 0,
    acquireRadius: 0,
    pointSeconds: 0,
    backswingSeconds: 0,
    baseAttackTimeSeconds: 0,
    projectileSpeed: 0,
    projectileRadius: 0,
    atlasFrame: "disc",
    tint: 0xffffff,
  },
  aggroRadius: 0,
  leashRadius: 0,
  experience: 0,
  indestructible: true,
  tier: "normal",
  abilities: [],
  behaviour: "stationary",
  atlasFrame: "square_outline",
  tint: 0xffffff, // tunable
} as const satisfies EnemyDef;
