import type { Registry } from "@domain/public";

/** The FNV-1a offset basis and prime, for 32 bits. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** A 32-bit hash written in hexadecimal is this wide. */
const VERSION_WIDTH = 8;

/**
 * `value` as JSON with every object's keys in sorted order, so the same content gives the
 * same text whatever order a definition file wrote its fields in. Content is plain data:
 * numbers, strings, booleans, arrays, and objects of them, which is all this walks.
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record: Record<string, unknown> = { ...value };
    const keys = Object.keys(record).sort();
    const fields = keys.map(
      (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
    );

    return `{${fields.join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
};

/** FNV-1a over the UTF-16 code units of `text`, as an unsigned 32-bit integer. */
const hashText = (text: string): number => {
  let hash = FNV_OFFSET_BASIS;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

/**
 * The content version stamp of `registry`: a hash over every definition in it, in the
 * designer's units. An input log carries the stamp of the registry it was recorded under,
 * and a replay against a registry with another stamp is refused rather than allowed to
 * diverge, since a changed number would change what every recorded command did.
 */
export const contentVersionOf = (registry: Registry): string =>
  hashText(stableStringify(registry)).toString(16).padStart(VERSION_WIDTH, "0");
