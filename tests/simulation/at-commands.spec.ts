import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../helpers";

const HULL = 27;

/** A wall standing across x 1000 to 1200. */
const WALL = { minX: 1000, minY: -1000, maxX: 1200, maxY: 1000 };

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

describe("AT-C1", () => {
  it("abandons the first destination when a second move arrives before arrival", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, 300, 0);
    world.tick();
    world.tick();
    world.tick();

    moveTo(world, 0, 300);
    world.tick();

    expect(hero.order.destination).toEqual({ x: 0, y: 300 });
    expect(hero.curr.x).toBeLessThan(300);
  });

  it("arrives at the second destination and never at the first", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, 300, 0);
    world.tick();
    world.tick();
    world.tick();
    moveTo(world, 0, 300);

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.curr).toEqual({ x: 0, y: 300 });
    expect(hero.order.kind).toBe("none");
  });
});

describe("AT-C2", () => {
  it("holds one destination and a one-waypoint path after two ground clicks, never a queue", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, 300, 0);
    world.tick();

    moveTo(world, 300, 300);
    world.tick();

    expect(hero.order.destination).toEqual({ x: 300, y: 300 });
    expect(hero.path.count).toBe(1);
    expect(hero.path.points[0]).toEqual({ x: 300, y: 300 });
  });
});

describe("AT-C4", () => {
  it("clears a move on a stop, and the hero stays where it stopped with its yaw frozen", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 0 });
    moveTo(world, -300, 300);
    world.tick();
    world.tick();
    const facingAtStop = hero.facing;
    const positionAtStop = { x: hero.curr.x, y: hero.curr.y };

    submit(world, { kind: "stop", tick: 2, timestamp: 2 });
    world.tick();
    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.path.count).toBe(0);
    expect(hero.facing).toBe(facingAtStop);
    expect(hero.curr).toEqual(positionAtStop);
  });
});

describe("map: click on an obstacle", () => {
  it("issues a move to the nearest walkable point on the obstacle's edge and arrives there", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({ obstacles: [WALL] }),
    });
    const hero = spawnHero(world, { x: 500, y: 0, facing: 0 });
    moveTo(world, 1050, 0);

    world.tick();

    expect(hero.order.destination).toEqual({ x: 1000 - HULL, y: 0 });

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.curr).toEqual({ x: 1000 - HULL, y: 0 });
  });
});

describe("map: click outside the map", () => {
  it("issues a move to the nearest point inside the bounds", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
        spawnPoint: { x: 500, y: 500 },
      }),
    });
    const hero = spawnHero(world, { x: 500, y: 500, facing: 0 });
    moveTo(world, 1200, 300);

    world.tick();

    expect(hero.order.destination).toEqual({ x: 1000 - HULL, y: 300 });
  });
});

describe("map: a move order crosses the arena around obstacles", () => {
  it("carries the hero from the spawn point to the far corner of the arena without entering a rectangle", () => {
    const world = makeWorld({ seed: 1, map: arenaDef });
    const hero = spawnHero(world, {
      x: arenaDef.spawnPoint.x,
      y: arenaDef.spawnPoint.y,
    });
    moveTo(world, 3800, 3800);
    let closest = Infinity;

    world.tick();

    for (let tick = 0; tick < 600 && hero.state !== "idle"; tick += 1) {
      world.tick();

      for (const rect of arenaDef.obstacles) {
        const dx =
          hero.curr.x - Math.min(Math.max(hero.curr.x, rect.minX), rect.maxX);
        const dy =
          hero.curr.y - Math.min(Math.max(hero.curr.y, rect.minY), rect.maxY);

        closest = Math.min(closest, Math.hypot(dx, dy));
      }
    }

    expect(hero.state).toBe("idle");
    expect(hero.curr).toEqual({ x: 3800, y: 3800 });
    expect(closest).toBeGreaterThanOrEqual(HULL - 1e-6);
  });
});
