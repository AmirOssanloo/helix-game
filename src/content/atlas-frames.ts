import type { ArmorySlot, AtlasFrameDef, AtlasFrameList } from "@domain/public";

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

/**
 * The glyphs the bitmap font holds, in font order: digits, the five number signs, the uppercase
 * letters, and the space. Each is the frame `glyph_<character>`. Every string on screen is
 * written in capitals, as the item catalogue's affix lines are. The space's cell is left blank
 * and the renderer draws no quad for it, so it is an advance alone.
 */
export const GLYPH_CHARACTERS = "0123456789-.%/+ABCDEFGHIJKLMNOPQRSTUVWXYZ ";

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
  {
    name: "square_dot",
    width: 128,
    height: 128,
    shape: { kind: "square_dot", holeFraction: 1 / 3 },
  },
  { name: "triangle", width: 128, height: 128, shape: { kind: "triangle" } },
  {
    name: "stripes",
    width: 128,
    height: 128,
    shape: { kind: "stripes", thickness: 12 },
  },
  { name: "pixel", width: 4, height: 4, shape: { kind: "pixel" } },
];

/** The full angles, in degrees, a cone is baked at: one frame per angle a definition aims a cone or a cone preview with. */
export const CONE_ANGLES: readonly number[] = [60];

/**
 * How wide a cone frame is baked. A cone's apex is the frame's centre and its arc the frame's
 * edge, so a cone drawn `length` from its apex covers twice this across; the longest cone on
 * screen reaches 900, which is 1800 across and bakes at half of that.
 */
const CONE_SIZE = 900;

/** The frame name a cone of `angleDegrees` is drawn with, so the frame list and whoever looks one up name it the same way. */
export const coneFrame = (angleDegrees: number): string =>
  `cone_${angleDegrees}`;

const cones: readonly AtlasFrameDef[] = CONE_ANGLES.map(
  (angleDegrees): AtlasFrameDef => ({
    name: coneFrame(angleDegrees),
    width: CONE_SIZE,
    height: CONE_SIZE,
    shape: { kind: "cone", angleDegrees },
  }),
);

/**
 * The frame each status is drawn with, one per status definition, keyed by the status id the
 * definition carries: an outlined square with one letter inside it, so two statuses on a unit
 * are told apart at a glance. The letter is the status's initial where that letter is free and
 * another of its own where it is taken, since a glyph is placeholder art and reads only as
 * "not the one beside it". A status definition names `icon_<its id>` and nothing else does.
 */
const STATUS_ICON_GLYPHS: Readonly<Record<string, string>> = {
  bash: "A",
  burn: "B",
  charge: "V",
  disarm: "D",
  frost_attack: "F",
  glacier_chill: "G",
  hoarfrost: "H",
  knockback: "K",
  lift: "L",
  quicken: "Q",
  root: "R",
  self_heal: "E",
  silence: "S",
  slow: "O",
  stun: "T",
  updraft_lift: "U",
  wane: "W",
  wane_chill: "C",
};

/** The frame name a status of `id` is drawn with. The definition and the frame list both read it, so neither spells it out. */
export const statusIconFrame = (id: string): string => `icon_${id}`;

const STATUS_ICON_SIZE = 32;

const statusIcons: readonly AtlasFrameDef[] = Object.entries(
  STATUS_ICON_GLYPHS,
).map(([id, glyph]): AtlasFrameDef => ({
  name: statusIconFrame(id),
  width: STATUS_ICON_SIZE,
  height: STATUS_ICON_SIZE,
  shape: { kind: "icon", glyph },
}));

/** The frame name an item of a base in `slot` is drawn with: one silhouette per armory slot. */
export const itemIconFrame = (slot: ArmorySlot): string => `item_${slot}`;

/** The frame gold on the ground is drawn with. */
export const ITEM_GOLD_FRAME = "item_gold";

/** The frame a globe on the ground is drawn with, tinted by the pool it restores. */
export const ITEM_GLOBE_FRAME = "item_globe";

/**
 * Item icons are baked at this size and fitted to an item's cells or its spot on the ground; a
 * base of two cells by three is drawn inside its box, never stretched to it.
 */
const ITEM_ICON_SIZE = 128;

/** How thick the ring's band is baked, in the icon's pixels. */
const ITEM_RING_THICKNESS = 22;

/**
 * Each armory slot's silhouette, as x, y pairs in fractions of the frame: a flat placeholder
 * shape that reads as the slot at a glance until there is art. The ring is a ring.
 */
const ITEM_SILHOUETTES: Readonly<
  Record<Exclude<ArmorySlot, "ring">, readonly number[]>
