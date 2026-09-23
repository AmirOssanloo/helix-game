import type { Rect, Vec2 } from "@shared/public";
import { clamp } from "@shared/public";
import type { Projection } from "./projection";

/** How much of the distance to the hero the camera closes each frame. */
const FOLLOW_LERP = 0.1;

/** One wheel notch scales the zoom by this. */
const ZOOM_STEP = 1.25;

/** Zoom is for debugging: out far enough to see the arena whole, in no further than the atlas frames stay sharp. */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const DEFAULT_ZOOM = 1;

/** The camera zooms about its centre. */
const HALF = 0.5;

/**
 * What the world camera needs of Phaser's: where it has scrolled to, the size and zoom it shows,
 * and the calls that follow a point, clamp it, and snap it. Phaser's camera satisfies it; a
 * test hands in a plain object.
 */
export type FollowCamera = {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  setZoom: (zoom: number) => unknown;
  startFollow: (
    target: Vec2,
    roundPixels: boolean,
    lerpX: number,
    lerpY: number,
  ) => unknown;
  setBounds: (x: number, y: number, width: number, height: number) => unknown;
  centerOn: (x: number, y: number) => unknown;
};

/**
 * The world camera: locked on the hero with a lerp, clamped to the box the loaded map's bounds
 * project to, and zoomed by the intents the input mapper emits. It never reads input. It is
 * handed world points and works in screen points through the projection: it follows where the
 * hero is drawn, a point the scene writes each frame from the hero's interpolated position, so
 * the camera and the hero's view agree on where the hero is drawn.
 */
export class WorldCamera {
  private readonly camera: FollowCamera;

  private readonly projection: Projection;

  private readonly target: Vec2 = { x: 0, y: 0 };

  /** Scratch for the screen box the bounds project to. */
  private readonly box: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** Scratch for the screen rectangle the camera shows. */
  private readonly shown: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  constructor(camera: FollowCamera, projection: Projection) {
    this.camera = camera;
    this.projection = projection;
    camera.setZoom(DEFAULT_ZOOM);
    camera.startFollow(this.target, false, FOLLOW_LERP, FOLLOW_LERP);
  }

  /** The world point the hero is drawn at this frame. The follow closes on its projection before the render. */
  follow(x: number, y: number): void {
    this.projection.toScreen(x, y, this.target);
  }

  /**
   * Clamps to the screen box around `bounds` from now on, and snaps onto the target so a map
   * load or a change of scale does not pan across the map.
   */
  fitBounds(bounds: Readonly<Rect>): void {
    const box = this.projection.screenBoxOf(bounds, this.box);

    this.camera.setBounds(
      box.minX,
      box.minY,
      box.maxX - box.minX,
      box.maxY - box.minY,
    );
    this.camera.centerOn(this.target.x, this.target.y);
  }

  /** Consumes a zoom intent: `+1` in, `-1` out, held inside the debug range. */
  zoomBy(direction: number): void {
    this.camera.setZoom(
      clamp(this.camera.zoom * ZOOM_STEP ** direction, MIN_ZOOM, MAX_ZOOM),
    );
  }

  /**
   * The screen rectangle the camera shows from where it stands now, widened by `margin` pixels
   * on every side, into `out`. Read from the scroll rather than the camera's own view, which is
   * last frame's, so a snap or a change of scale this frame is seen this frame.
   */
  screenRect(margin: number, out: Rect): Rect {
    const camera = this.camera;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;
    const x = camera.scrollX + (camera.width - width) * HALF;
    const y = camera.scrollY + (camera.height - height) * HALF;

    out.minX = x - margin;
    out.minY = y - margin;
    out.maxX = x + width + margin;
    out.maxY = y + height + margin;

    return out;
  }

  /** The world box around what the camera shows, widened by `margin` world units on every side, into `out`. */
  worldRect(margin: number, out: Rect): Rect {
    const shown = this.screenRect(0, this.shown);

    return this.projection.worldBoxOf(
      shown.minX,
      shown.minY,
      shown.maxX - shown.minX,
      shown.maxY - shown.minY,
      margin,
      out,
    );
  }
}
