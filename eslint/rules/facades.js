/**
 * The three `no-restricted-imports` entries that the dependency matrix cannot express: the
 * public doors of the two inner layers, and content's type-only view of the domain.
 *
 * Import patterns follow gitignore rules. The trailing `/**` on the first entry of each group
 * is load-bearing: without it the negation stops working and every import of the door is
 * reported. Read the traps section of ../README.md before editing a group.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */

const DOCS = "docs/architecture/layers-and-dependency-rule.md#the-public-doors";

/** Outer layers enter the domain only through src/domain/public.ts. */
export const DOMAIN_FACADE = {
  group: ["@domain/**", "!@domain/public", "**/domain/**", "!**/domain/public"],
  message: `Import the domain through @domain/public. If the symbol you need is missing, add it to src/domain/public.ts; that file is the domain contract. See ${DOCS}.`,
};

/** Outer layers enter the simulation only through src/simulation/public.ts. */
export const SIMULATION_FACADE = {
  group: [
    "@simulation/**",
    "!@simulation/public",
    "**/simulation/**",
    "!**/simulation/public",
  ],
  message: `Import the simulation through @simulation/public. If the symbol you need is missing, add it to src/simulation/public.ts; that file is the simulation API. See ${DOCS}.`,
};

/**
 * Content names effects and behaviours by string key and never calls the domain, so a value
 * import of the door is a violation while an `import type` of it is not.
 * `verbatimModuleSyntax` makes the keyword load-bearing.
 *
 * The group names only the door, on purpose. The rule skips an import entirely when any
 * matching pattern allows type imports, so a group that also matched the rest of domain/ would
 * let a type import walk past `DOMAIN_FACADE`.
 *
 * @see docs/adr/0005-content-references-by-string-key.md
 */
export const DOMAIN_TYPES_ONLY = {
  group: ["@domain/public", "**/domain/public"],
  allowTypeImports: true,
  message:
    "Content imports domain types only. Write `import type` and reference an effect or behaviour by its string key, never by function. See docs/adr/0005-content-references-by-string-key.md.",
};
