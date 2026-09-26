import { describe, expect, it } from "vitest";
import { contentRegistry, meleeGruntDef } from "@content/public";
import type { Unit } from "@domain/public";
import { applyDamage, applyStatus } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** Where the lone grunt stands: past its aggro radius and the hero's reach, so the hero walks before it fires. */
const GRUNT_AT = { x: 1500, y: 0 };

/** Where the pack stands, on the line of the attack-move and out of the hero's acquire radius at the start. */
const PACK_AT = { x: 1600, y: 0 };
const PACK_COUNT = 3;

/** Where the attack-move walks to: through the pack and out the far side. */
const DESTINATION = { x: 3000, y: 0 };

/** The generic lift, which puts a unit in the air and out of reach, and how long it holds. */
const LIFT = "lift";
const LIFT_TICKS = 60;

/** More than any grunt's health, landed as pure so no armour reads it. */
const LETHAL = 100000;

/** Long enough for the walk, the grunt's approach, and a few shots. */
const PATIENCE = 600;

/** Hits the hero lands on a grunt that is swinging back at it. */
const HITS_WHILE_FIGHTING = 3;

/** The content registry with no wander, so an idle grunt stands on its mark. */
const arrange = (): Readonly<{ world: Simulation; hero: Unit }> => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });

  return { world, hero: spawnHero(world) };
};

/**
 * A grunt's health for the fight that lasts until it fights back: the hero's attack kills a
 * content grunt before it closes, so this one outlasts the walk in and the hits after it.
 */
const HARDY_GRUNT_HEALTH = 1000;

/** As `arrange`, with a grunt that outlasts three of the hero's hits and its own walk in. */
const arrangeHardy = (): Readonly<{ world: Simulation; hero: Unit }> => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      tuning: { wander_radius: 0 },
      enemies: contentRegistry.enemies.map((def) =>
        def.id === meleeGruntDef.id
          ? { ...def, health: HARDY_GRUNT_HEALTH }
          : def,
      ),
    }),
  });

  return { world, hero: spawnHero(world) };
};

/** A pack of `count` grunts around `position`, from the panel's door. */
const spawnGrunts = (
  world: Simulation,
  count: number,
  position: Readonly<{ x: number; y: number }>,
): void => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId: meleeGruntDef.id,
    tier: "normal",
    count,
    position,
  });
  world.tick();
};

/** Every live grunt, in pool order. */
const gruntsOf = (world: Simulation): Unit[] => {
  const units = world.state.map.units;
  const found: Unit[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (
      unit !== null &&
      unit.definitionId === meleeGruntDef.id &&
      unit.state !== "dead"
    ) {
      found.push(unit);
    }
  }

  return found;
};

/** The one grunt the world holds. */
const onlyGrunt = (world: Simulation): Unit => {
  const [grunt] = gruntsOf(world);

  if (grunt === undefined) {
    throw new Error("The spec spawned a grunt");
  }

  return grunt;
};

/** Orders the hero to attack `targetId`, as a right click on it does. */
const attack = (world: Simulation, targetId: EntityId): void => {
  submit(world, {
    kind: "attack_target",
    tick: world.view.tick,
    timestamp: world.view.tick,
    targetId,
  });
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

/** How many hits the hero landed on `targetId` that the reader has not seen. */
const hitsOn = (
  world: Simulation,
  reader: EventReader,
  heroId: EntityId,
  targetId: EntityId,
): number => {
  let count = 0;

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (
      event.kind === "unit_damaged" &&
      event.sourceId === heroId &&
      event.unitId === targetId
    ) {
      count += 1;
    }
  }

  return count;
};

/** How far `unit` stood from `other` when the tick began, which is where the attack rule measured both. */
const startGap = (unit: Readonly<Unit>, other: Readonly<Unit>): number =>
  Math.hypot(other.prev.x - unit.prev.x, other.prev.y - unit.prev.y);

