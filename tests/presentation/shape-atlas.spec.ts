import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gameConfig } from "@app/game-config";
import {
  atlasFrames,
  CONE_ANGLES,
  coneFrame,
  FLOOR_FRAME,
  FLOOR_IMAGE,
  GLYPH_CHARACTERS,
  ITEM_GLOBE_FRAME,
  ITEM_GOLD_FRAME,
  itemIconFrame,
  WEDGE_STEPS,
} from "@content/public";
import type { AtlasFrameDef } from "@domain/public";
import { ARMORY_SLOTS } from "@domain/queries";
import {
  type FontLayout,
  ATLAS_WIDTH,
  FRAME_GUTTER,
  type ImageSize,
  layoutAtlas,
  type PlacedFrame,
  sizeTileFrames,
} from "@presentation/atlas/atlas-layout";
import {
  type AtlasImages,
  coneSweep,
  paintFrame,
  TILE_BLEED,
  wedgeSweep,
} from "@presentation/atlas/shape-painter";
import { ART_DIAMOND_WIDTH } from "@presentation/public";
import { PainterRecorder, REPOSITORY_ROOT } from "./../helpers";

const TWO_PI = Math.PI * 2;

/**
 * The largest texture WebGL is held to support on every desktop GPU the game targets. The atlas
 * is one canvas, so it bakes into one texture only while it fits inside this on each side.
 */
const MAX_TEXTURE_SIZE = 4096;

/**
 * Phaser itself, from its sources rather than the stub every spec is handed: the retro font
 * parser the bake calls and the renderer that turns a `BitmapText` into quads, so a spec can
 * count the quads a label draws without a GPU.
 */
const phaserSource = createRequire(
  join(REPOSITORY_ROOT, "node_modules", "phaser", "src", "gameobjects", "x.js"),
);

type RetroFontEntry = Readonly<{ data: unknown }>;

const parseRetroFont = phaserSource("./bitmaptext/ParseRetroFont.js") as (
  scene: unknown,
  config: Readonly<Record<string, unknown>>,
) => RetroFontEntry;

const getBitmapTextSize = phaserSource("./bitmaptext/GetBitmapTextSize.js") as (
  src: unknown,
  round: boolean,
  updateOrigin: boolean,
  out: unknown,
) => unknown;

const renderBitmapText = phaserSource(
  "./bitmaptext/static/BitmapTextWebGLRenderer.js",
) as (
  renderer: unknown,
  src: unknown,
  drawingContext: unknown,
  parentMatrix: unknown,
) => void;

const TransformMatrix = phaserSource(
  "./components/TransformMatrix.js",
) as new () => unknown;

/** The font the bake registers, parsed by Phaser from the layout's glyph grid over an atlas of `width` by `height`. */
const parsedFont = (
  font: FontLayout,
  width: number,
  height: number,
): unknown => {
  const scene = {
    sys: {
      textures: {
        getFrame: () => ({ cutX: 0, cutY: 0, source: { width, height } }),
      },
    },
  };

  return parseRetroFont(scene, {
    image: "atlas",
    "offset.x": font.x,
    "offset.y": font.y,
    width: font.glyphWidth,
    height: font.glyphHeight,
    chars: font.chars,
    charsPerRow: font.charsPerRow,
    "spacing.x": 0,
    "spacing.y": 0,
    lineSpacing: 0,
  }).data;
};

/** A `BitmapText` of `text` in `fontData` as Phaser's renderer reads one: one line, untinted, at the origin, its quads counted by `onQuad`. */
const labelOf = (fontData: unknown, text: string, onQuad: () => void) => ({
  _text: text,
  text,
  fontData,
  fontSize: 32,
  letterSpacing: 0,
  lineSpacing: 0,
  maxWidth: 0,
  wordWrapCharCode: 32,
  charColors: [],
  tintMode: 0,
  tintTopLeft: 0,
  tintTopRight: 0,
  tintBottomLeft: 0,
  tintBottomRight: 0,
  _alphaTL: 1,
  _alphaTR: 1,
  _alphaBL: 1,
  _alphaBR: 1,
  dropShadowX: 0,
  dropShadowY: 0,
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  scrollFactorX: 1,
  scrollFactorY: 1,
  displayOriginX: 0,
  displayOriginY: 0,
  customRenderNodes: {},
  defaultRenderNodes: {
    Submitter: {
      run: onQuad,
    },
  },
  getTextBounds(): unknown {
    return getBitmapTextSize(this, false, true, {
      local: {},
      global: {},
      lines: { shortest: 0, longest: 0, lengths: null, height: 0 },
      wrappedText: "",
      words: [],
      characters: [],
      scaleX: 0,
      scaleY: 0,
    });
  },
});

