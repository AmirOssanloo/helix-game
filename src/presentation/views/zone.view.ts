import type { ShapeDef, Zone } from "@domain/public";
import { shapeExtent, ZONE_CAPACITY } from "@domain/public";
import type { DeepReadonly, EntityId, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { DEPTH_GROUND } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";
import { ViewPool } from "./view-pool";

/** What a zone with no frame of its own is drawn as, and what every view is made with; binding sets the one the zone names. */
const FALLBACK_FRAME = "ring_thin";

/** A zone is drawn through its whole delay, dimmer, so the ground reads as claimed before it bites. */
const WAITING_ALPHA = 0.3;
const ACTIVE_ALPHA = 0.6;

const DIAMETERS_PER_RADIUS = 2;

/**
 * One zone on the ground: a single quad at the ground band, sized once to the zone's area when
 * it is bound, since a zone never changes shape, and written each frame with where it stands,
 * which way it is turned, and whether it has come alive yet. A zone that travels is
 * interpolated from the previous tick's position like any moving thing.
 */
export class ZoneView {
  private readonly quad: Quad;

  private readonly frameSizes: FrameSizes;

  constructor(quad: Quad, frameSizes: FrameSizes) {
    this.quad = quad;
    this.frameSizes = frameSizes;
  }

  bind(_id: EntityId, zone: DeepReadonly<Zone>): void {
    const frame = zone.frame ?? FALLBACK_FRAME;

    this.quad.setFrame(frame);
    this.quad.setDepth(DEPTH_GROUND);
    this.quad.tint = zone.tint;
    sizeToShape(this.quad, zone.shape, this.frameSizes(frame));
  }

  sync(zone: DeepReadonly<Zone>, alpha: number, tick: number): void {
    this.quad.x = interpolate(zone.prev.x, zone.curr.x, alpha);
    this.quad.y = interpolate(zone.prev.y, zone.curr.y, alpha);
    this.quad.rotation = zone.facing;
    this.quad.alpha = tick < zone.activeAtTick ? WAITING_ALPHA : ACTIVE_ALPHA;
    this.quad.visible = true;
  }

  release(): void {
    this.quad.visible = false;
  }
}

/**
 * Lays `quad` over the shape, once: a circle at its diameter, a rectangle at its length along
 * the facing and its width across it, and a cone at its length both ways, since the cone frame
 * is baked square with its apex at the centre, which is where the zone stands. The frame is one
 * texture whatever the shape, so the size is a scale.
 */
const sizeToShape = (
  quad: Quad,
  shape: DeepReadonly<ShapeDef>,
  frameWidth: number,
): void => {
  const perUnit = 1 / frameWidth;

  switch (shape.kind) {
    case "circle":
      quad.scaleX = shape.radius * DIAMETERS_PER_RADIUS * perUnit;
      quad.scaleY = quad.scaleX;

      break;

    case "rectangle":
      quad.scaleX = shape.length * perUnit;
      quad.scaleY = shape.width * perUnit;

      break;

    case "cone": {
      const size = shape.length * DIAMETERS_PER_RADIUS * perUnit;

      quad.scaleX = size;
      quad.scaleY = size;

      break;
    }
  }
};

export type ZoneViewPool = ViewPool<DeepReadonly<Zone>, ZoneView>;

/** `size` zone views over quads from `makeQuad`, at scene `create`. */
export const createZoneViewPool = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
): ZoneViewPool => {
  const views: ZoneView[] = [];

  for (let index = 0; index < size; index += 1) {
    views.push(new ZoneView(makeQuad(FALLBACK_FRAME), frameSizes));
  }

  return new ViewPool(views, ZONE_CAPACITY);
};

/** Whether the area `zone` covers reaches inside `rect` at all. */
const isZoneInside = (
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

/**
 * One frame of the zone views: the zone pool is small enough to walk by index, so there is no
 * query behind this one, and every zone whose area reaches inside `rect` keeps a view and is
 * written. A zone that expired or left the rectangle has its view released.
 */
export const syncZoneViews = (
  pool: ZoneViewPool,
  world: WorldView,
  rect: Readonly<Rect>,
  alpha: number,
): void => {
  const zones = world.map.zones;

  pool.beginFrame();

  for (let index = 0; index < zones.end; index += 1) {
    const zone = zones.at(index);
    const id = zones.idAt(index);

    if (zone === null || id === null || !isZoneInside(zone, rect)) {
      continue;
    }

    const view = pool.keep(id, zone);

    if (view !== null) {
      view.sync(zone, alpha, world.tick);
    }
  }

  pool.releaseUnkept();
};
