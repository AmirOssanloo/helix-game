/**
 * A `no-restricted-imports` pattern entry keeping Phaser out of every layer but presentation
 * and the composition root. A Phaser type appearing in domain or simulation is a hidden
 * dependency on the screen, and the Node test tiers are the proof that there is none.
 *
 * Add it to the `@typescript-eslint/no-restricted-imports` array of every layer block that
 * needs it. A narrower block replaces a wider one's array rather than adding to it.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-dependency-rule
 */
export const NO_PHASER_IMPORT = {
  group: ["phaser", "phaser/**", "@phaser/**"],
  message:
    "Phaser is used under src/presentation/, and src/app/ imports it only to construct the game. Read the world through @simulation/public and let a view draw it. See docs/architecture/layers-and-dependency-rule.md#the-dependency-rule.",
};
