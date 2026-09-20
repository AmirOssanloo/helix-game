/** One block: the boot scene, a one-file slice of the presentation layer. eslint.config.js orders it after ../src-files.js. */

import { NO_TEXT_FACTORY } from "../rules/no-shape-factory.js";
import { SRC_SYNTAX } from "../src-files.js";

/**
 * The boot scene shows a static `Text` banner when the renderer comes up as Canvas, the one
 * place a `Text` object is allowed. Setting `no-restricted-syntax` here replaces the src-wide
 * array for this file, so every other ban is spread back in.
 */
export const bootSceneFile = {
  files: ["src/presentation/**/boot.scene.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      ...SRC_SYNTAX.filter((entry) => entry !== NO_TEXT_FACTORY),
    ],
  },
};
