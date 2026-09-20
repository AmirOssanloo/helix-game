import { describe, expect, it } from "vitest";
import type { Simulation } from "@simulation/public";
import { makeWorld, spawnHero, submit, tickUntil } from "../helpers";

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
