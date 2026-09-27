import type { RunScope } from "../entities/world-state";
import type { LevelSchemas } from "./level-schemas";
import type { ValidationContext } from "./registry-checks";
import type { Schema } from "./schema";

/**
 * What a kind's numbers do under the tuning surface: the word its keys name it by, the title
 * of its folder in the panel, and how the one record of run scope read from a definition is
 * rebuilt from the world's copy once a tuning command has written it.
 */
export type KindTuning<Kind extends string, Def> = Readonly<{
  kind: Kind;
  title: string;
  rebuild(run: RunScope, id: string, def: Def, simHz: number): void;
}>;

/**
 * Where a kind sits in validation order, and its schema. A gate kind is checked first and any
 * fault in it stops validation there, since every other schema is built from what it holds:
 * the hero's orb level cap fixes every table's length. A levelled kind's schema is built from
 * the schemas for that cap.
 */
type KindSchema<Def> =
  | Readonly<{ stage: "gate"; schema: Schema<Def> }>
  | Readonly<{ stage: "levelled"; schema(levels: LevelSchemas): Schema<Def> }>;

/** What every kind holds: its field in the registry, its cross-reference checks, and its tuning, `null` for a kind with no number the tuning surface reaches. */
type KindCommon<
  Field extends string,
  Def,
  Kind extends string | null,
> = Readonly<{
  field: Field;
  check(context: ValidationContext, file: string, def: Def): void;
  tuning: Kind extends string ? KindTuning<Kind, Def> : null;
}>;

/**
 * A kind the registry holds a list of: the content folder each definition's file sits in, the
 * name other definitions reference one by, and the id namespace a duplicate is refused in, by
 * the words its fault names it with. Kinds that share a namespace share its words.
 */
export type ListKind<
  Field extends string,
  Def,
  Kind extends string | null,
> = KindCommon<Field, Def, Kind> &
  KindSchema<Def> &
  Readonly<{
    shape: "list";
    folder: string;
    namespace: string;
    nameOf(def: Def): string;
  }>;

/** A kind the registry holds exactly one of, and the content file it lives in. */
export type SingleKind<
  Field extends string,
  Def,
  Kind extends string | null,
> = KindCommon<Field, Def, Kind> &
  KindSchema<Def> &
  Readonly<{ shape: "single"; file: string }>;

/** Any kind at all, as validation and the tuning surface walk the list. Each call hands a definition back to the kind whose schema passed it. */
export type AnyKind =
  | ListKind<string, unknown, string | null>
  | SingleKind<string, unknown, string | null>;

/** The definition type of a kind, read from its schema, since its check reads the registry this type builds. */
export type DefOfKind<K> =
  K extends Readonly<{ schema: Schema<infer Def> }>
    ? Def
    : K extends Readonly<{ schema(levels: LevelSchemas): Schema<infer Def> }>
      ? Def
      : never;

/** What a kind puts in the registry: a list of its definitions or the one. */
export type ValueOfKind<K> =
  K extends Readonly<{ shape: "list" }>
    ? readonly DefOfKind<K>[]
    : DefOfKind<K>;

/** The registry a list of kinds describes: one field per kind. */
export type RegistryOf<Kinds extends readonly AnyKind[]> = Readonly<{
  [K in Kinds[number] as K["field"]]: ValueOfKind<K>;
}>;

/** The definitions of every kind in `Kinds` whose numbers the tuning surface reaches, by field. */
export type TunableOf<Kinds extends readonly AnyKind[]> = Readonly<{
  [
    K in Kinds[number] as K["tuning"] extends null ? never : K["field"]
  ]: ValueOfKind<K>;
}>;

/** Every word a tunable kind of `Kinds` names its keys by. */
export type KindWordOf<Kinds extends readonly AnyKind[]> = NonNullable<
  Kinds[number]["tuning"]
>["kind"];
