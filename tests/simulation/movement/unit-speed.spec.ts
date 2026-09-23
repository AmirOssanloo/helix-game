import { describe, expect, it } from "vitest";
import {
  contentRegistry,
  fastRunnerDef,
  meleeGruntDef,
  tankDef,
  tuningTable,
} from "@content/public";
import type { EnemyDef, Unit } from "@domain/public";
import { addModifier } from "@domain/public";
import type { Vec2 } from "@shared/public";
import { distanceSquared, shortestArc } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
} from "../../helpers";

/** The spec publishes a turn rate in radians per this many seconds. */
const TURN_STEP_SECONDS = 0.03;

/** Long enough for any unit here to notice the hero, turn, and walk for a while. */
const PATIENCE = 300;

const distance = (a: Readonly<Vec2>, b: Readonly<Vec2>): number =>
  Math.sqrt(distanceSquared(a, b));

/** How far a unit walking at `perSecond` moves in one tick. */
const stepOf = (perSecond: number): number => perSecond / tuningTable.sim_hz;

/** How far a unit turning at `perTurnStep`, as the spec publishes it, turns in one tick at the full rate. */
const turnOf = (perTurnStep: number): number =>
  perTurnStep / (TURN_STEP_SECONDS * tuningTable.sim_hz);

/** A slow archetype below the speed clamp's floor, and one to carry a slow, both closing to contact. */
const crawlerDef = makeEnemyDef.build({
  id: "crawler",
  movementSpeed: 50,
  behaviour: "melee_chaser",
});
const slowedDef = makeEnemyDef.build({
  id: "slowed",
  movementSpeed: 300,
  behaviour: "melee_chaser",
});

/** The content registry with the two test archetypes beside it, and no wander, so an enemy at rest stands still. */
const makeArena = (tuning: Readonly<Record<string, number>> = {}): Simulation =>
  makeWorld({
    seed: 1,
    registry: makeRegistry({
      tuning: { wander_radius: 0, ...tuning },
      enemies: [...contentRegistry.enemies, crawlerDef, slowedDef],
    }),
  });

const moveHeroTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

/** The longest single-tick step `unit` takes over `ticks` ticks, which is its speed once it walks unhindered. */
const longestStep = (world: Simulation, unit: Unit, ticks: number): number => {
  let longest = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const x = unit.curr.x;
    const y = unit.curr.y;

    world.tick();
    longest = Math.max(longest, distance({ x, y }, unit.curr));
  }

  return longest;
};

/** The largest single-tick turn `unit` makes over `ticks` ticks, which is its full turn rate once the ramp is past. */
const largestTurn = (world: Simulation, unit: Unit, ticks: number): number => {
  let largest = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const before = unit.facing;

    world.tick();
    largest = Math.max(largest, Math.abs(shortestArc(before, unit.facing)));
  }

  return largest;
};

/** The first tick on which `unit` begins an attack point, or `null` if it has not by the end of `ticks`. */
const firstSwingTick = (
  world: Simulation,
  units: readonly Unit[],
  ticks: number,
): (number | null)[] => {
  const swungAt: (number | null)[] = units.map(() => null);

  for (let tick = 0; tick < ticks; tick += 1) {
    world.tick();

    for (let index = 0; index < units.length; index += 1) {
      if (swungAt[index] === null && units[index]?.state === "attack_windup") {
        swungAt[index] = world.view.tick;
      }
    }
  }

  return swungAt;
};

/** One enemy of `def` chasing the hero from 400 units down the room, both standing still until then. */
const chaseFrom = (def: EnemyDef): { world: Simulation; enemy: Unit } => {
  const world = makeArena();

  spawnHero(world);

  return {
    world,
    enemy: spawnEnemy(world, { definitionId: def.id, x: -400, y: 0 }),
  };
};

