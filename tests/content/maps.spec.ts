import { describe, expect, it } from "vitest";
import {
  arenaDef,
  contentRegistry,
  longRoadDef,
  maps,
  startingMap,
  tuningTable,
} from "@content/public";
import type { MapDef } from "@domain/public";
import {
  deriveWalkabilityGrid,
  isBlockedAt,
  readRadiusClasses,
  validateRegistry,
} from "@domain/public";
import { createTuningState } from "@domain/public";
import type { Rect } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeMapDef, makeRegistry, makeWorld, submit } from "../helpers";

const SMALL_CLASS = 0;
const HERO_CLASS = 1;
const LARGE_CLASS = 2;

const ID_SHAPE = /^[a-z][a-z0-9_]*$/;

const isInside = (inner: Readonly<Rect>, outer: Readonly<Rect>): boolean =>
  inner.minX >= outer.minX &&
  inner.minY >= outer.minY &&
  inner.maxX <= outer.maxX &&
  inner.maxY <= outer.maxY;

const hasArea = (rect: Readonly<Rect>): boolean =>
  rect.maxX > rect.minX && rect.maxY > rect.minY;

const contains = (rect: Readonly<Rect>, x: number, y: number): boolean =>
  x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;

/** The grid the game derives for `map` under the shipped tuning table. */
const gridOf = (map: MapDef) => {
  const tuning = createTuningState(tuningTable);

  return deriveWalkabilityGrid(
    map.bounds,
    map.obstacles,
    tuningTable.walkability_cell_size,
    readRadiusClasses(tuning),
  );
};

/** Every refusal reason the reader has not seen, advancing it past everything. */
const refusalsOf = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push(String(event.reason));
    }

    event = world.events.read(reader);
  }

  return found;
};

/**
 * The most enemies any map's spec lets stand in packs within the sleep radius of one walkable
 * point, by map id. The arena holds no packs of its own, so its bound is none. A map with no
 * row here fails, so a new map names its spec's bound as it is added.
 */
const LIVE_NEAR_BOUND: Readonly<Record<string, number>> = {
  arena: 0,
  long_road: 40,
};

/**
 * The most enemies in packs whose point lies within `radius` of one point of `map` open to the
 * hero, over the centre of every such cell of the grid the game derives for it.
 */
const mostEnemiesNear = (map: MapDef, radius: number): number => {
  const grid = gridOf(map);
  const reach = radius * radius;
  let most = 0;

  for (let row = 0; row < grid.rows; row += 1) {
    const y = grid.originY + (row + 0.5) * grid.cellSize;

    for (let column = 0; column < grid.columns; column += 1) {
      const x = grid.originX + (column + 0.5) * grid.cellSize;

      if (isBlockedAt(grid, HERO_CLASS, x, y)) {
        continue;
      }

      let near = 0;

      for (const pack of map.packs) {
        const dx = pack.position.x - x;
        const dy = pack.position.y - y;

        if (dx * dx + dy * dy <= reach) {
          near += pack.count;
        }
      }

      most = Math.max(most, near);
    }
  }

  return most;
};

/** The index of the cell of `grid` under the world point, row by row. */
const cellOf = (
  grid: ReturnType<typeof gridOf>,
  x: number,
  y: number,
): number =>
  Math.floor((y - grid.originY) / grid.cellSize) * grid.columns +
  Math.floor((x - grid.originX) / grid.cellSize);

/**
 * Every cell of `map`'s grid a unit of `radiusClass` reaches from the spawn point by steps to
 * the four neighbouring open cells, as a flag per cell, row by row. Pathing may also step
 * diagonally, so a cell reached here is one A* reaches too.
 */
