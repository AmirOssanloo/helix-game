import { BASE_ATTACK_SPEED } from "../definitions/attack-state";
import type { UnitRecord } from "../definitions/unit-state";
import { deriveFromBase } from "../stats/derived";
import type { Unit } from "./unit";

/**
 * Puts `record`'s definition on `unit`: which definition it is, the body it wears, and
 * whether damage leaves it standing at one health. The hero wears a form instead, and takes
 * its body from that form every tick.
 */
export const wearDefinition = (unit: Unit, record: UnitRecord): void => {
  const def = record.def;

  unit.definitionId = def.id;
  unit.collisionRadius = def.body.collisionRadius;
  unit.boundRadius = def.body.boundRadius;
  unit.selectionRadius = def.body.selectionRadius;
  unit.indestructible = def.indestructible;
};

/**
 * Stores `record`'s base on `unit`, the definition's health first multiplied by
 * `healthMultiplier`, which is what a tier asks, derives the seven values from it through the
 * unit's modifier table, and fills its health and mana to the maximums just derived. Called
 * once, after every modifier row the spawn writes is on the table, so a unit spawned after
 * the stats system has run carries real maximums on its spawn tick. The stats system derives
 * from the same base every tick after, so a row added later is in the next tick's values,
 * and a retune of the definition reaches only the units spawned after it.
 */
export const fillFromDefinition = (
  unit: Unit,
  record: UnitRecord,
  healthMultiplier: number,
): void => {
  const def = record.def;
  const base = unit.baseStats;

  base.maxHealth = def.health * healthMultiplier;
  base.healthRegen = record.healthRegenPerTick;
  base.maxMana = def.mana;
  base.manaRegen = record.manaRegenPerTick;
  base.armour = def.armour;
  base.attackSpeed = BASE_ATTACK_SPEED;
  base.magicResistance = def.magicResistance;
  deriveFromBase(unit);
  unit.resources.health = unit.stats.maxHealth;
  unit.resources.mana = unit.stats.maxMana;
};
