import { describe, expect, it } from "vitest";
import type {
  ApplyStatusEffectDef,
  SpawnUnitEffectDef,
  StatusDef,
  SummonDef,
  Unit,
} from "@domain/public";
import { runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeAttackDef,
  makeCast,
  makeRegistry,
  makeStatusDef,
  makeSummonDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  unitIdOf,
} from "../../helpers";

/** How far from its owner the summon below is content to stand. */
const FOLLOW_DISTANCE = 250;

/** How far the summon below looks for something to attack, and how far its shot reaches. */
const ACQUIRE_RADIUS = 600;
const ATTACK_RANGE = 300;

/** The summon every case below spawns: it attacks what is near and follows its owner when nothing is. */
const EMBERLING: SummonDef = makeSummonDef.build({
  id: "emberling",
  behaviour: "summon_follow",
  followDistance: FOLLOW_DISTANCE,
  attack: makeAttackDef.build({
    range: ATTACK_RANGE,
    acquireRadius: ACQUIRE_RADIUS,
  }),
});

/** A root, for the case that asks whether a summon obeys one. */
const NET: StatusDef = makeStatusDef.build({
  id: "net",
  flags: ["rooted"],
});

/** Where the summon spawns: beside its owner, well inside the follow distance. */
const OFFSET = { forward: 0, right: 80 };

/** Long enough that no case below outlives it. */
const LIFETIME_SECONDS = 600;

const spawnEntry: SpawnUnitEffectDef = {
  kind: "spawn_unit",
  unitId: EMBERLING.id,
  count: 1,
  offset: OFFSET,
  lifetimeSeconds: { orb: "quartz", byLevel: [LIFETIME_SECONDS] },
  bonuses: [],
};

/** Long enough that the root outlasts every walk a case could make. */
const ROOT_SECONDS = 600;

const rootEntry: ApplyStatusEffectDef = {
  kind: "apply_status",
  target: { kind: "target" },
  statusId: NET.id,
  seconds: ROOT_SECONDS,
};

/** How far the hero walks away, and how many ticks a case gives it to get there and be followed. */
const WALK_X = 1200;
const PATIENCE = 400;

/** Ticks a case runs to show that nothing moved. */
const SETTLE = 60;

type Arranged = {
  world: Simulation;
  hero: Unit;
  summon: Unit;
  summonId: EntityId;
};

const distance = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/** The first summon in the pool, and the id it holds. */
const summonOf = (world: Simulation): { unit: Unit; id: EntityId } => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "summon") {
      return { unit, id };
    }
  }

  throw new Error("The spec expects a summon in the pool");
};

/** The hero at the origin with one emberling beside it. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ summons: [EMBERLING], statuses: [NET] }),
  });
  const hero = spawnHero(world);

  runPrimitive(world.state, makeCast(world), spawnEntry);

  const { unit, id } = summonOf(world);

  return { world, hero, summon: unit, summonId: id };
};

const walkHeroAway = (world: Simulation): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x: WALK_X, y: 0 },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("a summon following its owner", () => {
  it("holds its ground while its owner is inside the follow distance", () => {
    const { world, summon } = arrange();
    const stood = { x: summon.curr.x, y: summon.curr.y };

    tickTimes(world, SETTLE);

    expect(summon.order.kind).toBe("none");
    expect(summon.curr).toEqual(stood);
  });

  it("walks back to the follow ring once its owner has left it behind", () => {
    const { world, hero, summon } = arrange();

    walkHeroAway(world);
    tickTimes(world, PATIENCE);

    expect(summon.curr.x).toBeGreaterThan(0);
    expect(distance(hero, summon)).toBeCloseTo(FOLLOW_DISTANCE);
  });

  it("attacks the nearest enemy inside its acquire radius instead of following", () => {
    const { world, summon } = arrange();
    const enemy = spawnUnit(world, { x: ACQUIRE_RADIUS - 100, y: 0 });
    const enemyId = unitIdOf(world, enemy);

    world.tick();

    expect(summon.order.kind).toBe("attack_target");
    expect(summon.order.targetId).toBe(enemyId);
  });

  it("goes back to following once what it acquired is dead", () => {
    const { world, hero, summon } = arrange();
    const enemy = spawnUnit(world, { x: ACQUIRE_RADIUS - 100, y: 0 });

    world.tick();

    expect(summon.order.kind).toBe("attack_target");

    enemy.resources.health = 0;
    world.tick();
    world.tick();

    expect(summon.order.kind).toBe("none");

    walkHeroAway(world);
    tickTimes(world, PATIENCE);

    expect(distance(hero, summon)).toBeCloseTo(FOLLOW_DISTANCE);
  });

  it("stays where it stands while it is rooted, however far its owner goes", () => {
    const { world, hero, summon, summonId } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { targetId: summonId }),
      rootEntry,
    );

    const stood = { x: summon.curr.x, y: summon.curr.y };

    walkHeroAway(world);
    tickTimes(world, PATIENCE);

    expect(hero.curr.x).toBe(WALK_X);
    expect(summon.disables.rooted).toBe(true);
    expect(summon.curr).toEqual(stood);
  });
});
