import { describe, expect, it } from "vitest";
import { rootNetDef, tuningTable } from "@content/public";
import type { EnemyDef, Projectile, Unit } from "@domain/public";
import { applyStatus, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  always,
  greyedSlots,
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The net's cast point and the root it applies, in ticks. */
const CAST_POINT_TICKS = Math.round(
  rootNetDef.castPointSeconds * tuningTable.sim_hz,
);
const ROOT_TICKS = Math.round(
  rootNetDef.effects[0].onHit[0].seconds * tuningTable.sim_hz,
);

/** How far the net flies in one tick, the most it can be from the netter on the tick it is thrown. */
const NET_STEP = rootNetDef.effects[0].speed / tuningTable.sim_hz;

/** Where the netter stands: inside its aggro radius and the net's range, outside its melee reach. */
const NETTER_X = 500;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** A melee chaser that throws the net. */
const NETTER: EnemyDef = makeEnemyDef.build({
  id: "netter",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [always(rootNetDef.id)],
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
  netter: Unit;
  netterId: EntityId;
}>;

/** A world with the netter beside the content's abilities, the hero at the origin, and one netter in range. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [NETTER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const netter = spawnEnemy(world, {
    definitionId: NETTER.id,
    x: NETTER_X,
    y: 0,
  });

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    netter,
    netterId: unitIdOf(world, netter),
  };
};

const rootRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "root");

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

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts the net and ticks until the root it carries has landed on the hero. */
const netTheHero = (world: Simulation, hero: Unit, netter: Unit): void => {
  tickUntil(world, inCastPoint(netter), PATIENCE);
  tickUntil(world, () => rootRowOf(hero) !== undefined, PATIENCE);
};

describe("the root net", () => {
  it("is thrown at the hero as a projectile once the cast point ends, and roots it where it lands", () => {
    const { world, hero, heroId, netter, netterId } = arrange();

    tickUntil(world, inCastPoint(netter), PATIENCE);

    expect(netter.cast.abilityId).toBe(rootNetDef.id);
    expect(netter.cast.targetId).toBe(heroId);
    expect(projectilesIn(world)).toBe(0);

    const waited = tickUntil(world, () => projectilesIn(world) === 1, PATIENCE);
    const net = liveProjectile(world);

    expect(waited).toBeGreaterThanOrEqual(CAST_POINT_TICKS - 1);
    expect(net.casterId).toBe(netterId);
    expect(
      Math.hypot(net.curr.x - netter.curr.x, net.curr.y - netter.curr.y),
    ).toBeLessThanOrEqual(NET_STEP);
    expect(rootRowOf(hero)).toBeUndefined();

    tickUntil(world, () => rootRowOf(hero) !== undefined, PATIENCE);

    expect(projectilesIn(world)).toBe(0);
    expect(rootRowOf(hero)?.sourceId).toBe(netterId);
    expect(rootRowOf(hero)?.endsAtTick).toBe(world.state.tick - 1 + ROOT_TICKS);
  });

  it("holds the hero where it stands while it lasts, and the HUD greys nothing", () => {
    const { world, hero, netter } = arrange();

    netTheHero(world, hero, netter);
    world.tick();

    expect(hero.disables.rooted).toBe(true);
    expect(greyedSlots(world, hero)).toEqual([]);

    const x = hero.curr.x;
    const y = hero.curr.y;

    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: -2000, y: 0 },
    });
    tickTimes(world, ROOT_TICKS / 2);

    expect(hero.curr.x).toBe(x);
    expect(hero.curr.y).toBe(y);
  });

  it("lets go once its duration runs out", () => {
    const { world, hero, netter } = arrange();

    netTheHero(world, hero, netter);
    tickTimes(world, ROOT_TICKS + 1);

    expect(rootRowOf(hero)).toBeUndefined();
    expect(hero.disables.rooted).toBe(false);
  });

  it("is cancelled at no cost by a stun during its cast point: no net is thrown and the clock does not start", () => {
    const { world, hero, netter, netterId } = arrange();

    tickUntil(world, inCastPoint(netter), PATIENCE);
    applyStatus(world.state, netterId, "stun", STUN_TICKS, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(projectilesIn(world)).toBe(0);
    expect(rootRowOf(hero)).toBeUndefined();
    expect(
      remainingCooldownTicks(netter.cooldowns, rootNetDef.id, world.state.tick),
    ).toBe(0);
  });
});