describe("an attack on a grunt", () => {
  it("walks to it while it closes, and lands hits on it", () => {
    const { world, hero } = arrange();
    const reader = createEventReader();

    spawnGrunts(world, 1, GRUNT_AT);

    const grunt = onlyGrunt(world);
    const gruntId = unitIdOf(world, grunt);

    attack(world, gruntId);
    tickUntil(world, () => grunt.ai.state === "chase", PATIENCE);

    expect(hero.order.kind).toBe("attack_target");
    expect(hero.curr.x).toBeGreaterThan(0);

    tickUntil(
      world,
      () => grunt.resources.health < grunt.stats.maxHealth,
      PATIENCE,
    );

    expect(hitsOn(world, reader, unitIdOf(world, hero), gruntId)).toBe(1);
    expect(hero.order.kind).toBe("attack_target");
    expect(hero.order.targetId).toBe(gruntId);
  });

  it("keeps hitting it as it fights back", () => {
    const { world, hero } = arrangeHardy();
    const reader = createEventReader();

    spawnGrunts(world, 1, GRUNT_AT);

    const grunt = onlyGrunt(world);
    const gruntId = unitIdOf(world, grunt);
    const heroId = unitIdOf(world, hero);
    let hits = 0;

    attack(world, gruntId);
    tickUntil(world, () => grunt.ai.state === "attack", PATIENCE);
    hitsOn(world, reader, heroId, gruntId);
    tickUntil(
      world,
      () => {
        hits += hitsOn(world, reader, heroId, gruntId);

        return hits >= HITS_WHILE_FIGHTING;
      },
      PATIENCE,
    );

    expect(grunt.ai.state).toBe("attack");
    expect(hero.order.targetId).toBe(gruntId);
  });

  it("drops to idle when the grunt is lifted out of reach", () => {
    const { world, hero } = arrange();

    spawnGrunts(world, 1, GRUNT_AT);

    const grunt = onlyGrunt(world);
    const gruntId = unitIdOf(world, grunt);

    attack(world, gruntId);
    tickUntil(world, () => grunt.ai.state === "chase", PATIENCE);
    applyStatus(world.state, gruntId, LIFT, LIFT_TICKS, null, []);
    world.tick();

    expect(grunt.disables.untargetable).toBe(true);
    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
  });
});

describe("an attack-move through a pack", () => {
  it("acquires the member nearest the hero", () => {
    const { world, hero } = arrange();

    spawnGrunts(world, PACK_COUNT, PACK_AT);
    attackMove(world);
    tickUntil(world, () => hero.order.targetId !== null, PATIENCE);

    const target = world.state.map.units.resolve(hero.order.targetId ?? 0);
    const gaps = gruntsOf(world).map((grunt) => startGap(hero, grunt));

    expect(target).not.toBeNull();
    expect(startGap(hero, target ?? hero)).toBe(Math.min(...gaps));
  });

  it("acquires the next nearest when its target dies, and keeps the walk", () => {
    const { world, hero } = arrange();

    spawnGrunts(world, PACK_COUNT, PACK_AT);
    attackMove(world);
    tickUntil(world, () => hero.order.targetId !== null, PATIENCE);

    const first = hero.order.targetId ?? 0;

    applyDamage(world.state, first, LETHAL, "pure", unitIdOf(world, hero));
    tickUntil(
      world,
      () => hero.order.targetId !== null && hero.order.targetId !== first,
      PATIENCE,
    );

    const next = world.state.map.units.resolve(hero.order.targetId ?? 0);
    const gaps = gruntsOf(world).map((grunt) => startGap(hero, grunt));

    expect(hero.order.kind).toBe("attack_move");
    expect(hero.order.targetId).not.toBe(first);
    expect(next).not.toBeNull();
    expect(startGap(hero, next ?? hero)).toBe(Math.min(...gaps));
    expect(hero.attackMovePoint).toEqual(DESTINATION);
  });

  it("resumes the walk to its destination once the pack is dead", () => {
    const { world, hero } = arrange();

    spawnGrunts(world, PACK_COUNT, PACK_AT);
    attackMove(world);
    tickUntil(world, () => hero.order.targetId !== null, PATIENCE);
    submit(world, {
      kind: "kill_all",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();
    world.tick();

    expect(hero.order.kind).toBe("attack_move");
    expect(hero.order.targetId).toBeNull();

    tickUntil(world, () => hero.order.kind === "none", PATIENCE);

    expect(hero.curr.x).toBeCloseTo(DESTINATION.x);
    expect(hero.state).toBe("idle");
  });
});
