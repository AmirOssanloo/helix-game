import type { Attributes, FormDef, Stats } from "../definitions/form-def";
import type { ModifierEntry } from "../entities/unit";
import { modifiedValue } from "./modifiers";

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
  modifiers: readonly ModifierEntry[],
  out: Stats,
): Stats => {
  const base = def.baseStats;
  const worth = def.conversions;

  out.maxHealth = modifiedValue(
    base.maxHealth + attributes.strength * worth.healthPerStrength,
    modifiers,
    "max_health",
  );
  out.healthRegen = modifiedValue(
    base.healthRegen + attributes.strength * worth.healthRegenPerStrength,
    modifiers,
    "health_regen",
  );
  out.maxMana = modifiedValue(
    base.maxMana + attributes.intelligence * worth.manaPerIntelligence,
    modifiers,
    "max_mana",
  );
  out.manaRegen = modifiedValue(
    base.manaRegen + attributes.intelligence * worth.manaRegenPerIntelligence,
    modifiers,
    "mana_regen",
  );
  out.armour = modifiedValue(
    base.armour + attributes.agility * worth.armourPerAgility,
    modifiers,
    "armour",
  );
  out.attackSpeed = modifiedValue(
    base.attackSpeed + attributes.agility * worth.attackSpeedPerAgility,
    modifiers,
    "attack_speed",
  );
  out.magicResistance = modifiedValue(
    base.magicResistance,
    modifiers,
    "magic_resistance",
  );

  return out;
};
