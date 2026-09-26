import { describe, expect, it } from "vitest";
import type { Path, PathSearch, WalkabilityGrid } from "@domain/public";
import {
  cellIndex,
  createPathSearch,
  createUnitPool,
  deriveWalkabilityGrid,
  fitPathSearch,
  hasLineOfSight,
  isCellBlocked,
  resolveDestination,
  searchPath,
  segmentCrossesRect,
  writeSmoothedPath,
} from "@domain/public";
import type { Rect } from "@shared/public";

const CELL = 32;

const SMALL = 16;
const HERO = 27;
const LARGE = 50;

/** Small, hero, large. */
const CLASSES = [SMALL, HERO, LARGE];

const HERO_CLASS = 1;
const LARGE_CLASS = 2;

/** A square of twenty cells a side. */
const BOUNDS: Rect = { minX: 0, minY: 0, maxX: 640, maxY: 640 };

/** A block covering cells 8 to 11 across and 8 to 11 down exactly. */
const BLOCK: Rect = { minX: 256, minY: 256, maxX: 384, maxY: 384 };

/** A wall from the top of the map to the bottom, so nothing crosses from left to right. */
const FULL_WALL: Rect = { minX: 288, minY: 0, maxX: 352, maxY: 640 };

/** A wall from the top of the map and one from the bottom, spanning columns 7 to 12, with a corridor 96 wide between them: rows 9, 10, and 11, with row 10 open to the hero class and none to the large. */
const CORRIDOR: Rect[] = [
  { minX: 224, minY: 0, maxX: 416, maxY: 288 },
  { minX: 224, minY: 384, maxX: 416, maxY: 640 },
];

/** The corridor with its south wall stopping short of the bottom, so a wide unit can go around the long way through row 17. */
const CORRIDOR_WITH_A_WAY_AROUND: Rect[] = [
  { minX: 224, minY: 0, maxX: 416, maxY: 288 },
  { minX: 224, minY: 384, maxX: 416, maxY: 480 },
];

const derive = (obstacles: Rect[]): WalkabilityGrid =>
  deriveWalkabilityGrid(BOUNDS, obstacles, CELL, CLASSES);

const searchFor = (grid: WalkabilityGrid): PathSearch =>
  createPathSearch(grid.columns * grid.rows);

/** The cells of the last found path. */
const cellsOf = (search: PathSearch): number[] =>
  Array.from(search.result.subarray(0, search.resultCount));

/** A fresh unit's empty path buffer. */
const emptyPath = (): Path => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  return unit.path;
};

const waypointsOf = (path: Path): { x: number; y: number }[] =>
  path.points.slice(0, path.count).map((point) => ({ x: point.x, y: point.y }));

