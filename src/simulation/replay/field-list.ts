import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import {
  ABSENT,
  beginHash,
  finishHash,
  floats,
  mixFloat,
  mixSmall,
  mixText,
  PRESENT,
  sameFloats,
} from "./hash-words";

/**
 * Writes a number of `record` into `into` at slot `at`. The number is written, never returned,
 * because a fractional number returned from a call the engine does not inline is a heap object.
 */
export type NumberRead<T> = (record: T, into: Float64Array, at: number) => void;

/** As `NumberRead`, answering whether there is a number; nothing is written when there is none. */
export type NullableNumberRead<T> = (
  record: T,
  into: Float64Array,
  at: number,
) => boolean;

/** What a leaf of the state holds, for a walk over every leaf to know how to change it by one step. */
export type LeafKind =
  | "number"
  | "nullable_number"
  | "text"
  | "flag"
  | "numbers"
  | "texts"
  | "table"
  | "slot";

/** One value the state hashes: its canonical path and what it holds. */
export type Leaf = Readonly<{ path: string; kind: LeafKind }>;

/** One key the state leaves out, by its path, with the reason. */
export type ExcludedPath = Readonly<{ path: string; reason: string }>;

/**
 * One entry of a record's field list: every leaf under it, in the order they are hashed, and
 * every key under it that is left out; a hash of those values; and the path and both values of the first one on
 * which two records differ, or `null`. A path names what the value is, not where the record
 * keeps it, so a change of layout rewrites the reads and keeps the paths and their order.
 */
export type Field<T> = Readonly<{
  leaves: readonly Leaf[];
  excluded: readonly ExcludedPath[];
  hash: (record: T) => void;
  difference: (a: T, b: T) => string | null;
}>;

/** A key of a record that is left out of the state, with the reason. */
export type Excluded = Readonly<{ leftOut: string }>;

/** The keys of every member of a union, which is a record's keys when it is no union. */
type KeysOf<T> = T extends unknown ? keyof T : never;

/** One entry for every key of `T`, in the order the canonical sequence hashes them. */
export type FieldTable<T> = {
  readonly [Key in KeysOf<T>]: Field<T> | Excluded;
};

/** A record's field list: its entries in their canonical order, and the keys it leaves out with their reasons. */
export type FieldList<T> = Readonly<{
  fields: readonly Field<T>[];
  excluded: readonly Readonly<{ key: string; reason: string }>[];
}>;

const isExcluded = <T>(entry: Field<T> | Excluded): entry is Excluded =>
  "leftOut" in entry;

/**
 * The field list of `T` from a table with one entry per key, so a key added to the record and
 * not to the table fails the typecheck, naming the key and the record.
 */
export const fieldsOf = <T>(table: FieldTable<T>): FieldList<T> => {
  const fields: Field<T>[] = [];
  const excluded: { key: string; reason: string }[] = [];

  for (const [key, entry] of Object.entries<Field<T> | Excluded>(table)) {
    if (isExcluded(entry)) {
      excluded.push({ key, reason: entry.leftOut });
    } else {
      fields.push(entry);
    }
  }

  return { fields, excluded };
};

/** A key left out of the state, with the reason a reader is given. */
export const excluded = (reason: string): Excluded => ({ leftOut: reason });

export const hashFields = <T>(list: FieldList<T>, record: T): void => {
  const fields = list.fields;

  for (let index = 0; index < fields.length; index += 1) {
    fields[index]?.hash(record);
  }
};

export const fieldsDifference = <T>(
  list: FieldList<T>,
  a: T,
  b: T,
): string | null => {
  const fields = list.fields;

  for (let index = 0; index < fields.length; index += 1) {
    const difference = fields[index]?.difference(a, b) ?? null;

    if (difference !== null) {
      return difference;
    }
  }

  return null;
};

export const leavesOf = <T>(list: FieldList<T>, prefix: string): Leaf[] =>
  list.fields.flatMap((field) =>
    field.leaves.map((leaf) => ({ path: prefix + leaf.path, kind: leaf.kind })),
  );

