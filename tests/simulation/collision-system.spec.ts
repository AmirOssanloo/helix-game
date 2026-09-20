import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import {
  acquireUnit,
  createCandidateBuffer,
  issueMove,
  setStraightPath,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../helpers";

const HULL = 27;

/** A wall standing across x 1000 to 1200. */
const WALL: Rect = { minX: 1000, minY: -1000, maxX: 1200, maxY: 1000 };

const spawnEnemy = (world: Simulation, x: number, y: number): Unit => {
  const id = acquireUnit(world.state, "enemy", x, y);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (unit === null) {
    throw new Error("The unit pool has room for an enemy");
  }

  return unit;
};

/** The ids the world's hash holds within `radius` of a point. */
const near = (
  world: Simulation,
  x: number,
  y: number,
  radius: number,
): EntityId[] => {
  const out = createCandidateBuffer(UNIT_CAPACITY);
  const count = world.view.map.spatialHash.queryCircle(x, y, radius, out);

  return out.slice(0, count);
};

describe("the collision system and obstacles", () => {
  it("stops a unit displaced into a wall at the wall edge", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({ obstacles: [WALL] }),
    });
    const hero = spawnHero(world, { x: 900, y: 0 });
    hero.curr.x = 1050;

    world.tick();

    expect(hero.curr).toEqual({ x: 1000 - HULL, y: 0 });
  });

  it("stops a unit walking a path into a wall at the wall edge, order and speed untouched", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({ obstacles: [WALL] }),
    });
    const hero = spawnHero(world, { x: 990, y: 0, facing: 0 });
    issueMove(hero, 1100, 0);
    setStraightPath(hero.path, 1100, 0);
    hero.needsPath = false;

    world.tick();

    expect(hero.curr).toEqual({ x: 1000 - HULL, y: 0 });
    expect(hero.state).toBe("moving");
    expect(hero.order.destination).toEqual({ x: 1100, y: 0 });
  });

  it("stops a unit displaced past the map bounds at the wall edge", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
        spawnPoint: { x: 500, y: 500 },
      }),
    });
    const hero = spawnHero(world, { x: 500, y: 500 });
    hero.curr.x = 1020;
    hero.curr.y = -10;

    world.tick();

    expect(hero.curr).toEqual({ x: 1000 - HULL, y: HULL });
  });

  it("pushes a unit standing on the spawn point of a loaded map out on the first tick", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { x: 0, y: 0 });
    world.loadMap(makeMapDef.build({ spawnPoint: { x: 500, y: 500 } }));
    const squatter = spawnEnemy(world, 500, 500);

    world.tick();

    expect(hero.spawnPoint).toEqual({ x: 500, y: 500 });
    expect(
      Math.hypot(squatter.curr.x - hero.curr.x, squatter.curr.y - hero.curr.y),
    ).toBeCloseTo(2 * HULL);
  });
});

describe("the collision system and the hash", () => {
  it("finds a pushed unit in the cell it was pushed into and not the one it left", () => {
    const world = makeWorld({ seed: 1 });
    const pushed = spawnEnemy(world, 135, 0);
    const pushedId = world.view.map.units.idAt(0);
    spawnEnemy(world, 140, 0);

    world.tick();

    expect(pushed.curr.x).toBeCloseTo(110.5);
    expect(near(world, pushed.curr.x, 0, 1)).toEqual([pushedId]);
    expect(near(world, 200, 0, 1)).toEqual([world.view.map.units.idAt(1)]);
  });
});

describe("the push-out passes tunable", () => {
  /** Three discs in a row, each overlapping the next: one pass leaves the first pair overlapping. */
  const rowOfThree = (passes: number): Simulation => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({ tuning: { push_out_passes: passes } }),
    });
    spawnEnemy(world, 0, 0);
    spawnEnemy(world, 30, 0);
    spawnEnemy(world, 60, 0);

    return world;
  };

  const xs = (world: Simulation): number[] =>
    [0, 1, 2].map(
      (index) => world.view.map.units.at(index)?.curr.x ?? Number.NaN,
    );

  it("runs one pass over every pair in id order when the tunable is one", () => {
    const world = rowOfThree(1);

    world.tick();

    expect(xs(world)).toEqual([-12, 24, 78]);
  });

  it("settles the row further with three passes than with one", () => {
    const onePass = rowOfThree(1);
    const threePasses = rowOfThree(3);

    onePass.tick();
    threePasses.tick();

    const [firstOfOne, secondOfOne] = xs(onePass);
    const [firstOfThree, secondOfThree] = xs(threePasses);

    expect((secondOfThree ?? 0) - (firstOfThree ?? 0)).toBeGreaterThan(
      (secondOfOne ?? 0) - (firstOfOne ?? 0),
    );
  });

  it("changes the passes on the tick that consumes a tuning command", () => {
    const world = rowOfThree(3);
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "push_out_passes",
      value: 1,
    });

    world.tick();

    expect(xs(world)).toEqual([-12, 24, 78]);
  });
});
