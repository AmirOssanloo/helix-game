import { describe, expect, it } from "vitest";
import type { WalkabilityGrid } from "@domain/public";
import {
  columnOf,
  deriveWalkabilityGrid,
  isBlockedAt,
  isCellBlocked,
  radiusClassOf,
  rowOf,
  walkabilityCovers,
} from "@domain/public";
import type { Rect } from "@shared/public";
import { makeMapDef } from "../../helpers";

const CELL = 32;

const SMALL = 16;
const HERO = 27;
const LARGE = 50;

/** Small, hero, large. */
const CLASSES = [SMALL, HERO, LARGE];

const SMALL_CLASS = 0;
const HERO_CLASS = 1;
const LARGE_CLASS = 2;

/** A square of ten cells a side, so every edge cell and every interior cell has a fixed index. */
const BOUNDS: Rect = { minX: 0, minY: 0, maxX: 320, maxY: 320 };

/** A block covering cells 3 to 4 across and 3 to 4 down exactly. */
const BLOCK: Rect = { minX: 96, minY: 96, maxX: 160, maxY: 160 };

/** Two blocks with a corridor 96 wide, three cells, between them: columns 4, 5, and 6. */
const CORRIDOR_WALLS: Rect[] = [
  { minX: 32, minY: 96, maxX: 128, maxY: 224 },
  { minX: 224, minY: 96, maxX: 288, maxY: 224 },
];

const derive = (obstacles: Rect[]): WalkabilityGrid =>
  deriveWalkabilityGrid(
    makeMapDef.build({ bounds: BOUNDS, obstacles }),
    CELL,
    CLASSES,
  );

describe("deriveWalkabilityGrid", () => {
  it("covers the bounds with one cell per cell size, rounding the last cell up", () => {
    const grid = deriveWalkabilityGrid(
      makeMapDef.build({
        bounds: { minX: -100, minY: 50, maxX: 100, maxY: 130 },
      }),
      CELL,
      CLASSES,
    );

    expect(grid.columns).toBe(7);
    expect(grid.rows).toBe(3);
    expect(grid.originX).toBe(-100);
    expect(grid.originY).toBe(50);
    expect(grid.cells).toHaveLength(3 * 7 * 3);
    expect(
      walkabilityCovers(grid, { minX: -100, minY: 50, maxX: 100, maxY: 130 }),
    ).toBe(true);
    expect(walkabilityCovers(grid, BOUNDS)).toBe(false);
  });

  it("blocks every cell under a rectangle in every class", () => {
    const grid = derive([BLOCK]);

    for (let radiusClass = 0; radiusClass < CLASSES.length; radiusClass += 1) {
      expect(isCellBlocked(grid, radiusClass, 3, 3)).toBe(true);
      expect(isCellBlocked(grid, radiusClass, 4, 4)).toBe(true);
    }
  });

  it("blocks a cell a rectangle only partly covers", () => {
    const grid = derive([{ minX: 100, minY: 100, maxX: 110, maxY: 110 }]);

    expect(isCellBlocked(grid, SMALL_CLASS, 3, 3)).toBe(true);
    expect(isCellBlocked(grid, SMALL_CLASS, 4, 3)).toBe(false);
  });

  it("blocks a cell within the class radius of a rectangle and leaves one beyond it open", () => {
    const grid = derive([BLOCK]);

    expect(isCellBlocked(grid, SMALL_CLASS, 5, 3)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 5, 3)).toBe(true);
    expect(isCellBlocked(grid, SMALL_CLASS, 6, 3)).toBe(false);
    expect(isCellBlocked(grid, HERO_CLASS, 6, 3)).toBe(false);
    expect(isCellBlocked(grid, LARGE_CLASS, 6, 3)).toBe(true);
    expect(isCellBlocked(grid, LARGE_CLASS, 7, 3)).toBe(false);
  });

  it("leaves the cell beyond an edge open when the class radius reaches exactly to the boundary", () => {
    const grid = deriveWalkabilityGrid(
      makeMapDef.build({ bounds: BOUNDS, obstacles: [BLOCK] }),
      CELL,
      [CELL],
    );

    expect(isCellBlocked(grid, 0, 5, 3)).toBe(true);
    expect(isCellBlocked(grid, 0, 6, 3)).toBe(false);
  });

  it("opens the corridor to the small and hero classes and closes it to the large class", () => {
    const grid = derive(CORRIDOR_WALLS);

    expect(isCellBlocked(grid, SMALL_CLASS, 5, 5)).toBe(false);
    expect(isCellBlocked(grid, HERO_CLASS, 5, 5)).toBe(false);
    expect(isCellBlocked(grid, LARGE_CLASS, 5, 5)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 4, 5)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 6, 5)).toBe(true);
  });

  it("treats the bounds as walls a class radius thick", () => {
    const grid = derive([]);

    expect(isCellBlocked(grid, SMALL_CLASS, 0, 5)).toBe(true);
    expect(isCellBlocked(grid, SMALL_CLASS, 1, 5)).toBe(false);
    expect(isCellBlocked(grid, HERO_CLASS, 9, 5)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 8, 5)).toBe(false);
    expect(isCellBlocked(grid, LARGE_CLASS, 5, 1)).toBe(true);
    expect(isCellBlocked(grid, LARGE_CLASS, 5, 2)).toBe(false);
    expect(isCellBlocked(grid, LARGE_CLASS, 5, 8)).toBe(true);
    expect(isCellBlocked(grid, LARGE_CLASS, 5, 7)).toBe(false);
  });

  it("refuses a cell size of zero and bounds with no area", () => {
    expect(() => derive([]).cellSize).not.toThrow();
    expect(() =>
      deriveWalkabilityGrid(makeMapDef.build({ bounds: BOUNDS }), 0, CLASSES),
    ).toThrow();
    expect(() =>
      deriveWalkabilityGrid(
        makeMapDef.build({
          bounds: { minX: 0, minY: 0, maxX: 0, maxY: 320 },
        }),
        CELL,
        CLASSES,
      ),
    ).toThrow();
  });

  it("refuses classes that do not ascend", () => {
    expect(() =>
      deriveWalkabilityGrid(makeMapDef.build({ bounds: BOUNDS }), CELL, [
        HERO,
        SMALL,
      ]),
    ).toThrow();
  });
});

