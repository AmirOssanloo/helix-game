import type { Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenUnits } from "../camera/screen-units";
import type { Quad } from "../views/quad";
import { interpolate } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { layLine } from "./overlay-marks";

const PATH_TINT = 0xff80ff;

/** One segment per waypoint left on every path on screen, the first from where the unit stands. */
export class PathLines {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = 1 / frameWidth;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, units: ScreenUnits, alpha: number): void {
    const ids = units.ids;

    for (let index = 0; index < units.count; index += 1) {
      const id = ids[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null || !this.trace(unit, alpha)) {
        continue;
      }

      break;
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }

  /** Lays the segments of `unit`'s remaining path. `true` when the pool ran out. */
  private trace(unit: DeepReadonly<Unit>, alpha: number): boolean {
    const path = unit.path;
    let fromX = interpolate(unit.prev.x, unit.curr.x, alpha);
    let fromY = interpolate(unit.prev.y, unit.curr.y, alpha);

    for (let index = path.next; index < path.count; index += 1) {
      const point = path.points[index];

      if (point === undefined) {
        continue;
      }

      const quad = this.run.take();

      if (quad === null) {
        return true;
      }

      layLine(
        quad,
        fromX,
        fromY,
        point.x,
        point.y,
        this.scalePerUnit,
        PATH_TINT,
      );
      fromX = point.x;
      fromY = point.y;
    }

    return false;
  }
}
