/**
 * `no-restricted-syntax` entries banning `.only`. A focused test that reaches main takes the
 * rest of its file out of the gate, and nothing reports it: the run is green because it ran
 * four tests instead of four hundred.
 *
 * `.skip` is handled by ./skip-needs-reason.js instead: it is allowed, but only with a comment
 * on the same line, which no selector can check.
 *
 * @see docs/standards/testing.md#quick-reference
 */

const MESSAGE =
  "`.only` silently drops every other test in the file from the gate. Run the one test with `pnpm test -- -t '<name>'` and take `.only` out before committing. See docs/standards/testing.md#quick-reference.";

/**
 * Three selectors for the three spellings: `it.only`, a chained modifier such as
 * `describe.concurrent.only`, and `it.each(table).only`. Anchoring each on the runner name
 * keeps the rule off an unrelated `.only` property.
 */
export const NO_FOCUSED_TEST = [
  {
    selector:
      'MemberExpression[property.name="only"][object.name=/^(describe|it|test|suite|bench)$/]',
    message: MESSAGE,
  },
  {
    selector:
      'MemberExpression[property.name="only"][object.object.name=/^(describe|it|test|suite|bench)$/]',
    message: MESSAGE,
  },
  {
    selector:
      'MemberExpression[property.name="only"][object.callee.object.name=/^(describe|it|test|suite|bench)$/]',
    message: MESSAGE,
  },
];