/** How many quads Phaser's WebGL renderer submits for `text` in `fontData`. */
const quadsDrawn = (fontData: unknown, text: string): number => {
  let quads = 0;
  const identity = (): unknown => new TransformMatrix();
  const label = labelOf(fontData, text, () => {
    quads += 1;
  });
  const camera = {
    addToRenderList: (): void => {},
    matrix: identity(),
    matrixCombined: identity(),
    matrixExternal: identity(),
    scrollX: 0,
    scrollY: 0,
  };

  renderBitmapText(null, label, { camera, useCanvas: false }, null);

  return quads;
};

/** The maintainer's floor tile, as the boot loads it. */
const FLOOR_PNG = join(REPOSITORY_ROOT, "assets", "floor.png");

/** A PNG's width and height are the two big-endian words after its signature and the IHDR chunk's length and type. */
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

const pngSize = (path: string): ImageSize => {
  const bytes = readFileSync(path);

  return {
    width: bytes.readUInt32BE(PNG_WIDTH_OFFSET),
    height: bytes.readUInt32BE(PNG_HEIGHT_OFFSET),
  };
};

/** Every image the bake is handed, as a canvas of the given size. */
const canvasOf = (size: ImageSize): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");

  canvas.width = size.width;
  canvas.height = size.height;

  return canvas;
};

const floorImages: AtlasImages = () => canvasOf(pngSize(FLOOR_PNG));

const floorOf = (frames: readonly AtlasFrameDef[]): AtlasFrameDef => {
  const found = frames.find((frame) => frame.name === FLOOR_FRAME);

  if (found === undefined) {
    throw new Error(`The frame list has no "${FLOOR_FRAME}"`);
  }

  return found;
};

const overlaps = (a: PlacedFrame, b: PlacedFrame): boolean =>
  a.x < b.x + b.frame.width &&
  b.x < a.x + a.frame.width &&
  a.y < b.y + b.frame.height &&
  b.y < a.y + a.frame.height;

const disc = (name: string, size: number): AtlasFrameDef => ({
  name,
  width: size,
  height: size,
  shape: { kind: "disc" },
});

describe("layoutAtlas over the content frame list", () => {
  const layout = layoutAtlas(
    sizeTileFrames(atlasFrames, () => pngSize(FLOOR_PNG)),
  );

  it("gives every listed frame a region, in the list's order", () => {
    expect(layout.frames.map((placed) => placed.frame.name)).toEqual(
      atlasFrames.map((frame) => frame.name),
    );
  });

  it("keeps every region inside the canvas", () => {
    for (const placed of layout.frames) {
      expect(placed.x).toBeGreaterThanOrEqual(0);
      expect(placed.y).toBeGreaterThanOrEqual(0);
      expect(placed.x + placed.frame.width).toBeLessThanOrEqual(layout.width);
      expect(placed.y + placed.frame.height).toBeLessThanOrEqual(layout.height);
    }
  });

  it("overlaps no two regions", () => {
    const overlapping: string[] = [];

    for (let i = 0; i < layout.frames.length; i += 1) {
      for (let j = i + 1; j < layout.frames.length; j += 1) {
        const a = layout.frames[i];
        const b = layout.frames[j];

        if (a !== undefined && b !== undefined && overlaps(a, b)) {
          overlapping.push(`${a.frame.name} and ${b.frame.name}`);
        }
      }
    }

    expect(overlapping).toEqual([]);
  });

  it("is as wide as the atlas constant", () => {
    expect(layout.width).toBe(ATLAS_WIDTH);
  });

  it("lays the glyphs out as the grid the font describes, in character order", () => {
    const font = layout.font;

    expect(font).not.toBeNull();

    if (font === null) {
      return;
    }

    expect(font.chars).toBe(GLYPH_CHARACTERS);

    Array.from(GLYPH_CHARACTERS).forEach((character, index) => {
      const placed = layout.frames.find(
        (candidate) => candidate.frame.name === `glyph_${character}`,
      );

      expect(placed).toEqual({
        frame: {
          name: `glyph_${character}`,
          width: font.glyphWidth,
          height: font.glyphHeight,
          shape: { kind: "glyph", character },
        },
        x: font.x + (index % font.charsPerRow) * font.glyphWidth,
        y: font.y + Math.floor(index / font.charsPerRow) * font.glyphHeight,
      });
    });
  });

  it("holds the space and the plus among the glyphs", () => {
    const names = atlasFrames.map((frame) => frame.name);

    expect(names).toContain("glyph_ ");
    expect(names).toContain("glyph_+");
  });

  it("holds an item icon per armory slot, gold's, and a globe's, each one square size", () => {
    const names = [
      ...ARMORY_SLOTS.map(itemIconFrame),
      ITEM_GOLD_FRAME,
      ITEM_GLOBE_FRAME,
    ];
    const icons = names.map((name) =>
      atlasFrames.find((frame) => frame.name === name),
    );

    expect(icons.map((frame) => frame?.name)).toEqual(names);

    for (const frame of icons) {
      expect(frame?.width).toBe(icons[0]?.width);
      expect(frame?.height).toBe(frame?.width);
    }
  });

  it("gives every silhouette a closed outline of at least three points inside its frame", () => {
    for (const frame of atlasFrames) {
      if (frame.shape.kind !== "silhouette") {
        continue;
      }

      const { points } = frame.shape;

      expect(points.length % 2, frame.name).toBe(0);
      expect(points.length, frame.name).toBeGreaterThanOrEqual(6);

      for (const point of points) {
        expect(point, frame.name).toBeGreaterThanOrEqual(0);
        expect(point, frame.name).toBeLessThanOrEqual(1);
      }
    }
  });

  it("bakes into one canvas no larger than one texture, for a game of one texture", () => {
    expect(layout.width).toBeLessThanOrEqual(MAX_TEXTURE_SIZE);
    expect(layout.height).toBeLessThanOrEqual(MAX_TEXTURE_SIZE);
    expect(gameConfig.render?.maxTextures).toBe(1);
  });

  it("holds a cone frame per angle a definition aims one at", () => {
    const cones = atlasFrames.filter((frame) => frame.shape.kind === "cone");

    expect(cones.map((frame) => frame.name)).toEqual(
      CONE_ANGLES.map(coneFrame),
    );

    for (const frame of cones) {
      expect(frame.width).toBe(frame.height);
    }
  });

  it("lists one wedge frame per step, from one to the full disc", () => {
    const steps = atlasFrames
      .map((frame) => frame.shape)
      .filter((shape) => shape.kind === "wedge")
      .map((shape) => shape.step);

    expect(steps).toEqual(
      Array.from({ length: WEDGE_STEPS }, (_, index) => index + 1),
    );
  });
});

