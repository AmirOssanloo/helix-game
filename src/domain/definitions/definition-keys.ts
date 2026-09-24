import type { AbilityDef } from "./ability-def";
import type { EnemyDef, SummonDef } from "./enemy-def";
import type { FormDef } from "./form-def";
import type { HeroDef } from "./hero-def";
import type { SpellDef } from "./spell-def";
import type { StatusDef } from "./status-def";
import type { TuningUnit } from "./tuning-def";

/** The kinds of definition whose numbers the tuning surface reaches: every kind a unit, a cast, or a status reads. */
export type DefinitionKind =
  "hero" | "form" | "spell" | "ability" | "status" | "enemy" | "summon";

/**
 * A tuning key that names one number of one definition: `def:<kind>:<id>:<field path>`, with
 * `:<index>` after the path when the number is an entry of a table. The path is the property
 * path verbatim, a dot per nesting level, and an entry of a list of objects is a segment of
 * its own. The index is the array index verbatim, so `:2` is level 3. A key of this shape that
 * names nothing is refused when the command applies; content's own key type refuses it at
 * compile time.
 */
export type DefinitionKey = `def:${DefinitionKind}:${string}`;

/** The hero definition is the one of its kind and carries no id, so its keys name it by this one. */
export const HERO_DEFINITION_ID = "hero";

/** A definition field the tuning surface never reaches although it holds a number: a colour is not a slider. */
const UNTUNED_FIELDS: ReadonlySet<string> = new Set(["tint"]);

/** The path segment of `index` in a list of objects, or of a table entry's position. */
type IndexKeys<T extends readonly unknown[]> = Exclude<
  keyof T,
  keyof (readonly unknown[])
> &
  `${number}`;

/** `path` extended by `segment`, the root path being empty. */
type Join<P extends string, S extends string> = P extends "" ? S : `${P}.${S}`;

/** Every field path under `T`, in the key's form: a table's entries after a colon, anything else after a dot. */
type FieldPaths<T, P extends string> = T extends number
  ? P
  : T extends readonly number[]
    ? number extends T["length"]
      ? `${P}:${number}`
      : `${P}:${IndexKeys<T>}`
    : T extends readonly unknown[]
      ? number extends T["length"]
        ? never
        : { [I in IndexKeys<T>]: FieldPaths<T[I], Join<P, I>> }[IndexKeys<T>]
      : T extends object
        ? {
            [K in Exclude<keyof T & string, "tint">]: FieldPaths<
              T[K],
              Join<P, K>
            >;
          }[Exclude<keyof T & string, "tint">]
        : never;

/**
 * The exact keys of one definition of `Kind`, written as a constant: `def:<kind>:<id>:` and
 * every numeric field path under it. Content builds its key union from this over its own
 * constants, so a key naming a field, an id, or an entry that does not exist fails to compile.
 */
export type DefinitionKeysOf<Kind extends DefinitionKind, T> = T extends {
  readonly id: infer Id extends string;
}
  ? `def:${Kind}:${Id}:${FieldPaths<T, "">}`
  : `def:${Kind}:${typeof HERO_DEFINITION_ID}:${FieldPaths<T, "">}`;

/** Every definition the tuning surface reaches, in the designer's units: the registry's kinds a world reads a number from. */
export type TunableDefinitions = Readonly<{
  hero: HeroDef;
  forms: readonly FormDef[];
  spells: readonly SpellDef[];
  abilities: readonly AbilityDef[];
  statuses: readonly StatusDef[];
  enemies: readonly EnemyDef[];
  summons: readonly SummonDef[];
}>;

/**
 * The unit a definition field is written in, read from its name as the coding standard
 * names fields: seconds end in `Seconds` or are `seconds`, a rate per second is a regeneration
 * or a speed a unit or a shot moves at, the turn rate is radians per the spec's turn step, an
 * angle ends in `Degrees`. Everything else is read as written: a damage, a range, a count, an
 * attack speed, a fraction. A table's field is named by the property that holds it, so
 * `cooldownSeconds.byLevel` is seconds.
 */
export const definitionFieldUnit = (path: string): TuningUnit => {
  const segments = path.split(".");
  let name = "";

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index] ?? "";

    if (segment !== "byLevel" && !/^\d+$/.test(segment)) {
      name = segment;

      break;
    }
  }

  if (name === "seconds" || name.endsWith("Seconds")) {
    return "seconds";
  }

  if (
    name === "perSecond" ||
    name.endsWith("Regen") ||
    name.includes("RegenPer") ||
    name === "movementSpeed" ||
    name === "projectileSpeed" ||
    name === "speed"
  ) {
    return "units_per_second";
  }

  if (name === "turnRate") {
    return "radians_per_turn_step";
  }

  if (name.endsWith("Degrees")) {
    return "degrees";
  }

  return "as_written";
};

