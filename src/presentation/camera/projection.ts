import type { Rect, Vec2 } from "@shared/public";

/** The world's square cell the floor draws one diamond over: the walkability grid's cell. */
export const FLOOR_CELL = 32;

/** A cell is twice as wide across the screen as it is down it: the classic 2:1 diamond. */
const DIAMOND_ASPECT = 2;

/** The one scale the game is drawn at: a cell's diamond is this many whole pixels across, and half that down. */
export const DIAMOND_WIDTH = 40;

/** One art diamond of the floor tile covers this many cells along each side. */
export const FLOOR_ART_CELLS = 4;

/** An art diamond is this many pixels across, and half that down: four cells' diamonds. */
export const ART_DIAMOND_WIDTH = FLOOR_ART_CELLS * DIAMOND_WIDTH;

/** Screen pixels per world unit along each screen diagonal, at the diamond width. */
export const VIEW_SCALE = DIAMOND_WIDTH / (DIAMOND_ASPECT * FLOOR_CELL);

const SQRT_HALF = Math.SQRT1_2;

/**
 * Where a ground point is drawn, for a view that stands up off the ground rather than lying on
 * it: a label, a number, an icon. What lies on the ground is drawn inside the ground layer and
 * never asks. A test hands in a flat placement, screen equal to world.
 */
export type ScreenPlacement = Readonly<{
  /** The screen point, before the camera's scroll, that the world point (`x`, `y`) is drawn at. */
  toScreen: (x: number, y: number, out: Vec2) => void;
  /** How far above its centre the top of a ground circle of `radius` is drawn, in screen pixels. */
  riseOf: (radius: number) => number;
}>;

/**
 * The isometric projection, the one place the diamond view is worked out. The world stays a
 * square plane; this turns a world point into the screen point it is drawn at and back, for a
 * scale `k` of screen pixels per world unit along each screen diagonal:
 *
 *   screen x = (x − y) · k,  screen y = (x + y) · k / 2
 *
 * so a square cell of `FLOOR_CELL` world units is a diamond `2 · FLOOR_CELL · k` pixels across
 * and half that down. The scale is fixed and lives here rather than in the camera, so a
 * diamond is always `DIAMOND_WIDTH` whole pixels. Every method writes into what it is handed so nothing
 * allocates per frame.
 */
export class Projection implements ScreenPlacement {
  private readonly k = VIEW_SCALE;

  toScreen(x: number, y: number, out: Vec2): void {
    const k = this.k;

    out.x = (x - y) * k;
    out.y = ((x + y) * k) / DIAMOND_ASPECT;
  }

  /** The world point drawn at the screen point (`screenX`, `screenY`): the inverse of `toScreen`. */
  toWorld(screenX: number, screenY: number, out: Vec2): void {
    const across = screenX / this.k;
    const down = (screenY * DIAMOND_ASPECT) / this.k;

    out.x = (down + across) / 2;
    out.y = (down - across) / 2;
  }

  /** The screen angle a world heading of `angle` radians is drawn along. A heading and its screen angle agree only along the screen's axes. */
  screenAngle(angle: number): number {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    return Math.atan2((cos + sin) / DIAMOND_ASPECT, cos - sin);
  }

  riseOf(radius: number): number {
    return radius * this.k * SQRT_HALF;
  }

  /** The screen box around the four projected corners of the world rectangle `rect`, into `out`. */
  screenBoxOf(rect: Readonly<Rect>, out: Rect): Rect {
    const k = this.k;

    out.minX = (rect.minX - rect.maxY) * k;
    out.maxX = (rect.maxX - rect.minY) * k;
    out.minY = ((rect.minX + rect.minY) * k) / DIAMOND_ASPECT;
    out.maxY = ((rect.maxX + rect.maxY) * k) / DIAMOND_ASPECT;

    return out;
  }

  /**
   * The world box around the four corners of the screen rectangle at (`x`, `y`), `width` by
   * `height`, unprojected, widened by `margin` world units on every side, into `out`: what a
   * camera showing that rectangle can see, as the spatial hash is asked it.
   */
  worldBoxOf(
    x: number,
    y: number,
    width: number,
    height: number,
    margin: number,
    out: Rect,
  ): Rect {
    const k = this.k;
    // Across the screen is x − y and down it is x + y, so each world axis is widest at a pair of opposite corners.
    const acrossMin = x / k;
    const acrossMax = (x + width) / k;
    const downMin = (y * DIAMOND_ASPECT) / k;
    const downMax = ((y + height) * DIAMOND_ASPECT) / k;

    out.minX = (downMin + acrossMin) / 2 - margin;
    out.maxX = (downMax + acrossMax) / 2 + margin;
    out.minY = (downMin - acrossMax) / 2 - margin;
    out.maxY = (downMax - acrossMin) / 2 + margin;

    return out;
  }
}
