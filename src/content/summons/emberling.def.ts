import type { SummonDef } from "@domain/public";

/**
 * The emberling: the spirit Emberling spawns beside the hero. It holds its ground while the
 * hero is near, walks back to the follow distance once the hero has left it behind, and
 * shoots the nearest enemy inside its acquire radius for as long as the spell's lifetime
 * lasts. Its health and attack damage are the level-1 numbers; what the orbs add arrives as
 * modifier rows the spell writes on it at spawn, so the definition owns the base and the
 * spell owns the rest. The bound and selection radii, the projectile's size, and the colour
 * its shots carry are this file's, since the catalogue gives the body one radius and the
 * spirit is never selected. Every number is a starting value design retunes here.
 */
export const emberlingDef = {
  id: "emberling",
  health: 300, // tunable
  healthRegen: 0,
  mana: 0,
  manaRegen: 0,
  armour: 0,
  magicResistance: 0,
  movementSpeed: 380, // tunable
  turnRate: 0.6, // tunable, the hero's
  body: {
    collisionRadius: 16, // tunable
    boundRadius: 14, // tunable
    selectionRadius: 20, // tunable
  },
  attack: {
    damage: 22, // tunable
    range: 300, // tunable
    acquireRadius: 600, // tunable
    pointSeconds: 0.3, // tunable
    backswingSeconds: 0.4, // tunable
    baseAttackTimeSeconds: 1.35, // tunable
    projectileSpeed: 900, // tunable
    projectileRadius: 10, // tunable
    atlasFrame: "disc",
    tint: 0xbbbbbb, // tunable
  },
  aggroRadius: 0,
  leashRadius: 0,
  experience: 0,
  indestructible: false,
  tier: "normal",
  abilities: [],
  behaviour: "summon_follow",
  followDistance: 250, // tunable
  atlasFrame: "disc",
  tint: 0xbbbbbb, // tunable
} as const satisfies SummonDef;