> = {
  // A dome over a brim.
  helm: [
    0.08, 0.8, 0.92, 0.8, 0.92, 0.68, 0.84, 0.68, 0.8, 0.44, 0.68, 0.26, 0.5,
    0.18, 0.32, 0.26, 0.2, 0.44, 0.16, 0.68, 0.08, 0.68,
  ],
  // A chain hung in a V, and a gem below it.
  amulet: [
    0.14, 0.08, 0.24, 0.08, 0.5, 0.4, 0.76, 0.08, 0.86, 0.08, 0.57, 0.46, 0.74,
    0.66, 0.5, 0.92, 0.26, 0.66, 0.43, 0.46,
  ],
  // A tunic with short sleeves.
  body: [
    0.3, 0.1, 0.42, 0.18, 0.58, 0.18, 0.7, 0.1, 0.94, 0.26, 0.84, 0.46, 0.76,
    0.42, 0.76, 0.92, 0.24, 0.92, 0.24, 0.42, 0.16, 0.46, 0.06, 0.26,
  ],
  // A sword, point up, with its guard.
  main_hand: [
    0.5, 0.02, 0.56, 0.1, 0.56, 0.62, 0.74, 0.62, 0.74, 0.7, 0.56, 0.7, 0.56,
    0.96, 0.44, 0.96, 0.44, 0.7, 0.26, 0.7, 0.26, 0.62, 0.44, 0.62, 0.44, 0.1,
  ],
  // A heater shield.
  off_hand: [0.14, 0.1, 0.86, 0.1, 0.86, 0.5, 0.5, 0.94, 0.14, 0.5],
  // A hand, fingers up and the thumb out.
  gloves: [
    0.3, 0.92, 0.3, 0.56, 0.12, 0.44, 0.18, 0.36, 0.32, 0.42, 0.32, 0.16, 0.42,
    0.12, 0.46, 0.32, 0.5, 0.08, 0.6, 0.08, 0.62, 0.32, 0.7, 0.14, 0.8, 0.18,
    0.74, 0.92,
  ],
  // A strap through a square buckle.
  belt: [
    0.04, 0.42, 0.36, 0.42, 0.36, 0.3, 0.64, 0.3, 0.64, 0.42, 0.96, 0.42, 0.96,
    0.58, 0.64, 0.58, 0.64, 0.7, 0.36, 0.7, 0.36, 0.58, 0.04, 0.58,
  ],
  // A boot, the toe to the right.
  boots: [0.28, 0.08, 0.6, 0.08, 0.6, 0.58, 0.9, 0.7, 0.92, 0.92, 0.28, 0.92],
};

/** Gold's heap: a mound of coins. */
const GOLD_SILHOUETTE: readonly number[] = [
  0.06, 0.86, 0.16, 0.62, 0.32, 0.46, 0.5, 0.36, 0.68, 0.46, 0.84, 0.62, 0.94,
  0.86,
];

const itemIcon = (
  name: string,
  shape: AtlasFrameDef["shape"],
): AtlasFrameDef => ({
  name,
  width: ITEM_ICON_SIZE,
  height: ITEM_ICON_SIZE,
  shape,
});

const itemIcons: readonly AtlasFrameDef[] = [
  ...Object.entries(ITEM_SILHOUETTES).map(([slot, points]) =>
    itemIcon(`item_${slot}`, { kind: "silhouette", points }),
  ),
  itemIcon(itemIconFrame("ring"), {
    kind: "ring",
    thickness: ITEM_RING_THICKNESS,
  }),
  itemIcon(ITEM_GOLD_FRAME, { kind: "silhouette", points: GOLD_SILHOUETTE }),
  itemIcon(ITEM_GLOBE_FRAME, { kind: "disc" }),
];

/**
 * The width the floor's diamonds are baked at, in pixels a walkability cell is drawn across:
 * the one scale the view is drawn at.
 */
export const FLOOR_DIAMOND_WIDTH = 40;

/** One art diamond of the floor tile covers this many walkability cells along each side. */
export const FLOOR_ART_CELLS = 4;

/** The frame name the floor is drawn with. */
export const FLOOR_FRAME = "floor";

/** The key the floor tile's image is loaded under; the composition root says where it is. */
export const FLOOR_IMAGE = "floor";

/**
 * The maintainer's floor tile, drawn unscaled, a pixel a pixel. Its size here is one art
 * diamond, 160 by 80; the bake takes the image's own size, a whole number of them.
 */
const floor: AtlasFrameDef = {
  name: FLOOR_FRAME,
  width: FLOOR_ART_CELLS * FLOOR_DIAMOND_WIDTH,
  height: (FLOOR_ART_CELLS * FLOOR_DIAMOND_WIDTH) / 2,
  shape: { kind: "tile", image: FLOOR_IMAGE },
};

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

export const atlasFrames: AtlasFrameList = [
  ...shapes,
  ...cones,
  ...statusIcons,
  ...itemIcons,
  floor,
  ...wedges,
  ...glyphs,
];
