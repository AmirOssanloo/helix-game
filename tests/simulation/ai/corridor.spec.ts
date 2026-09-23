import { describe, expect, it } from "vitest";
import { arenaDef, fastRunnerDef, meleeGruntDef } from "@content/public";
import type { Unit } from "@domain/public";
import { applyDamage } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  unitIdOf,
} from "../../helpers";

/** The pack: ten grunts, each the hero's size, so the corridor takes one at a time. */
const PACK_SIZE = 10;
const RADIUS = meleeGruntDef.body.collisionRadius;

/** The corridor between the arena's two east blocks: where it runs, west to east. */
const CORRIDOR_WEST = 2560;
const CORRIDOR_EAST = 3200;

/** Where the pack stands, east of the corridor, and where the hero waits, west of it. */
const PACK_AT = { x: 3360, y: 2000 };
const HERO_AT = { x: 2300, y: 2000 };

/** The arrival epsilon: how much two pushed discs may still overlap after the capped passes. */
const EPSILON = 2;

/** Long enough for the last of the pack to come through. */
const PATIENCE = 400;

/** Where the hero draws a mixed pack through the corridor, and where it then runs to, past every leash. */
const LURE_AT = { x: 1200, y: 2000 };
const FAR_AWAY = { x: 300, y: 3800 };

/** Ticks the hero lures before it runs, and how long the pack is given to get home. */
const LURE_TICKS = 65;
const HOMECOMING = 1200;

type Arranged = Readonly<{ world: Simulation; grunts: readonly Unit[] }>;

/** The hero west of the corridor and a pack of grunts east of it, every grunt already chasing. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1, registry: makeRegistry(), map: arenaDef });
  const hero = spawnHero(world, HERO_AT);

  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId: meleeGruntDef.id,
    tier: "normal",
    count: PACK_SIZE,
    position: PACK_AT,
  });
  world.tick();

  const grunts: Unit[] = [];
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === meleeGruntDef.id) {
      grunts.push(unit);
    }
  }

  const first = grunts[0];

  if (first === undefined) {
    throw new Error("The pack spawned");
  }

  applyDamage(
    world.state,
    unitIdOf(world, first),
    1,
    "pure",
    unitIdOf(world, hero),
  );

  return { world, grunts };
};

/** Whether the unit's whole disc is between the corridor's two walls, where no one can pass it. */
const isInside = (unit: Readonly<Unit>): boolean =>
  unit.curr.x > CORRIDOR_WEST + RADIUS && unit.curr.x < CORRIDOR_EAST - RADIUS;

/** Every pair of the pack both inside the corridor, by index into the pack. */
const pairsInside = (grunts: readonly Unit[]): [number, number][] => {
  const pairs: [number, number][] = [];

  for (let a = 0; a < grunts.length; a += 1) {
    for (let b = a + 1; b < grunts.length; b += 1) {
      const first = grunts[a];
      const second = grunts[b];

      if (
        first !== undefined &&
        second !== undefined &&
        isInside(first) &&
        isInside(second)
      ) {
        pairs.push([a, b]);
      }
    }
  }

  return pairs;
};

describe("a pack of grunts in the corridor", () => {
  it("keeps its order inside: no grunt walks past another", () => {
    const { world, grunts } = arrange();
    let passes = 0;

    for (let tick = 0; tick < PATIENCE; tick += 1) {
      const before = grunts.map((grunt) => grunt.curr.x);

      world.tick();

      for (const [a, b] of pairsInside(grunts)) {
        const wasAhead = (before[a] ?? 0) < (before[b] ?? 0);
        const isAhead = (grunts[a]?.curr.x ?? 0) < (grunts[b]?.curr.x ?? 0);

        if (wasAhead !== isAhead) {
          passes += 1;
        }
      }
    }

    expect(passes).toBe(0);
  });

  it("never lets two grunts inside overlap", () => {
    const { world, grunts } = arrange();
    let closest = Infinity;

    for (let tick = 0; tick < PATIENCE; tick += 1) {
      world.tick();

      for (const [a, b] of pairsInside(grunts)) {
        const first = grunts[a];
        const second = grunts[b];

        if (first !== undefined && second !== undefined) {
          closest = Math.min(
            closest,
            Math.hypot(
              first.curr.x - second.curr.x,
              first.curr.y - second.curr.y,
            ),
          );
        }
      }
    }

    expect(closest).toBeGreaterThanOrEqual(RADIUS + RADIUS - EPSILON);
  });

  it("brings every grunt through to attack the hero", () => {
    const { world, grunts } = arrange();

    for (let tick = 0; tick < PATIENCE; tick += 1) {
      world.tick();
    }

    expect(grunts.map((grunt) => grunt.ai.state)).toEqual(
      grunts.map(() => "attack"),
    );
  });

  it("brings a mixed pack back home through the corridor after it leashes", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry(),
      map: arenaDef,
    });
    const hero = spawnHero(world, HERO_AT);
    const heroId = unitIdOf(world, hero);
    const packs = [
      {
        archetypeId: meleeGruntDef.id,
        count: 5,
        position: { x: 3450, y: 2150 },
      },
      {
        archetypeId: fastRunnerDef.id,
        count: 3,
        position: { x: 3450, y: 1850 },
      },
    ];

    for (const pack of packs) {
      submit(world, {
        kind: "spawn_pack",
        tick: world.view.tick,
        timestamp: world.view.tick,
        tier: "normal",
        ...pack,
      });
      world.tick();
    }

    const enemies: Unit[] = [];
    const units = world.state.map.units;

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);

      if (unit !== null && unit.kind === "enemy") {
        enemies.push(unit);
      }
    }

    for (const pack of packs) {
      const first = enemies.find(
        (enemy) => enemy.definitionId === pack.archetypeId,
      );

      if (first === undefined) {
        throw new Error("The pack spawned");
      }

      applyDamage(world.state, unitIdOf(world, first), 1, "pure", heroId);
    }

    const walkHero = (
      destination: Readonly<{ x: number; y: number }>,
    ): void => {
      submit(world, {
        kind: "move",
        tick: world.view.tick,
        timestamp: world.view.tick,
        destination,
      });
    };

    walkHero(LURE_AT);

    for (let tick = 0; tick < LURE_TICKS; tick += 1) {
      world.tick();
    }

    walkHero(FAR_AWAY);

    for (let tick = 0; tick < HOMECOMING; tick += 1) {
      world.tick();
    }

    expect(enemies.map((enemy) => enemy.ai.state)).toEqual(
      enemies.map(() => "idle"),
    );
  });
});
