/**
 * Two `no-restricted-syntax` entries banning a module loaded by expression instead of by
 * name. A static import that crosses a layer is caught here; a dynamic one is caught only by
 * the architecture test, so it is banned before it can hide.
 *
 * Add them to the `no-restricted-syntax` array of every src/ block. Dropped under tests/.
 *
 * @see docs/workflows/development.md#what-the-gate-enforces
 */

export const NO_DYNAMIC_IMPORT = {
  selector: "ImportExpression",
  message: "Use a static import declaration instead of a dynamic import().",
};

/** Needs its own selector: `ImportExpression` does not match a read on `import.meta`. */
export const NO_IMPORT_META_GLOB = {
  selector:
    'MemberExpression[object.type="MetaProperty"][property.name="glob"]',
  message:
    "import.meta.glob loads whatever matches a pattern, so a renamed file silently changes what runs. Import each module by name and list it in its registry index.",
};
