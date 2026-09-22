import type { AtlasFrameDef, AtlasShape } from "@domain/public";
import type { AtlasLayout, PlacedFrame } from "./atlas-layout";

/**
 * The part of a 2D canvas context the bake draws with. A real context satisfies it; a test
 * hands in a recorder, since nothing in a test draws.
 */
export type AtlasPainter = Pick<
  CanvasRenderingContext2D,
  | "arc"
  | "beginPath"
  | "closePath"
  | "fill"
  | "fillRect"
  | "fillStyle"
  | "fillText"
  | "font"
  | "lineTo"
  | "lineWidth"
  | "moveTo"
  | "stroke"
  | "strokeRect"
  | "strokeStyle"
  | "textAlign"
  | "textBaseline"
>;

/** Every frame is white; colour is a tint at runtime. */
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

/** Where the wedge covering `step` of `steps` starts and ends: clockwise from twelve o'clock, in canvas radians. */
export const wedgeSweep = (
  step: number,
  steps: number,
): Readonly<{ startAngle: number; endAngle: number }> => ({
  startAngle: TWELVE_OCLOCK,
  endAngle: TWELVE_OCLOCK + (TWO_PI * step) / steps,
});

const paintShape = (
  painter: AtlasPainter,
  shape: AtlasShape,
  frame: AtlasFrameDef,
  x: number,
  y: number,
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

    case "triangle": {
      painter.beginPath();
      painter.moveTo(x + width, centreY);
      painter.lineTo(x, y);
      painter.lineTo(x, y + height);
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

/** Draws one placed frame, white, inside its region and nowhere else. */
export const paintFrame = (
  painter: AtlasPainter,
  placed: PlacedFrame,
): void => {
  painter.fillStyle = WHITE;
  painter.strokeStyle = WHITE;
  paintShape(painter, placed.frame.shape, placed.frame, placed.x, placed.y);
};

/** Draws every frame of the layout. */
export const paintAtlas = (
  painter: AtlasPainter,
  layout: AtlasLayout,
): void => {
  for (const placed of layout.frames) {
    paintFrame(painter, placed);
  }
};
