import { describe, expect, it } from "vitest";
import { createOverlayToggles, Projection } from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";
import {
  arrangeOverlays,
  FixedHash,
  makeMapDef,
  makeOverlays,
  makeWorld,
  makeWorldView,
  OVERLAY_CAMERA_RECT,
  OVERLAY_FRAME_WIDTH,
  spawnHero,
  syncOverlays,
  visibleQuads,
} from "../../helpers";

const CELL_OUTLINE_FRAME = "square_outline";

/** Occupied hash cells around the rectangle, by column and row. */
const CELLS_AROUND_THE_RECT = [
  { cellX: 0, cellY: 0, count: 1 },
  { cellX: -3, cellY: 1, count: 2 },
  { cellX: 2, cellY: -3, count: 3 },
];

describe("the hash cells", () => {
  it("outline each occupied hash cell inside the rectangle with its count, rewriting the count only when it changes", () => {
    const arranged = arrangeOverlays();

    arranged.hash.cells = [
      { cellX: 0, cellY: 0, count: 3 },
      { cellX: 50, cellY: 50, count: 1 },
    ];
    arranged.toggles.hashCells = true;
    arranged.sync();
    arranged.sync();

    const outlines = visibleQuads(arranged.quads, CELL_OUTLINE_FRAME);
    const shown = arranged.labels.filter((label) => label.visible);

    expect(outlines).toHaveLength(1);
    expect(outlines[0]?.x).toBe(arranged.hash.cellSize / 2);
    expect(outlines[0]?.scale).toBeCloseTo(
      arranged.hash.cellSize / OVERLAY_FRAME_WIDTH,
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]?.text).toBe("3");
    expect(shown[0]?.rewrites).toBe(1);
  });

  it("put a hash cell's count where the centre of its outline is drawn", () => {
    const projection = new Projection();
    const arranged = arrangeOverlays(projection);
    const drawn: Vec2 = { x: 0, y: 0 };
    const size = arranged.hash.cellSize;

    arranged.hash.cells = CELLS_AROUND_THE_RECT;
    arranged.toggles.hashCells = true;
    arranged.sync();

    const shown = arranged.labels.filter((label) => label.visible);

    expect(shown).toHaveLength(CELLS_AROUND_THE_RECT.length);

    CELLS_AROUND_THE_RECT.forEach((cell, index) => {
      const label = shown[index];

      if (label === undefined) {
        throw new Error("Every occupied cell wears its count");
      }

      projection.toScreen(
        (cell.cellX + 0.5) * size,
        (cell.cellY + 0.5) * size,
        drawn,
      );
      expect(label.text).toBe(String(cell.count));
      expect(label.x).toBeCloseTo(drawn.x);
      expect(label.y).toBeCloseTo(drawn.y);
    });
  });

  it("count no hash cell the screen cannot show, and keep one its edge cuts through", () => {
    const projection = new Projection();
    const world = makeWorld({ seed: 1, map: makeMapDef.build({}) });

    spawnHero(world);

    const hash = new FixedHash();
    const { overlays, labels } = makeOverlays(projection);
    const toggles = createOverlayToggles();
    const size = hash.cellSize;
    const drawn: Vec2 = { x: 0, y: 0 };
    // A screen box whose right edge runs through the cell at (2, -2): its centre is drawn at
    // x = 320, past the edge, and its left corner at 240, inside it.
    const screen: Rect = { minX: -300, minY: -150, maxX: 300, maxY: 150 };

    // (0, 0) sits mid-screen; (2, -2) straddles the right edge; (3, 3) lies inside the camera
    // rectangle but is drawn far below the screen.
    hash.cells = [
      { cellX: 0, cellY: 0, count: 1 },
      { cellX: 2, cellY: -2, count: 2 },
      { cellX: 3, cellY: 3, count: 3 },
    ];
    toggles.hashCells = true;
    syncOverlays(
      overlays,
      makeWorldView(world, hash),
      OVERLAY_CAMERA_RECT,
      screen,
      toggles,
    );

    const shown = labels.filter((label) => label.visible);

    expect(shown.map((label) => label.text)).toEqual(["1", "2"]);

    projection.toScreen(2.5 * size, -1.5 * size, drawn);
    expect(drawn.x).toBeGreaterThan(screen.maxX);
  });
});
