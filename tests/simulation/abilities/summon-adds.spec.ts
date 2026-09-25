import { describe, expect, it } from "vitest";
import { impDef, summonAddsDef, tuningTable } from "@content/public";
import type { EnemyDef, Unit } from "@domain/public";
import {
  applyDamage,
  applyStatus,
  ENEMY_LIVE_CAP,
  isHostile,
  remainingCooldownTicks,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The summon's entry: how many adds it brings, how far in front of the caster, and for how long, in ticks. */
const ENTRY = summonAddsDef.effects[0];
const LIFETIME_TICKS = Math.round(
  ENTRY.lifetimeSeconds.byLevel[0] * tuningTable.sim_hz,
);

/** The summon's cast point and its clock, in ticks. */
const CAST_POINT_TICKS = Math.round(
  summonAddsDef.castPointSeconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  summonAddsDef.cooldownSeconds[0] * tuningTable.sim_hz,
);

/** The pack the summoner stands in. */
const PACK = 7;

/** Where the summoner stands: inside its aggro radius of the hero at the origin. */
const SUMMONER_X = 400;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** Long enough that the root holding the summoner outlasts every case. */
const ROOTED_TICKS = 100_000;

/** A summoner whose swing reaches nothing, so all it does is bring adds. */
const SUMMONER: EnemyDef = makeEnemyDef.build({
  id: "summoner",
  behaviour: "melee_chaser",
  health: 5000,
  experience: 40,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [{ id: summonAddsDef.id, condition: { kind: "always" } }],
  attack: makeAttackDef.build({
    range: 0,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

/** A body that holds a slot under the cap and does nothing else, far from the fight. */
const FILLER: EnemyDef = makeEnemyDef.build({
  id: "filler",
  behaviour: "stationary",
  aggroRadius: 0,
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  summoner: Unit;
  summonerId: EntityId;
}>;

/** A world with the summoner, the filler, and the imp; the hero at the origin; and one rooted summoner in its pack. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [SUMMONER, FILLER, impDef],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const summoner = spawnEnemy(world, {
    definitionId: SUMMONER.id,
    x: SUMMONER_X,
    y: 0,
    packId: PACK,
  });
  const summonerId = unitIdOf(world, summoner);

  applyStatus(world.state, summonerId, "root", ROOTED_TICKS, null, []);

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    summoner,
    summonerId,
  };
};

/** Fills the live cap from far away until `count` enemies hold a slot, the summoner and every add included. */
const fillTo = (world: Simulation, count: number): void => {
  const units = world.state.map.units;
  let live = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit?.kind === "enemy" && unit.definitionId !== null) {
      live += 1;
    }
  }

  for (let filler = 0; live + filler < count; filler += 1) {
    spawnEnemy(world, {
      definitionId: FILLER.id,
      x: -4000 + (filler % 20) * 100,
      y: 4000 - Math.floor(filler / 20) * 100,
    });
  }
};

/** Every imp in the world, in slot order. */
const impsOf = (world: Simulation): Unit[] => {
  const units = world.state.map.units;
  const imps: Unit[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === impDef.id) {
      imps.push(unit);
    }
  }

  return imps;
};

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const clockOf = (world: Simulation, summoner: Readonly<Unit>): number =>
  remainingCooldownTicks(
    summoner.cooldowns,
    summonAddsDef.id,
    world.state.tick,
  );

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Ticks through the summon's cast point to the tick after it commits, and returns the commit's tick. */
const summon = (world: Simulation, summoner: Unit): number => {
  tickUntil(world, inCastPoint(summoner), PATIENCE);
  tickUntil(world, () => summoner.state !== "ability_cast_point", PATIENCE);

  return world.state.tick - 1;
};

describe("the summoned adds", () => {
  it("are imps the caster owns, enemies in its pack, hostile to the hero, standing in front of it for the ability's lifetime", () => {
    const { world, hero, summoner, summonerId } = arrange();
    const committedAt = summon(world, summoner);
    const imps = impsOf(world);

    expect(imps).toHaveLength(ENTRY.count);

    for (const imp of imps) {
      expect(imp.kind).toBe("enemy");
      expect(isHostile(imp.kind, hero.kind)).toBe(true);
      expect(imp.ownerId).toBe(summonerId);
      expect(imp.packId).toBe(PACK);
      expect(imp.tier).toBe("normal");
      expect(imp.expiresAtTick).toBe(committedAt + LIFETIME_TICKS);
      expect(imp.stats.maxHealth).toBe(impDef.health);
      expect(Math.hypot(imp.curr.x - summoner.curr.x, imp.curr.y)).toBeLessThan(
        ENTRY.offset.forward + imp.collisionRadius * 2,
      );
    }

    expect(clockOf(world, summoner)).toBeGreaterThan(
      COOLDOWN_TICKS - CAST_POINT_TICKS,
    );
  });

  it("notice the hero their summoner is fighting and go after it", () => {
    const { world, summoner } = arrange();

    summon(world, summoner);
    world.tick();

    for (const imp of impsOf(world)) {
      expect(["chase", "attack"]).toContain(imp.ai.state);
    }
  });

  it("are refused at the live cap: nothing is cast, nothing spawns, and the clock does not start", () => {
    const { world, summoner } = arrange();

    fillTo(world, ENEMY_LIVE_CAP - ENTRY.count + 1);
    tickTimes(world, PATIENCE);

    expect(summoner.cast.abilityId).toBeNull();
    expect(impsOf(world)).toEqual([]);
    expect(clockOf(world, summoner)).toBe(0);
  });

  it("are brought when the cap has room for every one of them, up to the cap exactly", () => {
    const { world, summoner } = arrange();

    fillTo(world, ENEMY_LIVE_CAP - ENTRY.count);
    summon(world, summoner);

    expect(impsOf(world)).toHaveLength(ENTRY.count);
    expect(clockOf(world, summoner)).toBeGreaterThan(0);
  });

  it("are refused at the commit when the cap filled during the cast point: the cast is cancelled at no cost", () => {
    const { world, summoner } = arrange();

    tickUntil(world, inCastPoint(summoner), PATIENCE);
    fillTo(world, ENEMY_LIVE_CAP);
    tickTimes(world, CAST_POINT_TICKS + 1);

    expect(impsOf(world)).toEqual([]);
    expect(summoner.state).not.toBe("ability_backswing");
    expect(clockOf(world, summoner)).toBe(0);
  });

  it("leave on the tick their summoner dies, with no corpse and nothing granted for them", () => {
    const { world, hero, heroId, summoner, summonerId } = arrange();

    summon(world, summoner);

    const imps = impsOf(world);
    const before = hero.progression.experience;

    applyDamage(
      world.state,
      summonerId,
      summoner.resources.health * 10,
      "pure",
      heroId,
    );
    world.tick();

    expect(summoner.state).toBe("dead");
    expect(impsOf(world)).toEqual([]);
    expect(imps.every((imp) => imp.definitionId !== impDef.id)).toBe(true);
    expect(hero.progression.experience - before).toBe(SUMMONER.experience);
  });

  it("leave on the tick their lifetime runs out, their summoner still standing", () => {
    const { world, summoner } = arrange();
    const committedAt = summon(world, summoner);
    const firstPair = (): Unit[] =>
      impsOf(world).filter(
        (imp) => imp.expiresAtTick === committedAt + LIFETIME_TICKS,
      );

    tickUntil(
      world,
      () => world.state.tick === committedAt + LIFETIME_TICKS,
      LIFETIME_TICKS + PATIENCE,
    );

    expect(firstPair()).toHaveLength(ENTRY.count);

    world.tick();

    expect(summoner.state).not.toBe("dead");
    expect(firstPair()).toEqual([]);
  });

  it("grant nothing when the hero kills one", () => {
    const { world, hero, heroId, summoner } = arrange();

    summon(world, summoner);

    const [imp] = impsOf(world);
    const before = hero.progression.experience;

    if (imp === undefined) {
      throw new Error("The summon brought an imp");
    }

    applyDamage(
      world.state,
      unitIdOf(world, imp),
      imp.resources.health * 10,
      "pure",
      heroId,
    );
    world.tick();

    expect(imp.state).toBe("dead");
    expect(hero.progression.experience).toBe(before);
  });

  it("are cancelled at no cost by a stun during the cast point: nothing spawns and the clock does not start", () => {
    const { world, summoner, summonerId } = arrange();

    tickUntil(world, inCastPoint(summoner), PATIENCE);
    applyStatus(
      world.state,
      summonerId,
      "stun",
      CAST_POINT_TICKS + 5,
      null,
      [],
    );
    tickTimes(world, CAST_POINT_TICKS);

    expect(impsOf(world)).toEqual([]);
    expect(clockOf(world, summoner)).toBe(0);
  });
});
