import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import {
  cellCentreX,
  cellCentreY,
  isCellBlocked,
  radiusClassOf,
} from "@domain/public";
import { createOverlayToggles, Projection } from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";
import {
  arrangeOverlays,
  FixedHash,
  makeOverlays,
  makeWorld,
  makeWorldView,
  OVERLAY_WALL,
  syncOverlays,
  spawnHero,
  visibleQuads,
} from "../../helpers";

/** The logical canvas, and how far past it the play scene widens the screen rectangle. */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const SCREEN_MARGIN = 64;
const WORLD_BOX_MARGIN = 64;

/** Where the camera centred shows the most blocked cells of the arena, by the corridor and the east post. */
const DENSEST_VIEW: Vec2 = { x: 3216, y: 2032 };

/** The blocked-cell pool the overlay once had, which the densest view overran. */
const OLD_BLOCKED_POOL = 1024;

const CELL_FRAME = "square";

describe("the blocked cells", () => {
  it("shade the cells the hero's radius class may not stand in", () => {
    const arranged = arrangeOverlays();

    arranged.toggles.walkabilityGrid = true;
    arranged.sync();

    const cells = visibleQuads(arranged.quads, CELL_FRAME);

    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.x >= OVERLAY_WALL.minX - 100)).toBe(true);
  });

  it("shade every blocked cell drawn on screen at the arena's densest view, with no miss", () => {
    const projection = new Projection();
    const world = makeWorld({ seed: 1, map: arenaDef });
    const hero = spawnHero(world, {
      x: arenaDef.spawnPoint.x,
      y: arenaDef.spawnPoint.y,
    });
    const { overlays, quads } = makeOverlays(projection);
    const toggles = createOverlayToggles();
    const centre: Vec2 = { x: 0, y: 0 };
    const drawn: Vec2 = { x: 0, y: 0 };

    projection.toScreen(DENSEST_VIEW.x, DENSEST_VIEW.y, centre);

    const left = centre.x - CANVAS_WIDTH / 2;
    const top = centre.y - CANVAS_HEIGHT / 2;
    const shown: Rect = {
      minX: left,
      minY: top,
      maxX: left + CANVAS_WIDTH,
      maxY: top + CANVAS_HEIGHT,
    };
    const screen: Rect = {
      minX: shown.minX - SCREEN_MARGIN,
      minY: shown.minY - SCREEN_MARGIN,
      maxX: shown.maxX + SCREEN_MARGIN,
      maxY: shown.maxY + SCREEN_MARGIN,
    };
    const box = projection.worldBoxOf(
      left,
      top,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      WORLD_BOX_MARGIN,
      { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    );

    toggles.walkabilityGrid = true;
    syncOverlays(
      overlays,
      makeWorldView(world, new FixedHash()),
      box,
      screen,
      toggles,
    );

    const shaded = new Set(
      visibleQuads(quads, CELL_FRAME).map((quad) => `${quad.x},${quad.y}`),
    );
    const grid = world.view.map.walkability;
    const radiusClass = radiusClassOf(grid, hero.collisionRadius);
    let onScreen = 0;

    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const x = cellCentreX(grid, column);
        const y = cellCentreY(grid, row);

        projection.toScreen(x, y, drawn);

        if (
          !isCellBlocked(grid, radiusClass, column, row) ||
          drawn.x < shown.minX ||
          drawn.x > shown.maxX ||
          drawn.y < shown.minY ||
          drawn.y > shown.maxY
        ) {
          continue;
        }

        onScreen += 1;
        expect(shaded.has(`${x},${y}`)).toBe(true);
      }
    }

    for (const quad of visibleQuads(quads, CELL_FRAME)) {
      projection.toScreen(quad.x, quad.y, drawn);
      expect(drawn.x).toBeGreaterThanOrEqual(screen.minX);
      expect(drawn.x).toBeLessThanOrEqual(screen.maxX);
      expect(drawn.y).toBeGreaterThanOrEqual(screen.minY);
      expect(drawn.y).toBeLessThanOrEqual(screen.maxY);
    }

    expect(overlays.misses).toBe(0);
    expect(shaded.size).toBeGreaterThan(OLD_BLOCKED_POOL);
    expect(shaded.size).toBeGreaterThanOrEqual(onScreen);
  });
});
