import { describe, expect, it } from "vitest";
import type { WalkabilityView } from "@domain/public";
import { isCellBlocked } from "@domain/public";
import type { WorldView } from "@simulation/public";
import { makeMapDef, makeWorld } from "../../helpers";

/** The two tiles the stub layer is painted with. */
const FLOOR_TILE = 0;
const WALL_TILE = 1;

/** The radius class a tile layer draws: the smallest, the geometry itself with the least inflation. */
const DRAWN_CLASS = 0;

/**
 * The surface of a tile layer a view kind writes: sized once per map, one tile index per cell.
 * Phaser's `TilemapLayer` offers the same two operations; the stub records them instead.
 */
type TileLayer = {
  resize: (columns: number, rows: number) => void;
  putTileAt: (tile: number, column: number, row: number) => void;
};

/** A tile layer that remembers every tile put, row by row. */
class TileLayerRecorder implements TileLayer {
  columns = 0;

  rows = 0;

  tiles: number[] = [];

  resize(columns: number, rows: number): void {
    this.columns = columns;
    this.rows = rows;
    this.tiles = new Array<number>(columns * rows).fill(-1);
  }

  putTileAt(tile: number, column: number, row: number): void {
    this.tiles[row * this.columns + column] = tile;
  }

  tileAt(column: number, row: number): number {
    return this.tiles[row * this.columns + column] ?? -1;
  }
}

/**
 * The view kind under test: static map geometry drawn as a tile layer. It reads the loaded
 * map's walkability grid through the world view and nothing else, and binds once per map, as
 * the obstacle views do.
 */
class TileLayerView {
  private readonly layer: TileLayer;

  private boundMapId: string | null = null;

  constructor(layer: TileLayer) {
    this.layer = layer;
  }

  sync(world: WorldView): void {
    if (world.map.mapId === this.boundMapId) {
      return;
    }

    this.boundMapId = world.map.mapId;
    this.bind(world.map.walkability);
  }

  private bind(grid: WalkabilityView): void {
    this.layer.resize(grid.columns, grid.rows);

    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        this.layer.putTileAt(
          isCellBlocked(grid, DRAWN_CLASS, column, row)
            ? WALL_TILE
            : FLOOR_TILE,
          column,
          row,
        );
      }
    }
  }
}

/** A 32 by 16 cell room with a pillar over columns 10 to 13 and rows 6 to 9. */
const pillarRoom = makeMapDef.build({
  id: "pillar_room",
  bounds: { minX: 0, minY: 0, maxX: 1024, maxY: 512 },
  obstacles: [{ minX: 320, minY: 192, maxX: 448, maxY: 320 }],
  spawnPoint: { x: 800, y: 256 },
});

/** A 20 by 10 cell room with nothing in it. */
const bareRoom = makeMapDef.build({
  id: "bare_room",
  bounds: { minX: 0, minY: 0, maxX: 640, maxY: 320 },
  obstacles: [],
  spawnPoint: { x: 320, y: 160 },
});

describe("the door: static map geometry is drawn by a tile layer the domain map never learns of", () => {
  it("paints the loaded map's grid through the world view, repaints on a map load, and leaves the grid as the domain derived it", () => {
    const world = makeWorld({ seed: 1, map: pillarRoom });
    const layer = new TileLayerRecorder();
    const view = new TileLayerView(layer);
    const cellsBefore = Array.from(world.view.map.walkability.cells);

    view.sync(world.view);

    expect([layer.columns, layer.rows]).toEqual([32, 16]);
    expect(layer.tileAt(11, 7)).toBe(WALL_TILE);
    expect(layer.tileAt(24, 4)).toBe(FLOOR_TILE);
    expect(layer.tiles.includes(-1)).toBe(false);
    expect(Array.from(world.view.map.walkability.cells)).toEqual(cellsBefore);

    world.loadMap(bareRoom);
    view.sync(world.view);

    expect([layer.columns, layer.rows]).toEqual([20, 10]);
    expect(layer.tileAt(11, 7)).toBe(FLOOR_TILE);
  });
});
