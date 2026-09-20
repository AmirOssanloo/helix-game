/**
 * A rule implementation rather than a `no-restricted-syntax` entry: a file's own name is not
 * in its AST.
 *
 * Every file and folder is kebab-case, with dots separating the suffix that says what the
 * file is: `frost-lance.def.ts`, `boot.scene.ts`, `build-flags.d.ts`. Each dot-separated part
 * is checked on its own, so a suffix is free to be anything the coding standard lists.
 *
 * @see docs/standards/coding.md#quick-reference
 */

import { basename } from "node:path";

const KEBAB_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const fileNameKebabCase = {
  meta: {
    type: "problem",
    docs: {
      description: "Require kebab-case file names.",
    },
    schema: [],
    messages: {
      notKebab:
        "File names are kebab-case, with dots only before a suffix: `{{expected}}`. See docs/standards/coding.md#quick-reference.",
    },
  },

  create(context) {
    return {
      Program(node) {
        const name = basename(context.filename);
        const parts = name.split(".");

        if (parts.every((part) => KEBAB_PART.test(part))) {
          return;
        }

        const expected = parts
          .map((part) =>
            part
              .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
              .replace(/[_\s]+/g, "-")
              .toLowerCase(),
          )
          .join(".");

        context.report({ node, messageId: "notKebab", data: { expected } });
      },
    };
  },
};