describe("an enemy walks at its definition's speed", () => {
  it.each([
    ["grunt", meleeGruntDef],
    ["runner", fastRunnerDef],
    ["tank", tankDef],
  ])("the %s chases at its own speed, not the hero's", (_, def) => {
    const { world, enemy } = chaseFrom(def);

    expect(longestStep(world, enemy, 20)).toBeCloseTo(
      stepOf(def.movementSpeed),
    );
  });

  it("holds a definition's speed inside the clamp, as it holds the hero's", () => {
    const { world, enemy } = chaseFrom(crawlerDef);

    expect(longestStep(world, enemy, 20)).toBeCloseTo(
      stepOf(tuningTable.ms_min),
    );
  });

  it("applies a modifier over a definition's speed, as over the hero's", () => {
    const { world, enemy } = chaseFrom(slowedDef);

    // An item row, since the status system rewrites its own rows from the status table every tick.
    addModifier(enemy.modifiers, "item", "movement_speed", 0, -0.5);

    expect(longestStep(world, enemy, 20)).toBeCloseTo(stepOf(150));
  });

  it("walks at its own speed when the tuning table's base speed changes", () => {
    const { world, enemy } = chaseFrom(meleeGruntDef);

    submit(world, {
      kind: "set_tuning",
      tick: world.view.tick,
      timestamp: world.view.tick,
      key: "base_ms",
      value: 400,
    });

    expect(longestStep(world, enemy, 20)).toBeCloseTo(
      stepOf(meleeGruntDef.movementSpeed),
    );
  });
});

describe("an enemy turns at its definition's rate", () => {
  it.each([
    ["grunt", meleeGruntDef],
    ["runner", fastRunnerDef],
    ["tank", tankDef],
  ])("the %s turns about to chase at its own rate", (_, def) => {
    const { world, enemy } = chaseFrom(def);

    enemy.facing = Math.PI;

    expect(largestTurn(world, enemy, 10)).toBeCloseTo(turnOf(def.turnRate));
  });

  it("turns to face the hero in reach at its own rate", () => {
    const world = makeArena();

    spawnHero(world);

    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: 140,
      y: 0,
    });

    expect(largestTurn(world, grunt, 10)).toBeCloseTo(
      turnOf(meleeGruntDef.turnRate),
    );
    expect(grunt.state).toBe("attack_windup");
  });
});

describe("the hero walks and turns at the tuning table's rates", () => {
  it("walks at the base speed", () => {
    const world = makeArena();
    const hero = spawnHero(world);

    moveHeroTo(world, 3000, 0);

    expect(longestStep(world, hero, 20)).toBeCloseTo(
      stepOf(tuningTable.base_ms),
    );
  });

  it("walks at a base speed a tuning command changes", () => {
    const world = makeArena();
    const hero = spawnHero(world);

    submit(world, {
      kind: "set_tuning",
      tick: world.view.tick,
      timestamp: world.view.tick,
      key: "base_ms",
      value: 400,
    });
    moveHeroTo(world, 3000, 0);

    expect(longestStep(world, hero, 20)).toBeCloseTo(stepOf(400));
  });

  it("turns at the tuning table's turn rate", () => {
    const world = makeArena();
    const hero = spawnHero(world, { facing: 0 });

    moveHeroTo(world, -1000, 10);

    expect(largestTurn(world, hero, 10)).toBeCloseTo(
      turnOf(tuningTable.turn_rate_T),
    );
  });
});

describe("a pack of different speeds", () => {
  it("brings the runner to the hero before the grunt from the same distance", () => {
    const world = makeArena();

    spawnHero(world);

    const runner = spawnEnemy(world, {
      definitionId: fastRunnerDef.id,
      x: -480,
      y: 360,
    });
    const grunt = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: -480,
      y: -360,
    });
    const [runnerAt, gruntAt] = firstSwingTick(
      world,
      [runner, grunt],
      PATIENCE,
    );

    expect(runnerAt).not.toBeNull();
    expect(gruntAt).not.toBeNull();
    expect(runnerAt ?? Infinity).toBeLessThan(gruntAt ?? -Infinity);
  });

  it.each([
    ["gains on a grunt by the difference in speed", meleeGruntDef],
    ["loses ground to a runner by the difference in speed", fastRunnerDef],
  ])("the hero walking away %s", (_, def) => {
    const world = makeArena();
    const hero = spawnHero(world, { facing: 0 });
    const enemy = spawnEnemy(world, { definitionId: def.id, x: -400, y: 0 });

    moveHeroTo(world, 6000, 0);

    for (let tick = 0; tick < 20; tick += 1) {
      world.tick();
    }

    const before = distance(hero.curr, enemy.curr);

    for (let tick = 0; tick < tuningTable.sim_hz; tick += 1) {
      world.tick();
    }

    const gained = distance(hero.curr, enemy.curr) - before;

    // One second of walking: the gap changes by the two speeds' difference, give or take the
    // few ticks a chase stands at a waypoint before its next path.
    expect(Math.sign(gained)).toBe(
      Math.sign(tuningTable.base_ms - def.movementSpeed),
    );
    expect(
      Math.abs(gained - (tuningTable.base_ms - def.movementSpeed)),
    ).toBeLessThan(15);
  });
});
