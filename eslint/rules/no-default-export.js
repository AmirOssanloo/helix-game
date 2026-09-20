/**
 * A `no-restricted-syntax` entry banning default exports under src/. The main export of a
 * file matches its name, so a rename breaks the build instead of resolving to undefined.
 *
 * Add it to the `no-restricted-syntax` array of every src/ block. A narrower block replaces a
 * wider one's array rather than adding to it.
 *
 * @see docs/standards/coding.md#quick-reference
 */
export const NO_DEFAULT_EXPORT = {
  selector: "ExportDefaultDeclaration",
  message:
    "Export by name, with the main export matching the file name. See docs/standards/coding.md#quick-reference.",
};
