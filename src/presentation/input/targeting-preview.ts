import type { PreviewDef } from "@domain/public";
import { scalarAtOrbLevels } from "@domain/public";
import type { DeepReadonly, Vec2 } from "@shared/public";
import { bearing } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_GROUND } from "../views/depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "../views/quad";
import { interpolate } from "../views/quad";
import type { TargetingCursor } from "./targeting-cursor";

const RING_FRAME = "ring_thin";

/** What the cursor wears where the click would be refused; in range it wears the spell's own colour. */
const OUT_OF_RANGE_TINT = 0xff3030;

const RING_ALPHA = 0.5;
const SHAPE_ALPHA = 0.4;

/** How wide a unit reticle is drawn, in world units: wider than a unit's hull, so the ring reads as around whoever is under the pointer. */
export const RETICLE_SIZE = 120;

/** A radius drawn as a diameter, and a cone's length drawn as a radius from the apex at its frame's centre. */
const DIAMETERS_PER_RADIUS = 2;

/** The levels a caster that levels no orb reads a table at. */
const NO_ORB_LEVELS: readonly number[] = [];

/** Scratch for the hero's drawn position and the pointer, for the bearing of a direction spell. */
const from: Vec2 = { x: 0, y: 0 };
const to: Vec2 = { x: 0, y: 0 };

/**
 * The open targeting cursor, drawn in the play scene's world coordinates: a ring at the
 * spell's range around the hero where it is drawn this frame, and the spell's preview shape,
 * both from the atlas, both in the spell's own colour until the pointer is past the range,
 * when they turn red. The definition says which shape: a reticle or a circle sits under the
 * pointer, and a rectangle or a cone is placed on the hero and turned toward it, so a
 * direction spell shows the ground it would cover and is never out of range. A rectangle's
 * length and offset may be tables, read at the hero's orb levels as the cast would read them.
 * Nothing shows while the cursor is closed, or for a spell that previews nothing. Two quads,
 * made once; the shape's frame changes only when the spell does.
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

    const def = record.def;
    const form = world.run.forms[hero.activeFormIndex];

    from.x = interpolate(hero.prev.x, hero.curr.x, alpha);
    from.y = interpolate(hero.prev.y, hero.curr.y, alpha);
    to.x = pointerX;
    to.y = pointerY;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const outOfRange =
      cursor.targeting !== "direction" &&
      dx * dx + dy * dy > def.range * def.range;
    const tint = outOfRange ? OUT_OF_RANGE_TINT : def.tint;

    this.ring.x = from.x;
    this.ring.y = from.y;
    this.ring.rotation = 0;
    this.ring.scale = def.range * DIAMETERS_PER_RADIUS * this.ringScalePerUnit;
    this.ring.tint = tint;
    this.ring.visible = def.range > 0;

    this.syncShape(
      def.preview,
      form === undefined ? NO_ORB_LEVELS : form.kit.orbLevels,
      tint,
    );
  }

  /** Lays the shape quad over what the definition previews, in the tint the range decided. */
  private syncShape(
    preview: DeepReadonly<PreviewDef>,
    orbLevels: readonly number[],
    tint: number,
  ): void {
    if (preview.kind === "none") {
      this.shape.visible = false;

      return;
    }

    if (preview.atlasFrame !== this.shapeFrame) {
      this.shapeFrame = preview.atlasFrame;
      this.shapeScalePerUnit = 1 / this.frameSizes(preview.atlasFrame);
      this.shape.setFrame(preview.atlasFrame);
    }

    const perUnit = this.shapeScalePerUnit;

    switch (preview.kind) {
      case "unit": {
        const size = RETICLE_SIZE * perUnit;

        this.shape.x = to.x;
        this.shape.y = to.y;
        this.shape.rotation = 0;
        this.shape.scaleX = size;
        this.shape.scaleY = size;

        break;
      }

      case "circle": {
        const size = preview.radius * DIAMETERS_PER_RADIUS * perUnit;

        this.shape.x = to.x;
        this.shape.y = to.y;
        this.shape.rotation = 0;
        this.shape.scaleX = size;
        this.shape.scaleY = size;

        break;
      }

      case "rectangle": {
        const facing = bearing(from, to);
        const offset = scalarAtOrbLevels(preview.offset, orbLevels);

        this.shape.x = from.x + Math.cos(facing) * offset;
        this.shape.y = from.y + Math.sin(facing) * offset;
        this.shape.rotation = facing;
        this.shape.scaleX =
          scalarAtOrbLevels(preview.length, orbLevels) * perUnit;
        this.shape.scaleY = preview.width * perUnit;

        break;
      }

      case "cone": {
        const size = preview.length * DIAMETERS_PER_RADIUS * perUnit;

        this.shape.x = from.x;
        this.shape.y = from.y;
        this.shape.rotation = bearing(from, to);
        this.shape.scaleX = size;
        this.shape.scaleY = size;

        break;
      }
    }

    this.shape.tint = tint;
    this.shape.visible = true;
  }
}
