import type { Stat } from "../entities/unit-tables";
import type { ModifierTable } from "../stats/modifiers";
import { modifiedValue } from "../stats/modifiers";
import { BASE_ATTACK_SPEED } from "./attack-state";
import type { Attributes, AttributeConversions } from "./form-def";
import type { UnitRecord } from "./unit-state";

/**
 * Where one derived value comes from: the field it is kept in, the modifier stat whose rows
 * change it, the base a unit spawned from a definition stores for it, read from the
 * definition's record and the health multiplier its tier asks, and three writes of its field.
 * `derive` writes a form's value: the base plus what its driving attribute is worth at the
 * form's conversions, the base alone for a value no attribute drives, run through the modifier
 * pipeline for its stat. `modify` writes a base run through the pipeline, and `copy` a value
 * from one record to another.
 *
 * Each names its field and keeps the arithmetic inside it rather than reading or writing by key
 * or handing a value across a call: a fractional number read or written by key, or passed to
 * or returned from a call the engine does not inline, is boxed on the heap, and the stats
 * system writes every value of every unit with a live row every tick. A keyed copy over every
 * stat of a unit with none costs the tick about twenty times what a named one does.
 */
export type StatSource<Key extends string> = Readonly<{
  key: Key;
  modifier: Stat;
  fromDefinition: (record: UnitRecord, healthMultiplier: number) => number;
  derive: (
    base: Readonly<StatValues<Key>>,
    attributes: Readonly<Attributes>,
    conversions: Readonly<AttributeConversions>,
    table: Readonly<ModifierTable>,
    into: StatValues<Key>,
  ) => void;
  modify: (
    base: Readonly<StatValues<Key>>,
    table: Readonly<ModifierTable>,
    into: StatValues<Key>,
  ) => void;
  copy: (from: Readonly<StatValues<Key>>, into: StatValues<Key>) => void;
}>;

/** One number per key of a key list: what a unit carries for each derived value. */
export type StatValues<Key extends string> = Record<Key, number>;

/** One entry of a key list, its field name read from its key so each of its writes names the field. */
export const statSource = <Key extends string>(
  source: StatSource<Key>,
): StatSource<Key> => source;

/**
 * The one key list of the derived values, in the order every walk over them takes. A stat is
 * added here and nowhere else in the rules: the unit creates and clears it, a spawn stores its
 * base, and the stats system derives it by walking this list. Built once at module load.
 */
