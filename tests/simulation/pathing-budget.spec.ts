import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import { acquireUnit, issueMove } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../helpers";

const HULL = 27;

const spawnEnemy = (world: Simulation, x: number, y: number): Unit => {
  const id = acquireUnit(world.state, "enemy", x, y);
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (unit === null) {
    throw new Error("The unit pool has room for an enemy");
  }

  return unit;
};

/** Four enemies in the low pool slots and the hero in the fifth, every one ordered to walk east, on a world with the given budget. */
const fiveRequesting = (
  budget: number,
): { world: Simulation; enemies: Unit[]; hero: Unit } => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { repath_budget: budget } }),
  });
  const enemies = [0, 1, 2, 3].map((index) =>
    spawnEnemy(world, 0, index * 100),
  );
  const hero = spawnHero(world, { x: 0, y: -500 });

  for (const enemy of enemies) {
    issueMove(enemy, 1000, enemy.curr.y);
  }

  issueMove(hero, 1000, -500);

  return { world, enemies, hero };
};

const served = (units: readonly Unit[]): boolean[] =>
  units.map((unit) => !unit.needsPath && unit.path.count > 0);

describe("the re-path budget", () => {
  it("serves two of five requesting units this tick, the hero first, and the other three over the next ticks in pool order", () => {
    const { world, enemies, hero } = fiveRequesting(2);

    world.tick();

    expect(served([hero])).toEqual([true]);
    expect(served(enemies)).toEqual([true, false, false, false]);

    world.tick();

    expect(served(enemies)).toEqual([true, true, true, false]);

    world.tick();

    expect(served(enemies)).toEqual([true, true, true, true]);
  });

  it("holds a waiting unit still and moves it once it is served", () => {
    const { world, enemies } = fiveRequesting(2);
    const last = enemies[3];

    world.tick();
    world.tick();

    expect(last?.curr.x).toBe(0);
    expect(last?.state).toBe("turning");

    world.tick();
    world.tick();

    expect(last?.curr.x).toBeGreaterThan(0);
  });

  it("lets a unit asking for a new path keep walking its current one while it waits", () => {
    const { world, enemies, hero } = fiveRequesting(1);
    world.tick();
    world.tick();
    world.tick();
    const walker = enemies[0];
    const xBefore = walker?.curr.x ?? Number.NaN;
    const pathBefore = walker?.path.count ?? Number.NaN;

    if (walker !== undefined) {
      walker.needsPath = true;
    }

    hero.needsPath = true;
    world.tick();

    expect(walker?.needsPath).toBe(true);
    expect(walker?.path.count).toBe(pathBefore);
    expect(walker?.curr.x).toBeGreaterThan(xBefore);
  });

  it("changes the budget on the tick that consumes a tuning command", () => {
    const { world, enemies, hero } = fiveRequesting(5);
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "repath_budget",
      value: 1,
    });

    world.tick();

    expect(served([hero])).toEqual([true]);
    expect(served(enemies)).toEqual([false, false, false, false]);
  });
});

describe("the pathing system and the grid", () => {
  it("derives the grid again on the tick that consumes a cell size change and fits the search to it", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 640, maxY: 640 },
        spawnPoint: { x: 320, y: 320 },
      }),
    });
    const cellsBefore = world.view.map.walkability.columns;
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "walkability_cell_size",
      value: 16,
    });

    world.tick();

    expect(cellsBefore).toBe(20);
    expect(world.view.map.walkability.cellSize).toBe(16);
    expect(world.view.map.walkability.columns).toBe(40);
    expect(world.state.map.pathSearch.capacity).toBe(40 * 40);
  });

  it("derives the grid again on the tick that consumes a radius class change", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 640, maxY: 640 },
        obstacles: [{ minX: 256, minY: 256, maxX: 384, maxY: 384 }],
        spawnPoint: { x: 100, y: 100 },
      }),
    });
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "radius_class:1",
      value: 40,
    });

    world.tick();

    expect(world.view.map.walkability.classRadii[1]).toBe(40);
  });

  it("clears the order of a unit whose destination no search can reach", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 640, maxY: 640 },
        obstacles: [{ minX: 288, minY: 0, maxX: 352, maxY: 640 }],
        spawnPoint: { x: 100, y: 320 },
      }),
    });
    const hero = spawnHero(world, { x: 100, y: 320 });
    issueMove(hero, 540, 320);

    world.tick();

    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(hero.curr).toEqual({ x: 100, y: 320 });
  });

  it("plans the rest of a path from its last waypoint when the buffer cut it short", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { x: 0, y: 0, facing: 0 });
    issueMove(hero, 100, 0);
    hero.needsPath = false;
    hero.path.count = 1;
    hero.path.next = 0;
    const point = hero.path.points[0];

    if (point !== undefined) {
      point.x = 20;
      point.y = 0;
    }

    world.tick();
    world.tick();
    world.tick();
    world.tick();

    expect(hero.curr.x).toBeGreaterThan(20);
    expect(hero.order.kind).toBe("move");
    expect(hero.path.points[0]).toEqual({ x: 100, y: 0 });
  });
});

describe("the hero's own path", () => {
  it("walks the hero around a block along its smoothed path without ever overlapping it", () => {
    const block = { minX: 256, minY: 256, maxX: 384, maxY: 384 };
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        bounds: { minX: 0, minY: 0, maxX: 640, maxY: 640 },
        obstacles: [block],
        spawnPoint: { x: 144, y: 320 },
      }),
    });
    const hero = spawnHero(world, { x: 144, y: 320, facing: 0 });
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 496, y: 320 },
    });
    let closest = Infinity;

    world.tick();

    for (let tick = 0; tick < 200 && hero.state !== "idle"; tick += 1) {
      world.tick();

      const dx =
        hero.curr.x - Math.min(Math.max(hero.curr.x, block.minX), block.maxX);
      const dy =
        hero.curr.y - Math.min(Math.max(hero.curr.y, block.minY), block.maxY);

      closest = Math.min(closest, Math.hypot(dx, dy));
    }

    expect(hero.state).toBe("idle");
    expect(hero.curr).toEqual({ x: 496, y: 320 });
    expect(closest).toBeGreaterThanOrEqual(HULL - 1e-6);
  });
});