/**
 * What a walk over a definition hands for each number: its field path, its table index or
 * `null`, and the object or array holding it with the property it sits under, so whoever
 * walks may write it.
 */
export type NumberVisit = (
  path: string,
  index: number | null,
  container: Record<string, unknown> | unknown[],
  property: string | number,
  value: number,
) => void;

const isNumberTable = (value: readonly unknown[]): boolean =>
  value.length > 0 && value.every((entry) => typeof entry === "number");

const joinPath = (path: string, segment: string): string =>
  path === "" ? segment : `${path}.${segment}`;

const walkValue = (
  value: unknown,
  path: string,
  container: Record<string, unknown> | unknown[],
  property: string | number,
  visit: NumberVisit,
): void => {
  if (typeof value === "number") {
    visit(path, null, container, property, value);

    return;
  }

  if (Array.isArray(value)) {
    const list: unknown[] = value;

    if (isNumberTable(list)) {
      for (let index = 0; index < list.length; index += 1) {
        visit(path, index, list, index, list[index] as number);
      }

      return;
    }

    for (let index = 0; index < list.length; index += 1) {
      walkValue(list[index], joinPath(path, String(index)), list, index, visit);
    }

    return;
  }

  if (value !== null && typeof value === "object") {
    walkFields(value as Record<string, unknown>, path, visit);
  }
};

const walkFields = (
  record: Record<string, unknown>,
  path: string,
  visit: NumberVisit,
): void => {
  for (const field of Object.keys(record)) {
    if (!UNTUNED_FIELDS.has(field)) {
      walkValue(record[field], joinPath(path, field), record, field, visit);
    }
  }
};

/** Calls `visit` for every number `def` holds that the tuning surface reaches, in the order the definition writes its fields. */
export const walkDefinitionNumbers = (
  def: object,
  visit: NumberVisit,
): void => {
  walkFields(def as Record<string, unknown>, "", visit);
};

/** The key of the number at `path`, and at `index` when it is a table entry, of the definition `id` of `kind`. */
export const definitionKeyOf = (
  kind: DefinitionKind,
  id: string,
  path: string,
  index: number | null,
): DefinitionKey =>
  index === null
    ? `def:${kind}:${id}:${path}`
    : `def:${kind}:${id}:${path}:${String(index)}`;

/** Whether `key` names a definition field rather than an entry of the tuning table. */
export const isDefinitionKey = (key: string): key is DefinitionKey =>
  key.startsWith("def:");

/**
 * One number the tuning surface reaches: its key, the definition it belongs to, where in the
 * definition it sits, its value in the designer's units as content wrote it, and the unit
 * that value is converted from.
 */
export type DefinitionField = Readonly<{
  key: DefinitionKey;
  kind: DefinitionKind;
  id: string;
  path: string;
  index: number | null;
  value: number;
  unit: TuningUnit;
}>;

/** Calls `each` with every tunable definition in `defs`, its kind, and its id, the hero first. */
export const forEachTunableDefinition = (
  defs: TunableDefinitions,
  each: (kind: DefinitionKind, id: string, def: object) => void,
): void => {
  each("hero", HERO_DEFINITION_ID, defs.hero);

  const lists: readonly (readonly [
    DefinitionKind,
    readonly Readonly<{ id: string }>[],
  ])[] = [
    ["form", defs.forms],
    ["spell", defs.spells],
    ["ability", defs.abilities],
    ["status", defs.statuses],
    ["enemy", defs.enemies],
    ["summon", defs.summons],
  ];

  for (const [kind, list] of lists) {
    for (const def of list) {
      each(kind, def.id, def);
    }
  }
};

/**
 * Every number of every definition in `defs` the tuning surface reaches, in the designer's
 * units: the hero, then each kind in registry order, each definition's fields in the order it
 * writes them. The panel generates a slider from each; nothing here converts.
 */
export const definitionFields = (
  defs: TunableDefinitions,
): readonly DefinitionField[] => {
  const fields: DefinitionField[] = [];

  forEachTunableDefinition(defs, (kind, id, def): void => {
    walkDefinitionNumbers(def, (path, index, _container, _property, value) => {
      fields.push({
        key: definitionKeyOf(kind, id, path, index),
        kind,
        id,
        path,
        index,
        value,
        unit: definitionFieldUnit(path),
      });
    });
  });

  return fields;
};
