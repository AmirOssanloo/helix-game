import { describe, expect, it } from "vitest";
import { atlasFrames, GLYPH_CHARACTERS, WEDGE_STEPS } from "@content/public";
import type { AtlasFrameDef } from "@domain/public";
import {
  ATLAS_WIDTH,
  layoutAtlas,
  type PlacedFrame,
} from "@presentation/atlas/atlas-layout";
import { paintFrame, wedgeSweep } from "@presentation/atlas/shape-painter";
import { PainterRecorder } from "./../helpers";

const TWO_PI = Math.PI * 2;

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
  const layout = layoutAtlas(atlasFrames);

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

    for (const placed of layoutAtlas(atlasFrames).frames) {
      const painter = new PainterRecorder();

      paintFrame(painter, placed);

      if (painter.marks === 0) {
        unpainted.push(placed.frame.name);
      }
    }

    expect(unpainted).toEqual([]);
  });

  it("draws a wedge as an arc from the frame's centre over its sweep", () => {
    const painter = new PainterRecorder();

    paintFrame(painter, {
      frame: {
        name: "wedge_16",
        width: 64,
        height: 64,
        shape: { kind: "wedge", step: 16, steps: 64 },
      },
      x: 10,
      y: 20,
    });

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
