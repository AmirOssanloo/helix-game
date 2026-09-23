import type { AtlasFrameDef, AtlasShape } from "@domain/public";
import { coneHalfAngle } from "@domain/public";
import {
  type AtlasLayout,
  FRAME_GUTTER,
  type PlacedFrame,
} from "./atlas-layout";

/**
 * The part of a 2D canvas context the bake draws with. A real context satisfies it; a test
 * hands in a recorder, since nothing in a test draws.
 */
export type AtlasPainter = Pick<
  CanvasRenderingContext2D,
  | "arc"
  | "beginPath"
  | "closePath"
  | "drawImage"
  | "fill"
  | "fillRect"
  | "fillStyle"
  | "fillText"
  | "font"
  | "lineTo"
  | "lineWidth"
  | "moveTo"
  | "rect"
  | "stroke"
  | "strokeRect"
  | "strokeStyle"
  | "textAlign"
  | "textBaseline"
>;

/** Every frame but a painted tile is white; colour is a tint at runtime. */
const WHITE = "#ffffff";

const TWO_PI = Math.PI * 2;

/** Twelve o'clock on a canvas, where y grows downward. */
const TWELVE_OCLOCK = -Math.PI / 2;

/** The glyph's em height as a fraction of its cell, leaving room above and below for the cell's edge. */
const GLYPH_EM_FRACTION = 0.8;

const GLYPH_FONT_FAMILY = "monospace";

/** A stripe and its gap, in stripe thicknesses. */
const STRIPE_PERIOD = 2;

/** A status icon: an outline this fraction of the cell thick, with its glyph this fraction of the cell tall inside it. */
const ICON_OUTLINE_FRACTION = 0.125;
const ICON_EM_FRACTION = 0.6;

/**
 * Where a cone of `angleDegrees` starts and ends: half of it either side of the rightward
 * axis, in canvas radians, so a quad turned to a facing of zero opens the way the facing
 * points. The apex is the frame's centre, which is a quad's own origin, so a view puts the
 * quad where the cone's apex belongs and turns it to the facing.
 */
export const coneSweep = (
  angleDegrees: number,
): Readonly<{ startAngle: number; endAngle: number }> => {
  const half = coneHalfAngle(angleDegrees);

  return { startAngle: -half, endAngle: half };
};

/** Where the wedge covering `step` of `steps` starts and ends: clockwise from twelve o'clock, in canvas radians. */
export const wedgeSweep = (
  step: number,
  steps: number,
): Readonly<{ startAngle: number; endAngle: number }> => ({
  startAngle: TWELVE_OCLOCK,
  endAngle: TWELVE_OCLOCK + (TWO_PI * step) / steps,
});

/** The image loaded under a key, for a tile frame to be copied from. */
export type AtlasImages = (image: string) => CanvasImageSource;

/**
 * How far a tile is continued past its frame's edge, into half the gutter it shares with its
 * neighbour, so the neighbour's side stays clear.
 */
export const TILE_BLEED = FRAME_GUTTER / 2;

/**
 * Continues a seamless tile `bleed` pixels past each edge of its frame with the pixels from the
 * opposite edge, which are what the next tile laid beside it shows. A quad at a fractional
 * screen position is sampled between texels at its edge; with the gutter transparent that
 * sample is a dark seam between tiles, and with the tile continued it is the floor.
 */
const bleedTile = (
  painter: AtlasPainter,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  bleed: number,
): void => {
  const across = [
    { from: width - bleed, to: x - bleed, size: bleed },
    { from: 0, to: x, size: width },
    { from: 0, to: x + width, size: bleed },
  ];
  const down = [
    { from: height - bleed, to: y - bleed, size: bleed },
    { from: 0, to: y, size: height },
    { from: 0, to: y + height, size: bleed },
  ];

  for (const column of across) {
    for (const row of down) {
      // The middle of the nine is the tile itself, already copied.
      if (column.size === width && row.size === height) {
        continue;
      }

      painter.drawImage(
        image,
        column.from,
        row.from,
        column.size,
        row.size,
        column.to,
        row.to,
        column.size,
        row.size,
      );
    }
  }
};

