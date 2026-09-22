import { describe, expect, it } from "vitest";
import { heroDef, trainingDummyDef, tuningTable } from "@content/public";
import type { Unit } from "@domain/public";
import {
  attackTicks,
  BASE_ATTACK_SPEED,
  createAttackRecord,
  readTunable,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../../helpers";

/** Where the target stands: the spec's thousand-and-two-hundred units out in front of the hero. */
const TARGET_X = 1200;

/** Ticks a case runs, long enough for the walk, two shots, and both flights. */
const PATIENCE = 300;

/** Seconds as the whole ticks the simulation counts them in. */
const ticks = (seconds: number): number =>
  Math.round(seconds * tuningTable.sim_hz);

/** The slot key each orb is pressed with: Q, W, E as slots one, two, three. */
const EMBER = 3;

/** How many Ember instances the hero holds in the case that reads the damage off them. */
const EMBER_INSTANCES = 3;

/** What one held Ember instance adds at orb level one. */
const EMBER_DAMAGE = tuningTable["ember_damage_per_instance:0"];

/** The hero's attack with its seconds read for the tick, as run scope holds it. */
const HERO_ATTACK = createAttackRecord(heroDef.attack, tuningTable.sim_hz);

type Arranged = {
  world: Simulation;
  hero: Unit;
  target: Unit;
  targetId: EntityId;
  reader: EventReader;
};

/** The hero at the origin facing its target, with one enemy out in front of it. */
const arrange = (options: { health?: number } = {}): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);
  const target = spawnUnit(world, {
    x: TARGET_X,
    y: 0,
    health: options.health ?? 1000,
  });

  return {
    world,
    hero,
    target,
    targetId: unitIdOf(world, target),
    reader: createEventReader(),
  };
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

/** What a run of the world saw: the tick each attack point began on, and the tick each shot was fired on. */
type Seen = {
  windups: number[];
  shots: number[];
};

/** Runs `count` ticks, noting every attack point the hero began and every projectile it fired. */
const run = (
  world: Simulation,
  hero: Readonly<Unit>,
  reader: EventReader,
  count: number,
): Seen => {
  const seen: Seen = { windups: [], shots: [] };
  let wasInWindup = false;

  for (let index = 0; index < count; index += 1) {
    const tick = world.view.tick;

    world.tick();

    if (hero.state === "attack_windup" && !wasInWindup) {
      seen.windups.push(tick);
    }

    wasInWindup = hero.state === "attack_windup";

    for (
      let event = world.events.read(reader);
      event !== null;
      event = world.events.read(reader)
    ) {
      if (event.kind === "projectile_spawned") {
        seen.shots.push(event.tick);
      }
    }
  }

  return seen;
};

/** The one projectile in flight, or `null` when none is. */
const shotOf = (
  world: Simulation,
): Readonly<{
  speed: number;
  targetId: EntityId | null;
  attackDamage: number;
}> | null => {
  const projectiles = world.state.map.projectiles;

  for (let index = 0; index < projectiles.end; index += 1) {
    const projectile = projectiles.at(index);

    if (projectile !== null) {
      return projectile;
    }
  }

  return null;
};

/** The first unit in the pool wearing the dummy's definition. */
const dummyOf = (world: Simulation): Unit => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === trainingDummyDef.id) {
      return unit;
    }
  }

  throw new Error("The spec expects the dummy it spawned in the pool");
};

/** Every hit the reader has not seen, by the amount that landed. */
const hits = (world: Simulation, reader: EventReader): number[] => {
  const found: number[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === "unit_damaged") {
      found.push(event.amount);
    }
  }

  return found;
};

describe("an attack on a target", () => {
  it("walks into reach, faces, and fires after the attack point", () => {
    const { world, hero, target, targetId, reader } = arrange();

    attack(world, targetId);

    const seen = run(world, hero, reader, PATIENCE);
    const reach = heroDef.attack.range + hero.boundRadius + target.boundRadius;
    const windup = seen.windups[0];
    const shot = seen.shots[0];

    expect(windup).toBeDefined();
    expect(shot).toBeDefined();
    expect(hero.curr.x).toBeLessThanOrEqual(TARGET_X - heroDef.attack.range);
    expect(Math.hypot(TARGET_X - hero.curr.x, 0)).toBeLessThanOrEqual(reach);
    expect((shot ?? 0) - (windup ?? 0)).toBe(
      ticks(heroDef.attack.pointSeconds),
    );
  });

  it("fires a homing shot at the definition's speed, carrying the attack damage", () => {
    const { world, hero, targetId, reader } = arrange();

    attack(world, targetId);
    run(world, hero, reader, PATIENCE);

    const shot = shotOf(world);

    expect(shot).not.toBeNull();
    expect(shot?.targetId).toBe(targetId);
    expect(shot?.speed).toBeCloseTo(
      heroDef.attack.projectileSpeed /
        readTunable(world.view.run.tuning, "sim_hz"),
    );
    expect(shot?.attackDamage).toBe(heroDef.attack.damage);
  });

  it("counts a whole base attack time between shots at base attack speed", () => {
    expect(attackTicks(HERO_ATTACK, BASE_ATTACK_SPEED)).toBe(
      ticks(heroDef.attack.baseAttackTimeSeconds),
    );
  });

  it("fires again one attack time after the first, scaled by its attack speed", () => {
    const { world, hero, targetId, reader } = arrange();

    attack(world, targetId);

    const seen = run(world, hero, reader, PATIENCE);
    const [first, second] = seen.shots;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(hero.stats.attackSpeed).toBeGreaterThan(0);
    expect((second ?? 0) - (first ?? 0)).toBe(
      attackTicks(HERO_ATTACK, hero.stats.attackSpeed),
    );
  });

  it("carries what each held Ember instance adds to the attack damage", () => {
    const { world, hero, targetId, reader } = arrange();

    submit(world, {
      kind: "set_orb_levels",
      tick: world.view.tick,
      timestamp: 0,
      levels: [0, 0, 1],
    });

    for (let press = 0; press < EMBER_INSTANCES; press += 1) {
      submit(world, {
        kind: "slot",
        tick: world.view.tick,
        timestamp: press + 1,
        slot: EMBER,
      });
    }

    world.tick();
    attack(world, targetId);
    run(world, hero, reader, PATIENCE);

    expect(shotOf(world)?.attackDamage).toBe(
      heroDef.attack.damage + EMBER_INSTANCES * EMBER_DAMAGE,
    );
  });

  it("leaves the training dummy at one health, with the whole hit in the event", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    const reader = createEventReader();

    submit(world, {
      kind: "spawn_enemies",
      tick: world.view.tick,
      timestamp: world.view.tick,
      archetypeId: trainingDummyDef.id,
      count: 1,
      position: { x: TARGET_X, y: 0 },
    });
    world.tick();

    const dummy = dummyOf(world);
    const damage = createEventReader();

    dummy.resources.health = 1;
    attack(world, unitIdOf(world, dummy));
    run(world, hero, reader, PATIENCE);

    expect(dummy.resources.health).toBe(1);
    expect(hits(world, damage)).toContain(heroDef.attack.damage);
  });

  it("drops to idle when its target is gone", () => {
    const { world, hero, target, targetId, reader } = arrange();

    attack(world, targetId);
    run(world, hero, reader, 2);

    expect(hero.order.kind).toBe("attack_target");

    submit(world, {
      kind: "clear_units",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(target.state).toBe("idle");
    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
  });
});
