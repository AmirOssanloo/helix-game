import type { WalkabilityView } from "@domain/public";
import {
  cellCentreX,
  cellCentreY,
  columnOf,
  isCellBlocked,
  radiusClassOf,
  rowOf,
} from "@domain/public";
import type { Rect, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenPlacement } from "../camera/projection";
import type { Quad } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { CELL_ALPHA } from "./overlay-marks";

const BLOCKED_TINT = 0xff4040;

/**
 * Every blocked cell of the hero's radius class drawn on screen, shaded. The camera rectangle
 * is the box around the screen's unprojected corners, about twice what the screen shows, so a
 * blocked cell inside it is shaded only when its centre is drawn inside `screen`.
 */
export class BlockedCells {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  private readonly placement: ScreenPlacement;

  /** Scratch for where a cell's centre is drawn this frame. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  constructor(
    quads: readonly Quad[],
    frameWidth: number,
    placement: ScreenPlacement,
  ) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = 1 / frameWidth;
    this.placement = placement;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, rect: Readonly<Rect>, screen: Readonly<Rect>): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);

    if (hero !== null) {
      this.shade(
        world.map.walkability,
        radiusClassOf(world.map.walkability, hero.collisionRadius),
        rect,
        screen,
      );
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }

  private shade(
    grid: WalkabilityView,
    radiusClass: number,
    rect: Readonly<Rect>,
    screen: Readonly<Rect>,
  ): void {
    const drawn = this.drawn;
    const minColumn = Math.max(0, columnOf(grid, rect.minX));
    const maxColumn = Math.min(grid.columns - 1, columnOf(grid, rect.maxX));
    const minRow = Math.max(0, rowOf(grid, rect.minY));
    const maxRow = Math.min(grid.rows - 1, rowOf(grid, rect.maxY));
    const scale = grid.cellSize * this.scalePerUnit;

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        if (!isCellBlocked(grid, radiusClass, column, row)) {
          continue;
        }

        const x = cellCentreX(grid, column);
        const y = cellCentreY(grid, row);

        this.placement.toScreen(x, y, drawn);

        if (
          drawn.x < screen.minX ||
          drawn.x > screen.maxX ||
          drawn.y < screen.minY ||
          drawn.y > screen.maxY
        ) {
          continue;
        }

        const quad = this.run.take();

        if (quad === null) {
          return;
        }

        quad.x = x;
        quad.y = y;
        quad.rotation = 0;
        quad.scale = scale;
        quad.tint = BLOCKED_TINT;
        quad.alpha = CELL_ALPHA;
        quad.visible = true;
      }
    }
  }
}
