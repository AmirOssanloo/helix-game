import type { Rect, Vec2 } from "@shared/public";
import type { Projection } from "./projection";

/**
 * How far past the screen's edge a unit may be drawn and still be bound, in pixels: past the
 * reach of the widest body, the boss outline around it, and the row of icons above it, so a
 * unit is bound while any part of it can show and a view bound on entry starts off screen.
 */
export const VIEW_SCREEN_MARGIN = 96;

/**
 * What the camera shows this frame, as the views that bind by it ask: the screen rectangle,
 * widened, and the world box around that rectangle's four corners unprojected, which is what
 * the spatial hash is asked. The box is about twice what the screen shows, so a view keeps to
 * the screen: an entity inside the box is bound only when the point it is drawn at falls
 * inside the widened screen. Made once; `fit` rewrites it each frame.
 */
export class CameraFrame {
  /** The world box the hash is asked for. */
  readonly world: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** The widened screen rectangle, before the camera's scroll is taken off. */
  readonly screen: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  private readonly projection: Projection;

  /** Scratch for where a point is drawn. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  constructor(projection: Projection) {
    this.projection = projection;
  }

  /** Frames the screen rectangle `screen`, already widened, and the world box around it. */
  fit(screen: Readonly<Rect>): void {
    this.screen.minX = screen.minX;
    this.screen.minY = screen.minY;
    this.screen.maxX = screen.maxX;
    this.screen.maxY = screen.maxY;
    this.projection.worldBoxOf(
      screen.minX,
      screen.minY,
      screen.maxX - screen.minX,
      screen.maxY - screen.minY,
      0,
      this.world,
    );
  }

  /** Whether the world point (`x`, `y`) is drawn inside the widened screen. */
  shows(x: number, y: number): boolean {
    const drawn = this.drawn;
    const screen = this.screen;

    this.projection.toScreen(x, y, drawn);

    return (
      drawn.x >= screen.minX &&
      drawn.x <= screen.maxX &&
      drawn.y >= screen.minY &&
      drawn.y <= screen.maxY
    );
  }

  /** Whether a point moving from `prev` to `curr` is drawn inside the widened screen at the driver's fraction `alpha`: where its view draws it this frame. */
  showsBetween(
    prev: Readonly<Vec2>,
    curr: Readonly<Vec2>,
    alpha: number,
  ): boolean {
    return this.shows(
      prev.x + (curr.x - prev.x) * alpha,
      prev.y + (curr.y - prev.y) * alpha,
    );
  }
}
