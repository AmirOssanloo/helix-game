import { describe, expect, it } from "vitest";
import { chargeDef, tuningTable } from "@content/public";
import type { EnemyDef, MapDef, Unit } from "@domain/public";
import { applyStatus, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeAttackDef,
  makeEnemyDef,
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** How far the charge carries at most, how fast, and so the ticks its table gives for the whole distance. */
const FIELDS = chargeDef.effects[0].fields;
const DISTANCE = FIELDS.distance.byLevel[0];
const TRAVEL_TICKS = Math.round((DISTANCE / FIELDS.speed) * tuningTable.sim_hz);

/** The charge's cast point, in ticks. */
const CAST_POINT_TICKS = Math.round(
  chargeDef.castPointSeconds * tuningTable.sim_hz,
);

/** The charger's body: a bound radius wider than its collision radius, so it ends a charge against the hero's edge without the collision pass shoving the two apart. */
const COLLISION_RADIUS = 16;
const BOUND_RADIUS = 30;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** Where the wall between the charger and the hero stands, and its far face, the one the charger meets. */
const WALL_MIN_X = 200;
const WALL_MAX_X = 300;

/** Long enough that the root holding the charger outlasts every case: a root stops it walking, never a push. */
const ROOTED_TICKS = 100_000;

/**
 * A charger held by a root, so every unit it moves is the charge's, and whose swing reaches
 * the hero from the end of a charge.
 */
const CHARGER: EnemyDef = makeEnemyDef.build({
  id: "charger",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 2000,
  leashRadius: 4000,
  body: {
    collisionRadius: COLLISION_RADIUS,
    boundRadius: BOUND_RADIUS,
    selectionRadius: 32,
  },
  abilities: [{ id: chargeDef.id, condition: { kind: "always" } }],
  attack: makeAttackDef.build({
    damage: 30,
    range: 100,
    acquireRadius: 2000,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  charger: Unit;
  chargerId: EntityId;
}>;

/** The hero at the origin and the charger on the positive x axis, `gap` from the hero's edge to its own, bound to bound. */
const arrange = (gap: number, map: MapDef = makeMapDef.build()): Arranged => {
  const world = makeWorld({
    seed: 1,
    map,
    registry: makeRegistry({
      enemies: [CHARGER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const charger = spawnEnemy(world, {
    definitionId: CHARGER.id,
    x: gap + BOUND_RADIUS + hero.boundRadius,
    y: 0,
  });

  const chargerId = unitIdOf(world, charger);

  applyStatus(world.state, chargerId, "root", ROOTED_TICKS, null, []);

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    charger,
    chargerId,
  };
};

/** A map with a wall standing across the way from the charger to the hero. */
const walled = (): MapDef =>
  makeMapDef.build({
    obstacles: [
      { minX: WALL_MIN_X, minY: -2000, maxX: WALL_MAX_X, maxY: 2000 },
    ],
  });

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

/** Ticks through the charge's cast point to the tick after it commits. */
const commit = (world: Simulation, charger: Unit): void => {
  tickUntil(world, inCastPoint(charger), PATIENCE);
  tickUntil(world, () => charger.state !== "ability_cast_point", PATIENCE);
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

describe("the charge", () => {
  it("closes its whole distance in the ticks its table gives, displaced the whole way, and ends against the hero's edge", () => {
    const { world, hero, charger } = arrange(DISTANCE);
    const startX = charger.curr.x;

    commit(world, charger);

    expect(charger.push.ticksLeft).toBeGreaterThan(0);

    tickTimes(world, TRAVEL_TICKS - 2);

    expect(charger.disables.displaced).toBe(true);
    expect(startX - charger.curr.x).toBeLessThan(DISTANCE);

    tickUntil(world, () => charger.push.ticksLeft === 0, PATIENCE);

    expect(startX - charger.curr.x).toBeCloseTo(DISTANCE, 6);
    expect(charger.curr.x - hero.curr.x).toBeCloseTo(
      BOUND_RADIUS + hero.boundRadius,
      6,
    );
  });

  it("takes exactly the table's ticks from the commit to the end of the carry", () => {
    const { world, charger } = arrange(DISTANCE);

    commit(world, charger);

    const carried = tickUntil(
      world,
      () => charger.push.ticksLeft === 0,
      PATIENCE,
    );

    expect(carried + 1).toBe(TRAVEL_TICKS);
  });

  it("stops at a wall across its way, with the rest of the charge spent against it", () => {
    const { world, charger } = arrange(DISTANCE, walled());

    commit(world, charger);
    tickUntil(world, () => charger.push.ticksLeft === 0, PATIENCE);
    world.tick();

    expect(charger.curr.x - COLLISION_RADIUS).toBeGreaterThanOrEqual(
      WALL_MAX_X - 1e-6,
    );
    expect(charger.curr.x - COLLISION_RADIUS).toBeLessThan(WALL_MAX_X + 1);
  });

  it("goes back to its attack from where the charge left it, and lands it", () => {
    const { world, hero, heroId, charger } = arrange(DISTANCE);
    const before = heroHealth(world);

    commit(world, charger);
    tickUntil(world, () => charger.push.ticksLeft === 0, PATIENCE);
    tickUntil(world, () => heroHealth(world) < before, PATIENCE);

    expect(charger.ai.state).toBe("attack");
    expect(charger.order.kind).toBe("attack_target");
    expect(charger.order.targetId).toBe(heroId);
    expect(heroHealth(world)).toBeLessThan(hero.stats.maxHealth);
  });

  it("is not cast at a hero beyond its reach", () => {
    const { world, charger } = arrange(DISTANCE + 50);

    tickTimes(world, PATIENCE);

    expect(charger.cast.abilityId).toBeNull();
    expect(charger.push.ticksLeft).toBe(0);
  });

  it("is cancelled at no cost by a stun during its cast point: nobody moves and the clock does not start", () => {
    const { world, charger, chargerId } = arrange(DISTANCE);
    const startX = charger.curr.x;

    tickUntil(world, inCastPoint(charger), PATIENCE);
    applyStatus(world.state, chargerId, "stun", CAST_POINT_TICKS + 5, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(charger.curr.x).toBe(startX);
    expect(charger.push.ticksLeft).toBe(0);
    expect(
      remainingCooldownTicks(charger.cooldowns, chargeDef.id, world.state.tick),
    ).toBe(0);
  });
});
