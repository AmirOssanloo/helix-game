import { describe, expect, it } from "vitest";
import {
  acquireUnit,
  createCandidateBuffer,
  releaseUnit,
  UNIT_CAPACITY,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../helpers";

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

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

describe("acquireUnit", () => {
  it("stands the unit at the position, with its previous position and spawn point there, and indexes it", () => {
    const world = makeWorld({ seed: 1 });

    const id = acquireUnit(world.state, "enemy", 300, 400);
    const unit = id === null ? null : world.state.map.units.resolve(id);

    expect(unit?.kind).toBe("enemy");
    expect(unit?.curr).toEqual({ x: 300, y: 400 });
    expect(unit?.prev).toEqual({ x: 300, y: 400 });
    expect(unit?.spawnPoint).toEqual({ x: 300, y: 400 });
    expect(near(world, 300, 400, 1)).toEqual([id]);
  });

  it("returns null and indexes nothing when the pool is full", () => {
    const world = makeWorld({ seed: 1 });

    for (let index = 0; index < UNIT_CAPACITY; index += 1) {
      acquireUnit(world.state, "enemy", 0, 0);
    }

    expect(acquireUnit(world.state, "enemy", 5000, 5000)).toBeNull();
    expect(world.view.map.units.misses).toBe(1);
    expect(near(world, 5000, 5000, 1)).toEqual([]);
  });
});

describe("releaseUnit", () => {
  it("takes the unit out of the hash and frees its slot", () => {
    const world = makeWorld({ seed: 1 });
    const id = acquireUnit(world.state, "enemy", 300, 400);

    if (id === null) {
      throw new Error("A fresh world has room for a unit");
    }

    releaseUnit(world.state, id);

    expect(near(world, 300, 400, 1)).toEqual([]);
    expect(world.view.map.units.count).toBe(0);
    expect(world.view.map.spatialHash.count).toBe(0);
  });
});

describe("the movement system and the hash", () => {
  it("finds a hero that walked into another cell there and no longer where it started", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { facing: 0 });
    moveTo(world, 300, 0);

    tickUntil(
      world,
      (view) => {
        const hero = view.run.heroId;

        return hero !== null && view.map.units.resolve(hero)?.curr.x === 300;
      },
      60,
    );

    expect(near(world, 300, 0, 1)).toEqual([world.view.run.heroId]);
    expect(near(world, 0, 0, 1)).toEqual([]);
  });

  it("indexes a unit taken straight from the pool by the end of the next tick", () => {
    const world = makeWorld({ seed: 1 });
    const unit = world.state.map.units.acquire();

    if (unit === null) {
      throw new Error("A fresh world has room for a unit");
    }

    unit.curr.x = 700;
    unit.curr.y = 700;
    world.tick();

    expect(near(world, 700, 700, 1)).toEqual([world.view.map.units.idAt(0)]);
  });

  it("rebuilds the hash on the tick that consumes a change to the cell size", () => {
    const world = makeWorld({ seed: 1 });
    spawnHero(world, { x: 300, y: 300 });
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "hash_cell_size",
      value: 64,
    });

    world.tick();

    expect(world.view.map.spatialHash.cellSize).toBe(64);
    expect(near(world, 300, 300, 1)).toEqual([world.view.run.heroId]);
  });
});

describe("loadMap", () => {
  it("rebuilds the hash at the tuned cell size with only the hero in it, at the spawn point", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({ tuning: { hash_cell_size: 32 } }),
    });
    spawnHero(world, { x: 300, y: 300 });
    acquireUnit(world.state, "enemy", 300, 300);

    world.loadMap(makeMapDef.build({ spawnPoint: { x: 500, y: 500 } }));

    expect(world.view.map.spatialHash.cellSize).toBe(32);
    expect(world.view.map.spatialHash.count).toBe(1);
    expect(near(world, 300, 300, 1)).toEqual([]);
    expect(near(world, 500, 500, 1)).toEqual([world.view.run.heroId]);
  });
});
