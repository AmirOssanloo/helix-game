import type { Registry } from "@domain/public";

/** The FNV-1a offset basis and prime, for 32 bits. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** A 32-bit hash written in hexadecimal is this wide. */
const VERSION_WIDTH = 8;

/**
 * The definition fields that only say how a thing is drawn: the frame it is drawn with and the
 * colour it is drawn in. The narrow stamp leaves every field of these names out, at any depth of
 * any definition, so an art or colour edit leaves every stored log valid. No rule under the domain
 * or the simulation reads one: a spawn copies the frame and the tint onto the thing it makes for
 * the view to draw, and the registry's validation checks the frame is one the atlas has, and
 * neither decides anything a tick does. A label or other text a person reads joins the list when
 * a definition gains one.
 */
export const PRESENTATION_FIELDS: readonly string[] = ["atlasFrame", "tint"];

const PRESENTATION_FIELD_SET: ReadonlySet<string> = new Set(
  PRESENTATION_FIELDS,
);

/** No key is left out of the strict stamp. */
const NO_FIELDS: ReadonlySet<string> = new Set();

/**
 * `value` as JSON with every object's keys in sorted order, so the same content gives the
 * same text whatever order a definition file wrote its fields in, and with every key in
 * `omitted` left out wherever it appears. Content is plain data: numbers, strings, booleans,
 * arrays, and objects of them, which is all this walks.
 */
const stableStringify = (
  value: unknown,
  omitted: ReadonlySet<string>,
): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry, omitted)).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const record: Record<string, unknown> = { ...value };
    const keys = Object.keys(record)
      .filter((key) => !omitted.has(key))
      .sort();
    const fields = keys.map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(record[key], omitted)}`,
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

const versionOf = (value: unknown, omitted: ReadonlySet<string>): string =>
  hashText(stableStringify(value, omitted))
    .toString(16)
    .padStart(VERSION_WIDTH, "0");

/**
 * The content version stamp of `registry`: a hash over what the simulation reads of it, in the
 * designer's units. The atlas frame list, glyphs included, and every field `PRESENTATION_FIELDS`
 * names are left out. An input log carries the stamp of the registry it was recorded under,
 * and a replay against a registry with another stamp is refused rather than allowed to diverge,
 * since a changed number would change what every recorded command did; an art edit changes
 * none, so it moves no stamp.
 */
export const contentVersionOf = (registry: Registry): string => {
  const { atlasFrames: _drawnOnly, ...simulated } = registry;

  return versionOf(simulated, PRESENTATION_FIELD_SET);
};

/**
 * The strict stamp of `registry`: a hash over every definition in it, the atlas and every
 * presentation field included. A feedback file carries it beside the content version, so a file
 * read on a build whose art differs from the one it was played on says so; it never refuses a
 * replay.
 */
export const strictContentVersionOf = (registry: Registry): string =>
  versionOf(registry, NO_FIELDS);