const paintShape = (
  painter: AtlasPainter,
  shape: AtlasShape,
  frame: AtlasFrameDef,
  x: number,
  y: number,
  images: AtlasImages,
): void => {
  const { width, height } = frame;
  const centreX = x + width / 2;
  const centreY = y + height / 2;
  const radius = Math.min(width, height) / 2;

  switch (shape.kind) {
    case "disc": {
      painter.beginPath();
      painter.arc(centreX, centreY, radius, 0, TWO_PI);
      painter.fill();

      return;
    }

    case "ring": {
      painter.beginPath();
      painter.arc(centreX, centreY, radius - shape.thickness / 2, 0, TWO_PI);
      painter.lineWidth = shape.thickness;
      painter.stroke();

      return;
    }

    case "square": {
      painter.fillRect(x, y, width, height);

      return;
    }

    case "square_outline": {
      const inset = shape.thickness / 2;

      painter.lineWidth = shape.thickness;
      painter.strokeRect(
        x + inset,
        y + inset,
        width - shape.thickness,
        height - shape.thickness,
      );

      return;
    }

    case "square_dot": {
      // The square and the circle in one path, filled even-odd, so the circle is left empty.
      painter.beginPath();
      painter.rect(x, y, width, height);
      painter.moveTo(centreX + (width * shape.holeFraction) / 2, centreY);
      painter.arc(
        centreX,
        centreY,
        (width * shape.holeFraction) / 2,
        0,
        TWO_PI,
      );
      painter.fill("evenodd");

      return;
    }

    case "triangle": {
      painter.beginPath();
      painter.moveTo(x + width, centreY);
      painter.lineTo(x, y);
      painter.lineTo(x, y + height);
      painter.closePath();
      painter.fill();

      return;
    }

    case "cone": {
      const { startAngle, endAngle } = coneSweep(shape.angleDegrees);

      painter.beginPath();
      painter.moveTo(centreX, centreY);
      painter.arc(centreX, centreY, radius, startAngle, endAngle);
      painter.closePath();
      painter.fill();

      return;
    }

    case "pixel": {
      painter.fillRect(x, y, width, height);

      return;
    }

    case "wedge": {
      const { startAngle, endAngle } = wedgeSweep(shape.step, shape.steps);

      painter.beginPath();
      painter.moveTo(centreX, centreY);
      painter.arc(centreX, centreY, radius, startAngle, endAngle);
      painter.closePath();
      painter.fill();

      return;
    }

    case "stripes": {
      // Bands the thickness of the gap between them, so the square reads as half filled.
      for (
        let top = y;
        top < y + height;
        top += shape.thickness * STRIPE_PERIOD
      ) {
        painter.fillRect(
          x,
          top,
          width,
          Math.min(shape.thickness, y + height - top),
        );
      }

      return;
    }

    case "icon": {
      const outline = width * ICON_OUTLINE_FRACTION;

      painter.lineWidth = outline;
      painter.strokeRect(
        x + outline / 2,
        y + outline / 2,
        width - outline,
        height - outline,
      );
      painter.font = `bold ${Math.round(height * ICON_EM_FRACTION)}px ${GLYPH_FONT_FAMILY}`;
      painter.textAlign = "center";
      painter.textBaseline = "middle";
      painter.fillText(shape.glyph, centreX, centreY);

      return;
    }

    case "tile": {
      // Copied pixel for pixel, in the colours it was painted; the frame is the image's size.
      const image = images(shape.image);

      painter.drawImage(image, x, y);
      bleedTile(painter, image, x, y, width, height, TILE_BLEED);

      return;
    }

    case "glyph": {
      const em = Math.round(height * GLYPH_EM_FRACTION);

      painter.font = `bold ${em}px ${GLYPH_FONT_FAMILY}`;
      painter.textAlign = "center";
      painter.textBaseline = "middle";
      painter.fillText(shape.character, centreX, centreY);

      return;
    }
  }
};

/** Draws one placed frame inside its region and nowhere else: white, or a tile copied from `images`. */
export const paintFrame = (
  painter: AtlasPainter,
  placed: PlacedFrame,
  images: AtlasImages,
): void => {
  painter.fillStyle = WHITE;
  painter.strokeStyle = WHITE;
  paintShape(
    painter,
    placed.frame.shape,
    placed.frame,
    placed.x,
    placed.y,
    images,
  );
};

/** Draws every frame of the layout. */
export const paintAtlas = (
  painter: AtlasPainter,
  layout: AtlasLayout,
  images: AtlasImages,
): void => {
  for (const placed of layout.frames) {
    paintFrame(painter, placed, images);
  }
};
