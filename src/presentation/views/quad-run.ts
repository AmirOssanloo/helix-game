import type { Quad, QuadFactory } from "./quad";

/** `size` hidden quads of `frame` at `depth`, made once, when a view is created. */
export const makeQuads = (
  size: number,
  frame: string,
  depth: number,
  makeQuad: QuadFactory,
): Quad[] => {
  const quads: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(frame);

    quad.setDepth(depth);
    quads.push(quad);
  }

  return quads;
};

/**
 * A view pool for marks that belong to no entity: a fixed set of quads bound from the front
 * each frame. `take` hands out the next one or counts a miss, and `finish` hides the ones bound
 * last frame and not this one, so a quad that stays bound is never hidden and re-shown, and a
 * quad past the high-water mark is never written at all. It never grows.
 */
export class QuadRun {
  private readonly quads: readonly Quad[];

  private bound = 0;

  private lastBound = 0;

  private missCount = 0;

  constructor(quads: readonly Quad[]) {
    this.quads = quads;
  }

  /** Binds refused since the run was made. */
  get misses(): number {
    return this.missCount;
  }

  take(): Quad | null {
    const quad = this.quads[this.bound];

    if (quad === undefined) {
      this.missCount += 1;

      return null;
    }

    this.bound += 1;

    return quad;
  }

  finish(): void {
    for (let index = this.bound; index < this.lastBound; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }

    this.lastBound = this.bound;
    this.bound = 0;
  }

  /** Hides everything bound last frame. Between frames nothing is bound, so one sweep does it. */
  hide(): void {
    this.finish();
  }
}