const reachableFromSpawn = (map: MapDef, radiusClass: number): Uint8Array => {
  const grid = gridOf(map);
  const reached = new Uint8Array(grid.columns * grid.rows);
  const open = (column: number, row: number): boolean =>
    column >= 0 &&
    column < grid.columns &&
    row >= 0 &&
    row < grid.rows &&
    !isBlockedAt(
      grid,
      radiusClass,
      grid.originX + (column + 0.5) * grid.cellSize,
      grid.originY + (row + 0.5) * grid.cellSize,
    );
  const start = cellOf(grid, map.spawnPoint.x, map.spawnPoint.y);
  const queue: number[] = [start];

  reached[start] = 1;

  for (let next = 0; next < queue.length; next += 1) {
    const cell = queue[next] ?? 0;
    const column = cell % grid.columns;
    const row = Math.floor(cell / grid.columns);

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const neighbour = (row + dy) * grid.columns + column + dx;

      if (open(column + dx, row + dy) && reached[neighbour] === 0) {
        reached[neighbour] = 1;
        queue.push(neighbour);
      }
    }
  }

  return reached;
};

/** How far the point stands from the nearest edge of `rect`, or 0 inside it. */
const distanceToRect = (rect: Readonly<Rect>, x: number, y: number): number =>
  Math.hypot(
    Math.max(rect.minX - x, 0, x - rect.maxX),
    Math.max(rect.minY - y, 0, y - rect.maxY),
  );

const faultsOf = (id: string) =>
  validateRegistry(contentRegistry).filter((fault) =>
    fault.file.endsWith(`/${id.replace(/_/g, "-")}.def.ts`),
  );

