/**
 * The plugin wrapper for the two rule implementations. Flat config reaches an implementation
 * only through a plugin, so the rule ids are `helix/file-name-kebab-case` and
 * `helix/skip-needs-reason`; eslint.config.js and ./tests.js assign the severities.
 */

import { fileNameKebabCase } from "./rules/file-name-kebab-case.js";
import { skipNeedsReason } from "./rules/skip-needs-reason.js";

export const helixPlugin = {
  meta: { name: "helix" },
  rules: {
    "file-name-kebab-case": fileNameKebabCase,
    "skip-needs-reason": skipNeedsReason,
  },
};
