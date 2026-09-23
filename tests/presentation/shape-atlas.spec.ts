import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  atlasFrames,
  CONE_ANGLES,
  coneFrame,
  FLOOR_FRAME,
  FLOOR_IMAGE,
  GLYPH_CHARACTERS,
  WEDGE_STEPS,
} from "@content/public";
import type { AtlasFrameDef } from "@domain/public";
import {
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
