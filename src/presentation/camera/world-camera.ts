import type { Rect, Vec2 } from "@shared/public";
import { clamp } from "@shared/public";
import type { Projection } from "./projection";

/** The camera never zooms: the scale lives in the projection, so a diamond stays whole pixels. */
const CAMERA_ZOOM = 1;

/**
 * What the world camera needs of Phaser's: where it has scrolled to, the size it shows, and
 * the calls that fix its zoom, follow a point, clamp it, and snap it. Phaser's camera
 * satisfies it; a test hands in a plain object.
 */
export type FollowCamera = {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly width: number;
  readonly height: number;
  setZoom: (zoom: number) => unknown;
  setLerp: (x: number, y: number) => unknown;
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
 * project to, at one fixed zoom. It never reads input. It is handed world points and works in
 * screen points through the projection: it follows where the hero is drawn, a point the scene
 * writes each frame from the hero's interpolated position, so the camera and the hero's view
 * agree on where the hero is drawn. The lerp is the fraction of the distance to the hero it
 * closes each frame, handed in from the tuning table, and a change reaches the camera on the
 * frame it is handed.
 */
export class WorldCamera {
  private readonly camera: FollowCamera;

  private readonly projection: Projection;

  private readonly target: Vec2 = { x: 0, y: 0 };

  /** Scratch for the screen box the bounds project to. */
  private readonly box: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** The lerp the camera follows with now, so an unchanged one is not written again. */
  private lerp: number;

  constructor(camera: FollowCamera, projection: Projection, lerp: number) {
    this.camera = camera;
    this.projection = projection;
    this.lerp = clamp(lerp, 0, 1);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(this.target, false, this.lerp, this.lerp);
  }

  /** Follows with `lerp` from now on, held between nothing and all of the distance a frame. */
  setLerp(lerp: number): void {
    const held = clamp(lerp, 0, 1);

    if (held !== this.lerp) {
      this.lerp = held;
      this.camera.setLerp(held, held);
    }
  }

  /** The world point the hero is drawn at this frame. The follow closes on its projection before the render. */
  follow(x: number, y: number): void {
    this.projection.toScreen(x, y, this.target);
  }

  /**
   * Clamps to the screen box around `bounds` from now on, and snaps onto the target so a map
   * load does not pan across the map.
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

  /**
   * The screen rectangle the camera shows from where it stands now, widened by `margin` pixels
   * on every side, into `out`. Read from the scroll rather than the camera's own view, which is
   * last frame's, so a snap this frame is seen this frame.
   */
  screenRect(margin: number, out: Rect): Rect {
    const camera = this.camera;

    out.minX = camera.scrollX - margin;
    out.minY = camera.scrollY - margin;
    out.maxX = camera.scrollX + camera.width + margin;
    out.maxY = camera.scrollY + camera.height + margin;

    return out;
  }
}
