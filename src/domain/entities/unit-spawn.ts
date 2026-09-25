import { BASE_ATTACK_SPEED } from "../definitions/attack-state";
import type { UnitRecord } from "../definitions/unit-state";
import { modifiedValue } from "../stats/modifiers";
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
 * Writes the seven derived values from `record` through the unit's modifier table, the
 * definition's health first multiplied by `healthMultiplier`, which is what a tier asks, and fills
 * its health and mana to the maximums just derived. Called once, after every modifier row
 * the spawn writes is on the table: the stats system derives the hero from its active form
 * every tick, and a unit spawned from a definition carries what this wrote, so a row added
 * here is in the values and a row added later is read where it is read live — the speed
 * stack, the attack rule — rather than from these.
 */
export const fillFromDefinition = (
  unit: Unit,
  record: UnitRecord,
  healthMultiplier: number,
): void => {
  const def = record.def;
  const stats = unit.stats;
  const modifiers = unit.modifiers;

  stats.maxHealth = modifiedValue(
    def.health * healthMultiplier,
    modifiers,
    "max_health",
  );
  stats.healthRegen = modifiedValue(
    record.healthRegenPerTick,
    modifiers,
    "health_regen",
  );
  stats.maxMana = modifiedValue(def.mana, modifiers, "max_mana");
  stats.manaRegen = modifiedValue(
    record.manaRegenPerTick,
    modifiers,
    "mana_regen",
  );
  stats.armour = modifiedValue(def.armour, modifiers, "armour");
  stats.attackSpeed = modifiedValue(
    BASE_ATTACK_SPEED,
    modifiers,
    "attack_speed",
  );
  stats.magicResistance = modifiedValue(
    def.magicResistance,
    modifiers,
    "magic_resistance",
  );
  unit.resources.health = stats.maxHealth;
  unit.resources.mana = stats.maxMana;
};
