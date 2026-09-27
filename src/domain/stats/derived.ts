import type {
  Attributes,
  AttributeConversions,
  FormDef,
  Stats,
} from "../definitions/form-def";
import type { StatSource, StatValues } from "../definitions/stat-keys";
import { copyStatValues, STAT_SOURCES } from "../definitions/stat-keys";
import type { Unit } from "../entities/unit";
import type { ModifierTable } from "./modifiers";
import { applyModifiersOver } from "./modifiers";

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
 * Writes every value of `sources` into `out`: the base plus what its driving attribute is
 * worth at `conversions`, the base alone for a value no attribute drives, run through the
 * modifier pipeline for its stat, so an orb passive now and an item later change a value the
 * same way.
 */
export const deriveOver = <Key extends string>(
  sources: readonly StatSource<Key>[],
  base: Readonly<StatValues<Key>>,
  conversions: AttributeConversions,
  attributes: Readonly<Attributes>,
  modifiers: Readonly<ModifierTable>,
  out: StatValues<Key>,
): StatValues<Key> => {
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    if (source === undefined) {
      continue;
    }

    const worth = source.worth;

    out[source.key] =
      worth === null
        ? base[source.key]
        : base[source.key] +
          attributes[worth.attribute] * conversions[worth.conversion];
  }

  return applyModifiersOver(sources, out, modifiers, out);
};

/**
 * Writes a form's derived values into `out`, over the one key list. The units are the
 * definition's: regeneration is per tick once the form record holds it.
 */
export const deriveStats = (
  def: FormDef,
  attributes: Readonly<Attributes>,
  modifiers: Readonly<ModifierTable>,
  out: Stats,
): Stats =>
  deriveOver(
    STAT_SOURCES,
    def.baseStats,
    def.conversions,
    attributes,
    modifiers,
    out,
  );

/** Writes every value of `sources` of `base` through `table` into `out`, or copies the base when no row is live. */
export const deriveFromBaseOver = <Key extends string>(
  sources: readonly StatSource<Key>[],
  base: Readonly<StatValues<Key>>,
  table: Readonly<ModifierTable>,
  out: StatValues<Key>,
): void => {
  if (table.liveModifierRows === 0) {
    copyStatValues(sources, base, out);
  } else {
    applyModifiersOver(sources, base, table, out);
  }
};

/**
 * Writes the derived values of a unit spawned from a definition: its stored base through its
 * modifier table, or the base alone when no row is live. Health and mana above a maximum that
 * fell are brought down to it, as the hero's regeneration brings the hero's; nothing
 * regenerates here. Spawn runs it once the spawn's rows are written, and the stats system
 * every tick after.
 */
export const deriveFromBase = (unit: Unit): void => {
  const stats = unit.stats;

  deriveFromBaseOver(STAT_SOURCES, unit.baseStats, unit, stats);

  const resources = unit.resources;

  if (resources.health > stats.maxHealth) {
    resources.health = stats.maxHealth;
  }

  if (resources.mana > stats.maxMana) {
    resources.mana = stats.maxMana;
  }
};
