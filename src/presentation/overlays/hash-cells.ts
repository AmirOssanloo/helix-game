import type { HashCell } from "@domain/public";
import { createHashCell } from "@domain/public";
import type { Rect, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenPlacement } from "../camera/projection";
import type { Label, Quad } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { CELL_ALPHA, LABEL_TINT, OPAQUE } from "./overlay-marks";

const HASH_TINT = 0x40ff40;

/** A count label showing nothing yet. */
const NO_COUNT = -1;

/**
 * Every occupied hash cell drawn on screen, outlined, with its count. As with the blocked
 * cells, the camera rectangle is about twice what the screen shows, so a cell inside it is
 * drawn only when its centre is drawn inside `screen` widened by half the cell's drawn size,
 * which keeps a cell the screen's edge cuts through and drops the ones it cannot show.
 */
export class HashCells {
  private readonly run: QuadRun;

  private readonly labels: readonly Label[];

  /** Per label: the count it shows, so a steady count costs no rewrite. */
  private readonly counts: number[];

  private readonly scalePerUnit: number;

  private readonly placement: ScreenPlacement;

  /** Scratch for where a cell's centre is drawn this frame. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  /** Scratch for where two opposite corners of a cell are drawn, for its drawn size. */
  private readonly cornerA: Vec2 = { x: 0, y: 0 };

  private readonly cornerB: Vec2 = { x: 0, y: 0 };

  /** The screen rectangle widened by half a cell's drawn size, rewritten each frame. */
  private readonly reach: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  private readonly cell: HashCell = createHashCell();

  private labelsBound = 0;

  private labelsLastBound = 0;

  constructor(
    quads: readonly Quad[],
    labels: readonly Label[],
    frameWidth: number,
    placement: ScreenPlacement,
  ) {
    this.run = new QuadRun(quads);
    this.labels = labels;
    this.placement = placement;
    this.counts = [];
    this.scalePerUnit = 1 / frameWidth;

    for (let index = 0; index < labels.length; index += 1) {
      this.counts.push(NO_COUNT);
    }
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, rect: Readonly<Rect>, screen: Readonly<Rect>): void {
    const hash = world.map.spatialHash;
    const size = hash.cellSize;
    const cell = this.cell;
    const drawn = this.drawn;
    const reach = this.widen(screen, size);

    for (let index = 0; index < hash.cellSlots; index += 1) {
      if (!hash.readCell(index, cell)) {
        continue;
      }

      const minX = cell.cellX * size;
      const minY = cell.cellY * size;

      if (
        minX + size < rect.minX ||
        minX > rect.maxX ||
        minY + size < rect.minY ||
        minY > rect.maxY
      ) {
        continue;
      }

      this.placement.toScreen(minX + size / 2, minY + size / 2, drawn);

      if (
        drawn.x < reach.minX ||
        drawn.x > reach.maxX ||
        drawn.y < reach.minY ||
        drawn.y > reach.maxY
      ) {
        continue;
      }

      const quad = this.run.take();
      const label = this.labels[this.labelsBound];

      if (quad === null || label === undefined) {
        break;
      }

      quad.x = minX + size / 2;
      quad.y = minY + size / 2;
      quad.rotation = 0;
      quad.scale = size * this.scalePerUnit;
      quad.tint = HASH_TINT;
      quad.alpha = CELL_ALPHA;
      quad.visible = true;

      label.x = drawn.x;
      label.y = drawn.y;
      label.tint = LABEL_TINT;
      label.alpha = OPAQUE;
      label.visible = true;

      if (this.counts[this.labelsBound] !== cell.count) {
        this.counts[this.labelsBound] = cell.count;
        label.setText(String(cell.count));
      }

      this.labelsBound += 1;
    }

    this.finishLabels();
    this.run.finish();
  }

  hide(): void {
    this.finishLabels();
    this.run.hide();
  }

  /**
   * `screen` widened on each side by half how wide and how tall a cell of `size` is drawn: a
   * cell's drawn width is the larger of its two diagonals across the screen, its height the
   * larger down it, so the same sum holds flat or projected.
   */
  private widen(screen: Readonly<Rect>, size: number): Readonly<Rect> {
    const a = this.cornerA;
    const b = this.cornerB;
    const reach = this.reach;

    this.placement.toScreen(size, 0, a);
    this.placement.toScreen(0, size, b);

    const acrossX = Math.abs(a.x - b.x);
    const acrossY = Math.abs(a.y - b.y);

    this.placement.toScreen(0, 0, a);
    this.placement.toScreen(size, size, b);

    const halfWidth = Math.max(acrossX, Math.abs(a.x - b.x)) / 2;
    const halfHeight = Math.max(acrossY, Math.abs(a.y - b.y)) / 2;

    reach.minX = screen.minX - halfWidth;
    reach.maxX = screen.maxX + halfWidth;
    reach.minY = screen.minY - halfHeight;
    reach.maxY = screen.maxY + halfHeight;

    return reach;
  }

  private finishLabels(): void {
    for (
      let index = this.labelsBound;
      index < this.labelsLastBound;
      index += 1
    ) {
      const label = this.labels[index];

      if (label !== undefined) {
        label.visible = false;
      }
    }

    this.labelsLastBound = this.labelsBound;
    this.labelsBound = 0;
  }
}
