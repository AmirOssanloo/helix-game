/**
 * Two `no-restricted-syntax` entries for the Phaser factories a view may not call. Every
 * Shape and Graphics object breaks the one-texture batch; a `Text` updated during sync
 * re-rasterises a canvas per frame. Everything drawn is a tinted quad from the atlas or a
 * `BitmapText`.
 *
 * Add them to the `no-restricted-syntax` array of every src/ block. The boot scene block drops
 * `NO_TEXT_FACTORY` alone: its Canvas-renderer banner is the one static `Text` allowed.
 *
 * @see docs/standards/presentation-coding.md#quick-reference
 */

const DOCS = "docs/standards/presentation-coding.md#quick-reference";

/** Anchored on the `add` or `make` factory so an unrelated `.circle` property is not matched. */
export const NO_SHAPE_FACTORY = {
  selector:
    "MemberExpression[object.property.name=/^(add|make)$/][property.name=/^(graphics|circle|rectangle|line|polygon|ellipse|arc|star|triangle|curve|grid|isobox|isotriangle)$/]",
  message: `Shape and Graphics objects break the one-texture batch. Draw a tinted quad from an atlas frame; a new shape is a new frame baked at boot. See ${DOCS}.`,
};

export const NO_TEXT_FACTORY = {
  selector:
    'MemberExpression[object.property.name=/^(add|make)$/][property.name="text"]',
  message: `\`Text\` re-rasterises a canvas on every change. Use \`BitmapText\` from the baked font; the boot scene's static banner is the one exception. See ${DOCS}.`,
};
