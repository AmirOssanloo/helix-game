/**
 * `no-restricted-globals` entries keeping the browser out of the two inner layers. They run
 * in Node under the test tiers, and a reference to the page is a dependency the tiers cannot
 * see until it throws.
 *
 * Add them to the `no-restricted-globals` array of the domain and simulation blocks.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-dependency-rule
 */

const DOCS =
  "docs/architecture/layers-and-dependency-rule.md#the-dependency-rule";

export const NO_DOM_GLOBALS = [
  "window",
  "document",
  "navigator",
  "requestAnimationFrame",
].map((name) => ({
  name,
  message: `\`${name}\` is the browser. Nothing under src/domain/ or src/simulation/ touches the DOM; the presentation layer reads the world view and draws it. See ${DOCS}.`,
}));