describe("every map", () => {
  it.each(maps.map((map) => [map.id, map] as const))(
    "%s validates in the registry",
    (id) => {
      expect(faultsOf(id)).toEqual([]);
    },
  );

  it.each(maps.map((map) => [map.id, map] as const))(
    "%s has a snake_case id, bounds with area, obstacles inside them, and a spawn point on open ground",
    (_id, map) => {
      expect(map.id).toMatch(ID_SHAPE);
      expect(hasArea(map.bounds)).toBe(true);

      for (const obstacle of map.obstacles) {
        expect(hasArea(obstacle)).toBe(true);
        expect(isInside(obstacle, map.bounds)).toBe(true);
        expect(contains(obstacle, map.spawnPoint.x, map.spawnPoint.y)).toBe(
          false,
        );
      }

      expect(contains(map.bounds, map.spawnPoint.x, map.spawnPoint.y)).toBe(
        true,
      );
      expect(
        isBlockedAt(
          gridOf(map),
          HERO_CLASS,
          map.spawnPoint.x,
          map.spawnPoint.y,
        ),
      ).toBe(false);
    },
  );

  it.each(maps.map((map) => [map.id, map] as const))(
    "%s places each of its packs on its empty map, within the placement radius",
    (_id, map) => {
      for (const pack of map.packs) {
        const world = makeWorld({
          seed: 1,
          registry: contentRegistry,
          map: { ...map, packs: [] },
        });
        const reader = createEventReader();

        submit(world, {
          kind: "spawn_pack",
          tick: world.view.tick,
          timestamp: world.view.tick,
          archetypeId: pack.archetypeId,
          tier: pack.tier,
          count: pack.count,
          position: pack.position,
        });
        world.tick();

        expect(refusalsOf(world, reader)).toEqual([]);
        expect(world.view.map.units.count).toBe(pack.count);
      }
    },
  );

  it.each(maps.map((map) => [map.id, map] as const))(
    "%s stands every checkpoint inside the bounds, outside every obstacle, on a cell open to the hero",
    (_id, map) => {
      const grid = gridOf(map);

      for (const checkpoint of map.checkpoints) {
        expect(contains(map.bounds, checkpoint.x, checkpoint.y)).toBe(true);
        expect(
          map.obstacles.some((obstacle) =>
            contains(obstacle, checkpoint.x, checkpoint.y),
          ),
        ).toBe(false);
        expect(isBlockedAt(grid, HERO_CLASS, checkpoint.x, checkpoint.y)).toBe(
          false,
        );
      }
    },
  );

  it.each(maps.map((map) => [map.id, map] as const))(
    "%s has no walkable point with more enemies in packs within the sleep radius than its spec's bound",
    (id, map) => {
      const bound = LIVE_NEAR_BOUND[id];

      expect(bound).toBeDefined();
      expect(
        mostEnemiesNear(map, tuningTable.pack_sleep_radius),
      ).toBeLessThanOrEqual(bound ?? 0);
    },
  );

  it("has an id no other map shares", () => {
    const ids = maps.map((map) => map.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("live enemies near a point", () => {
  const packAt = (x: number, count: number) => ({
    archetypeId: "melee_grunt",
    tier: "normal" as const,
    count,
    position: { x, y: 0 },
    dormant: true,
  });

  it("adds up every pack within the radius of the worst walkable point", () => {
    const map = makeMapDef.build({
      packs: [packAt(-1000, 5), packAt(1000, 7), packAt(6000, 9)],
    });

    expect(mostEnemiesNear(map, 2000)).toBe(12);
    expect(mostEnemiesNear(map, 900)).toBe(9);
  });

  it("does not count a pack whose point no walkable point comes within the radius of", () => {
    const map = makeMapDef.build({
      obstacles: [{ minX: -2048, minY: -2048, maxX: 2048, maxY: 2048 }],
      packs: [packAt(0, 5)],
    });

    expect(mostEnemiesNear(map, 1000)).toBe(0);
  });
});

describe("the arena", () => {
  it("is listed", () => {
    expect(maps).toContain(arenaDef);
  });

  it("is 4000 by 4000 with the spawn point at the centre and nothing spawning on load", () => {
    expect(arenaDef.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 4000,
      maxY: 4000,
    });
    expect(arenaDef.spawnPoint).toEqual({ x: 2000, y: 2000 });
    expect(arenaDef.packs).toHaveLength(0);
  });

  it("has between eight and twelve obstacles on cell boundaries", () => {
    expect(arenaDef.obstacles.length).toBeGreaterThanOrEqual(8);
    expect(arenaDef.obstacles.length).toBeLessThanOrEqual(12);

    for (const obstacle of arenaDef.obstacles) {
      expect(obstacle.minX % tuningTable.walkability_cell_size).toBe(0);
      expect(obstacle.minY % tuningTable.walkability_cell_size).toBe(0);
      expect(obstacle.maxX % tuningTable.walkability_cell_size).toBe(0);
      expect(obstacle.maxY % tuningTable.walkability_cell_size).toBe(0);
    }
  });

  it("has one corridor open to a small or hero-sized unit and closed to a large one", () => {
    const grid = gridOf(arenaDef);
    const corridorX = 2880;
    const corridorY = 2000;

    expect(isBlockedAt(grid, SMALL_CLASS, corridorX, corridorY)).toBe(false);
    expect(isBlockedAt(grid, HERO_CLASS, corridorX, corridorY)).toBe(false);
    expect(isBlockedAt(grid, LARGE_CLASS, corridorX, corridorY)).toBe(true);
  });
});

describe("the long road", () => {
  const cellSize = tuningTable.walkability_cell_size;

  it("is listed", () => {
    expect(maps).toContain(longRoadDef);
  });

  it("is the map a fresh session starts on, with the arena still in the list", () => {
    expect(startingMap).toBe(longRoadDef);
    expect(maps).toContain(startingMap);
    expect(maps).toContain(arenaDef);
  });

  it("is 4000 by 24000 with the spawn point at the first checkpoint, six checkpoints in order along the road", () => {
    expect(longRoadDef.bounds).toEqual({
      minX: 0,
      minY: 0,
      maxX: 4000,
      maxY: 24000,
    });
    expect(longRoadDef.checkpoints).toHaveLength(6);
    expect(longRoadDef.checkpoints[0]).toEqual(longRoadDef.spawnPoint);

    const ys = longRoadDef.checkpoints.map((checkpoint) => checkpoint.y);

    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it("has 137 obstacles, every edge on a cell boundary", () => {
    expect(longRoadDef.obstacles).toHaveLength(137);

    for (const obstacle of longRoadDef.obstacles) {
      expect(obstacle.minX % cellSize).toBe(0);
      expect(obstacle.minY % cellSize).toBe(0);
      expect(obstacle.maxX % cellSize).toBe(0);
      expect(obstacle.maxY % cellSize).toBe(0);
    }
  });

  it("holds 32 packs of 54 enemies, every one dormant", () => {
    expect(longRoadDef.packs).toHaveLength(32);
    expect(longRoadDef.packs.reduce((sum, pack) => sum + pack.count, 0)).toBe(
      54,
    );
    expect(longRoadDef.packs.every((pack) => pack.dormant)).toBe(true);
  });

  it("stands every pack at least 256 from every obstacle and at least 1080 from every checkpoint", () => {
    for (const pack of longRoadDef.packs) {
      const { x, y } = pack.position;

      for (const obstacle of longRoadDef.obstacles) {
        expect(distanceToRect(obstacle, x, y)).toBeGreaterThanOrEqual(256);
      }

      for (const checkpoint of longRoadDef.checkpoints) {
        expect(
          Math.hypot(checkpoint.x - x, checkpoint.y - y),
        ).toBeGreaterThanOrEqual(1080);
      }
    }
  });

  it.each([
    ["small", SMALL_CLASS],
    ["hero", HERO_CLASS],
    ["large", LARGE_CLASS],
  ] as const)(
    "lets a %s unit walk from the spawn to every checkpoint in order and on to the last boss's pack",
    (_name, radiusClass) => {
      const grid = gridOf(longRoadDef);
      const reached = reachableFromSpawn(longRoadDef, radiusClass);
      const lastBoss = longRoadDef.packs[longRoadDef.packs.length - 1];

      for (const checkpoint of longRoadDef.checkpoints) {
        expect(reached[cellOf(grid, checkpoint.x, checkpoint.y)]).toBe(1);
      }

      expect(lastBoss?.tier).toBe("boss");
      expect(
        reached[
          cellOf(grid, lastBoss?.position.x ?? 0, lastBoss?.position.y ?? 0)
        ],
      ).toBe(1);

      for (const pack of longRoadDef.packs) {
        expect(reached[cellOf(grid, pack.position.x, pack.position.y)]).toBe(1);
      }
    },
  );

  it("keeps the live-near bound for any sleep radius up to 3200, peaking at 14 within 2000 and 22 within 3200", () => {
    expect(mostEnemiesNear(longRoadDef, 2000)).toBe(14);
    expect(mostEnemiesNear(longRoadDef, 3200)).toBe(22);
    expect(mostEnemiesNear(longRoadDef, 3200)).toBeLessThanOrEqual(
      LIVE_NEAR_BOUND.long_road ?? 0,
    );
  });
});

/** A wall east of the origin; its west face stands at `x = 1000`. */
const WALL: Readonly<Rect> = { minX: 1000, minY: -500, maxX: 1500, maxY: 500 };

/** The faults the registry finds in the checkpoints of a map holding `checkpoints` beside `WALL`. */
const checkpointFaultsOf = (
  checkpoints: readonly Readonly<{ x: number; y: number }>[],
) =>
  validateRegistry(
    makeRegistry({
      maps: [makeMapDef.build({ obstacles: [WALL], checkpoints })],
    }),
  ).filter((fault) => fault.path.startsWith("checkpoints"));

describe("a map's checkpoints in the registry", () => {
  it("accepts checkpoints on open ground", () => {
    expect(
      checkpointFaultsOf([
        { x: 0, y: 0 },
        { x: 2000, y: 0 },
      ]),
    ).toEqual([]);
  });

  it("refuses a checkpoint outside the bounds", () => {
    expect(
      checkpointFaultsOf([
        { x: 0, y: 0 },
        { x: 9000, y: 0 },
      ]),
    ).toMatchObject([
      { path: "checkpoints[1]", message: "expected a point inside the bounds" },
    ]);
  });

  it("refuses a checkpoint inside an obstacle", () => {
    expect(checkpointFaultsOf([{ x: 1200, y: 0 }])).toMatchObject([
      {
        path: "checkpoints[0]",
        message: "expected a point outside every obstacle",
      },
    ]);
  });

  it("refuses a checkpoint too close to a wall for the hero's radius class", () => {
    const tooClose = 1000 - tuningTable["radius_class:1"] / 2;

    expect(checkpointFaultsOf([{ x: tooClose, y: 0 }])).toMatchObject([
      {
        path: "checkpoints[0]",
        message: "expected a point on a cell open to the hero's radius class",
      },
    ]);
  });

  it("names the map's file in every fault", () => {
    const faults = checkpointFaultsOf([{ x: 9000, y: 9000 }]);

    expect(faults).toHaveLength(1);
    expect(faults[0]?.file).toMatch(/maps\/map-\d+\.def\.ts$/);
  });
});
