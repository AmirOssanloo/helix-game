/**
 * Composes the blocks under eslint/ and fixes their order. Nothing else decides order.
 *
 * Three behaviours explain why the tree looks the way it does:
 *
 * - Last block wins, and it replaces. When two blocks set the same rule id and a file matches
 *   both, ESLint keeps the later block's options and throws the earlier one's away. A narrower
 *   block repeats every entry it wants to keep from a wider one; leaving one out is silent.
 * - Import patterns follow gitignore rules. `**\/domain/**` with a `!**\/domain/public` negation
 *   works; `**\/domain` does not, because nothing gets back in once the folder itself is
 *   excluded. `*` matches `..`.
 * - A pattern that matches nothing looks like a rule that works. Every rule is proven by a
 *   one-line violation; the procedure is in eslint/README.md.
 *
 * Order: the base blocks first, then src/ as a whole, then one block per layer, then the two
 * slices that sit inside a layer, then tests/. A block that overlaps nothing could go anywhere;
 * they are kept in the order of the layer table so the file reads like it.
 */

import js from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import prettier from "eslint-plugin-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";
import { appLayer } from "./eslint/layers/app.js";
import { bootSceneFile } from "./eslint/layers/boot-scene.js";
import { contentLayer } from "./eslint/layers/content.js";
import { devtoolsLayer } from "./eslint/layers/devtools.js";
import { domainLayer } from "./eslint/layers/domain.js";
import { instrumentationLayer } from "./eslint/layers/instrumentation.js";
import { presentationLayer } from "./eslint/layers/presentation.js";
import { sharedLayer } from "./eslint/layers/shared.js";
import { simulationLayer } from "./eslint/layers/simulation.js";
import { helixPlugin } from "./eslint/plugin.js";
import { srcFiles } from "./eslint/src-files.js";
import { testsRules } from "./eslint/tests.js";

/** The eight aliased layers, in one import group between external packages and relative paths. */
const LAYER_ALIAS_PATTERN =
  "^@(shared|domain|simulation|content|instrumentation|presentation|devtools|app)/";

export default defineConfig([
  // Flat config does not read .gitignore: without these, ESLint walks build output and the
  // reference trees kept beside the repository.
  globalIgnores([
    "dist/**",
    "coverage/**",
    "reference-config/**",
    "reference-testing/**",
    "vite.config.ts.timestamp-*",
  ]),

  // Every linted file: the config sources, the Vite config, src/, tests/, and bench/.
  {
    files: ["**/*.js", "**/*.ts"],
    extends: [js.configs.recommended],
    plugins: {
      helix: helixPlugin,
      perfectionist,
      prettier,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "prettier/prettier": "error",
      "perfectionist/sort-imports": [
        "error",
        {
          type: "alphabetical",
          order: "asc",
          ignoreCase: true,
          newlinesBetween: 0,
          groups: [
            "builtin",
            "external",
            "layers",
            ["parent", "sibling", "index"],
            "style",
          ],
          customGroups: [
            { groupName: "layers", elementNamePattern: LAYER_ALIAS_PATTERN },
          ],
        },
      ],
      "helix/file-name-kebab-case": "error",
      curly: ["error", "all"],
      "no-debugger": "error",
    },
  },

  // The config sources run under Node, and the Vite and Vitest configs are bundled for it.
  {
    files: [
      "eslint.config.js",
      "eslint/**/*.js",
      "vite.config.ts",
      "vitest.config.ts",
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Every TypeScript file. Type-aware rules are deliberately absent: nothing here needs a
  // program, and lint stays fast enough for the commit hook.
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.recommended],
    rules: {
      // Together these make `import type { Foo }` the one spelling for a type: the first turns
      // a type-only value import into it, the second refuses the inline `{ type Foo }` form,
      // which `verbatimModuleSyntax` would otherwise keep as a side-effect import.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: true,
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  srcFiles,
  sharedLayer,
  domainLayer,
  simulationLayer,
  contentLayer,
  instrumentationLayer,
  presentationLayer,
  bootSceneFile,
  devtoolsLayer,
  appLayer,
  ...testsRules,
]);
