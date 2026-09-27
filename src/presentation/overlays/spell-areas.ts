import type { ShapeDef, Zone } from "@domain/public";
import { shapeExtent } from "@domain/queries";
import type { DeepReadonly, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { FrameSizes, Quad } from "../views/quad";
import { interpolate } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { DIAMETERS_PER_RADIUS, LINE_ALPHA } from "./overlay-marks";

/** A zone's area is outlined by the frame its shape kind wants: a ring, an outlined box, or the cone frame. */
export const AREA_CIRCLE_FRAME = "ring_thin";
export const AREA_RECTANGLE_FRAME = "square_outline";
export const AREA_CONE_FRAME = "cone_60";

const AREA_TINT = 0xff8040;

/** A zone through its delay touches nothing yet, so its outline is drawn fainter until it does. */
const WAITING_AREA_ALPHA = 0.3;

/** Which of the three areas a zone covers, which is what decides the frame its outline is drawn with. */
type ShapeKind = ShapeDef["kind"];

/**
 * Every zone whose area reaches inside the camera rectangle, outlined as the simulation tests
 * it: the area at the position and the facing the world holds this tick, not the quad the
 * zone view draws, and fainter through the delay, while it touches nothing. A circle is its
 * diameter, a rectangle its length along the facing centred on the zone, a cone its length
 * both ways from the apex at the frame's centre. One run of quads per shape kind, so a bind
 * never changes a frame, and a kind that runs out counts a miss like any other overlay.
 */
export class SpellAreas {
  private readonly circles: QuadRun;

  private readonly rectangles: QuadRun;

  private readonly cones: QuadRun;

  private readonly circleScale: number;

  private readonly rectangleScale: number;

  private readonly coneScale: number;

  constructor(
    circles: readonly Quad[],
    rectangles: readonly Quad[],
    cones: readonly Quad[],
    frameSizes: FrameSizes,
  ) {
    this.circles = new QuadRun(circles);
    this.rectangles = new QuadRun(rectangles);
    this.cones = new QuadRun(cones);
    this.circleScale = 1 / frameSizes(AREA_CIRCLE_FRAME);
    this.rectangleScale = 1 / frameSizes(AREA_RECTANGLE_FRAME);
    this.coneScale = 1 / frameSizes(AREA_CONE_FRAME);
  }

  get misses(): number {
    return this.circles.misses + this.rectangles.misses + this.cones.misses;
  }

  sync(world: WorldView, rect: Readonly<Rect>, alpha: number): void {
    const zones = world.map.zones;

    for (let index = 0; index < zones.end; index += 1) {
      const zone = zones.at(index);

      if (zone !== null && reachesInto(zone, rect)) {
        this.outline(zone, alpha, world.tick);
      }
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  /** Lays one outline over `zone`: turned to its facing, and as long and as wide as its shape. */
  private outline(zone: DeepReadonly<Zone>, alpha: number, tick: number): void {
    const shape = zone.shape;
    const quad = this.runFor(shape.kind).take();

    if (quad === null) {
      return;
    }

    quad.x = interpolate(zone.prev.x, zone.curr.x, alpha);
    quad.y = interpolate(zone.prev.y, zone.curr.y, alpha);

    switch (shape.kind) {
      case "circle": {
        const across = shape.radius * DIAMETERS_PER_RADIUS * this.circleScale;

        quad.rotation = 0;
        quad.scaleX = across;
        quad.scaleY = across;

        break;
      }

      case "rectangle":
        quad.rotation = zone.facing;
        quad.scaleX = shape.length * this.rectangleScale;
        quad.scaleY = shape.width * this.rectangleScale;

        break;

      case "cone": {
        const across = shape.length * DIAMETERS_PER_RADIUS * this.coneScale;

        quad.rotation = zone.facing;
        quad.scaleX = across;
        quad.scaleY = across;

        break;
      }
    }

    quad.tint = AREA_TINT;
    quad.alpha = tick < zone.activeAtTick ? WAITING_AREA_ALPHA : LINE_ALPHA;
    quad.visible = true;
  }

  private runFor(kind: ShapeKind): QuadRun {
    switch (kind) {
      case "circle":
        return this.circles;

      case "rectangle":
        return this.rectangles;

      case "cone":
        return this.cones;
    }
  }

  private finish(): void {
    this.circles.finish();
    this.rectangles.finish();
    this.cones.finish();
  }
}

/** Whether the area `zone` covers reaches inside `rect` at all, as the zone view asks it. */
const reachesInto = (
  zone: DeepReadonly<Zone>,
  rect: Readonly<Rect>,
): boolean => {
  const reach = shapeExtent(zone.shape);

  return (
    zone.curr.x + reach >= rect.minX &&
    zone.curr.x - reach <= rect.maxX &&
    zone.curr.y + reach >= rect.minY &&
    zone.curr.y - reach <= rect.maxY
  );
};
