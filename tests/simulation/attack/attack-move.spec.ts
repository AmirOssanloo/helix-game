import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../../helpers";

/** Where the attack-move walks to: straight out in front of the hero. */
const DESTINATION = { x: 2400, y: 0 };

/** Where the enemy stands: off the line, out of the acquire radius from the hero's start and inside it partway along. */
const ENEMY = { x: 1400, y: 500 };

/** Ticks a case gives the walk. */
const PATIENCE = 400;

type Arranged = {
  world: Simulation;
  hero: Unit;
  enemy: Unit;
  enemyId: EntityId;
};

/** The hero at the origin facing its walk, with one enemy off to the side of it. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);
  const enemy = spawnUnit(world, { x: ENEMY.x, y: ENEMY.y });

  return { world, hero, enemy, enemyId: unitIdOf(world, enemy) };
};

/** Orders the hero to attack-move to the destination, as A then a left click does. */
const attackMove = (world: Simulation): void => {
  submit(world, {
    kind: "attack_move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: DESTINATION,
  });
};

/** Ticks until `predicate` holds, and returns whether it did within the patience. */
const tickWhile = (
  world: Simulation,
  predicate: () => boolean,
  ticks = PATIENCE,
): boolean => {
  for (let index = 0; index < ticks; index += 1) {
    if (predicate()) {
      return true;
    }

    world.tick();
  }

  return predicate();
};

describe("an attack-move", () => {
  it("acquires the nearest enemy once it is inside the acquire radius", () => {
    const { world, hero, enemy, enemyId } = arrange();

    attackMove(world);

    expect(tickWhile(world, () => hero.order.targetId !== null)).toBe(true);
    expect(hero.order.kind).toBe("attack_move");
    expect(hero.order.targetId).toBe(enemyId);
    expect(
      Math.hypot(enemy.curr.x - hero.curr.x, enemy.curr.y - hero.curr.y),
    ).toBeLessThanOrEqual(heroDef.attack.acquireRadius);
    expect(hero.attackMovePoint).toEqual(DESTINATION);
  });

  it("resumes the walk from where it stands when the target is gone, without turning back", () => {
    const { world, hero } = arrange();

    attackMove(world);
    tickWhile(world, () => hero.order.targetId !== null);

    const left = hero.curr.x;

    submit(world, {
      kind: "clear_all",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(hero.order.kind).toBe("attack_move");
    expect(hero.order.targetId).toBeNull();
    expect(hero.order.destination).toEqual(DESTINATION);

    let furthestBack = hero.curr.x;

    tickWhile(world, () => {
      furthestBack = Math.min(furthestBack, hero.curr.x);

      return hero.order.kind === "none";
    });

    expect(hero.order.kind).toBe("none");
    expect(furthestBack).toBeGreaterThanOrEqual(left - 1);
    expect(hero.curr.x).toBeCloseTo(DESTINATION.x);
  });

  it("walks to its destination and goes idle when it acquires nothing", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);

    attackMove(world);
    world.tick();

    expect(hero.order.kind).toBe("attack_move");
    expect(tickWhile(world, () => hero.order.kind === "none")).toBe(true);
    expect(hero.curr.x).toBeCloseTo(DESTINATION.x);
    expect(hero.state).toBe("idle");
  });
});