export const STAT_SOURCES = [
  statSource({
    key: "maxHealth",
    modifier: "max_health",
    fromDefinition: (record, healthMultiplier) =>
      record.def.health * healthMultiplier,
    derive: (base, attributes, conversions, table, into) => {
      into.maxHealth = modifiedValue(
        base.maxHealth + attributes.strength * conversions.healthPerStrength,
        table,
        "max_health",
      );
    },
    modify: (base, table, into) => {
      into.maxHealth = modifiedValue(base.maxHealth, table, "max_health");
    },
    copy: (from, into) => {
      into.maxHealth = from.maxHealth;
    },
  }),
  statSource({
    key: "healthRegen",
    modifier: "health_regen",
    fromDefinition: (record) => record.healthRegenPerTick,
    derive: (base, attributes, conversions, table, into) => {
      into.healthRegen = modifiedValue(
        base.healthRegen +
          attributes.strength * conversions.healthRegenPerStrength,
        table,
        "health_regen",
      );
    },
    modify: (base, table, into) => {
      into.healthRegen = modifiedValue(base.healthRegen, table, "health_regen");
    },
    copy: (from, into) => {
      into.healthRegen = from.healthRegen;
    },
  }),
  statSource({
    key: "maxMana",
    modifier: "max_mana",
    fromDefinition: (record) => record.def.mana,
    derive: (base, attributes, conversions, table, into) => {
      into.maxMana = modifiedValue(
        base.maxMana +
          attributes.intelligence * conversions.manaPerIntelligence,
        table,
        "max_mana",
      );
    },
    modify: (base, table, into) => {
      into.maxMana = modifiedValue(base.maxMana, table, "max_mana");
    },
    copy: (from, into) => {
      into.maxMana = from.maxMana;
    },
  }),
  statSource({
    key: "manaRegen",
    modifier: "mana_regen",
    fromDefinition: (record) => record.manaRegenPerTick,
    derive: (base, attributes, conversions, table, into) => {
      into.manaRegen = modifiedValue(
        base.manaRegen +
          attributes.intelligence * conversions.manaRegenPerIntelligence,
        table,
        "mana_regen",
      );
    },
    modify: (base, table, into) => {
      into.manaRegen = modifiedValue(base.manaRegen, table, "mana_regen");
    },
    copy: (from, into) => {
      into.manaRegen = from.manaRegen;
    },
  }),
  statSource({
    key: "armour",
    modifier: "armour",
    fromDefinition: (record) => record.def.armour,
    derive: (base, attributes, conversions, table, into) => {
      into.armour = modifiedValue(
        base.armour + attributes.agility * conversions.armourPerAgility,
        table,
        "armour",
      );
    },
    modify: (base, table, into) => {
      into.armour = modifiedValue(base.armour, table, "armour");
    },
    copy: (from, into) => {
      into.armour = from.armour;
    },
  }),
  statSource({
    key: "attackSpeed",
    modifier: "attack_speed",
    fromDefinition: () => BASE_ATTACK_SPEED,
    derive: (base, attributes, conversions, table, into) => {
      into.attackSpeed = modifiedValue(
        base.attackSpeed +
          attributes.agility * conversions.attackSpeedPerAgility,
        table,
        "attack_speed",
      );
    },
    modify: (base, table, into) => {
      into.attackSpeed = modifiedValue(base.attackSpeed, table, "attack_speed");
    },
    copy: (from, into) => {
      into.attackSpeed = from.attackSpeed;
    },
  }),
  statSource({
    key: "magicResistance",
    modifier: "magic_resistance",
    fromDefinition: (record) => record.def.magicResistance,
    derive: (base, _attributes, _conversions, table, into) => {
      into.magicResistance = modifiedValue(
        base.magicResistance,
        table,
        "magic_resistance",
      );
    },
    modify: (base, table, into) => {
      into.magicResistance = modifiedValue(
        base.magicResistance,
        table,
        "magic_resistance",
      );
    },
    copy: (from, into) => {
      into.magicResistance = from.magicResistance;
    },
  }),
] as const;

/** A derived value's field name. */
export type StatKey = (typeof STAT_SOURCES)[number]["key"];

/**
 * The derived values the attributes and the modifier table give, one named field per entry
 * of the key list. A definition writes the level-independent base of each; the unit carries
 * the current value of each. Regeneration is per second in a definition and per tick on a
 * unit.
 */
export type Stats = StatValues<StatKey>;

/**
 * What a record of derived values is made from: a class of its own, so the engine lays every
 * record out on a shape no other object shares. A record made from a plain object literal or
 * read back from text takes the shape of any object whose keys run in the same order, such as
 * the schema that validates a definition's base, whose fields hold objects; a fractional number
 * written to a field of that shape is boxed on the heap at every write. A class also holds
 * every key inside the object, where a plain object built one key at a time holds its later
 * keys outside it.
 */
class StatRecord {}

/** Every value of `sources` at zero: a fresh record, made once with the pool slot or the form. */
export const createStatValues = <Key extends string>(
  sources: readonly StatSource<Key>[],
): StatValues<Key> => {
  const values: Partial<StatValues<Key>> = new StatRecord();

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    if (source !== undefined) {
      values[source.key] = 0;
    }
  }

  return values as StatValues<Key>;
};

/** Every value of `sources` back to zero, in place. */
export const clearStatValues = <Key extends string>(
  sources: readonly StatSource<Key>[],
  values: StatValues<Key>,
): void => {
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    if (source !== undefined) {
      values[source.key] = 0;
    }
  }
};

/** Writes every value of `from` into `into` over `sources`, in place, each by its own copy. */
export const copyStatValues = <Key extends string>(
  sources: readonly StatSource<Key>[],
  from: Readonly<StatValues<Key>>,
  into: StatValues<Key>,
): void => {
  for (let index = 0; index < sources.length; index += 1) {
    sources[index]?.copy(from, into);
  }
};

/** A fresh record of the derived values, every one at zero. */
export const createStats = (): Stats => createStatValues(STAT_SOURCES);

/** Every derived value back to zero, in place. */
export const clearStats = (stats: Stats): void => {
  clearStatValues(STAT_SOURCES, stats);
};
