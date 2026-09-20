import { describe, expect, it } from "vitest";
import { makeWorld, spawnHero, submit } from "../helpers";

describe("commandSystem", () => {
  it("makes a move consumed on tick N the hero's order after tick N, with the hero turning", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 100, y: 40 },
    });

    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.order.destination).toEqual({ x: 100, y: 40 });
    expect(hero.state).toBe("turning");
  });

  it("makes an attack-move the hero's order with its destination", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, {
      kind: "attack_move",
      tick: 0,
      timestamp: 1,
      destination: { x: -30, y: 5 },
    });

    world.tick();

    expect(hero.order.kind).toBe("attack_move");
    expect(hero.order.destination).toEqual({ x: -30, y: 5 });
    expect(hero.state).toBe("turning");
  });

  it("makes an attack on a target the hero's order with its target id", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, {
      kind: "attack_target",
      tick: 0,
      timestamp: 1,
      targetId: 7,
    });

    world.tick();

    expect(hero.order.kind).toBe("attack_target");
    expect(hero.order.targetId).toBe(7);
    expect(hero.state).toBe("turning");
  });

  it("clears the order on a stop consumed after a move and leaves facing where it was", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { facing: 2 });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 100, y: 40 },
    });
    world.tick();
    submit(world, { kind: "stop", tick: 1, timestamp: 2 });

    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.facing).toBe(2);
  });

  it("leaves the order and the state as they were when a command is refused", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    hero.order.kind = "attack_target";
    hero.order.targetId = 7;
    hero.state = "attack_windup";
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 100, y: 40 },
    });

    world.tick();

    expect(hero.order.kind).toBe("attack_target");
    expect(hero.order.targetId).toBe(7);
    expect(hero.order.destination).toEqual({ x: 0, y: 0 });
    expect(hero.state).toBe("attack_windup");
  });

  it("leaves the later move by timestamp when two arrive in one tick", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 20,
      destination: { x: 200, y: 0 },
    });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 10,
      destination: { x: 100, y: 0 },
    });

    world.tick();

    expect(hero.order.destination).toEqual({ x: 200, y: 0 });
  });

  it("drops every player command in a world with no hero and still records it", () => {
    const world = makeWorld({ seed: 1 });
    const move = {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 100, y: 40 },
    } as const;
    submit(world, move);

    world.tick();

    expect(world.view.map.units.count).toBe(0);
    expect(world.log.commandAt(0)).toBe(move);
  });

  it("validates a slot key and a cast and drops them without touching the order", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, { kind: "slot", tick: 0, timestamp: 1, slot: 1 });
    submit(world, {
      kind: "cast",
      tick: 0,
      timestamp: 2,
      abilityId: "quartz",
      target: { kind: "none" },
    });

    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
  });

  it("forgets the consumed commands once the tick is over", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world);
    submit(world, { kind: "stop", tick: 0, timestamp: 1 });

    world.tick();

    expect(world.state.commands.count).toBe(0);
    expect(world.state.commands.at(0)).toBeNull();
  });
});
