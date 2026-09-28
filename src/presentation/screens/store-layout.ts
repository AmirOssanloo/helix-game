import type { StoreTab } from "@domain/public";
import type { Rect } from "@shared/public";
import { GRID_CELL_SIZE, PANEL_HEIGHT, PANEL_WIDTH } from "./inventory-layout";

/**
 * Where everything on the store screen sits, in the HUD scene's pixels on the logical canvas:
 * the panel along the left edge, across the canvas from the inventory as Diablo II's store
 * is, its title, the three tabs, the stock grid, and gold, and how an item is laid in the grid.
 * A presentation number, every one of them; nothing here reads the world.
 */

const HALF = 0.5;
const PANEL_MARGIN = 40;

/** The canvas rectangle the store covers, the inventory's size: every press inside it is the screen's. */
export const STORE_RECT: Readonly<Rect> = {
  minX: PANEL_MARGIN,
  minY: PANEL_MARGIN,
  maxX: PANEL_MARGIN + PANEL_WIDTH,
  maxY: PANEL_MARGIN + PANEL_HEIGHT,
};

export const STORE_CENTRE_X = (STORE_RECT.minX + STORE_RECT.maxX) * HALF;
export const STORE_CENTRE_Y = (STORE_RECT.minY + STORE_RECT.maxY) * HALF;

export const STORE_TITLE_SIZE = 40;
export const STORE_TITLE_CENTRE_Y = STORE_RECT.minY + 48;

/** The tabs in the order they are laid from the left, each with the word it shows. */
export const STORE_TABS: readonly StoreTab[] = ["armour", "weapons", "misc"];
export const STORE_TAB_TITLES: Readonly<Record<StoreTab, string>> = {
  armour: "ARMOUR",
  weapons: "WEAPONS",
  misc: "MISC",
};

/** The tabs: a row of buttons under the title, centred across the panel. */
export const TAB_WIDTH = 200;
export const TAB_HEIGHT = 48;
const TAB_GAP = 16;
export const TAB_TEXT_SIZE = 24;
export const TAB_CENTRE_Y = STORE_RECT.minY + 120;

/** The x of the centre of tab `tab`, counted from zero from the left. */
export const tabCentreX = (tab: number): number =>
  STORE_CENTRE_X +
  (tab - (STORE_TABS.length - 1) * HALF) * (TAB_WIDTH + TAB_GAP);

/** The tab whose button holds (`x`, `y`), counted from zero from the left, or `-1`. */
export const tabAt = (x: number, y: number): number => {
  if (Math.abs(y - TAB_CENTRE_Y) > TAB_HEIGHT * HALF) {
    return -1;
  }

  for (let tab = 0; tab < STORE_TABS.length; tab += 1) {
    if (Math.abs(x - tabCentreX(tab)) <= TAB_WIDTH * HALF) {
      return tab;
    }
  }

  return -1;
};

/**
 * The stock grid: the inventory's cells, ten across and nine down. An item is laid in a lane
 * two cells wide, the widest base, in the first lane from the left with rows left for it, top
 * down; five lanes of nine rows hold every stock of twelve, since no base is taller than three.
 */
export const STOCK_COLUMNS = 10;
export const STOCK_ROWS = 9;
export const STOCK_LANE_WIDTH = 2;
export const STOCK_LANE_COUNT = STOCK_COLUMNS / STOCK_LANE_WIDTH;
export const STOCK_TOP = STORE_RECT.minY + 168;
export const STOCK_LEFT =
  STORE_CENTRE_X - STOCK_COLUMNS * GRID_CELL_SIZE * HALF;

/** The rectangle the stock grid covers. */
export const STOCK_RECT: Readonly<Rect> = {
  minX: STOCK_LEFT,
  minY: STOCK_TOP,
  maxX: STOCK_LEFT + STOCK_COLUMNS * GRID_CELL_SIZE,
  maxY: STOCK_TOP + STOCK_ROWS * GRID_CELL_SIZE,
};

/** Gold, one line below the grid. */
export const STORE_GOLD_SIZE = 28;
export const STORE_GOLD_CENTRE_Y = STOCK_RECT.maxY + 40;

/** How far an item's backdrop sits inside the cells it covers, so the grid's lines show. */
const CELL_INSET = 2;

/**
 * Lays an item `width` by `height` cells in the first lane whose used rows, in `laneRows`,
 * leave room for it, writing the cells it covers into `out`, inset from their lines, and the
 * rows into the lane. Returns `false`, writing nothing, when it is wider than a lane or no lane
 * has room. `laneRows` holds one count per lane, zeroed before each tab is laid.
 */
export const layInLane = (
  laneRows: number[],
  width: number,
  height: number,
  out: Rect,
): boolean => {
  if (width > STOCK_LANE_WIDTH) {
    return false;
  }

  for (let lane = 0; lane < laneRows.length; lane += 1) {
    const used = laneRows[lane] ?? STOCK_ROWS;

    if (used + height <= STOCK_ROWS) {
      out.minX = STOCK_LEFT + lane * STOCK_LANE_WIDTH * GRID_CELL_SIZE;
      out.minY = STOCK_TOP + used * GRID_CELL_SIZE;
      out.maxX = out.minX + width * GRID_CELL_SIZE - CELL_INSET;
      out.maxY = out.minY + height * GRID_CELL_SIZE - CELL_INSET;
      out.minX += CELL_INSET;
      out.minY += CELL_INSET;
      laneRows[lane] = used + height;

      return true;
    }
  }

  return false;
};
