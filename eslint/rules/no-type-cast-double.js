/**
 * Two `no-restricted-syntax` entries covering the casts that let a test double stop resembling
 * the thing it stands in for. `{} as any` and `{ ... } as unknown as Port` compile, so the test
 * keeps passing after the port grows a method the double never got.
 *
 * @see docs/standards/testing.md#quick-reference
 */

const REMEDY =
  "Build the double from the real type with a helper from the tests/helpers barrel. See docs/standards/testing.md#quick-reference.";

export const NO_TYPE_CAST_DOUBLE = [
  {
    selector: "TSAsExpression > TSAnyKeyword",
    message: `\`as any\` hides the shape, so the double survives a change to it. ${REMEDY}`,
  },
  {
    selector:
      'TSAsExpression > TSAsExpression[typeAnnotation.type="TSUnknownKeyword"]',
    message: `\`as unknown as\` forces a value into a type it does not have, so the double survives a change to it. ${REMEDY}`,
  },
];
