import { bearing } from "@shared/public";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_GROUND } from "../views/depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "../views/quad";
import { interpolate } from "../views/quad";
import type { TargetingCursor } from "./targeting-cursor";

const RING_FRAME = "ring_thin";

/** Placeholder art: white, red when the pointer is past the spell's range. */
const IN_RANGE_TINT = 0xffffff;
const OUT_OF_RANGE_TINT = 0xff3030;
const RING_ALPHA = 0.5;
const SHAPE_ALPHA = 0.4;

/** How wide the spell's shape is drawn under the pointer, in world units, until a definition carries a size. */
export const PREVIEW_SIZE = 120;

const DIAMETERS_PER_RADIUS = 2;

/** Scratch for the hero's drawn position and the pointer, for the bearing of a direction spell. */
const from: Vec2 = { x: 0, y: 0 };
const to: Vec2 = { x: 0, y: 0 };

/**
 * The open targeting cursor, drawn in the play scene's world coordinates: a ring at the
 * spell's range around the hero where it is drawn this frame, and the spell's shape under
 * the pointer, both from the atlas. A point or a unit spell puts the shape at the pointer
 * and turns both red once the pointer is past the range; a direction spell turns the shape
 * on the hero toward the pointer and is never out of range. Nothing shows while the cursor
 * is closed. Two quads, made once; the shape's frame changes only when the spell does.
 */
export class TargetingPreview {
  private readonly ring: Quad;

  private readonly shape: Quad;

  private readonly frameSizes: FrameSizes;

  private readonly ringScalePerUnit: number;

  private shapeFrame: string | null = null;

  private shapeScalePerUnit = 0;

  constructor(makeQuad: QuadFactory, frameSizes: FrameSizes) {
    this.ring = makeQuad(RING_FRAME);
    this.shape = makeQuad(RING_FRAME);
    this.frameSizes = frameSizes;
    this.ringScalePerUnit = 1 / frameSizes(RING_FRAME);
    this.ring.setDepth(DEPTH_GROUND);
    this.shape.setDepth(DEPTH_GROUND);
    this.ring.alpha = RING_ALPHA;
    this.shape.alpha = SHAPE_ALPHA;
  }

  /** Whether the preview showed anything on the last sync. */
  get open(): boolean {
    return this.ring.visible || this.shape.visible;
  }

  sync(
    world: WorldView,
    cursor: Readonly<TargetingCursor>,
    pointerX: number,
    pointerY: number,
    alpha: number,
  ): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);
    const record =
      cursor.kind === "slot" && cursor.abilityId !== null
        ? world.run.spells.get(cursor.abilityId)
        : undefined;

    if (hero === null || record === undefined) {
      this.ring.visible = false;
      this.shape.visible = false;

      return;
    }

    from.x = interpolate(hero.prev.x, hero.curr.x, alpha);
    from.y = interpolate(hero.prev.y, hero.curr.y, alpha);
    to.x = pointerX;
    to.y = pointerY;

    const range = record.def.range;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const outOfRange =
      cursor.targeting !== "direction" && dx * dx + dy * dy > range * range;
    const tint = outOfRange ? OUT_OF_RANGE_TINT : IN_RANGE_TINT;

    this.ring.x = from.x;
    this.ring.y = from.y;
    this.ring.rotation = 0;
    this.ring.scale = range * DIAMETERS_PER_RADIUS * this.ringScalePerUnit;
    this.ring.tint = tint;
    this.ring.visible = range > 0;

    if (record.def.atlasFrame !== this.shapeFrame) {
      this.shapeFrame = record.def.atlasFrame;
      this.shapeScalePerUnit = 1 / this.frameSizes(record.def.atlasFrame);
      this.shape.setFrame(record.def.atlasFrame);
    }

    if (cursor.targeting === "direction") {
      this.shape.x = from.x;
      this.shape.y = from.y;
      this.shape.rotation = bearing(from, to);
    } else {
      this.shape.x = to.x;
      this.shape.y = to.y;
      this.shape.rotation = 0;
    }

    this.shape.scale = PREVIEW_SIZE * this.shapeScalePerUnit;
    this.shape.tint = tint;
    this.shape.visible = true;
  }
}
