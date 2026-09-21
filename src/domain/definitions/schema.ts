/**
 * The runtime validators every definition schema is built from. A schema is a type guard
 * that also records why it refused, so one pass over a registry names every fault at once
 * rather than the first. Nothing here knows a definition kind; the schemas beside the
 * definition types compose these into one per kind.
 */

/** One reason a value failed its schema: where in the value, and what was expected. */
export type SchemaFault = Readonly<{
  path: string;
  message: string;
}>;

/** A type guard over unknown data that records every fault it finds under `path`. */
export type Schema<T> = (
  value: unknown,
  path: string,
  faults: SchemaFault[],
) => value is T;

/** The shape every id and key in content has: snake_case, starting with a letter. */
export const ID_SHAPE = /^[a-z][a-z0-9_]*$/;

/** The largest tint: three bytes of colour. */
const TINT_MAX = 0xffffff;

const fail = (faults: SchemaFault[], path: string, message: string): false => {
  faults.push({ path, message });

  return false;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/** `key` under `path`, the root path being empty so a top-level field reads as its own name. */
const fieldPathOf = (path: string, key: string): string =>
  path === "" ? key : `${path}.${key}`;

/** Any finite number. */
export const numberSchema: Schema<number> = (
  value,
  path,
  faults,
): value is number =>
  typeof value === "number" && Number.isFinite(value)
    ? true
    : fail(faults, path, "expected a finite number");

/** A finite number no less than zero: a duration, a cost, a radius, a count. */
export const nonNegativeSchema: Schema<number> = (
  value,
  path,
  faults,
): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? true
    : fail(faults, path, "expected a number no less than zero");

/** A whole number no less than zero. */
export const countSchema: Schema<number> = (
  value,
  path,
  faults,
): value is number =>
  Number.isInteger(value) && (value as number) >= 0
    ? true
    : fail(faults, path, "expected a whole number no less than zero");

/** A colour as three bytes. */
export const tintSchema: Schema<number> = (
  value,
  path,
  faults,
): value is number =>
  Number.isInteger(value) &&
  (value as number) >= 0 &&
  (value as number) <= TINT_MAX
    ? true
    : fail(faults, path, "expected a tint between 0x000000 and 0xffffff");

export const stringSchema: Schema<string> = (
  value,
  path,
  faults,
): value is string =>
  typeof value === "string" ? true : fail(faults, path, "expected a string");

/** An id or a key: snake_case, starting with a letter. */
export const idSchema: Schema<string> = (
  value,
  path,
  faults,
): value is string =>
  typeof value === "string" && ID_SHAPE.test(value)
    ? true
    : fail(faults, path, "expected a snake_case id");

export const booleanSchema: Schema<boolean> = (
  value,
  path,
  faults,
): value is boolean =>
  typeof value === "boolean" ? true : fail(faults, path, "expected a boolean");

/** Any plain object, its fields unchecked here: a named effect's fields, which the effect's own schema checks. */
export const recordSchema: Schema<Readonly<Record<string, unknown>>> = (
  value,
  path,
  faults,
): value is Readonly<Record<string, unknown>> =>
  isRecord(value) ? true : fail(faults, path, "expected an object");

/** One of a fixed list of strings, such as a targeting kind or a damage type. */
export const oneOf =
  <T extends string>(values: readonly T[]): Schema<T> =>
  (value, path, faults): value is T =>
    typeof value === "string" && values.includes(value as T)
      ? true
      : fail(faults, path, `expected one of ${values.join(", ")}`);

/** `inner`, or `null`. */
export const nullable =
  <T>(inner: Schema<T>): Schema<T | null> =>
  (value, path, faults): value is T | null =>
    value === null || inner(value, path, faults);

/** An array of `item`s, every one checked. */
export const arrayOf =
  <T>(item: Schema<T>): Schema<readonly T[]> =>
  (value, path, faults): value is readonly T[] => {
    if (!Array.isArray(value)) {
      return fail(faults, path, "expected an array");
    }

    let valid = true;

    for (let index = 0; index < value.length; index += 1) {
      valid = item(value[index], `${path}[${String(index)}]`, faults) && valid;
    }

    return valid;
  };

/** An array of exactly `length` `item`s, such as a level table with one entry per orb level. */
export const arrayOfLength =
  <T>(item: Schema<T>, length: number): Schema<readonly T[]> =>
  (value, path, faults): value is readonly T[] => {
    if (!arrayOf(item)(value, path, faults)) {
      return false;
    }

    return value.length === length
      ? true
      : fail(
          faults,
          path,
          `expected ${String(length)} entries, one per level, found ${String(value.length)}`,
        );
  };

/** One schema per field of `T`. Every field is required; absence is `null`, and a schema says so with `nullable`. */
export type FieldSchemas<T> = { readonly [K in keyof T]-?: Schema<T[K]> };

/** An object with exactly the fields of `T`: a missing field and an unknown field are both faults. */
export const objectOf =
  <T extends object>(fields: FieldSchemas<T>): Schema<T> =>
  (value, path, faults): value is T => {
    if (!isRecord(value)) {
      return fail(faults, path, "expected an object");
    }

    let valid = true;
    const expected = Object.keys(fields);

    for (const key of expected) {
      const check = fields[key as keyof T];
      const fieldPath = fieldPathOf(path, key);

      if (!(key in value)) {
        valid = fail(faults, fieldPath, "missing field");

        continue;
      }

      valid = check(value[key], fieldPath, faults) && valid;
    }

    for (const key of Object.keys(value)) {
      if (!expected.includes(key)) {
        valid = fail(faults, fieldPathOf(path, key), "unknown field");
      }
    }

    return valid;
  };

/** The schema of each variant of `T`, by the value of its discriminator field `D`. */
export type VariantSchemas<D extends string, T extends Record<D, string>> = {
  readonly [K in T[D]]: Schema<Extract<T, Record<D, K>>>;
};

/** A union told apart by the string field `discriminator`: the variant's schema checks the whole value. */
export const taggedUnion =
  <D extends string, T extends Record<D, string>>(
    discriminator: D,
    variants: VariantSchemas<D, T>,
  ): Schema<T> =>
  (value, path, faults): value is T => {
    if (!isRecord(value)) {
      return fail(faults, path, "expected an object");
    }

    const tag = value[discriminator];
    const known = Object.keys(variants);

    if (typeof tag !== "string" || !known.includes(tag)) {
      return fail(
        faults,
        fieldPathOf(path, discriminator),
        `expected one of ${known.join(", ")}`,
      );
    }

    const variant = (variants as Record<string, Schema<T>>)[tag];

    return variant !== undefined && variant(value, path, faults);
  };

/** `a` or `b`, tried in that order; a value that is neither records one fault saying what was expected. */
export const either =
  <A, B>(a: Schema<A>, b: Schema<B>, expected: string): Schema<A | B> =>
  (value, path, faults): value is A | B => {
    const scratch: SchemaFault[] = [];

    if (a(value, path, scratch) || b(value, path, scratch)) {
      return true;
    }

    return fail(faults, path, `expected ${expected}`);
  };

/** A schema resolved on first use, for a type that contains itself, such as an effect list inside an effect. */
export const lazy =
  <T>(resolve: () => Schema<T>): Schema<T> =>
  (value, path, faults): value is T =>
    resolve()(value, path, faults);
