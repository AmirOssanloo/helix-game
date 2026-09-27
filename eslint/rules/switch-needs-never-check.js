/**
 * `no-restricted-syntax` entries requiring every `switch` to have a `default` whose one
 * statement is `return assertNever(value);` or `assertNever(value);`. `assertNever` takes
 * `never`, so the typecheck fails at every switch that does not handle a member added to its
 * union. Lint carries no type information on purpose and cannot see the union; it sees only
 * that the check is there, and the typecheck does the rest.
 *
 * Two entries rather than one: a switch with no `default` of its own, and a `default` that is
 * not the check. esquery's `:has` does not follow a chain of child combinators, so one
 * selector cannot tell a switch's own `default` from one in a switch nested inside it.
 *
 * A switch over something that is not a finite union has no place in the two inner layers:
 * write the comparison as `if` statements instead.
 *
 * Add them to the `no-restricted-syntax` array of the domain and simulation blocks. A narrower
 * block replaces a wider one's array rather than adding to it.
 *
 * @see docs/standards/simulation-coding.md#quick-reference
 */

const MESSAGE =
  "A switch under src/domain/ or src/simulation/ has a `default` whose one statement is `return assertNever(value);` or `assertNever(value);`, from @shared/public, so a member added to the union and not handled fails the typecheck. See docs/standards/simulation-coding.md#quick-reference.";

/** A call of the bare identifier `assertNever` with one argument, at the node `path` names. */
const neverCheckAt = (path) =>
  `[${path}.type="CallExpression"][${path}.callee.type="Identifier"][${path}.callee.name="assertNever"][${path}.arguments.length=1]`;

export const SWITCH_NEEDS_NEVER_CHECK = [
  {
    selector: "SwitchStatement:not(:has(> SwitchCase[test=null]))",
    message: MESSAGE,
  },
  {
    selector: `SwitchCase[test=null]:not([consequent.length=1]:matches([consequent.0.type="ReturnStatement"]${neverCheckAt("consequent.0.argument")}, [consequent.0.type="ExpressionStatement"]${neverCheckAt("consequent.0.expression")}))`,
    message: MESSAGE,
  },
];
