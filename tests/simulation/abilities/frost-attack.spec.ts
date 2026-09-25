import { describe, expect, it } from "vitest";
import { frostAttackDef, statuses, tuningTable } from "@content/public";
import type { EnemyDef, Unit } from "@domain/public";
import { applyDamage, STATUS_NEVER_ENDS } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
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

/** How long the frost attack slows the unit hit, and how long before it may slow again, in ticks. */
const SLOW_TICKS = Math.round(
  frostAttackDef.onDamageDealt.effects[0].seconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  frostAttackDef.onDamageDealt.cooldownSeconds.byLevel[0] * tuningTable.sim_hz,
);

/** The fraction the generic slow takes off the speed, read at the level an archetype applies it at. */
const SLOW_FRACTION =
  statuses.find((status) => status.id === "slow")?.modifiers[0]?.amount
    .byLevel[0] ?? 0;

/** The hero's walking step with nothing on it, in world units per tick. */
const BASE_STEP = tuningTable.base_ms / tuningTable.sim_hz;

/** Where a froster stands: inside its aggro radius of the hero at the origin, outside its reach. */
const FROSTER_X = 300;

/** Where a froster that never moves stands: behind the hero, out of the way of its walk. */
const BEHIND_X = -300;

/** A hit the spec lands by hand, small against the hero's health. */
const HIT = 1;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** A melee chaser that carries the frost attack. */
const FROSTER: EnemyDef = makeEnemyDef.build({
  id: "froster",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 700,
  leashRadius: 2000,
  statuses: [frostAttackDef.id],
  attack: makeAttackDef.build({
    range: 100,
    acquireRadius: 700,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

/** A froster that stands and never swings, for hits the spec lands by hand. */
const STILL_FROSTER: EnemyDef = makeEnemyDef.build({
  id: "still_froster",
  health: 5000,
  statuses: [frostAttackDef.id],
});

type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: EntityId }>;

/** A world holding the two archetypes, with the hero at the origin facing +X and nothing else. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [FROSTER, STILL_FROSTER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);

  return { world, hero, heroId: unitIdOf(world, hero) };
};

/** Spawns one froster at (`x`, 0) through the panel's pack command, as a person would, and returns it. */
const spawnPackOf = (world: Simulation, def: EnemyDef, x: number): Unit => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId: def.id,
    tier: "normal",
    count: 1,
    position: { x, y: 0 },
  });
  world.tick();

  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== undefined && unit !== null && unit.definitionId === def.id) {
      return unit;
    }
  }

  throw new Error(`The pack command spawned a ${def.id}`);
};

/** A froster that never swings, behind the hero, and its id. */
const stillFroster = (world: Simulation): EntityId =>
  unitIdOf(
    world,
    spawnEnemy(world, { definitionId: STILL_FROSTER.id, x: BEHIND_X, y: 0 }),
  );

const slowRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "slow");

/** How far the hero walks in one tick along +X, which it already faces, once it is under way. */
const stepOf = (world: Simulation, hero: Unit): number => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x: 5000, y: 0 },
  });
  world.tick();
  world.tick();

  const before = hero.curr.x;

  world.tick();

  return hero.curr.x - before;
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("the frost attack", () => {
  it("is on the archetype that carries it from the tick it spawns, applied by itself, and never ends", () => {
    const { world } = arrange();
    const froster = spawnPackOf(world, FROSTER, FROSTER_X);
    const row = froster.statuses.find(
      (entry) => entry.definitionId === frostAttackDef.id,
    );

    expect(row?.sourceId).toBe(unitIdOf(world, froster));
    expect(row?.endsAtTick).toBe(STATUS_NEVER_ENDS);
  });

  it("slows the hero on the froster's swing, from the froster, and the HUD greys nothing", () => {
    const { world, hero } = arrange();
    const froster = spawnPackOf(world, FROSTER, FROSTER_X);

    tickUntil(world, () => slowRowOf(hero) !== undefined, PATIENCE);

    expect(slowRowOf(hero)?.sourceId).toBe(unitIdOf(world, froster));
    // The swing landed inside the tick just stepped, one behind the count the world now reads.
    expect(slowRowOf(hero)?.endsAtTick).toBe(world.state.tick - 1 + SLOW_TICKS);

    world.tick();

    expect(greyedSlots(world, hero)).toEqual([]);
  });

  it("takes the slow's fraction off the hero's walk while it lasts", () => {
    const { world, hero, heroId } = arrange();

    expect(SLOW_FRACTION).toBeLessThan(0);

    applyDamage(world.state, heroId, HIT, "pure", stillFroster(world));

    expect(stepOf(world, hero)).toBeCloseTo(BASE_STEP * (1 + SLOW_FRACTION));
  });

  it("holds its internal cooldown: a hit inside it leaves the slow's end where it was, and the first after it moves it", () => {
    const { world, hero, heroId } = arrange();
    const frosterId = stillFroster(world);

    applyDamage(world.state, heroId, HIT, "pure", frosterId);

    const firstEnd = slowRowOf(hero)?.endsAtTick;

    tickTimes(world, COOLDOWN_TICKS - 1);
    applyDamage(world.state, heroId, HIT, "pure", frosterId);

    expect(slowRowOf(hero)?.endsAtTick).toBe(firstEnd);

    world.tick();
    applyDamage(world.state, heroId, HIT, "pure", frosterId);

    expect(slowRowOf(hero)?.endsAtTick).toBe(world.state.tick + SLOW_TICKS);
    expect(slowRowOf(hero)?.endsAtTick).toBeGreaterThan(firstEnd ?? 0);
  });
});
