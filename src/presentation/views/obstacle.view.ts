import type { Rect } from "@shared/public";
import { DEPTH_OBSTACLES } from "./depth-bands";
import type { Quad, QuadFactory } from "./quad";

const OBSTACLE_FRAME = "square";

/** Placeholder art: obstacles and walls are grey. */
const OBSTACLE_TINT = 0x555555;

/**
 * The loaded map's obstacle rectangles on screen: a pool of quads sized to what the camera
 * shows, not to the map. A map holds a few hundred rectangles at most, so every frame walks
 * them by index and puts a quad, centred and sized to it, on each that reaches inside the
 * camera's world rectangle, in order, and hides the quads left over. An obstacle on screen
 * with no quad left is counted as a miss, never drawn by a quad made mid-play.
 */
export class ObstacleViews {
  private readonly quads: readonly Quad[];

  private missCount = 0;

  private boundCount = 0;

  constructor(quads: readonly Quad[]) {
    this.quads = quads;
  }

  /** Quads the pool holds, bound or free. */
  get size(): number {
    return this.quads.length;
  }

  /** Quads showing an obstacle this frame. */
  get bound(): number {
    return this.boundCount;
  }

  /** Obstacles on screen that found no quad free, one per frame each, since creation. The scene writes it to a ring. */
  get misses(): number {
    return this.missCount;
  }

  /** One frame: a quad on every one of `obstacles` that reaches inside `rect`, and every other quad hidden. */
  sync(obstacles: readonly Readonly<Rect>[], rect: Readonly<Rect>): void {
    let bound = 0;

    for (let index = 0; index < obstacles.length; index += 1) {
      const obstacle = obstacles[index];

      if (obstacle === undefined || !overlaps(obstacle, rect)) {
        continue;
      }

      const quad = this.quads[bound];

      if (quad === undefined) {
        this.missCount += 1;

        continue;
      }

      quad.setDisplaySize(
        obstacle.maxX - obstacle.minX,
        obstacle.maxY - obstacle.minY,
      );
      quad.x = (obstacle.minX + obstacle.maxX) / 2;
      quad.y = (obstacle.minY + obstacle.maxY) / 2;
      quad.visible = true;
      bound += 1;
    }

    for (let index = bound; index < this.boundCount; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }

    this.boundCount = bound;
  }
}

/** Whether `a` and `b` share any point, edges included. */
const overlaps = (a: Readonly<Rect>, b: Readonly<Rect>): boolean =>
  a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;

/** `size` obstacle quads from `makeQuad`, framed, banded, and tinted once, at scene `create`. */
export const createObstacleViews = (
  size: number,
  makeQuad: QuadFactory,
): ObstacleViews => {
  const quads: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(OBSTACLE_FRAME);

    quad.setDepth(DEPTH_OBSTACLES);
    quad.tint = OBSTACLE_TINT;
    quads.push(quad);
  }

  return new ObstacleViews(quads);
};