describe("the atlas font as Phaser draws it", () => {
  const layout = layoutAtlas(
    sizeTileFrames(atlasFrames, () => pngSize(FLOOR_PNG)),
  );
  const font = layout.font;

  if (font === null) {
    throw new Error("The content frame list lays out no font");
  }

  const fontData = parsedFont(font, layout.width, layout.height);

  it("advances a space as far as any glyph, so words stay apart", () => {
    expect(widthOf(fontData, "HEAVY BELT")).toBeGreaterThan(
      widthOf(fontData, "HEAVYBELT"),
    );
    expect(widthOf(fontData, "HEAVY BELT")).toBe(
      widthOf(fontData, "HEAVYXBELT"),
    );
  });

  it("draws one quad a character for a label with no space", () => {
    expect(quadsDrawn(fontData, "RIMECOIL")).toBe(8);
  });

  it.each(["HEAVY BELT", "+12% MAGIC DAMAGE", "LEATHER GLOVES"])(
    "draws %s with one quad fewer than its characters for each space",
    (text) => {
      const spaces = Array.from(text).filter((character) => character === " ");

      expect(quadsDrawn(fontData, text)).toBe(text.length - spaces.length);
    },
  );
});

/** How wide Phaser measures `text` in `fontData`, in the font's pixels. */
const widthOf = (fontData: unknown, text: string): number => {
  const bounds = labelOf(fontData, text, () => {}).getTextBounds() as Readonly<{
    local: Readonly<{ width: number }>;
  }>;

  return bounds.local.width;
};

describe("layoutAtlas refusals", () => {
  it("refuses a list that names a frame twice", () => {
    expect(() => layoutAtlas([disc("disc", 8), disc("disc", 8)])).toThrow(
      'names "disc" twice',
    );
  });

  it("refuses a frame wider than the atlas", () => {
    expect(() => layoutAtlas([disc("disc", 2000)])).toThrow("does not fit");
  });

  it("lays out a list with no glyphs and no font", () => {
    const layout = layoutAtlas([disc("a", 8), disc("b", 8)]);

    expect(layout.font).toBeNull();
    expect(layout.frames).toHaveLength(2);
  });

  it("starts a new shelf when a frame does not fit beside the last", () => {
    const layout = layoutAtlas([disc("a", 60), disc("b", 60)], 100, 0);

    expect(layout.frames.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 60 },
    ]);
    expect(layout.height).toBe(120);
  });
});

