/**
 * The `no-restricted-imports` entries that the dependency matrix cannot express: each layer's
 * doors, the tests' door that nothing under src/ takes, and content's type-only view of the
 * domain.
 *
 * Import patterns follow gitignore rules. The trailing `/**` on the first entry of each door
 * group is load-bearing: without it the negations stop working and every import of a door is
 * reported. Read the traps section of ../README.md before editing a group.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */

import { doorsOpenTo, LAYER_IMPORTS } from "../matrix.js";

const DOCS = "docs/architecture/layers-and-dependency-rule.md#the-public-doors";

/** `@foo/bar`, `@foo/bar or @foo/baz`, the list the messages read best with. */
const listDoors = (target, doors) => {
  const names = doors.map((door) => `@${target}/${door}`);

  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
};

/** The entry that shuts every file under `target` but the doors open to `layer`. */
const doorFor = (layer, target) => {
  const doors = doorsOpenTo(layer, target);

  return {
    group: [
      `@${target}/**`,
      ...doors.map((door) => `!@${target}/${door}`),
      `**/${target}/**`,
      ...doors.map((door) => `!**/${target}/${door}`),
    ],
    message: `The ${layer} layer enters ${target}/ only through ${listDoors(target, doors)}. If the symbol you need is missing, it is either behind the door on purpose or belongs in one; see ${DOCS}.`,
  };
};

/** One entry per layer `layer`'s row names, each shutting that layer to all but its doors. */
export const doorsFor = (layer) =>
  LAYER_IMPORTS[layer].map((target) => doorFor(layer, target));

/** A layer's door for tests: what is behind `public.ts`, which only tests/ may import. */
export const NO_TESTING_DOOR = {
  group: ["@*/testing", "**/testing"],
  message: `A testing.ts door is for tests/ only; nothing under src/ imports one. Use the layer's public door. See ${DOCS}.`,
};

/**
 * Content names effects and behaviours by string key and never calls the domain, so a value
 * import of the door is a violation while an `import type` of it is not.
 * `verbatimModuleSyntax` makes the keyword load-bearing.
 *
 * The group names only the door, on purpose. The rule skips an import entirely when any
 * matching pattern allows type imports, so a group that also matched the rest of domain/ would
 * let a type import walk past the domain's door entry.
 *
 * @see docs/adr/0005-content-references-by-string-key.md
 */
export const DOMAIN_TYPES_ONLY = {
  group: ["@domain/public", "**/domain/public"],
  allowTypeImports: true,
  message:
    "Content imports domain types only. Write `import type` and reference an effect or behaviour by its string key, never by function. See docs/adr/0005-content-references-by-string-key.md.",
};