/** The hash of `record` over `list`, from a fresh start. */
export const hashRecord = <T>(list: FieldList<T>, record: T): number => {
  beginHash();
  hashFields(list, record);

  return finishHash();
};

/** The first path on which two records differ over `list`, with both values, or `null`. */
export const recordDifference = <T>(
  list: FieldList<T>,
  a: T,
  b: T,
): string | null => fieldsDifference(list, a, b);

export const excludedOf = <T>(
  list: FieldList<T>,
  prefix: string,
): ExcludedPath[] => [
  ...list.excluded.map((entry) => ({
    path: prefix + entry.key,
    reason: entry.reason,
  })),
  ...list.fields.flatMap((field) =>
    field.excluded.map((entry) => ({
      path: prefix + entry.path,
      reason: entry.reason,
    })),
  ),
];

/** Every key `list` leaves out, at any depth, with its reason. */
export const excludedOfList = <T>(list: FieldList<T>): ExcludedPath[] =>
  excludedOf(list, "");

/** Every leaf `list` hashes, in order. */
export const leavesOfList = <T>(list: FieldList<T>): Leaf[] =>
  leavesOf(list, "");

export const number = <T>(name: string, read: NumberRead<T>): Field<T> => ({
  leaves: [{ path: name, kind: "number" }],
  excluded: [],
  hash: (record) => {
    read(record, floats, 0);
    mixFloat();
  },
  difference: (a, b) => {
    read(a, floats, 0);
    read(b, floats, 1);

    return sameFloats()
      ? null
      : `${name}: ${String(floats[0])} vs ${String(floats[1])}`;
  },
});

export const nullableNumber = <T>(
  name: string,
  read: NullableNumberRead<T>,
): Field<T> => ({
  leaves: [{ path: name, kind: "nullable_number" }],
  excluded: [],
  hash: (record) => {
    if (read(record, floats, 0)) {
      mixSmall(PRESENT);
      mixFloat();
    } else {
      mixSmall(ABSENT);
    }
  },
  difference: (a, b) => {
    const left = read(a, floats, 0);
    const right = read(b, floats, 1);

    if (left === right && (!left || sameFloats())) {
      return null;
    }

    return `${name}: ${left ? String(floats[0]) : "null"} vs ${right ? String(floats[1]) : "null"}`;
  },
});

/** An id, or `null`. Ids are integers, so they are read as they are. */
export const nullableId = <T>(
  name: string,
  read: (record: T) => EntityId | null,
): Field<T> =>
  nullableNumber(name, (record, into, at) => {
    const id = read(record);

    if (id === null) {
      return false;
    }

    into[at] = id;

    return true;
  });

export const text = <T>(
  name: string,
  read: (record: T) => string | null,
): Field<T> => ({
  leaves: [{ path: name, kind: "text" }],
  excluded: [],
  hash: (record) => {
    mixText(read(record));
  },
  difference: (a, b) => {
    const left = read(a);
    const right = read(b);

    return left === right
      ? null
      : `${name}: ${String(left)} vs ${String(right)}`;
  },
});

export const flag = <T>(
  name: string,
  read: (record: T) => boolean,
): Field<T> => ({
  leaves: [{ path: name, kind: "flag" }],
  excluded: [],
  hash: (record) => {
    mixSmall(read(record) ? 1 : 0);
  },
  difference: (a, b) => {
    const left = read(a);
    const right = read(b);

    return left === right
      ? null
      : `${name}: ${String(left)} vs ${String(right)}`;
  },
});

/** The item at `index` of a list a count below its length bounds. */
export const itemAt = <U>(list: readonly U[], index: number): U => {
  const item = list[index];

  assert(item !== undefined, "An index below the count holds an item");

  return item;
};

/** A record inside a record, hashed over its own list. */
export const record = <T, U>(
  name: string,
  read: (record: T) => U,
  list: FieldList<U>,
): Field<T> => ({
  leaves: leavesOf(list, `${name}.`),
  excluded: excludedOf(list, `${name}.`),
  hash: (outer) => {
    hashFields(list, read(outer));
  },
  difference: (a, b) => {
    const difference = fieldsDifference(list, read(a), read(b));

    return difference === null ? null : `${name}.${difference}`;
  },
});
