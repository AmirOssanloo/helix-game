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
import type { DebugCommand, DomainEvent, Unit } from "@domain/public";
import {
  acquireUnit,
  applyDamage,
  experienceProgress,
  fillFromDefinition,
  grantExperience,
  wearDefinition,
} from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
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

/** The slot keys Quartz and Whorl sit on. */
const Q = 1;
const W = 2;

/** The respawn delay in ticks under the content table's defaults. */
const RESPAWN_TICKS = tuningTable.respawn_delay * tuningTable.sim_hz;

/**
 * The total experience each level from 1 to 30 has reached, written out rather than read from
 * content, so a retune of the table is a change a spec sees.
 */
const LEVEL_CURVE: readonly number[] = [
  0, 230, 600, 1080, 1660, 2260, 2980, 3730, 4620, 5550, 6520, 7530, 8580, 9805,
  11055, 12330, 13630, 14955, 16455, 18045, 19645, 21495, 23595, 25945, 28545,
  32045, 36545, 42045, 48545, 56045,
];

/** The level the curve stops at. */
const CAP = 30;

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
const run = (
  world: Simulation,
  kind: "kill_all" | "clear_all" | "level_up" | "kill_hero",
): void => {
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
  fillFromDefinition(unit, record, 1);
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

/** Spends a skill point on the orb `slot` holds, as the HUD's click does, and runs the tick. */
const spend = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "spend_skill_point",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
  world.tick();
};

/** The panel's Set orb levels, and the tick that consumes it. */
const setOrbLevels = (world: Simulation, levels: readonly number[]): void => {
  submit(world, {
    kind: "set_orb_levels",
    tick: world.view.tick,
    timestamp: world.view.tick,
    levels,
  } as DebugCommand);
  world.tick();
};

/** The active form's orb levels, Q, W, E in order. */
const orbLevelsOf = (world: Simulation): number[] => {
  const record = world.view.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  return [...record.kit.orbLevels];
};

/** The reason of every refusal the reader has not seen, advancing it past everything. */
const refusals = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];
  let event: DomainEvent | null = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push(String(event.reason));
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Levels the hero to the cap with the panel's Level up, one level a tick. */
const levelToCap = (world: Simulation, hero: Unit): void => {
  while (hero.progression.level < heroDef.maxLevel) {
    run(world, "level_up");
  }
};

describe("the level curve", () => {
  it("is the source game's table, 1 to 30, threshold for threshold", () => {
    expect(heroDef.maxLevel).toBe(CAP);
    expect(heroDef.experienceThresholds).toEqual(LEVEL_CURVE);
  });

  it("walks 1 to 30: one short of each threshold holds the level below, the threshold reaches it, with its skill point and its attributes", () => {
    const { world, hero } = arrange();

    for (let level = 2; level <= CAP; level += 1) {
      const threshold = LEVEL_CURVE[level - 1] ?? 0;

      grantExperience(
        hero.progression,
        threshold - 1 - hero.progression.experience,
        world.state.run.hero,
      );

      expect(hero.progression.level).toBe(level - 1);

      grantExperience(hero.progression, 1, world.state.run.hero);
      world.tick();

      expect(hero.progression.level).toBe(level);
      expect(hero.progression.experience).toBe(threshold);
      expect(hero.progression.skillPoints).toBe(
        heroDef.startingSkillPoints + (level - 1) * heroDef.skillPointsPerLevel,
      );
      expect(hero.attributes.strength).toBeCloseTo(
        skeinDef.attributes.strength +
          (level - 1) * skeinDef.attributeGains.strength,
      );
    }
  });

  it("is climbed one level a press by the panel's Level up, each landing on its threshold", () => {
    const { world, hero } = arrange();

    for (let level = 2; level <= CAP; level += 1) {
      run(world, "level_up");

      expect(hero.progression.level).toBe(level);
      expect(hero.progression.experience).toBe(LEVEL_CURVE[level - 1]);
    }
  });
});

describe("a skill point", () => {
  it("granted by the panel's Level up is spent on the orb the slot holds, as the HUD's click spends it", () => {
    const { world, hero } = arrange();

    hero.progression.skillPoints = 0;
    run(world, "level_up");

    expect(hero.progression.skillPoints).toBe(heroDef.skillPointsPerLevel);

    spend(world, W);

    expect(orbLevelsOf(world)).toEqual([0, 1, 0]);
    expect(hero.progression.skillPoints).toBe(0);
  });

  it("is untouched by the panel's Set orb levels, which assigns levels without spending", () => {
    const { world, hero } = arrange();
    const points = hero.progression.skillPoints;

    setOrbLevels(world, [3, 2, 1]);

    expect(orbLevelsOf(world)).toEqual([3, 2, 1]);
    expect(hero.progression.skillPoints).toBe(points);

    spend(world, Q);

    expect(orbLevelsOf(world)).toEqual([4, 2, 1]);
  });

  it("Skill point unspent: kept until spent, across later levels, a death, and a respawn", () => {
    const { world, hero } = arrange();
    const start = heroDef.startingSkillPoints;

    run(world, "level_up");
    run(world, "level_up");

    expect(hero.progression.skillPoints).toBe(
      start + 2 * heroDef.skillPointsPerLevel,
    );

    run(world, "kill_hero");

    for (let tick = 0; tick < RESPAWN_TICKS + 1; tick += 1) {
      world.tick();
    }

    expect(hero.state).not.toBe("dead");
    expect(hero.progression.skillPoints).toBe(
      start + 2 * heroDef.skillPointsPerLevel,
    );

    spend(world, Q);

    expect(hero.progression.skillPoints).toBe(
      start + 2 * heroDef.skillPointsPerLevel - 1,
    );
  });
});

describe("the level cap", () => {
  it("refuses the panel's Level up at 30 and changes nothing", () => {
    const { world, hero } = arrange();
    const reader = createEventReader();

    levelToCap(world, hero);
    refusals(world, reader);

    const before = { ...hero.progression };

    run(world, "level_up");

    expect(hero.progression).toEqual(before);
    expect(refusals(world, reader)).toEqual(["at_level_cap"]);
  });

  it("keeps a point unspent at 30, and it still spends", () => {
    const { world, hero } = arrange();

    levelToCap(world, hero);

    const points = hero.progression.skillPoints;

    expect(points).toBe(
      heroDef.startingSkillPoints + (CAP - 1) * heroDef.skillPointsPerLevel,
    );

    killRow(world, TROVE.id, ROW);

    expect(hero.progression.skillPoints).toBe(points);

    spend(world, Q);

    expect(hero.progression.skillPoints).toBe(points - 1);
    expect(orbLevelsOf(world)[0]).toBe(1);
  });

  it("reached from one below by kills worth more than the gap, lands on the cap's threshold and not past it", () => {
    const { world, hero } = arrange();

    while (hero.progression.level < CAP - 1) {
      run(world, "level_up");
    }

    const points = hero.progression.skillPoints;

    killRow(world, TROVE.id, ROW);

    expect(hero.progression.level).toBe(CAP);
    expect(hero.progression.experience).toBe(LEVEL_CURVE[CAP - 1]);
    expect(hero.progression.skillPoints).toBe(
      points + heroDef.skillPointsPerLevel,
    );
  });
});

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

  it("Level cap reached: experience stops accumulating; the XP bar shows full and stops", () => {
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
