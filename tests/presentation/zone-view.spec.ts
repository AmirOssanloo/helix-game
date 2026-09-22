import { describe, expect, it } from "vitest";
import type { Zone } from "@domain/public";
import { acquireZone } from "@domain/public";
import type { ZoneViewPool } from "@presentation/public";
import {
  createZoneViewPool,
  DEPTH_GROUND,
  syncZoneViews,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, QuadRecorder, SYNC_FIELDS } from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a world size over it. */
const FRAME_WIDTH = 128;

/** The zone stands here, well inside the camera rectangle the cases use. */
const ZONE_X = 100;
const ZONE_Y = 100;

const AROUND_ZONE: Rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
const FAR_AWAY: Rect = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3300 };

const RADIUS = 60;
const HALF_WAY = 0.5;

/** What a bind writes, in order, before the first sync writes anything. */
const BIND_WRITES = ["setFrame", "setDepth", "tint", "scaleX", "scaleY"];

/** The five fields a zone's sync writes: it is sized once at bind, so the scale is not among them. */
const ZONE_SYNC_FIELDS = ["x", "y", "rotation", "alpha", "visible"];

type Arranged = {
  world: Simulation;
  zone: Zone;
  pool: ZoneViewPool;
  quads: QuadRecorder[];
  sync: (rect: Rect) => void;
};

/** A world holding one still circular zone, and a pool of `size` zone views over recording quads. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const id = acquireZone(world.state, ZONE_X, ZONE_Y, 0);
  const zone = id === null ? null : world.state.map.zones.resolve(id);
  const quads: QuadRecorder[] = [];
  const pool = createZoneViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
  );

  if (zone === null) {
    throw new Error("The zone pool has room for the zone");
  }

  zone.circle.radius = RADIUS;
  zone.frame = "ring_thin";
  zone.tint = 0x336699;
  zone.expiresAtTick = 100;

  return {
    world,
    zone,
    pool,
    quads,
    sync: (rect): void => {
      syncZoneViews(pool, world.view, rect, HALF_WAY);
    },
  };
};

const firstQuad = (arranged: Arranged): QuadRecorder => {
  const quad = arranged.quads[0];

  if (quad === undefined) {
    throw new Error("The pool made a quad per view");
  }

  return quad;
};

describe("a zone view", () => {
  it("writes the frame, the depth, the tint, and the size once at bind", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_ZONE);

    expect(quad.writes.slice(0, BIND_WRITES.length)).toEqual(BIND_WRITES);
    expect(quad.frame).toBe("ring_thin");
    expect(quad.depth).toBe(DEPTH_GROUND);
    expect(quad.tint).toBe(0x336699);
    expect(quad.scaleX).toBe((RADIUS * 2) / FRAME_WIDTH);
    expect(quad.scaleY).toBe(quad.scaleX);
  });

  it("writes only sync fields after the bind, and the same ones every frame", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_ZONE);

    const firstSync = quad.writes.slice(BIND_WRITES.length);

    expect(firstSync.every((field) => SYNC_FIELDS.includes(field))).toBe(true);

    quad.forgetWrites();
    arranged.sync(AROUND_ZONE);

    expect([...new Set(quad.writes)].sort()).toEqual(
      [...ZONE_SYNC_FIELDS].sort(),
    );
  });

  it("interpolates a travelling zone from where it was, and turns to its facing", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.zone.curr.x = ZONE_X + 60;
    arranged.zone.facing = Math.PI / 2;

    arranged.sync(AROUND_ZONE);

    expect(quad.x).toBe(ZONE_X + 30);
    expect(quad.y).toBe(ZONE_Y);
    expect(quad.rotation).toBe(Math.PI / 2);
    expect(quad.visible).toBe(true);
  });

  it("draws a zone still inside its delay, dimmer than one that has come alive", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.zone.activeAtTick = 10;
    arranged.sync(AROUND_ZONE);

    const waiting = quad.alpha;

    arranged.zone.activeAtTick = 0;
    arranged.sync(AROUND_ZONE);

    expect(waiting).toBeLessThan(quad.alpha);
    expect(waiting).toBeGreaterThan(0);
  });

  it("lays a rectangle along its length and across its width", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.zone.shape = { kind: "rectangle", length: 256, width: 64 };
    arranged.sync(AROUND_ZONE);

    expect(quad.scaleX).toBe(256 / FRAME_WIDTH);
    expect(quad.scaleY).toBe(64 / FRAME_WIDTH);
  });

  it("releases the view of a zone that left the rectangle or the world", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_ZONE);

    expect(quad.visible).toBe(true);

    arranged.sync(FAR_AWAY);

    expect(quad.visible).toBe(false);
    expect(arranged.pool.bound).toBe(0);
  });

  it("counts a miss when every view is bound and refuses to grow", () => {
    const arranged = arrange(1);
    const second = acquireZone(arranged.world.state, ZONE_X, ZONE_Y, 0);
    const zone =
      second === null ? null : arranged.world.state.map.zones.resolve(second);

    if (zone === null) {
      throw new Error("The zone pool has room for a second zone");
    }

    zone.circle.radius = RADIUS;
    arranged.sync(AROUND_ZONE);

    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.misses).toBe(1);
    expect(arranged.quads).toHaveLength(1);
  });
});
