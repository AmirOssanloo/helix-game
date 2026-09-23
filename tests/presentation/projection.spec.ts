import { describe, expect, it } from "vitest";
import { DIAMOND_WIDTHS, FLOOR_CELL, Projection } from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";

/** Points spread over the arena and past its edges, including negative ones. */
const POINTS: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 32, y: 0 },
  { x: 0, y: 32 },
  { x: 2000, y: 2000 },
  { x: 3999, y: 17 },
  { x: -250, y: 1234.5 },
];

const QUARTER_TURN = Math.PI / 2;
const HALF_TURN = Math.PI;

/** Where a heading of zero, along world +X, is drawn: two across for one down. */
const EAST_ON_SCREEN = Math.atan2(1, 2);

const at = (diamondWidth: number): Projection => {
  const projection = new Projection();

  projection.setDiamondWidth(diamondWidth);

  return projection;
};

describe.each(DIAMOND_WIDTHS)(
  "the projection at a diamond %i across",
  (diamondWidth) => {
    it("takes a world point to the screen and back to where it started", () => {
      const projection = at(diamondWidth);
      const screen = { x: 0, y: 0 };
      const back = { x: 0, y: 0 };

      for (const point of POINTS) {
        projection.toScreen(point.x, point.y, screen);
        projection.toWorld(screen.x, screen.y, back);

        expect(back.x).toBeCloseTo(point.x, 9);
        expect(back.y).toBeCloseTo(point.y, 9);
      }
    });

    it("draws the four corners of a cell as a diamond that many whole pixels across and half that down", () => {
      const projection = at(diamondWidth);
      const corner = (x: number, y: number): Vec2 => {
        const out = { x: 0, y: 0 };

        projection.toScreen(x, y, out);

        return out;
      };
      const minX = FLOOR_CELL * 3;
      const minY = FLOOR_CELL * 5;
      const top = corner(minX, minY);
      const right = corner(minX + FLOOR_CELL, minY);
      const bottom = corner(minX + FLOOR_CELL, minY + FLOOR_CELL);
      const left = corner(minX, minY + FLOOR_CELL);

      expect(right.x - left.x).toBe(diamondWidth);
      expect(bottom.y - top.y).toBe(diamondWidth / 2);
      expect(top.x).toBe(bottom.x);
      expect(left.y).toBe(right.y);
      expect(Number.isInteger(top.x) && Number.isInteger(top.y)).toBe(true);
    });

    it("draws a heading of zero, a quarter turn, and a half turn along their screen angles", () => {
      const projection = at(diamondWidth);

      expect(projection.screenAngle(0)).toBeCloseTo(EAST_ON_SCREEN, 9);
      expect(projection.screenAngle(QUARTER_TURN)).toBeCloseTo(
        HALF_TURN - EAST_ON_SCREEN,
        9,
      );
      expect(projection.screenAngle(HALF_TURN)).toBeCloseTo(
        EAST_ON_SCREEN - HALF_TURN,
        9,
      );
    });

    it("boxes a screen rectangle in the world box every point drawn inside it falls in", () => {
      const projection = at(diamondWidth);
      const box: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      const view = { x: 500, y: -200, width: 1920, height: 1080 };
      const world = { x: 0, y: 0 };

      projection.worldBoxOf(view.x, view.y, view.width, view.height, 0, box);

      for (let across = 0; across <= 1; across += 0.25) {
        for (let down = 0; down <= 1; down += 0.25) {
          projection.toWorld(
            view.x + view.width * across,
            view.y + view.height * down,
            world,
          );

          expect(world.x).toBeGreaterThanOrEqual(box.minX - 1e-9);
          expect(world.x).toBeLessThanOrEqual(box.maxX + 1e-9);
          expect(world.y).toBeGreaterThanOrEqual(box.minY - 1e-9);
          expect(world.y).toBeLessThanOrEqual(box.maxY + 1e-9);
        }
      }
    });

    it("boxes the map's bounds in the screen box around their four drawn corners", () => {
      const projection = at(diamondWidth);
      const bounds: Rect = { minX: 0, minY: 0, maxX: 4000, maxY: 4000 };
      const box: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
      const k = diamondWidth / (2 * FLOOR_CELL);

      projection.screenBoxOf(bounds, box);

      expect(box).toEqual({
        minX: -4000 * k,
        maxX: 4000 * k,
        minY: 0,
        maxY: 4000 * k,
      });
    });

    it("stands the top of a circle a radius times k over root two above its centre", () => {
      const projection = at(diamondWidth);
      const k = diamondWidth / (2 * FLOOR_CELL);
      const top = { x: 0, y: 0 };
      const centre = { x: 0, y: 0 };
      const radius = 40;

      // The top of a drawn circle is the world point a radius along −X and −Y at once, over root two.
      projection.toScreen(
        100 - radius * Math.SQRT1_2,
        100 - radius * Math.SQRT1_2,
        top,
      );
      projection.toScreen(100, 100, centre);

      expect(projection.riseOf(radius)).toBeCloseTo(centre.y - top.y, 9);
      expect(projection.riseOf(radius)).toBeCloseTo(
        radius * k * Math.SQRT1_2,
        9,
      );
    });
  },
);
