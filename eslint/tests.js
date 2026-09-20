/**
 * The blocks that cover tests/. Two, because the barrel rule does not apply to the files
 * behind the barrel. Last block wins and it replaces, so the second block sets only the rule
 * id it changes.
 *
 * The src/ bans on dynamic import, default export, and optional properties are not repeated
 * here: a spec has no registry to be listed in, and its helpers are typed by the testing
 * standard, not the coding standard.
 *
 * @see docs/standards/testing.md#quick-reference
 */

import { NO_AMBIENT_TIME_IN_TESTS } from "./rules/no-ambient-time-in-tests.js";
import { NO_DEEP_HELPER_IMPORT } from "./rules/no-deep-helper-import.js";
import { NO_FOCUSED_TEST } from "./rules/no-focused-test.js";
import { NO_MODULE_MOCKING } from "./rules/no-module-mocking.js";
import { NO_TYPE_CAST_DOUBLE } from "./rules/no-type-cast-double.js";

/** Every file under the tests tree. */
const TEST_FILES = ["tests/**/*.ts"];

/** The barrel and the files behind it, which import each other by name. */
const HELPER_FILES = ["tests/helpers/**/*.ts"];

export const testsRules = [
  {
    files: TEST_FILES,
    rules: {
      "no-restricted-syntax": [
        "error",
        ...NO_FOCUSED_TEST,
        ...NO_TYPE_CAST_DOUBLE,
        NO_MODULE_MOCKING,
        ...NO_AMBIENT_TIME_IN_TESTS,
      ],
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { patterns: [NO_DEEP_HELPER_IMPORT] },
      ],
      "helix/skip-needs-reason": "error",
    },
  },
  {
    files: HELPER_FILES,
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },
];
