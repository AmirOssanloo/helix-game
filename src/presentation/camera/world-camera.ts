import type Phaser from "phaser";
import type { Rect, Vec2 } from "@shared/public";
import { clamp } from "@shared/public";

/** How much of the distance to the hero the camera closes each frame. */
const FOLLOW_LERP = 0.1;

/** One wheel notch scales the zoom by this. */
const ZOOM_STEP = 1.25;

/** Zoom is for debugging: out far enough to see the arena whole, in no further than the atlas frames stay sharp. */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 1;

/**
 * The world camera: locked on the hero with a lerp, clamped to the loaded map's bounds, and
 * zoomed by the intents the input mapper emits. It never reads input. It follows a point the
 * scene writes each frame, the hero's interpolated position, so the camera and the hero's
 * view agree on where the hero is drawn.
 */
export class WorldCamera {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;

  private readonly target: Vec2 = { x: 0, y: 0 };

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
    camera.setZoom(DEFAULT_ZOOM);
    camera.startFollow(this.target, false, FOLLOW_LERP, FOLLOW_LERP);
  }

  /** Where the hero is drawn this frame. The follow closes on it before the render. */
  follow(x: number, y: number): void {
    this.target.x = x;
    this.target.y = y;
  }

  /** Clamps to `bounds` from now on, and snaps onto the target so a map load does not pan across the map. */
  fitBounds(bounds: Readonly<Rect>): void {
    this.camera.setBounds(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    this.camera.centerOn(this.target.x, this.target.y);
  }

  /** Consumes a zoom intent: `+1` in, `-1` out, held inside the debug range. */
  zoomBy(direction: number): void {
    this.camera.setZoom(
      clamp(this.camera.zoom * ZOOM_STEP ** direction, MIN_ZOOM, MAX_ZOOM),
    );
  }

  /** The world rectangle the camera showed last frame, widened by `margin` on every side, into `out`. */
  worldRect(margin: number, out: Rect): Rect {
    const view = this.camera.worldView;

    out.minX = view.x - margin;
    out.minY = view.y - margin;
    out.maxX = view.x + view.width + margin;
    out.maxY = view.y + view.height + margin;

    return out;
  }
}
