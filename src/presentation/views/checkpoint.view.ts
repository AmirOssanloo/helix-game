import type { DomainEvent } from "@domain/public";
import { readTunable } from "@domain/public";
import type { Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_GROUND } from "./depth-bands";
import type { FloatingNumberViews } from "./floating-number.view";
import type { Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";

/** A checkpoint is a thin ring on the floor, as wide as the reach that takes it. */
export const CHECKPOINT_FRAME = "ring_thin";

/** A checkpoint the hero has not reached yet: a pale grey, there but not yet the hero's. */
export const CHECKPOINT_AHEAD_TINT = 0xb0bec5;

/** A checkpoint reached, the furthest or one before it: a green, so the hero sees where it comes back. */
export const CHECKPOINT_REACHED_TINT = 0x66bb6a;

/** The word raised over the hero when it reaches a checkpoint further along than any before. */
export const CHECKPOINT_WORD = "CHECKPOINT";

/** A marker sits under what stands on it, so it is drawn a little faded. */
const MARKER_ALPHA = 0.8;

const DIAMETERS_PER_RADIUS = 2;

/**
 * The loaded map's checkpoints on the floor: a small set of ring quads at the ground band, each
 * as wide as the reach that takes a checkpoint, tinted by whether the hero has reached it. A
 * map holds a handful of checkpoints, so every frame walks them by index and puts a quad on
 * each whose ring reaches inside the camera's world rectangle, in order, and hides the quads
 * left over. The reach is read each frame, so a retune shows on the next one. A checkpoint on
 * screen with no quad left is counted as a miss, never drawn by a quad made mid-play.
 */
export class CheckpointViews {
  private readonly quads: readonly Quad[];

  private readonly frameWidth: number;

  private missCount = 0;

  private boundCount = 0;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.quads = quads;
    this.frameWidth = frameWidth;
  }

  /** Quads the set holds, bound or free. */
  get size(): number {
    return this.quads.length;
  }

  /** Quads showing a checkpoint this frame. */
  get bound(): number {
    return this.boundCount;
  }

  /** Checkpoints on screen that found no quad free, one per frame each, since creation. The scene writes it to a ring. */
  get misses(): number {
    return this.missCount;
  }

  /** One frame: a quad on every checkpoint of `world`'s map whose ring reaches inside `rect`, and every other quad hidden. */
  sync(world: WorldView, rect: Readonly<Rect>): void {
    const checkpoints = world.map.checkpoints;
    const furthest = world.map.furthestCheckpoint;
    const reach = readTunable(world.run.tuning, "checkpoint_reach_radius");
    const scale = (reach * DIAMETERS_PER_RADIUS) / this.frameWidth;
    let bound = 0;

    for (let index = 0; index < checkpoints.length; index += 1) {
      const checkpoint = checkpoints[index];

      if (
        checkpoint === undefined ||
        !isRingInside(checkpoint.x, checkpoint.y, reach, rect)
      ) {
        continue;
      }

      const quad = this.quads[bound];

      if (quad === undefined) {
        this.missCount += 1;

        continue;
      }

      quad.x = checkpoint.x;
      quad.y = checkpoint.y;
      quad.scale = scale;
      quad.tint =
        index <= furthest ? CHECKPOINT_REACHED_TINT : CHECKPOINT_AHEAD_TINT;
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

/** Whether a ring of `radius` around (`x`, `y`) reaches inside `rect` at all. */
const isRingInside = (
  x: number,
  y: number,
  radius: number,
  rect: Readonly<Rect>,
): boolean =>
  x + radius >= rect.minX &&
  x - radius <= rect.maxX &&
  y + radius >= rect.minY &&
  y - radius <= rect.maxY;

/** `size` checkpoint quads from `makeQuad`, framed, banded, and faded once, at scene `create`; `frameWidth` is the ring frame's baked width. */
export const createCheckpointViews = (
  size: number,
  makeQuad: QuadFactory,
  frameWidth: number,
): CheckpointViews => {
  const quads: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(CHECKPOINT_FRAME);

    quad.setDepth(DEPTH_GROUND);
    quad.alpha = MARKER_ALPHA;
    quads.push(quad);
  }

  return new CheckpointViews(quads, frameWidth);
};

/**
 * Raises the checkpoint word over the hero on a `checkpoint_reached`, in the reached tint, for
 * as long as a damage number lives. The event is announced only for a checkpoint further along
 * than the furthest, so walking back past an earlier one raises nothing. Any other event, or a
 * hero no longer in the world, shows nothing.
 */
export const showCheckpointReached = (
  event: Readonly<DomainEvent>,
  world: WorldView,
  alpha: number,
  numbers: FloatingNumberViews,
): void => {
  if (event.kind !== "checkpoint_reached" || event.unitId === null) {
    return;
  }

  const hero = world.map.units.resolve(event.unitId);

  if (hero === null) {
    return;
  }

  numbers.spawnWord(
    interpolate(hero.prev.x, hero.curr.x, alpha),
    interpolate(hero.prev.y, hero.curr.y, alpha) - hero.boundRadius,
    CHECKPOINT_WORD,
    CHECKPOINT_REACHED_TINT,
    event.tick,
    readTunable(world.run.tuning, "damage_number_fade_duration"),
  );
};
