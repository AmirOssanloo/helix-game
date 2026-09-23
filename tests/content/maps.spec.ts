import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry, maps, tuningTable } from "@content/public";
import type { MapDef } from "@domain/public";
import {
  deriveWalkabilityGrid,
  isBlockedAt,
  readRadiusClasses,
  validateRegistry,
} from "@domain/public";
import { createTuningState } from "@domain/public";
import type { Rect } from "@shared/public";

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

  it("has an id no other map shares", () => {
    const ids = maps.map((map) => map.id);

    expect(new Set(ids).size).toBe(ids.length);
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
