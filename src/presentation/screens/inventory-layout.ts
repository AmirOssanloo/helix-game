import {
  ARMORY_SLOT_COUNT,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
} from "@domain/queries";
import type { Rect } from "@shared/public";
import { containsPoint, HUD_WIDTH } from "../hud/hud-layout";

/**
 * Where everything on the inventory and armory screen sits, in the HUD scene's pixels on the
 * logical canvas: the panel, the armory's ten slots laid out as a figure, the grid, and gold.
 * A presentation number, every one of them; nothing here reads the world.
 */

const HALF = 0.5;

/** The panel along the right edge of the canvas, clear of the bar below it. */
export const PANEL_WIDTH = 720;
export const PANEL_HEIGHT = 840;
const PANEL_MARGIN = 40;

/** The canvas rectangle the inventory covers: every press inside it is the screen's. */
export const INVENTORY_RECT: Readonly<Rect> = {
  minX: HUD_WIDTH - PANEL_MARGIN - PANEL_WIDTH,
  minY: PANEL_MARGIN,
  maxX: HUD_WIDTH - PANEL_MARGIN,
  maxY: PANEL_MARGIN + PANEL_HEIGHT,
};

export const PANEL_CENTRE_X =
  (INVENTORY_RECT.minX + INVENTORY_RECT.maxX) * HALF;
export const PANEL_CENTRE_Y =
  (INVENTORY_RECT.minY + INVENTORY_RECT.maxY) * HALF;

/** The title, near the panel's top. */
export const TITLE_SIZE = 40;
export const TITLE_CENTRE_Y = INVENTORY_RECT.minY + 48;

/** The inventory grid: square cells, ten across and four down, centred across the panel. */
export const GRID_CELL_SIZE = 64;
export const GRID_TOP = 544;
export const GRID_LEFT =
  PANEL_CENTRE_X - INVENTORY_COLUMNS * GRID_CELL_SIZE * HALF;

/** The rectangle the grid covers. */
export const GRID_RECT: Readonly<Rect> = {
  minX: GRID_LEFT,
  minY: GRID_TOP,
  maxX: GRID_LEFT + INVENTORY_COLUMNS * GRID_CELL_SIZE,
  maxY: GRID_TOP + INVENTORY_ROWS * GRID_CELL_SIZE,
};

/** Gold, one line below the grid. */
export const GOLD_SIZE = 28;
export const GOLD_CENTRE_Y = GRID_RECT.maxY + 40;

/** The x of the centre of the column `column` of the grid. */
export const gridColumnCentreX = (column: number): number =>
  GRID_LEFT + (column + HALF) * GRID_CELL_SIZE;

/** The y of the centre of the row `row` of the grid. */
export const gridRowCentreY = (row: number): number =>
  GRID_TOP + (row + HALF) * GRID_CELL_SIZE;

/**
 * The grid cell under (`x`, `y`), counted from zero in reading order, or `-1` off the grid. A
 * point on a line between two cells is the cell right of it or below it; the grid's far edges
 * are the last cells'.
 */
export const gridCellAt = (x: number, y: number): number => {
  if (!containsPoint(GRID_RECT, x, y)) {
    return -1;
  }

  const column = Math.min(
    Math.floor((x - GRID_LEFT) / GRID_CELL_SIZE),
    INVENTORY_COLUMNS - 1,
  );
  const row = Math.min(
    Math.floor((y - GRID_TOP) / GRID_CELL_SIZE),
    INVENTORY_ROWS - 1,
  );

  return row * INVENTORY_COLUMNS + column;
};

/** The armory's slots are laid in cells of this size, smaller than the grid's, so the figure fits above it. */
const ARMORY_CELL = 52;
const ARMORY_GAP = 8;

/** The figure's three columns: the middle one under the panel's centre, and one each side, past half the belt, a ring, and half a glove. */
const MIDDLE_X = PANEL_CENTRE_X;
const SIDE_OFFSET_X = ARMORY_CELL * 3 + ARMORY_GAP * 2;
const LEFT_X = MIDDLE_X - SIDE_OFFSET_X;
const RIGHT_X = MIDDLE_X + SIDE_OFFSET_X;

/** The figure's rows, top down: the helm, the body and the hands, then the belt, rings, gloves, and boots. */
const HELM_Y = 196;
const BODY_Y = 334;
const BELT_Y = 446;
const FEET_Y = 472;

/** A slot's box, in the armory's cells of width and height, centred on (`x`, `y`). */
const slotBox = (
  x: number,
  y: number,
  width: number,
  height: number,
): Readonly<Rect> => ({
  minX: x - width * ARMORY_CELL * HALF,
  minY: y - height * ARMORY_CELL * HALF,
  maxX: x + width * ARMORY_CELL * HALF,
  maxY: y + height * ARMORY_CELL * HALF,
});

/** How far a ring's or the amulet's one cell sits from the middle column: past half the belt, or the helm, and a gap. */
const BESIDE_MIDDLE_X = ARMORY_CELL + ARMORY_GAP + ARMORY_CELL * HALF;

/**
 * The box of each armory slot on the canvas, in the armory's order: helm, amulet, body, main
 * hand, off-hand, gloves, belt, boots, and the two rings. The helm sits over the body and the
 * belt under it; the amulet beside the helm; the hands either side of the body; the gloves
 * and the boots at the figure's feet, a ring beside each end of the belt.
 */
export const ARMORY_SLOT_RECTS: readonly Readonly<Rect>[] = [
  slotBox(MIDDLE_X, HELM_Y, 2, 2),
  slotBox(MIDDLE_X + BESIDE_MIDDLE_X, HELM_Y - ARMORY_CELL * HALF, 1, 1),
  slotBox(MIDDLE_X, BODY_Y, 2, 3),
  slotBox(LEFT_X, BODY_Y, 2, 3),
  slotBox(RIGHT_X, BODY_Y, 2, 3),
  slotBox(LEFT_X, FEET_Y, 2, 2),
  slotBox(MIDDLE_X, BELT_Y, 2, 1),
  slotBox(RIGHT_X, FEET_Y, 2, 2),
  slotBox(MIDDLE_X - BESIDE_MIDDLE_X, BELT_Y, 1, 1),
  slotBox(MIDDLE_X + BESIDE_MIDDLE_X, BELT_Y, 1, 1),
];

/** The armory slot whose box holds (`x`, `y`), counted from zero in the armory's order, or `-1`. */
export const armorySlotAt = (x: number, y: number): number => {
  for (let slot = 0; slot < ARMORY_SLOT_COUNT; slot += 1) {
    const rect = ARMORY_SLOT_RECTS[slot];

    if (rect !== undefined && containsPoint(rect, x, y)) {
      return slot;
    }
  }

  return -1;
};
