import type { FormDef } from "@domain/public";
import { defineFactory } from "../factories/define-factory";

/**
 * A form definition with a counted id, `form_1`, `form_2`, the same every run: the spec's hull,
 * round attribute numbers a derived value is easy to check against, no regeneration, one
 * ability, the Invoke kit, and the unit disc. A spec overrides what it is about.
 */
export const makeFormDef = defineFactory<FormDef>((sequence) => ({
  id: `form_${sequence}`,
  body: { collisionRadius: 27, boundRadius: 24, selectionRadius: 32 },
  attributes: { strength: 10, agility: 10, intelligence: 10 },
  attributeGains: { strength: 1, agility: 1, intelligence: 1 },
  conversions: {
    healthPerStrength: 20,
    healthRegenPerStrength: 0,
    manaPerIntelligence: 10,
    manaRegenPerIntelligence: 0,
    armourPerAgility: 0.2,
    attackSpeedPerAgility: 1,
  },
  baseStats: {
    maxHealth: 100,
    healthRegen: 0,
    maxMana: 50,
    manaRegen: 0,
    armour: 0,
    attackSpeed: 100,
    magicResistance: 0.25,
  },
  abilities: ["ability_1"],
  kit: "invoke",
  atlasFrame: "disc",
}));
