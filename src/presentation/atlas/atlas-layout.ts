import type { AtlasFrameDef, AtlasFrameList } from "@domain/public";

/** The atlas is this wide; the bake makes it as tall as the frames need. */
export const ATLAS_WIDTH = 1024;

/** Transparent pixels around every frame, so a scaled quad never samples its neighbour's edge. */
export const FRAME_GUTTER = 2;

/** One frame with the top-left corner of its region on the atlas. */
export type PlacedFrame = Readonly<{
  frame: AtlasFrameDef;
  x: number;
  y: number;
}>;

/**
 * Where the glyph grid sits, in the terms a retro font is described by: the grid's origin, one
 * cell's size, how many cells a row holds, and the characters in cell order.
 */
export type FontLayout = Readonly<{
  x: number;
  y: number;
  glyphWidth: number;
  glyphHeight: number;
  charsPerRow: number;
  chars: string;
}>;

/** Every frame placed, in the frame list's order, and the canvas size that holds them. */
export type AtlasLayout = Readonly<{
  width: number;
  height: number;
  frames: readonly PlacedFrame[];
  font: FontLayout | null;
}>;

type Cell = Readonly<{ width: number; height: number }>;

type Placement = Readonly<{ x: number; y: number }>;

/** The grid the glyphs go in: near square, so the block packs beside the shapes rather than as a strip. */
const glyphGrid = (
  glyphs: readonly AtlasFrameDef[],
): Readonly<{ cell: Cell; charsPerRow: number; rows: number }> => {
  const [first] = glyphs;

  if (first === undefined) {
    throw new Error("A glyph grid needs at least one glyph");
  }

  for (const glyph of glyphs) {
    if (glyph.width !== first.width || glyph.height !== first.height) {
      throw new Error(
        `Every glyph is one cell size; "${glyph.name}" is ${glyph.width} by ${glyph.height} and "${first.name}" is ${first.width} by ${first.height}`,
      );
    }
  }

  const charsPerRow = Math.ceil(Math.sqrt(glyphs.length));

  return {
    cell: { width: first.width, height: first.height },
    charsPerRow,
    rows: Math.ceil(glyphs.length / charsPerRow),
  };
};

/**
 * Shelf packing: the cells sorted by height, laid left to right, a new shelf when one does not
 * fit. Ties keep the given order, so the same list always lays out the same way. Returns one
 * placement per cell, in the cells' order, and the height the shelves reached.
 */
const packShelves = (
  cells: readonly Cell[],
  width: number,
  gutter: number,
): Readonly<{ placements: readonly Placement[]; height: number }> => {
  const order = cells
    .map((cell, index) => ({ cell, index }))
    .sort((a, b) => b.cell.height - a.cell.height || a.index - b.index);
  const placements: Placement[] = new Array<Placement>(cells.length);
  let cursorX = gutter;
  let cursorY = gutter;
  let shelfHeight = 0;

  for (const { cell, index } of order) {
    if (cell.width + gutter * 2 > width) {
      throw new Error(
        `A frame ${cell.width} wide does not fit an atlas ${width} wide`,
      );
    }

    if (cursorX + cell.width + gutter > width) {
      cursorY += shelfHeight + gutter;
      cursorX = gutter;
      shelfHeight = 0;
    }

    placements[index] = { x: cursorX, y: cursorY };
    cursorX += cell.width + gutter;
    shelfHeight = Math.max(shelfHeight, cell.height);
  }

  return { placements, height: cursorY + shelfHeight + gutter };
};

/** An image's size in pixels, as it loaded. */
export type ImageSize = Readonly<{ width: number; height: number }>;

/**
 * Every tile frame of the list at the size of the image it names, looked up by `imageSize`;
 * every other frame as it is. A tile frame's own size is one repeat, an art diamond, and its
 * image is refused unless it is a whole number of them in each direction and fits an atlas
 * `width` wide, since a floor laid from anything else drifts off the cells.
 */
export const sizeTileFrames = (
  frames: AtlasFrameList,
  imageSize: (image: string) => ImageSize,
  width: number = ATLAS_WIDTH,
  gutter: number = FRAME_GUTTER,
): AtlasFrameList =>
  frames.map((frame): AtlasFrameDef => {
    if (frame.shape.kind !== "tile") {
      return frame;
    }

    const size = imageSize(frame.shape.image);
    const across = size.width / frame.width;
    const down = size.height / frame.height;
    const widest = Math.floor((width - gutter * 2) / frame.width) * frame.width;

    if (
      !Number.isInteger(across) ||
      !Number.isInteger(down) ||
      across < 1 ||
      down < 1 ||
      size.width > widest
    ) {
      throw new Error(
        `The tile image "${frame.shape.image}" for the frame "${frame.name}" is ${size.width} by ${size.height}: it must be a whole number of ${frame.width} by ${frame.height} art diamonds in each direction, and at most ${widest} wide to fit the atlas`,
      );
    }

    return { ...frame, width: size.width, height: size.height };
  });

const isGlyph = (frame: AtlasFrameDef): boolean => frame.shape.kind === "glyph";

const glyphCharacter = (frame: AtlasFrameDef): string =>
  frame.shape.kind === "glyph" ? frame.shape.character : "";

/**
 * Where every frame of the list goes on one canvas `width` wide. Each shape is its own cell;
 * the glyphs are one grid cell, because a retro font reads its characters from a grid at one
 * offset. A duplicate name is refused, since a texture holds one frame per name.
 */
export const layoutAtlas = (
  frames: AtlasFrameList,
  width: number = ATLAS_WIDTH,
  gutter: number = FRAME_GUTTER,
): AtlasLayout => {
  const names = new Set<string>();

  for (const frame of frames) {
    if (names.has(frame.name)) {
      throw new Error(`The frame list names "${frame.name}" twice`);
    }

    names.add(frame.name);
  }

  const shapes = frames.filter((frame) => !isGlyph(frame));
  const glyphs = frames.filter(isGlyph);
  const grid = glyphs.length === 0 ? null : glyphGrid(glyphs);
  const cells: Cell[] = shapes.map((frame) => ({
    width: frame.width,
    height: frame.height,
  }));

  if (grid !== null) {
    cells.push({
      width: grid.charsPerRow * grid.cell.width,
      height: grid.rows * grid.cell.height,
    });
  }

  const { placements, height } = packShelves(cells, width, gutter);
  const placed = new Map<string, Placement>();

  shapes.forEach((frame, index) => {
    const placement = placements[index];

    if (placement !== undefined) {
      placed.set(frame.name, placement);
    }
  });

  const gridOrigin = placements[shapes.length] ?? null;
  const font: FontLayout | null =
    grid === null || gridOrigin === null
      ? null
      : {
          x: gridOrigin.x,
          y: gridOrigin.y,
          glyphWidth: grid.cell.width,
          glyphHeight: grid.cell.height,
          charsPerRow: grid.charsPerRow,
          chars: glyphs.map(glyphCharacter).join(""),
        };

  if (font !== null) {
    glyphs.forEach((glyph, index) => {
      placed.set(glyph.name, {
        x: font.x + (index % font.charsPerRow) * font.glyphWidth,
        y: font.y + Math.floor(index / font.charsPerRow) * font.glyphHeight,
      });
    });
  }

  return {
    width,
    height,
    frames: frames.map((frame): PlacedFrame => {
      const placement = placed.get(frame.name);

      if (placement === undefined) {
        throw new Error(`"${frame.name}" was never placed`);
      }

      return { frame, x: placement.x, y: placement.y };
    }),
    font,
  };
};