describe("searchPath", () => {
  it("finds a path around a rectangle that ends on the goal and walks only open cells", () => {
    const grid = derive([BLOCK]);
    const search = searchFor(grid);

    const found = searchPath(search, grid, HERO_CLASS, 4, 10, 15, 10);

    const cells = cellsOf(search);
    expect(found).toBe(true);
    expect(cells.at(-1)).toBe(cellIndex(grid, 15, 10));
    expect(cells.length).toBeGreaterThan(11);
    for (const cell of cells) {
      expect(
        isCellBlocked(
          grid,
          HERO_CLASS,
          cell % grid.columns,
          Math.floor(cell / grid.columns),
        ),
      ).toBe(false);
    }
  });

  it("finds none across a wall", () => {
    const grid = derive([FULL_WALL]);
    const search = searchFor(grid);

    const found = searchPath(search, grid, HERO_CLASS, 4, 10, 15, 10);

    expect(found).toBe(false);
    expect(search.resultCount).toBe(0);
  });

  it("uses the corridor when it is the only way", () => {
    const grid = derive(CORRIDOR);
    const search = searchFor(grid);

    const found = searchPath(search, grid, HERO_CLASS, 2, 10, 17, 10);

    expect(found).toBe(true);
    expect(cellsOf(search)).toContain(cellIndex(grid, 10, 10));
  });

  it("refuses the corridor to the large class and paths around", () => {
    const grid = derive(CORRIDOR_WITH_A_WAY_AROUND);
    const search = searchFor(grid);

    const heroFound = searchPath(search, grid, HERO_CLASS, 2, 10, 17, 10);
    const heroCells = cellsOf(search);
    const largeFound = searchPath(search, grid, LARGE_CLASS, 2, 10, 17, 10);
    const largeCells = cellsOf(search);

    expect(heroFound).toBe(true);
    expect(heroCells).toContain(cellIndex(grid, 10, 10));
    expect(largeFound).toBe(true);
    expect(largeCells).not.toContain(cellIndex(grid, 10, 10));
    expect(
      largeCells.some((cell) => Math.floor(cell / grid.columns) === 17),
    ).toBe(true);
  });

  it("never cuts the corner of a blocked cell on a diagonal step", () => {
    const grid = derive([{ minX: 320, minY: 320, maxX: 352, maxY: 352 }]);
    const search = searchFor(grid);

    const found = searchPath(search, grid, 0, 8, 8, 12, 12);

    const cells = cellsOf(search);
    let column = 8;
    let row = 8;
    expect(found).toBe(true);
    for (const cell of cells) {
      const nextColumn = cell % grid.columns;
      const nextRow = Math.floor(cell / grid.columns);

      if (nextColumn !== column && nextRow !== row) {
        expect(isCellBlocked(grid, 0, nextColumn, row)).toBe(false);
        expect(isCellBlocked(grid, 0, column, nextRow)).toBe(false);
      }

      column = nextColumn;
      row = nextRow;
    }
  });

  it("finds a start on the goal cell with no cells to walk", () => {
    const grid = derive([]);
    const search = searchFor(grid);

    expect(searchPath(search, grid, HERO_CLASS, 5, 5, 5, 5)).toBe(true);
    expect(search.resultCount).toBe(0);
  });

  it("returns the same cells for the same search twice and keeps its arrays across searches", () => {
    const grid = derive([BLOCK]);
    const search = searchFor(grid);
    const heap = search.heap;

    searchPath(search, grid, HERO_CLASS, 4, 10, 15, 10);
    const first = cellsOf(search);
    searchPath(search, grid, HERO_CLASS, 4, 10, 15, 10);
    const second = cellsOf(search);
    fitPathSearch(search, grid.columns * grid.rows);

    expect(second).toEqual(first);
    expect(search.heap).toBe(heap);
  });

  it("counts every cell a search expands, across searches and a fit, and none for a start on the goal", () => {
    const grid = derive([]);
    const search = searchFor(grid);

    searchPath(search, grid, HERO_CLASS, 5, 5, 5, 5);
    expect(search.expanded).toBe(0);

    searchPath(search, grid, HERO_CLASS, 2, 10, 6, 10);
    const straight = search.expanded;

    expect(straight).toBe(5);

    searchPath(search, grid, HERO_CLASS, 2, 10, 6, 10);
    fitPathSearch(search, grid.columns * grid.rows * 2);

    expect(search.expanded).toBe(straight * 2);
  });

  it("grows through fitPathSearch when a grid has more cells than it was sized for", () => {
    const search = createPathSearch(4);

    fitPathSearch(search, 400);

    expect(search.capacity).toBe(400);
    expect(search.result).toHaveLength(400);
  });
});

describe("writeSmoothedPath", () => {
  it("turns a path across an open room into one segment", () => {
    const grid = derive([]);
    const search = searchFor(grid);
    const path = emptyPath();
    searchPath(search, grid, HERO_CLASS, 2, 2, 17, 15);

    writeSmoothedPath(
      path,
      grid,
      search.result,
      search.resultCount,
      80,
      80,
      555,
      500,
      HERO,
      [],
    );

    expect(waypointsOf(path)).toEqual([{ x: 555, y: 500 }]);
    expect(path.next).toBe(0);
  });

  it("keeps one waypoint at the corner of a rectangle and none along the straight legs", () => {
    const grid = derive([BLOCK]);
    const search = searchFor(grid);
    const path = emptyPath();
    searchPath(search, grid, HERO_CLASS, 4, 10, 15, 10);

    writeSmoothedPath(
      path,
      grid,
      search.result,
      search.resultCount,
      144,
      336,
      496,
      336,
      HERO,
      [BLOCK],
    );

    const waypoints = waypointsOf(path);
    expect(waypoints.length).toBeGreaterThanOrEqual(2);
    expect(waypoints.length).toBeLessThanOrEqual(3);
    expect(waypoints.at(-1)).toEqual({ x: 496, y: 336 });
    let fromX = 144;
    let fromY = 336;
    for (const point of waypoints) {
      expect(
        hasLineOfSight(fromX, fromY, point.x, point.y, HERO, [BLOCK]),
      ).toBe(true);
      fromX = point.x;
      fromY = point.y;
    }
  });
});

