import { describe, expect, it } from "vitest";
import { slamDef, tuningTable } from "@content/public";
import type { EnemyDef, MapDef, Unit } from "@domain/public";
import { applyStatus, mitigate, remainingCooldownTicks } from "@domain/public";
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
  spawnUnit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The slam's cast point and its clock, in ticks. */
const CAST_POINT_TICKS = Math.round(
  slamDef.castPointSeconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  slamDef.cooldownSeconds[0] * tuningTable.sim_hz,
);

/** The circle the slam strikes, its physical damage, and how far it pushes. */
const RADIUS = slamDef.effects[0].target.radius;
const SLAM_DAMAGE = slamDef.effects[0].amount.byLevel[0];
const PUSH_DISTANCE = slamDef.effects[1].distance.byLevel[0];

/** How near the target must stand before the slammer's entry lets it slam: inside the circle. */
const WITHIN = RADIUS - 50;

/** Where the slammer stands when the hero is inside the circle, and when it is outside the distance but inside aggro. */
const NEAR_X = 150;
const FAR_X = WITHIN + 100;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** Where the wall's near face stands, behind the hero, well short of where the push would end. */
const WALL_X = -100;

/** Long enough that the root holding the slammer outlasts every case. */
const ROOTED_TICKS = 100_000;

/** A slammer whose swing reaches nothing, so all the hero takes is the slam's. */
const SLAMMER: EnemyDef = makeEnemyDef.build({
  id: "slammer",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [
    { id: slamDef.id, condition: { kind: "target_within", distance: WITHIN } },
  ],
  attack: makeAttackDef.build({
    range: 0,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  slammer: Unit;
  slammerId: EntityId;
}>;

/**
 * A world with the slammer beside the content's abilities, the hero at the origin, and one
 * slammer at (`x`, 0), rooted, so where each case puts it is where it slams from.
 */
const arrange = (x: number, map: MapDef = makeMapDef.build()): Arranged => {
  const world = makeWorld({
    seed: 1,
    map,
    registry: makeRegistry({
      enemies: [SLAMMER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const slammer = spawnEnemy(world, { definitionId: SLAMMER.id, x, y: 0 });
  const slammerId = unitIdOf(world, slammer);

  applyStatus(world.state, slammerId, "root", ROOTED_TICKS, null, []);

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    slammer,
    slammerId,
  };
};

/** A map with a wall standing behind the hero, across the push's way. */
const walled = (): MapDef =>
  makeMapDef.build({
    obstacles: [{ minX: WALL_X - 400, minY: -2000, maxX: WALL_X, maxY: 2000 }],
  });

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

const knockbackRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "knockback");

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Ticks through the slam's cast point to the tick after it lands. */
const slam = (world: Simulation, slammer: Unit): void => {
  tickUntil(world, inCastPoint(slammer), PATIENCE);
  tickUntil(world, () => slammer.state !== "ability_cast_point", PATIENCE);
};

/** Ticks until no push has hold of `units`, so each stands where its push left it. */
const settle = (world: Simulation, units: readonly Unit[]): void => {
  tickUntil(
    world,
    () => units.every((unit) => unit.push.ticksLeft === 0),
    PATIENCE,
  );
};

describe("the slam", () => {
  it("is held while the hero stands outside its distance: nothing is cast and the clock does not start", () => {
    const { world, hero, slammer } = arrange(FAR_X);

    tickTimes(world, PATIENCE);

    expect(slammer.cast.abilityId).toBeNull();
    expect(heroHealth(world)).toBe(hero.stats.maxHealth);
    expect(
      remainingCooldownTicks(slammer.cooldowns, slamDef.id, world.state.tick),
    ).toBe(0);
  });

  it("is cast once the hero stands inside its distance, damages it, and pushes it straight away from the caster", () => {
    const { world, hero, slammer } = arrange(NEAR_X);
    const before = heroHealth(world);
    const startX = hero.curr.x;

    tickUntil(world, inCastPoint(slammer), PATIENCE);

    expect(slammer.cast.abilityId).toBe(slamDef.id);

    const waited = tickUntil(
      world,
      () => knockbackRowOf(hero) !== undefined,
      PATIENCE,
    );

    expect(waited).toBeGreaterThanOrEqual(CAST_POINT_TICKS - 1);
    expect(before - heroHealth(world)).toBeCloseTo(
      mitigate(
        SLAM_DAMAGE,
        "physical",
        hero.stats,
        tuningTable.armour_constant,
      ),
      6,
    );
    expect(knockbackRowOf(hero)?.sourceId).toBe(unitIdOf(world, slammer));

    settle(world, [hero]);

    expect(hero.curr.x).toBeCloseTo(startX - PUSH_DISTANCE, 0);
    expect(hero.curr.y).toBeCloseTo(0, 6);
    expect(
      remainingCooldownTicks(slammer.cooldowns, slamDef.id, world.state.tick),
    ).toBeGreaterThan(0);
    expect(
      remainingCooldownTicks(slammer.cooldowns, slamDef.id, world.state.tick),
    ).toBeLessThan(COOLDOWN_TICKS);
  });

  it("pushes every hostile unit in the circle away from the caster, each along its own bearing, and leaves its own side alone", () => {
    const { world, hero, slammer } = arrange(NEAR_X);
    const summon = spawnUnit(world, {
      kind: "summon",
      x: NEAR_X,
      y: 150,
      health: 1000,
    });
    const ally = spawnUnit(world, { x: NEAR_X, y: -150, health: 1000 });
    const summonStart = { x: summon.curr.x, y: summon.curr.y };
    const allyStart = { x: ally.curr.x, y: ally.curr.y };

    slam(world, slammer);
    settle(world, [hero, summon]);

    expect(hero.curr.x).toBeLessThan(0);
    expect(summon.curr.y - summonStart.y).toBeCloseTo(PUSH_DISTANCE, 0);
    expect(summon.curr.x).toBeCloseTo(summonStart.x, 0);
    expect(summon.resources.health).toBeLessThan(1000);
    expect(knockbackRowOf(ally)).toBeUndefined();
    expect(ally.resources.health).toBe(1000);
    expect(ally.curr.x).toBe(allyStart.x);
    expect(ally.curr.y).toBe(allyStart.y);
  });

  it("stops a unit it pushes at a wall's edge, with the rest of the push spent against it", () => {
    const { world, hero, slammer } = arrange(NEAR_X, walled());

    slam(world, slammer);
    settle(world, [hero]);

    expect(hero.curr.x - hero.collisionRadius).toBeGreaterThanOrEqual(
      WALL_X - 1e-6,
    );
    expect(hero.curr.x - hero.collisionRadius).toBeLessThan(WALL_X + 1);
  });

  it("is cancelled at no cost by a stun during its cast point: nobody is hit or pushed and the clock does not start", () => {
    const { world, hero, slammer, slammerId } = arrange(NEAR_X);

    tickUntil(world, inCastPoint(slammer), PATIENCE);
    applyStatus(world.state, slammerId, "stun", STUN_TICKS, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(heroHealth(world)).toBe(hero.stats.maxHealth);
    expect(knockbackRowOf(hero)).toBeUndefined();
    expect(
      remainingCooldownTicks(slammer.cooldowns, slamDef.id, world.state.tick),
    ).toBe(0);
  });
});
