import type { FormDef } from "@domain/public";

/**
 * Skein, the one form the hero has: a ranged caster wearing the spec's hull, with the source
 * game's attribute values and per-point conversions at patch 7.35 as starting values, the ten
 * spells the Invoke kit composes from, and the disc every unit is drawn with. Regeneration
 * is per second here; the world converts it once. Every number is a starting value design
 * retunes here.
 */
export const skeinDef = {
  id: "skein",
  body: {
    collisionRadius: 27, // tunable
    boundRadius: 24, // tunable
    selectionRadius: 32, // tunable
  },
  attributes: {
    strength: 18, // tunable
    agility: 14, // tunable
    intelligence: 15, // tunable
  },
  attributeGains: {
    strength: 2.4, // tunable
    agility: 1.9, // tunable
    intelligence: 4.6, // tunable
  },
  conversions: {
    healthPerStrength: 22, // tunable
    healthRegenPerStrength: 0.1, // tunable
    manaPerIntelligence: 12, // tunable
    manaRegenPerIntelligence: 0.05, // tunable
    armourPerAgility: 0.1667, // tunable
    attackSpeedPerAgility: 1, // tunable
  },
  baseStats: {
    maxHealth: 120, // tunable
    healthRegen: 0.25, // tunable
    maxMana: 75, // tunable
    manaRegen: 0, // tunable
    armour: 0, // tunable
    attackSpeed: 100, // tunable
    magicResistance: 0.25, // tunable
  },
  abilities: [
    "hoarfrost",
    "wane",
    "glacier",
    "siphon",
    "updraft",
    "quicken",
    "zenith",
    "emberling",
    "bolide",
    "clarion",
  ],
  kit: "invoke",
  atlasFrame: "disc",
} as const satisfies FormDef;
