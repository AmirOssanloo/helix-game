import { describe, expect, it } from "vitest";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, spawnHero, spawnUnit, submit } from "../helpers";

/** Behind the hero and far enough that no attack reaches it, so an order on it stays a turn and an approach for as long as a spec runs. */
const FAR_AWAY = -5000;

/** An enemy well out of the hero's reach, and the id an order names it by: an attack on a unit that is not there drops to idle before a spec can read it. */
const enemyId = (world: Simulation): EntityId => {
  const unit = spawnUnit(world, { x: FAR_AWAY, y: 0 });
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    if (units.at(index) === unit) {
      const id = units.idAt(index);

      if (id !== null) {
        return id;
      }
    }
  }

  throw new Error("The spec expects the unit it just spawned in the pool");
};

describe("commandSystem", () => {
  it("makes a move consumed on tick N the hero's order after tick N, with the hero turning", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: -100, y: 40 },
    });

    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.order.destination).toEqual({ x: -100, y: 40 });
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
    const targetId = enemyId(world);

    submit(world, {
      kind: "attack_target",
      tick: 0,
      timestamp: 1,
      targetId,
    });

    world.tick();

    expect(hero.order.kind).toBe("attack_target");
    expect(hero.order.targetId).toBe(targetId);
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
    const facingAtStop = hero.facing;
    submit(world, { kind: "stop", tick: 1, timestamp: 2 });

    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.facing).toBe(facingAtStop);
  });

  it("leaves the order and the state as they were when a command is refused", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    const targetId = enemyId(world);

    hero.order.kind = "attack_target";
    hero.order.targetId = targetId;
    hero.state = "turning";
    hero.disables.stunned = true;
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 1,
      destination: { x: 100, y: 40 },
    });

    world.tick();

    expect(hero.order.kind).toBe("attack_target");
    expect(hero.order.targetId).toBe(targetId);
    expect(hero.order.destination).not.toEqual({ x: 100, y: 40 });
    expect(hero.state).toBe("turning");
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