describe("the floor tile in the atlas", () => {
  it("is the maintainer's PNG, a whole number of art diamonds in each direction, and fits the atlas", () => {
    const size = pngSize(FLOOR_PNG);

    expect(size.width % ART_DIAMOND_WIDTH).toBe(0);
    expect(size.height % (ART_DIAMOND_WIDTH / 2)).toBe(0);
    expect(size.width).toBeGreaterThan(0);
  });

  it("names one art diamond as its repeat: four cells' diamonds across, and half that down", () => {
    const floor = floorOf(atlasFrames);

    expect(floor.shape).toEqual({ kind: "tile", image: FLOOR_IMAGE });
    expect(floor.width).toBe(ART_DIAMOND_WIDTH);
    expect(floor.height).toBe(ART_DIAMOND_WIDTH / 2);
  });

  it("is carried at the PNG's size, and every other frame at its own", () => {
    const size = pngSize(FLOOR_PNG);
    const sized = sizeTileFrames(atlasFrames, () => size);
    const placed = layoutAtlas(sized).frames.find(
      (candidate) => candidate.frame.name === FLOOR_FRAME,
    );

    expect(placed?.frame.width).toBe(size.width);
    expect(placed?.frame.height).toBe(size.height);
    expect(sized.filter((frame) => frame.name !== FLOOR_FRAME)).toEqual(
      atlasFrames.filter((frame) => frame.name !== FLOOR_FRAME),
    );
  });

  it.each([
    [320, 160],
    [960, 80],
  ])(
    "takes a tile of %i by %i, a whole number of art diamonds, at that size",
    (width, height) => {
      const floor = floorOf(
        sizeTileFrames(atlasFrames, () => ({ width, height })),
      );

      expect({ width: floor.width, height: floor.height }).toEqual({
        width,
        height,
      });
    },
  );

  it.each([
    [170, 80],
    [160, 90],
    [80, 40],
    [240, 80],
    [1120, 80],
  ])("refuses a tile of %i by %i, naming the rule", (width, height) => {
    expect(() =>
      sizeTileFrames(atlasFrames, () => ({ width, height })),
    ).toThrow(
      `The tile image "${FLOOR_IMAGE}" for the frame "${FLOOR_FRAME}" is ${width} by ${height}: it must be a whole number of 160 by 80 art diamonds in each direction, and at most 960 wide to fit the atlas`,
    );
  });

  it("is copied into its region pixel for pixel from the image it names", () => {
    const painter = new PainterRecorder();
    const image = canvasOf({ width: 160, height: 80 });
    const named: string[] = [];

    paintFrame(
      painter,
      { frame: floorOf(atlasFrames), x: 10, y: 20 },
      (key) => {
        named.push(key);

        return image;
      },
    );

    expect(named).toEqual([FLOOR_IMAGE]);
    expect(painter.images[0]).toEqual({
      image,
      from: { x: 0, y: 0, width: 160, height: 80 },
      to: { x: 10, y: 20 },
    });
  });

  it("continues the tile a pixel past every edge with the pixels from the opposite edge, so a tile at a fractional position shows no seam", () => {
    const painter = new PainterRecorder();
    const image = canvasOf({ width: 160, height: 80 });

    paintFrame(
      painter,
      { frame: floorOf(atlasFrames), x: 10, y: 20 },
      () => image,
    );

    const bleeds = painter.images.slice(1).map(({ from, to }) => ({
      from,
      to,
    }));

    expect(TILE_BLEED).toBe(1);
    expect(bleeds).toEqual(
      expect.arrayContaining([
        // Left of the frame: the tile's rightmost column; right of it: its leftmost.
        { from: { x: 159, y: 0, width: 1, height: 80 }, to: { x: 9, y: 20 } },
        { from: { x: 0, y: 0, width: 1, height: 80 }, to: { x: 170, y: 20 } },
        // Above: its bottom row; below: its top row.
        { from: { x: 0, y: 79, width: 160, height: 1 }, to: { x: 10, y: 19 } },
        { from: { x: 0, y: 0, width: 160, height: 1 }, to: { x: 10, y: 100 } },
        // The four corners: the diagonally opposite corner pixel.
        { from: { x: 159, y: 79, width: 1, height: 1 }, to: { x: 9, y: 19 } },
        { from: { x: 0, y: 79, width: 1, height: 1 }, to: { x: 170, y: 19 } },
        { from: { x: 159, y: 0, width: 1, height: 1 }, to: { x: 9, y: 100 } },
        { from: { x: 0, y: 0, width: 1, height: 1 }, to: { x: 170, y: 100 } },
      ]),
    );
    expect(bleeds).toHaveLength(8);
  });

  it("keeps the bleed inside half the gutter, clear of the neighbouring frame", () => {
    expect(TILE_BLEED * 2).toBeLessThanOrEqual(FRAME_GUTTER);
  });
});

