import type { HashCell, SpatialHashView } from "@domain/public";
import type { EntityId, Rect, Vec2 } from "@shared/public";

/**
 * A hash for a sync test: answers every query with the ids it was given, wherever they are,
 * reports the cells it was given as its occupied ones, and remembers the last rectangle it
 * was asked, so a spec proves the sync bound what the hash said and asked for the camera
 * rectangle.
 */
export class FixedHash implements SpatialHashView {
  readonly cellSize = 128;

  readonly misses = 0;

  /** What every query answers with, in this order. */
  ids: EntityId[] = [];

  /** What a cell walk reports, one per index. */
  cells: HashCell[] = [];

  /** The rectangle of the last `queryRectangle`. */
  readonly lastRectangle: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  rectangleQueries = 0;

  get count(): number {
    return this.ids.length;
  }

  get cellSlots(): number {
    return this.cells.length;
  }

  readCell(index: number, out: HashCell): boolean {
    const cell = this.cells[index];

    if (cell === undefined) {
      return false;
    }

    out.cellX = cell.cellX;
    out.cellY = cell.cellY;
    out.count = cell.count;

    return true;
  }

  queryCircle(
    _centre: Readonly<Vec2>,
    _radius: number,
    out: EntityId[],
  ): number {
    return this.answer(out);
  }

  querySegment(
    _from: Readonly<Vec2>,
    _to: Readonly<Vec2>,
    _radius: number,
    out: EntityId[],
  ): number {
    return this.answer(out);
  }

  queryRectangle(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    out: EntityId[],
  ): number {
    this.lastRectangle.minX = minX;
    this.lastRectangle.minY = minY;
    this.lastRectangle.maxX = maxX;
    this.lastRectangle.maxY = maxY;
    this.rectangleQueries += 1;

    return this.answer(out);
  }

  private answer(out: EntityId[]): number {
    for (let index = 0; index < this.ids.length; index += 1) {
      const id = this.ids[index];

      if (id !== undefined) {
        out[index] = id;
      }
    }

    return this.ids.length;
  }
}
