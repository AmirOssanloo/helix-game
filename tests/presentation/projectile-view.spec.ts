import { describe, expect, it } from "vitest";
import type { Projectile } from "@domain/public";
import { acquireProjectile } from "@domain/public";
import type { ProjectileViewPool } from "@presentation/public";
import {
  createProjectileViewPool,
  DEPTH_PROJECTILES,
  syncProjectileViews,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, QuadRecorder, SYNC_FIELDS } from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a world size over it. */
const FRAME_WIDTH = 128;

/** The projectile is fired from here, well inside the camera rectangle the cases use. */
const START_X = 100;
const START_Y = 100;

const AROUND_IT: Rect = { minX: 0, minY: 0, maxX: 300, maxY: 300 };
const FAR_AWAY: Rect = { minX: 3000, minY: 3000, maxX: 3300, maxY: 3300 };

const RADIUS = 8;
const STEP = 60;
const HALF_WAY = 0.5;

/** What a bind writes, in order, before the first sync writes anything. */
const BIND_WRITES = ["setFrame", "setDepth", "tint", "scale"];

/** The four fields a projectile's sync writes: it is sized once at bind, so the scale is not among them. */
const PROJECTILE_SYNC_FIELDS = ["x", "y", "rotation", "visible"];

type Arranged = {
  world: Simulation;
  projectile: Projectile;
  pool: ProjectileViewPool;
  quads: QuadRecorder[];
  sync: (rect: Rect) => void;
};

/** A world holding one projectile, and a pool of `size` projectile views over recording quads. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const id = acquireProjectile(world.state, START_X, START_Y, 0);
  const projectile =
    id === null ? null : world.state.map.projectiles.resolve(id);
  const quads: QuadRecorder[] = [];
  const pool = createProjectileViewPool(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
  );

  if (projectile === null) {
    throw new Error("The projectile pool has room for the projectile");
  }

  projectile.radius = RADIUS;
  projectile.frame = "disc";
  projectile.tint = 0x336699;

  return {
    world,
    projectile,
    pool,
    quads,
    sync: (rect): void => {
      syncProjectileViews(pool, world.view, rect, HALF_WAY);
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

describe("a projectile view", () => {
  it("writes the frame, the depth, the tint, and the size once at bind", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_IT);

    expect(quad.writes.slice(0, BIND_WRITES.length)).toEqual(BIND_WRITES);
    expect(quad.frame).toBe("disc");
    expect(quad.depth).toBe(DEPTH_PROJECTILES);
    expect(quad.tint).toBe(0x336699);
    expect(quad.scale).toBe((RADIUS * 2) / FRAME_WIDTH);
  });

  it("writes only sync fields after the bind, and the same ones every frame", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_IT);

    const firstSync = quad.writes.slice(BIND_WRITES.length);

    expect(firstSync.every((field) => SYNC_FIELDS.includes(field))).toBe(true);

    quad.forgetWrites();
    arranged.sync(AROUND_IT);

    expect([...new Set(quad.writes)].sort()).toEqual(
      [...PROJECTILE_SYNC_FIELDS].sort(),
    );
  });

  it("interpolates from where it was and turns to the bearing it flies", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.projectile.curr.x = START_X + STEP;
    arranged.projectile.facing = Math.PI / 2;

    arranged.sync(AROUND_IT);

    expect(quad.x).toBe(START_X + STEP * HALF_WAY);
    expect(quad.y).toBe(START_Y);
    expect(quad.rotation).toBe(Math.PI / 2);
    expect(quad.visible).toBe(true);
  });

  it("releases the view of a projectile that landed or left the rectangle", () => {
    const arranged = arrange(1);
    const quad = firstQuad(arranged);

    arranged.sync(AROUND_IT);

    expect(quad.visible).toBe(true);

    arranged.sync(FAR_AWAY);

    expect(quad.visible).toBe(false);
    expect(arranged.pool.bound).toBe(0);
  });

  it("counts a miss when every view is bound and refuses to grow", () => {
    const arranged = arrange(1);
    const second = acquireProjectile(arranged.world.state, START_X, START_Y, 0);

    if (second === null) {
      throw new Error("The projectile pool has room for a second projectile");
    }

    arranged.sync(AROUND_IT);

    expect(arranged.pool.bound).toBe(1);
    expect(arranged.pool.misses).toBe(1);
    expect(arranged.quads).toHaveLength(1);
  });
});
