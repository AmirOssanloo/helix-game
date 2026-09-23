import type { Rect } from "@shared/public";
import { DEPTH_FLOOR } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";

/** The frame the floor is drawn with: the content frame list names it the same way. */
export const FLOOR_FRAME = "floor";

/** A floor frame is half as tall as it is wide. */
const FLOOR_ASPECT = 2;

/** Placeholder art: the grid's lines a dark grey, so a white hero reads on them. */
const FLOOR_TINT = 0x2a2a2a;

/** The void outside the map is the canvas's own black. */
const VOID_TINT = 0x000000;

const VOID_FRAME = "square";

const OPAQUE = 1;

/** West, east, north, and south of the bounds. */
const VOID_SIDES = 4;

const HALF = 0.5;

/**
 * The floor: tiles of the diamond grid laid edge to edge in screen space, unscaled, so its
 * lines stay a pixel thick. The projected world origin is a corner of every tile, so each
 * diamond sits over one walkability cell. Each frame the tiles are laid over the rectangle the
 * camera shows, from a pool made at `create`; a camera showing more than the pool covers
 * leaves the rest bare and counts a miss.
 */
export class FloorView {
  private readonly tiles: readonly Quad[];

  private readonly tileWidth: number;

  private readonly tileHeight: number;

  private missCount = 0;

  constructor(tiles: readonly Quad[], frameSizes: FrameSizes) {
    this.tiles = tiles;
    this.tileWidth = frameSizes(FLOOR_FRAME);
    this.tileHeight = this.tileWidth / FLOOR_ASPECT;

    for (const tile of tiles) {
      tile.setDepth(DEPTH_FLOOR);
      tile.tint = FLOOR_TINT;
      tile.alpha = OPAQUE;
    }
  }

  /** Frames the camera showed more floor than the pool covers, since creation. */
  get misses(): number {
    return this.missCount;
  }

  /** One frame: covers the screen rectangle `shown` with tiles, and hides the rest. */
  sync(shown: Readonly<Rect>): void {
    const tileWidth = this.tileWidth;
    const tileHeight = this.tileHeight;

    if (tileWidth <= 0) {
      return;
    }

    const firstColumn = Math.floor(shown.minX / tileWidth);
    const firstRow = Math.floor(shown.minY / tileHeight);
    const columns = Math.floor(shown.maxX / tileWidth) - firstColumn + 1;
    const rows = Math.floor(shown.maxY / tileHeight) - firstRow + 1;
    let used = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const tile = this.tiles[used];

        if (tile === undefined) {
          this.missCount += 1;
          this.hideFrom(used);

          return;
        }

        tile.x = (firstColumn + column + HALF) * tileWidth;
        tile.y = (firstRow + row + HALF) * tileHeight;
        tile.visible = true;
        used += 1;
      }
    }

    this.hideFrom(used);
  }

  private hideFrom(first: number): void {
    for (let index = first; index < this.tiles.length; index += 1) {
      const tile = this.tiles[index];

      if (tile !== undefined) {
        tile.visible = false;
      }
    }
  }
}

/**
 * The void around the map: four quads on the ground, over the floor, covering everything
 * outside the bounds as far as the camera can see past them. Bound once per map load.
 */
export class VoidViews {
  private readonly quads: readonly Quad[];

  constructor(quads: readonly Quad[]) {
    this.quads = quads;

    for (const quad of quads) {
      quad.setDepth(DEPTH_FLOOR);
      quad.tint = VOID_TINT;
      quad.alpha = OPAQUE;
    }
  }

  /** Lays the four sides around `bounds`, each reaching the bounds' width and height again past them. */
  bind(bounds: Readonly<Rect>): void {
    const reach = bounds.maxX - bounds.minX + (bounds.maxY - bounds.minY);
    const top = bounds.minY - reach;
    const bottom = bounds.maxY + reach;

    this.lay(0, bounds.minX - reach, top, bounds.minX, bottom);
    this.lay(1, bounds.maxX, top, bounds.maxX + reach, bottom);
    this.lay(2, bounds.minX, top, bounds.maxX, bounds.minY);
    this.lay(3, bounds.minX, bounds.maxY, bounds.maxX, bottom);
  }

  private lay(
    side: number,
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): void {
    const quad = this.quads[side];

    if (quad === undefined) {
      return;
    }

    quad.setDisplaySize(maxX - minX, maxY - minY);
    quad.x = (minX + maxX) * HALF;
    quad.y = (minY + maxY) * HALF;
    quad.visible = true;
  }
}

/** `size` floor tiles from `makeTile`, which makes them in screen space, at scene `create`. */
export const createFloorView = (
  size: number,
  makeTile: QuadFactory,
  frameSizes: FrameSizes,
): FloorView => {
  const tiles: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    tiles.push(makeTile(FLOOR_FRAME));
  }

  return new FloorView(tiles, frameSizes);
};

/** The four sides of the void from `makeQuad`, which lays them on the ground, at scene `create`. */
export const createVoidViews = (makeQuad: QuadFactory): VoidViews => {
  const quads: Quad[] = [];

  for (let side = 0; side < VOID_SIDES; side += 1) {
    quads.push(makeQuad(VOID_FRAME));
  }

  return new VoidViews(quads);
};
