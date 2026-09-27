import type { Stat } from "../entities/unit";
import { BASE_ATTACK_SPEED } from "./attack-state";
import type { Attributes, AttributeConversions } from "./form-def";
import type { UnitRecord } from "./unit-state";

/** What one attribute point is worth toward a derived value: the attribute, and the form's conversion that prices it. */
export type AttributeWorth = Readonly<{
  attribute: keyof Attributes;
  conversion: keyof AttributeConversions;
}>;

/**
 * Where one derived value comes from: the field it is kept in, the modifier stat whose rows
 * change it, what an attribute point is worth toward it on a form, `null` for a value no
 * attribute drives, the base a unit spawned from a definition stores for it, read from
 * the definition's record and the health multiplier its tier asks, and the copy of its value
 * from one record to another. The copy names its field rather than writing by key: it runs for
 * every unit with no live row every tick, and a keyed copy over every stat there costs the
 * tick about twenty times what a named one does.
 */
export type StatSource<Key extends string> = Readonly<{
  key: Key;
  modifier: Stat;
  worth: AttributeWorth | null;
  fromDefinition: (record: UnitRecord, healthMultiplier: number) => number;
  copy: (from: Readonly<StatValues<Key>>, into: StatValues<Key>) => void;
}>;

/** One number per key of a key list: what a unit carries for each derived value. */
export type StatValues<Key extends string> = Record<Key, number>;

/** One entry of a key list, its field name read from its key so its copy names the field. */
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
    worth: { attribute: "strength", conversion: "healthPerStrength" },
    fromDefinition: (record, healthMultiplier) =>
      record.def.health * healthMultiplier,
    copy: (from, into) => {
      into.maxHealth = from.maxHealth;
    },
  }),
  statSource({
    key: "healthRegen",
    modifier: "health_regen",
    worth: { attribute: "strength", conversion: "healthRegenPerStrength" },
    fromDefinition: (record) => record.healthRegenPerTick,
    copy: (from, into) => {
      into.healthRegen = from.healthRegen;
    },
  }),
  statSource({
    key: "maxMana",
    modifier: "max_mana",
    worth: { attribute: "intelligence", conversion: "manaPerIntelligence" },
    fromDefinition: (record) => record.def.mana,
    copy: (from, into) => {
      into.maxMana = from.maxMana;
    },
  }),
  statSource({
    key: "manaRegen",
    modifier: "mana_regen",
    worth: {
      attribute: "intelligence",
      conversion: "manaRegenPerIntelligence",
    },
    fromDefinition: (record) => record.manaRegenPerTick,
    copy: (from, into) => {
      into.manaRegen = from.manaRegen;
    },
  }),
  statSource({
    key: "armour",
    modifier: "armour",
    worth: { attribute: "agility", conversion: "armourPerAgility" },
    fromDefinition: (record) => record.def.armour,
    copy: (from, into) => {
      into.armour = from.armour;
    },
  }),
  statSource({
    key: "attackSpeed",
    modifier: "attack_speed",
    worth: { attribute: "agility", conversion: "attackSpeedPerAgility" },
    fromDefinition: () => BASE_ATTACK_SPEED,
    copy: (from, into) => {
      into.attackSpeed = from.attackSpeed;
    },
  }),
  statSource({
    key: "magicResistance",
    modifier: "magic_resistance",
    worth: null,
    fromDefinition: (record) => record.def.magicResistance,
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
 * Every value of `sources` at zero: a fresh record, made once with the pool slot or the form.
 * The record is read back from its text rather than kept as built. A record built one key at
 * a time holds its later keys outside the object, and every number written there is boxed
 * on the heap, which across the unit pool's two records a slot costs a world some hundred
 * and forty kilobytes; a parsed record holds every key inside the object, as a literal does.
 */
export const createStatValues = <Key extends string>(
  sources: readonly StatSource<Key>[],
): StatValues<Key> => {
  const values: Partial<StatValues<Key>> = {};

  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];

    if (source !== undefined) {
      values[source.key] = 0;
    }
  }

  return JSON.parse(JSON.stringify(values)) as StatValues<Key>;
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