describe("coneSweep", () => {
  it.each([[60], [90], [180]])(
    "a cone of %i degrees opens half of it either side of the rightward axis",
    (angleDegrees) => {
      const { startAngle, endAngle } = coneSweep(angleDegrees);

      expect(startAngle).toBeCloseTo(-endAngle);
      expect(endAngle - startAngle).toBeCloseTo((angleDegrees * Math.PI) / 180);
    },
  );
});

describe("wedgeSweep", () => {
  it.each([
    [1, 64],
    [16, 64],
    [32, 64],
    [63, 64],
  ])(
    "frame %i of %i starts at twelve o'clock and sweeps that fraction of the circle clockwise",
    (step, steps) => {
      const { startAngle, endAngle } = wedgeSweep(step, steps);

      expect(startAngle).toBe(-Math.PI / 2);
      expect(endAngle - startAngle).toBeCloseTo((TWO_PI * step) / steps);
    },
  );

  it("frame 64 of 64 is the full circle", () => {
    const { startAngle, endAngle } = wedgeSweep(64, 64);

    expect(endAngle - startAngle).toBeCloseTo(TWO_PI);
  });
});

describe("paintFrame over the content frame list", () => {
  it("makes at least one mark for every listed frame", () => {
    const unpainted: string[] = [];

    for (const placed of layoutAtlas(
      sizeTileFrames(atlasFrames, () => pngSize(FLOOR_PNG)),
    ).frames) {
      const painter = new PainterRecorder();

      paintFrame(painter, placed, floorImages);

      if (painter.marks === 0) {
        unpainted.push(placed.frame.name);
      }
    }

    expect(unpainted).toEqual([]);
  });

  it("draws a silhouette as one closed outline through its points, scaled to the frame, and fills it", () => {
    const painter = new PainterRecorder();

    paintFrame(
      painter,
      {
        frame: {
          name: "item_off_hand",
          width: 100,
          height: 50,
          shape: { kind: "silhouette", points: [0, 0, 1, 0, 0.5, 1] },
        },
        x: 10,
        y: 20,
      },
      floorImages,
    );

    expect(painter.pathPoints).toEqual([
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      { x: 60, y: 70 },
    ]);
    expect(painter.fillRules).toEqual(["nonzero"]);
  });

  it("draws a cone as an arc from the frame's centre, half its angle either side of the rightward axis", () => {
    const painter = new PainterRecorder();

    paintFrame(
      painter,
      {
        frame: {
          name: coneFrame(60),
          width: 64,
          height: 64,
          shape: { kind: "cone", angleDegrees: 60 },
        },
        x: 10,
        y: 20,
      },
      floorImages,
    );

    expect(painter.arcs).toEqual([
      {
        x: 42,
        y: 52,
        radius: 32,
        startAngle: -Math.PI / 6,
        endAngle: Math.PI / 6,
      },
    ]);
  });

  it("draws a square with a dot as the square and a circle a third of it across, filled even-odd so the circle is a hole", () => {
    const painter = new PainterRecorder();

    paintFrame(
      painter,
      {
        frame: {
          name: "square_dot",
          width: 60,
          height: 60,
          shape: { kind: "square_dot", holeFraction: 1 / 3 },
        },
        x: 10,
        y: 20,
      },
      floorImages,
    );

    expect(painter.arcs).toEqual([
      { x: 40, y: 50, radius: 10, startAngle: 0, endAngle: Math.PI * 2 },
    ]);
    expect(painter.fillRules).toEqual(["evenodd"]);
  });

  it("draws a wedge as an arc from the frame's centre over its sweep", () => {
    const painter = new PainterRecorder();

    paintFrame(
      painter,
      {
        frame: {
          name: "wedge_16",
          width: 64,
          height: 64,
          shape: { kind: "wedge", step: 16, steps: 64 },
        },
        x: 10,
        y: 20,
      },
      floorImages,
    );

    expect(painter.arcs).toEqual([
      {
        x: 42,
        y: 52,
        radius: 32,
        startAngle: -Math.PI / 2,
        endAngle: -Math.PI / 2 + Math.PI / 2,
      },
    ]);
  });
});