describe("hasLineOfSight", () => {
  const RECT: Rect = { minX: 100, minY: 100, maxX: 200, maxY: 200 };

  it("is blocked through a rectangle and clear past it by the radius", () => {
    expect(hasLineOfSight(0, 150, 300, 150, HERO, [RECT])).toBe(false);
    expect(
      hasLineOfSight(0, 100 - HERO - 1, 300, 100 - HERO - 1, HERO, [RECT]),
    ).toBe(true);
    expect(
      hasLineOfSight(0, 100 - HERO + 1, 300, 100 - HERO + 1, HERO, [RECT]),
    ).toBe(false);
  });

  it("is clear sliding along the inflated edge, where a pushed-out disc stands", () => {
    expect(hasLineOfSight(0, 100 - HERO, 300, 100 - HERO, HERO, [RECT])).toBe(
      true,
    );
    expect(hasLineOfSight(200 + HERO, 0, 200 + HERO, 300, HERO, [RECT])).toBe(
      true,
    );
  });

  it("is clear a unit outside the corner of the inflated rectangle and blocked a unit inside it", () => {
    const far = 2 * (200 + HERO);

    expect(segmentCrossesRect(0, far + 1, far + 1, 0, RECT, HERO)).toBe(false);
    expect(segmentCrossesRect(0, far - 1, far - 1, 0, RECT, HERO)).toBe(true);
  });
});

describe("resolveDestination", () => {
  it("moves a point on an obstacle to the nearest edge of the inflated obstacle", () => {
    const grid = derive([BLOCK]);

    const out = resolveDestination(
      grid,
      HERO_CLASS,
      BOUNDS,
      [BLOCK],
      270,
      300,
      { x: 0, y: 0 },
    );

    expect(out).toEqual({ x: 256 - HERO, y: 300 });
  });

  it("moves a point outside the map to the nearest point inside the bounds a class radius in", () => {
    const grid = derive([]);

    const west = resolveDestination(grid, HERO_CLASS, BOUNDS, [], -50, 300, {
      x: 0,
      y: 0,
    });
    const south = resolveDestination(grid, HERO_CLASS, BOUNDS, [], 300, 700, {
      x: 0,
      y: 0,
    });

    expect(west).toEqual({ x: HERO, y: 300 });
    expect(south).toEqual({ x: 300, y: 640 - HERO });
  });

  it("snaps a point in the map's corner, which both wall strips close, to the nearest open cell", () => {
    const grid = derive([]);

    const out = resolveDestination(grid, HERO_CLASS, BOUNDS, [], -50, 700, {
      x: 0,
      y: 0,
    });

    expect(out).toEqual({ x: CELL, y: 640 - CELL });
  });

  it("leaves a legal point where it is", () => {
    const grid = derive([BLOCK]);

    const out = resolveDestination(
      grid,
      HERO_CLASS,
      BOUNDS,
      [BLOCK],
      100,
      100,
      { x: 0, y: 0 },
    );

    expect(out).toEqual({ x: 100, y: 100 });
  });

  it("snaps a point in a corridor the class cannot enter to the nearest open cell", () => {
    const grid = derive(CORRIDOR);

    const out = resolveDestination(
      grid,
      LARGE_CLASS,
      BOUNDS,
      CORRIDOR,
      320,
      336,
      { x: 0, y: 0 },
    );

    expect(out).toEqual({ x: 480, y: 334 });
    expect(isCellBlocked(grid, LARGE_CLASS, 15, 10)).toBe(false);
  });
});
