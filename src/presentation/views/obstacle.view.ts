import type { Rect } from "@shared/public";
import { DEPTH_OBSTACLES } from "./depth-bands";
import type { Quad, QuadFactory } from "./quad";

const OBSTACLE_FRAME = "square";

/** Placeholder art: obstacles and walls are grey. */
const OBSTACLE_TINT = 0x555555;

/**
 * The loaded map's obstacle rectangles: static quads bound once per map load, one per
 * rectangle, and never written again until the next map. A map with more rectangles than
 * the pool holds leaves the rest undrawn and counts each as a miss.
 */
export class ObstacleViews {
  private readonly quads: readonly Quad[];

  private missCount = 0;

  constructor(quads: readonly Quad[]) {
    this.quads = quads;
  }

  /** Rectangles refused because every quad was bound, over every map load since creation. */
  get misses(): number {
    return this.missCount;
  }

  /** Puts a quad over each of `obstacles`, centred and sized to it, and hides the quads left over. */
  bind(obstacles: readonly Readonly<Rect>[]): void {
    for (let index = 0; index < this.quads.length; index += 1) {
      const quad = this.quads[index];
      const rect = obstacles[index];

      if (quad === undefined) {
        continue;
      }

      if (rect === undefined) {
        quad.visible = false;

        continue;
      }

      quad.setDisplaySize(rect.maxX - rect.minX, rect.maxY - rect.minY);
      quad.x = (rect.minX + rect.maxX) / 2;
      quad.y = (rect.minY + rect.maxY) / 2;
      quad.visible = true;
    }

    if (obstacles.length > this.quads.length) {
      this.missCount += obstacles.length - this.quads.length;
    }
  }
}

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
