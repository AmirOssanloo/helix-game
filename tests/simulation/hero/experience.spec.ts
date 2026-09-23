import { describe, expect, it } from "vitest";
import {
  heroDef,
  meleeGruntDef,
  skeinDef,
  enemies,
  summons,
  trainingDummyDef,
  tuningTable,
} from "@content/public";
import type { DebugCommand, Unit } from "@domain/public";
import {
  acquireUnit,
  applyDamage,
  experienceProgress,
  fillFromDefinition,
  wearDefinition,
} from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The corpse delay in ticks under the content table's defaults. */
const CORPSE_TICKS = tuningTable.corpse_delay * tuningTable.sim_hz;

/** Far enough from the hero that nothing spawned there aggroes on its own. */
const FAR = 5000;

/** A stationary archetype worth enough that a few rows take the hero from 1 to the cap. */
const TROVE = makeEnemyDef.build({ id: "trove", experience: 2000 });

/** How many troves a round of the climb kills at once. */
const ROW = 8;

/** Long enough for any walk or shot below. */
const PATIENCE = 1500;

type Arranged = Readonly<{ world: Simulation; hero: Unit }>;

/** The content registry on an open map with the hero at the origin, and no wander to move anyone off their marks. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      tuning: { wander_radius: 0 },
      enemies: [...enemies, TROVE],
    }),
  });

  return { world, hero: spawnHero(world) };
};

/** A payload-free debug command, consumed by one tick. */
const run = (world: Simulation, kind: "kill_all" | "clear_all"): void => {
  submit(world, {
    kind,
    tick: world.view.tick,
    timestamp: world.view.tick,
  } as DebugCommand);
  world.tick();
};

/** `count` enemies of `definitionId` in a row far from the hero, each alone. */
const spawnRow = (
  world: Simulation,
  definitionId: string,
  count: number,
): Unit[] => {
  const row: Unit[] = [];

  for (let index = 0; index < count; index += 1) {
    row.push(spawnEnemy(world, { definitionId, x: FAR, y: index * 120 - 600 }));
  }

  return row;
};

/** Kills `count` enemies of `definitionId` with the panel's kill all, and waits out the corpses. */
const killRow = (
  world: Simulation,
  definitionId: string,
  count: number,
): void => {
  spawnRow(world, definitionId, count);
  run(world, "kill_all");

  for (let tick = 0; tick < CORPSE_TICKS; tick += 1) {
    world.tick();
  }
};

/** A pure hit from `source` big enough to empty `target`. */
const lethal = (world: Simulation, target: Unit, source: Unit): void => {
  applyDamage(
    world.state,
    unitIdOf(world, target),
    target.stats.maxHealth * 10,
    "pure",
    unitIdOf(world, source),
  );
};

/** The first summon content defines, owned by the hero and standing beside it. */
const spawnSummon = (world: Simulation, hero: Unit): Unit => {
  const def = summons[0];
  const record =
    def === undefined ? undefined : world.state.run.units.get(def.id);
  const id = acquireUnit(world.state, "summon", 80, 0);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (record === undefined || unit === null) {
    throw new Error("The registry holds a summon and the pool has room");
  }

  wearDefinition(unit, record);
  fillFromDefinition(unit, record);
  unit.ownerId = unitIdOf(world, hero);

  return unit;
};

/** The total experience the level table says `level` has reached. */
const thresholdOf = (level: number): number => {
  const threshold = heroDef.experienceThresholds[level - 1];

  if (threshold === undefined) {
    throw new Error(`The level table reaches level ${level}`);
  }

  return threshold;
};

