/**
 * A `no-restricted-syntax` entry banning `field?: Type` on a type member anywhere under src/.
 * `field?:` blurs "the value can be absent" with "the caller left it out"; `field: Type | null`
 * states the first plainly and `exactOptionalPropertyTypes` refuses the second.
 *
 * Add it to the `no-restricted-syntax` array of every src/ block. A narrower block replaces a
 * wider one's array rather than adding to it.
 *
 * @see docs/standards/coding.md#quick-reference
 */
export const NO_OPTIONAL_PROPERTY = {
  selector: "TSPropertySignature[optional=true]",
  message:
    "Optional properties are not allowed. Absence is `field: Type | null`, handled on purpose. See docs/standards/coding.md#quick-reference.",
};
