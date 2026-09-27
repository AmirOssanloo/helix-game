/**
 * Two blocks: the size limit on every file under src/, and the files let past it.
 *
 * The limit counts raw lines, blank and comment lines included, so a figure quoted anywhere
 * matches `wc -l`. A file over it is doing more than one job; the limit is where that shows up
 * in review instead of in a file nobody wants to open.
 *
 * `OVER_THE_LIMIT` lists each file let past, with a one-line reason. The list only shrinks:
 * the change that splits a file removes its line, and a new file is never added to it.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#quick-reference
 */

/** Raw lines per file under src/. */
export const MAX_LINES_PER_FILE = 500;

/** Map definitions are data: a map is as long as its obstacles and packs, not its logic. */
const MAP_DEFINITIONS = "src/content/maps/**/*.ts";

/** The files over the limit, each with why it is let past until it is split. */
export const OVER_THE_LIMIT = {
  "src/presentation/overlays/debug-overlays.ts":
    "every debug overlay in one file; splits into one file per overlay",
  "src/domain/definitions/validate-registry.ts":
    "one hand-sequenced validation over every definition kind; splits into one descriptor per kind",
  "src/domain/ai/machine.ts":
    "every AI state in one machine; splits into one file per state",
  "src/domain/movement/spatial-hash.ts":
    "the grid, its queries, and their scratch in one module; splits by query",
  "src/domain/public.ts":
    "the domain's door re-exports every module; shrinks when the door is narrowed",
  "src/domain/definitions/definition-schemas.ts":
    "every definition kind's schema in one file; folds into the per-kind descriptors",
  "src/domain/entities/unit.ts":
    "the unit's fields as one flat record; splits into sub-records",
};

export const sizeLimit = [
  {
    files: ["src/**/*.ts"],
    ignores: [MAP_DEFINITIONS],
    rules: {
      "max-lines": [
        "error",
        {
          max: MAX_LINES_PER_FILE,
          skipBlankLines: false,
          skipComments: false,
        },
      ],
    },
  },
  {
    files: Object.keys(OVER_THE_LIMIT),
    rules: {
      "max-lines": "off",
    },
  },
];
