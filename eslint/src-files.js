/**
 * One block covering every TypeScript file under src/. Not a layer: it has no folder of its
 * own and no matrix row.
 *
 * `SRC_SYNTAX` is the list every layer block that sets `no-restricted-syntax` spreads back in.
 * ESLint keeps only the last block that sets a rule id, and the options replace rather than
 * combine, so a layer block that set the rule without spreading this list would silently drop
 * every ban in it for its own files.
 */

import { NO_DEFAULT_EXPORT } from "./rules/no-default-export.js";
import {
  NO_DYNAMIC_IMPORT,
  NO_IMPORT_META_GLOB,
} from "./rules/no-dynamic-import.js";
import { NO_OPTIONAL_PROPERTY } from "./rules/no-optional-property.js";
import { NO_SHAPE_FACTORY, NO_TEXT_FACTORY } from "./rules/no-shape-factory.js";
import { NO_WORLD_VIEW_CAST } from "./rules/no-world-view-cast.js";

/** The bans that belong to no single layer. Simulation drops the world-view cast; the boot scene drops the `Text` ban. */
export const SRC_SYNTAX = [
  NO_DYNAMIC_IMPORT,
  NO_IMPORT_META_GLOB,
  NO_DEFAULT_EXPORT,
  NO_OPTIONAL_PROPERTY,
  NO_SHAPE_FACTORY,
  NO_TEXT_FACTORY,
  ...NO_WORLD_VIEW_CAST,
];

export const srcFiles = {
  files: ["src/**/*.ts"],
  rules: {
    "no-restricted-syntax": ["error", ...SRC_SYNTAX],
    // Nothing under domain/, simulation/, or presentation/ logs; it emits an event or a sample.
    // app/ and devtools/ set their own allowance.
    "no-console": "error",
  },
};
