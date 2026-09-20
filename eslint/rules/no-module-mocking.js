/**
 * A `no-restricted-syntax` entry banning `vi.mock` across the whole tests tree. A module mock
 * replaces someone else's library for the whole file, so the test stops describing our code
 * and starts describing a guess about theirs. Phaser is stubbed by a Vitest alias, which is a
 * runner setting and not a mock, so there is no carve-out.
 *
 * @see docs/standards/testing.md#quick-reference
 */
export const NO_MODULE_MOCKING = {
  selector:
    'CallExpression[callee.object.name="vi"][callee.property.name=/^(mock|doMock)$/]',
  message:
    "`vi.mock` fakes a library instead of a boundary we own. Hand the subject a small world or a double built from the real type through the tests/helpers barrel; Phaser is already stubbed by the Vitest alias. See docs/standards/testing.md#quick-reference.",
};
