import type { AtlasFrameDef, AtlasFrameList } from "@domain/public";

/**
 * The one frame list: every shape the game draws, by name, with the size it is baked at. The
 * bake reads it to draw the atlas, a view picks a frame by name, and a definition names the
 * frame it is drawn with. A frame name that is not here does not exist.
 *
 * Sizes are the largest on-screen size divided by two, since a view scales a frame up by at
 * most two: the unit disc is drawn at the collision radius and never past twice this; the thin
 * ring is a range ring at up to a screen height across; the thick ring marks a small radius
 * such as a bound. Cone frames are added by the spells that need them.
 */

/**
 * How many frames the cooldown sweep is cut into. Frame `wedge_N` covers N of these, clockwise
 * from twelve o'clock, so the last one is the full disc and none is empty. A view finds the
 * frame for a step by its shape, once, when it is created.
 */
export const WEDGE_STEPS = 64;

/** The glyphs the bitmap font holds, in font order: digits, the four number signs, and the uppercase letters. Each is the frame `glyph_<character>`. */
export const GLYPH_CHARACTERS = "0123456789-.%/ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const GLYPH_WIDTH = 20;
const GLYPH_HEIGHT = 32;
const WEDGE_SIZE = 64;

const shapes: readonly AtlasFrameDef[] = [
  { name: "disc", width: 128, height: 128, shape: { kind: "disc" } },
  {
    name: "ring_thin",
    width: 512,
    height: 512,
    shape: { kind: "ring", thickness: 3 },
  },
  {
    name: "ring_thick",
    width: 256,
    height: 256,
    shape: { kind: "ring", thickness: 24 },
  },
  { name: "square", width: 128, height: 128, shape: { kind: "square" } },
  {
    name: "square_outline",
    width: 128,
    height: 128,
    shape: { kind: "square_outline", thickness: 6 },
  },
  {
    name: "square_outline_thick",
    width: 128,
    height: 128,
    shape: { kind: "square_outline", thickness: 16 },
  },
  { name: "triangle", width: 128, height: 128, shape: { kind: "triangle" } },
  { name: "pixel", width: 4, height: 4, shape: { kind: "pixel" } },
  { name: "status_icon", width: 32, height: 32, shape: { kind: "icon" } },
];

const wedges: readonly AtlasFrameDef[] = Array.from(
  { length: WEDGE_STEPS },
  (_, index): AtlasFrameDef => ({
    name: `wedge_${index + 1}`,
    width: WEDGE_SIZE,
    height: WEDGE_SIZE,
    shape: { kind: "wedge", step: index + 1, steps: WEDGE_STEPS },
  }),
);

const glyphs: readonly AtlasFrameDef[] = Array.from(
  GLYPH_CHARACTERS,
  (character): AtlasFrameDef => ({
    name: `glyph_${character}`,
    width: GLYPH_WIDTH,
    height: GLYPH_HEIGHT,
    shape: { kind: "glyph", character },
  }),
);

export const atlasFrames: AtlasFrameList = [...shapes, ...wedges, ...glyphs];
