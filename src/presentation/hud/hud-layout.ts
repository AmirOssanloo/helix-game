import { SLOT_COUNT } from "@domain/public";
import type { Rect } from "@shared/public";

/**
 * Where everything on the bottom bar sits, in the HUD scene's own pixels on the logical
 * canvas. A presentation number, every one of them; nothing here reads the world.
 */

/** The logical canvas the bar is laid out on. */
export const HUD_WIDTH = 1920;
export const HUD_HEIGHT = 1080;

/** The ability squares: six in a row, centred, with a gap between them. */
export const SQUARE_SIZE = 96;
export const SQUARE_GAP = 12;
export const SQUARE_BOTTOM_MARGIN = 24;

/** The orb squares: three small ones above the ability squares, in age order from the left. */
export const ORB_SQUARE_SIZE = 40;
export const ORB_SQUARE_GAP = 8;
export const ORB_ROW_MARGIN = 12;

/** The two resource bars, stacked to the left of the squares. */
export const BAR_WIDTH = 256;
export const BAR_HEIGHT = 24;
export const BAR_GAP = 8;
export const BAR_MARGIN = 32;

/** The level, its experience bar, and the marker, to the right of the squares. */
export const LEVEL_MARGIN = 32;
export const EXPERIENCE_BAR_WIDTH = 160;
export const EXPERIENCE_BAR_HEIGHT = 12;
export const MARKER_SIZE = 16;

/** Text sizes, in pixels a line. */
export const KEY_LABEL_SIZE = 28;
export const SMALL_LABEL_SIZE = 18;
export const BAR_LABEL_SIZE = 18;
export const LEVEL_LABEL_SIZE = 32;

const HALF = 0.5;

/** The width of the six squares and the five gaps between them. */
export const SQUARES_WIDTH =
  SQUARE_SIZE * SLOT_COUNT + SQUARE_GAP * (SLOT_COUNT - 1);

/** The x of the first square's left edge. */
export const SQUARES_LEFT = (HUD_WIDTH - SQUARES_WIDTH) * HALF;

/** The y of the squares' centre line. */
export const SQUARES_CENTRE_Y =
  HUD_HEIGHT - SQUARE_BOTTOM_MARGIN - SQUARE_SIZE * HALF;

/** The x of the centre of ability square `slot`, 1 to 6. */
export const squareCentreX = (slot: number): number =>
  SQUARES_LEFT + (slot - 1) * (SQUARE_SIZE + SQUARE_GAP) + SQUARE_SIZE * HALF;

/** The y of the orb squares' centre line. */
export const ORB_ROW_CENTRE_Y =
  SQUARES_CENTRE_Y -
  SQUARE_SIZE * HALF -
  ORB_ROW_MARGIN -
  ORB_SQUARE_SIZE * HALF;

/** The x of the centre of orb square `index`, from zero, laid from the first ability square's left edge. */
export const orbSquareCentreX = (index: number): number =>
  SQUARES_LEFT +
  index * (ORB_SQUARE_SIZE + ORB_SQUARE_GAP) +
  ORB_SQUARE_SIZE * HALF;

/** The x of the resource bars' centre. */
export const BARS_CENTRE_X = SQUARES_LEFT - BAR_MARGIN - BAR_WIDTH * HALF;

/** The y of the health bar's centre, and of the mana bar's below it. */
export const HEALTH_BAR_CENTRE_Y =
  SQUARES_CENTRE_Y - (BAR_HEIGHT + BAR_GAP) * HALF;
export const MANA_BAR_CENTRE_Y =
  SQUARES_CENTRE_Y + (BAR_HEIGHT + BAR_GAP) * HALF;

/** The x of the level block's centre. */
export const LEVEL_CENTRE_X =
  SQUARES_LEFT + SQUARES_WIDTH + LEVEL_MARGIN + EXPERIENCE_BAR_WIDTH * HALF;

/** The y of the level number, and of the experience bar beneath it. */
export const LEVEL_LABEL_CENTRE_Y = SQUARES_CENTRE_Y - LEVEL_LABEL_SIZE * HALF;
export const EXPERIENCE_BAR_CENTRE_Y =
  SQUARES_CENTRE_Y + LEVEL_LABEL_SIZE * HALF + EXPERIENCE_BAR_HEIGHT;

/** The rectangle the whole bar covers: a click inside it belongs to the HUD and never reaches the world. */
export const BAR_RECT: Readonly<Rect> = {
  minX: BARS_CENTRE_X - BAR_WIDTH * HALF,
  minY: ORB_ROW_CENTRE_Y - ORB_SQUARE_SIZE * HALF,
  maxX: LEVEL_CENTRE_X + EXPERIENCE_BAR_WIDTH * HALF,
  maxY: HUD_HEIGHT,
};

/** Whether (`x`, `y`) is inside `rect`. */
export const containsPoint = (
  rect: Readonly<Rect>,
  x: number,
  y: number,
): boolean =>
  x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;

/** The ability square under (`x`, `y`), 1 to 6, or `0` when none is. */
export const squareAt = (x: number, y: number): number => {
  const half = SQUARE_SIZE * HALF;

  if (y < SQUARES_CENTRE_Y - half || y > SQUARES_CENTRE_Y + half) {
    return 0;
  }

  for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
    const centre = squareCentreX(slot);

    if (x >= centre - half && x <= centre + half) {
      return slot;
    }
  }

  return 0;
};