describe("the hero's experience", () => {
  it("reaches level 2 from five grunts killed at level 1, with a skill point and the level's attributes", () => {
    const { world, hero } = arrange();

    killRow(world, meleeGruntDef.id, 5);

    expect(hero.progression.experience).toBe(5 * meleeGruntDef.experience);
    expect(hero.progression.level).toBe(2);
    expect(hero.progression.skillPoints).toBe(
      heroDef.startingSkillPoints + heroDef.skillPointsPerLevel,
    );
    expect(hero.attributes.strength).toBeCloseTo(
      skeinDef.attributes.strength + skeinDef.attributeGains.strength,
    );
  });

  it("does not reach level 2 from four", () => {
    const { world, hero } = arrange();

    killRow(world, meleeGruntDef.id, 4);

    expect(hero.progression.level).toBe(1);
  });

  it("climbs from 1 to 30 on kills, one skill point a level", () => {
    const { world, hero } = arrange();

    while (hero.progression.level < heroDef.maxLevel) {
      killRow(world, TROVE.id, ROW);
    }

    expect(hero.progression.level).toBe(heroDef.maxLevel);
    expect(hero.progression.skillPoints).toBe(
      heroDef.startingSkillPoints +
        (heroDef.maxLevel - 1) * heroDef.skillPointsPerLevel,
    );
  });

  it("stays at 30 with a full bar when more experience comes", () => {
    const { world, hero } = arrange();

    while (hero.progression.level < heroDef.maxLevel) {
      killRow(world, TROVE.id, ROW);
    }

    const points = hero.progression.skillPoints;

    killRow(world, TROVE.id, ROW);

    expect(hero.progression.level).toBe(heroDef.maxLevel);
    expect(hero.progression.experience).toBe(thresholdOf(heroDef.maxLevel));
    expect(hero.progression.skillPoints).toBe(points);
    expect(experienceProgress(hero.progression, heroDef)).toBe(1);
  });

  it("is paid for a summon's kill", () => {
    const { world, hero } = arrange();
    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: FAR,
      y: 0,
    });
    const summon = spawnSummon(world, hero);

    lethal(world, grunt, summon);
    world.tick();

    expect(grunt.state).toBe("dead");
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });

  it("is paid for a kill with no source", () => {
    const { world, hero } = arrange();
    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: FAR,
      y: 0,
    });

    applyDamage(
      world.state,
      unitIdOf(world, grunt),
      grunt.stats.maxHealth * 10,
      "pure",
      null,
    );
    world.tick();

    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });

  it("is paid once per enemy, not again while the corpse lies or when it is released", () => {
    const { world, hero } = arrange();

    spawnRow(world, meleeGruntDef.id, 1);
    run(world, "kill_all");

    const paid = hero.progression.experience;

    for (let tick = 0; tick < CORPSE_TICKS + 5; tick += 1) {
      world.tick();
    }

    expect(paid).toBe(meleeGruntDef.experience);
    expect(hero.progression.experience).toBe(paid);
  });

  it("is paid by kill all and not by clear all", () => {
    const { world, hero } = arrange();

    spawnRow(world, meleeGruntDef.id, 3);
    run(world, "clear_all");

    expect(hero.progression.experience).toBe(0);

    spawnRow(world, meleeGruntDef.id, 3);
    run(world, "kill_all");

    expect(hero.progression.experience).toBe(3 * meleeGruntDef.experience);
  });

  it("is not paid by the training dummy", () => {
    const { world, hero } = arrange();

    spawnRow(world, trainingDummyDef.id, 2);
    run(world, "kill_all");

    expect(hero.progression.experience).toBe(0);
  });

  it("is paid for an enemy killed while it returns", () => {
    const { world, hero } = arrange();
    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: meleeGruntDef.aggroRadius - 50,
      y: 0,
    });

    world.tick();
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: -3 * meleeGruntDef.leashRadius, y: 0 },
    });
    tickUntil(world, () => grunt.ai.state === "return", PATIENCE);
    lethal(world, grunt, hero);
    world.tick();

    expect(grunt.state).toBe("dead");
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });

  it("is paid for a kill by the hero's shot that lands after the hero died", () => {
    const { world, hero } = arrange();
    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: heroDef.attack.range - 50,
      y: 0,
    });

    grunt.resources.health = 1;
    submit(world, {
      kind: "attack_target",
      tick: world.view.tick,
      timestamp: world.view.tick,
      targetId: unitIdOf(world, grunt),
    });
    tickUntil(world, () => world.view.map.projectiles.count > 0, PATIENCE);
    lethal(world, hero, grunt);
    world.tick();

    expect(hero.state).toBe("dead");
    expect(grunt.state).not.toBe("dead");

    tickUntil(world, () => grunt.state === "dead", PATIENCE);

    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });
});
