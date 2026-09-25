import { describe, expect, it } from "vitest";
import { arrowDef, tuningTable } from "@content/public";
import type { EnemyDef, Projectile, Unit } from "@domain/public";
import { applyStatus, mitigate, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  always,
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The arrow's cast point and its clock, in ticks. */
const CAST_POINT_TICKS = Math.round(
  arrowDef.castPointSeconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  arrowDef.cooldownSeconds[0] * tuningTable.sim_hz,
);

/** The physical damage the arrow carries, before armour. */
const ARROW_DAMAGE = arrowDef.effects[0].onHit[0].amount.byLevel[0];

/** How far the arrow flies in one tick, the most it can be from the archer on the tick it is loosed. */
const ARROW_STEP = arrowDef.effects[0].speed / tuningTable.sim_hz;

/** Where the archer stands: inside its aggro radius and the arrow's range, outside its melee reach. */
const ARCHER_X = 500;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/**
 * A chaser that looses the arrow and whose own swing reaches no farther than its body, so every
 * point of damage the hero takes at range is the arrow's.
 */
const ARCHER: EnemyDef = makeEnemyDef.build({
  id: "arrow_archer",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [always(arrowDef.id)],
  attack: makeAttackDef.build({
    range: 100,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  archer: Unit;
  archerId: EntityId;
}>;

/** A world with the archer beside the content's abilities, the hero at the origin, and one archer in range. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [ARCHER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const archer = spawnEnemy(world, {
    definitionId: ARCHER.id,
    x: ARCHER_X,
    y: 0,
  });

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    archer,
    archerId: unitIdOf(world, archer),
  };
};

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const projectilesIn = (world: Simulation): number =>
  world.state.map.projectiles.count;

/** The one projectile in flight, which the spec has just seen spawn. */
const liveProjectile = (world: Simulation): Projectile => {
  const projectiles = world.state.map.projectiles;

  for (let index = 0; index < projectiles.end; index += 1) {
    const projectile = projectiles.at(index);

    if (projectile !== null) {
      return projectile;
    }
  }

  throw new Error("A projectile is in flight");
};

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("the arrow", () => {
  it("is loosed at the hero from the caster once the cast point ends, and homes on it", () => {
    const { world, hero, heroId, archer, archerId } = arrange();

    tickUntil(world, inCastPoint(archer), PATIENCE);

    expect(archer.cast.abilityId).toBe(arrowDef.id);
    expect(archer.cast.targetId).toBe(heroId);
    expect(projectilesIn(world)).toBe(0);

    const waited = tickUntil(world, () => projectilesIn(world) === 1, PATIENCE);
    const arrow = liveProjectile(world);

    expect(waited).toBeGreaterThanOrEqual(CAST_POINT_TICKS - 1);
    expect(arrow.casterId).toBe(archerId);
    expect(arrow.targetId).toBe(heroId);
    expect(
      Math.hypot(arrow.curr.x - archer.curr.x, arrow.curr.y - archer.curr.y),
    ).toBeLessThanOrEqual(ARROW_STEP);
    expect(heroHealth(world)).toBe(hero.stats.maxHealth);
  });

  it("deals its physical damage, less the hero's armour, where it lands", () => {
    const { world, hero, archer } = arrange();

    tickUntil(world, inCastPoint(archer), PATIENCE);
    tickUntil(world, () => projectilesIn(world) === 1, PATIENCE);

    const before = heroHealth(world);

    tickUntil(world, () => projectilesIn(world) === 0, PATIENCE);

    expect(before - heroHealth(world)).toBeCloseTo(
      Math.min(
        before,
        mitigate(
          ARROW_DAMAGE,
          "physical",
          hero.stats,
          tuningTable.armour_constant,
        ),
      ),
      6,
    );
  });

  it("starts its clock at commit and is not loosed again until it runs out", () => {
    const { world, archer } = arrange();

    tickUntil(world, inCastPoint(archer), PATIENCE);
    tickUntil(world, () => projectilesIn(world) === 1, PATIENCE);

    expect(
      remainingCooldownTicks(archer.cooldowns, arrowDef.id, world.state.tick),
    ).toBeGreaterThan(COOLDOWN_TICKS - CAST_POINT_TICKS);

    tickUntil(world, () => projectilesIn(world) === 0, PATIENCE);
    tickTimes(world, COOLDOWN_TICKS / 2);

    expect(archer.state).not.toBe("ability_cast_point");
    expect(projectilesIn(world)).toBe(0);
  });

  it("is cancelled at no cost by a stun during its cast point: no arrow is loosed and the clock does not start", () => {
    const { world, hero, archer, archerId } = arrange();

    tickUntil(world, inCastPoint(archer), PATIENCE);
    applyStatus(world.state, archerId, "stun", STUN_TICKS, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(projectilesIn(world)).toBe(0);
    expect(heroHealth(world)).toBe(hero.stats.maxHealth);
    expect(
      remainingCooldownTicks(archer.cooldowns, arrowDef.id, world.state.tick),
    ).toBe(0);
  });
});
