import type { Attributes, FormDef, Stats } from "../definitions/form-def";
import type { Unit } from "../entities/unit";
import type { ModifierTable } from "./modifiers";
import { applyModifiers } from "./modifiers";

/** Writes the attributes a form has at `level` into `out`: the level-one values plus the per-level gains for every level after the first. */
export const attributesAt = (
  def: FormDef,
  level: number,
  out: Attributes,
): Attributes => {
  const levelsGained = level - 1;

  out.strength =
    def.attributes.strength + def.attributeGains.strength * levelsGained;
  out.agility =
    def.attributes.agility + def.attributeGains.agility * levelsGained;
  out.intelligence =
    def.attributes.intelligence +
    def.attributeGains.intelligence * levelsGained;

  return out;
};

/**
 * Writes the seven derived values into `out`. Each is the definition's base plus what the
 * driving attribute is worth, run through the modifier pipeline for its stat, so an orb
 * passive now and an item later change a value the same way. The units are the
 * definition's: regeneration is per tick once the form record holds it.
 */
export const deriveStats = (
  def: FormDef,
  attributes: Readonly<Attributes>,
  modifiers: Readonly<ModifierTable>,
  out: Stats,
): Stats => {
  const base = def.baseStats;
  const worth = def.conversions;

  out.maxHealth =
    base.maxHealth + attributes.strength * worth.healthPerStrength;
  out.healthRegen =
    base.healthRegen + attributes.strength * worth.healthRegenPerStrength;
  out.maxMana =
    base.maxMana + attributes.intelligence * worth.manaPerIntelligence;
  out.manaRegen =
    base.manaRegen + attributes.intelligence * worth.manaRegenPerIntelligence;
  out.armour = base.armour + attributes.agility * worth.armourPerAgility;
  out.attackSpeed =
    base.attackSpeed + attributes.agility * worth.attackSpeedPerAgility;
  out.magicResistance = base.magicResistance;

  return applyModifiers(out, modifiers, out);
};

/**
 * Writes the derived values of a unit spawned from a definition: its stored base through its
 * modifier table, or the base alone when no row is live. Health and mana above a maximum that
 * fell are brought down to it, as the hero's regeneration brings the hero's; nothing
 * regenerates here. Spawn runs it once the spawn's rows are written, and the stats system
 * every tick after.
 */
export const deriveFromBase = (unit: Unit): void => {
  const base = unit.baseStats;
  const stats = unit.stats;

  if (unit.liveModifierRows === 0) {
    stats.maxHealth = base.maxHealth;
    stats.healthRegen = base.healthRegen;
    stats.maxMana = base.maxMana;
    stats.manaRegen = base.manaRegen;
    stats.armour = base.armour;
    stats.attackSpeed = base.attackSpeed;
    stats.magicResistance = base.magicResistance;
  } else {
    applyModifiers(base, unit, stats);
  }

  const resources = unit.resources;

  if (resources.health > stats.maxHealth) {
    resources.health = stats.maxHealth;
  }

  if (resources.mana > stats.maxMana) {
    resources.mana = stats.maxMana;
  }
};
