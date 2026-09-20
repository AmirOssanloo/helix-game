/**
 * A `no-restricted-imports` pattern entry: `tests/helpers/index.ts` is the only import path
 * for a helper. A deep import pins a spec to a file name, so the barrel stops being free to
 * reorganise behind it.
 *
 * The group is scoped to relative specifiers. The trailing `/**` on the first two entries is
 * load-bearing: shorten either to `.../helpers` and the negations stop working, because
 * gitignore will not let anything back in once a folder itself is excluded. `!**\/src/**` keeps
 * a spec's import of its own subject out of the rule.
 *
 * Files inside tests/helpers/ import their own siblings, so the tests preset drops this entry
 * for them.
 *
 * @see docs/standards/testing.md#quick-reference
 */
export const NO_DEEP_HELPER_IMPORT = {
  group: [
    "./**/helpers/**",
    "../**/helpers/**",
    "!**/helpers/index",
    "!**/helpers/index.ts",
    "!**/src/**",
  ],
  message:
    "tests/helpers/index.ts is the only import path for a helper. Import from the barrel and, if the helper you need is missing from it, export it there. See docs/standards/testing.md#quick-reference.",
};