describe("isCellBlocked", () => {
  it("reports a cell outside the grid and a class it does not have as blocked", () => {
    const grid = derive([]);

    expect(isCellBlocked(grid, HERO_CLASS, -1, 5)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 10, 5)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 5, -1)).toBe(true);
    expect(isCellBlocked(grid, HERO_CLASS, 5, 10)).toBe(true);
    expect(isCellBlocked(grid, CLASSES.length, 5, 5)).toBe(true);
  });
});

describe("isBlockedAt", () => {
  it("looks up the cell under a world point", () => {
    const grid = derive([BLOCK]);

    expect(columnOf(grid, 127)).toBe(3);
    expect(rowOf(grid, 128)).toBe(4);
    expect(isBlockedAt(grid, HERO_CLASS, 127, 128)).toBe(true);
    expect(isBlockedAt(grid, HERO_CLASS, 200, 128)).toBe(false);
    expect(isBlockedAt(grid, HERO_CLASS, 320, 128)).toBe(true);
    expect(isBlockedAt(grid, HERO_CLASS, -1, 128)).toBe(true);
  });
});

describe("radiusClassOf", () => {
  it("picks the smallest class whose radius holds the unit", () => {
    const grid = derive([]);

    expect(radiusClassOf(grid, 10)).toBe(SMALL_CLASS);
    expect(radiusClassOf(grid, SMALL)).toBe(SMALL_CLASS);
    expect(radiusClassOf(grid, HERO)).toBe(HERO_CLASS);
    expect(radiusClassOf(grid, 30)).toBe(LARGE_CLASS);
  });

  it("puts a unit wider than the largest class in the largest class", () => {
    const grid = derive([]);

    expect(radiusClassOf(grid, LARGE + 1)).toBe(LARGE_CLASS);
  });
});
