import type { Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenUnits } from "../camera/screen-units";
import type { Quad } from "../views/quad";
import { interpolate } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { DIAMETERS_PER_RADIUS, RING_ALPHA } from "./overlay-marks";

/** One ring per unit on screen, scaled to the radius `radiusOf` reads: the collision discs and the bound radii. */
export class UnitRings {
  private readonly run: QuadRun;

  private readonly scalePerUnit: number;

  private readonly tint: number;

  private readonly radiusOf: (unit: DeepReadonly<Unit>) => number;

  constructor(
    quads: readonly Quad[],
    frameWidth: number,
    tint: number,
    radiusOf: (unit: DeepReadonly<Unit>) => number,
  ) {
    this.run = new QuadRun(quads);
    this.scalePerUnit = DIAMETERS_PER_RADIUS / frameWidth;
    this.tint = tint;
    this.radiusOf = radiusOf;
  }

  get misses(): number {
    return this.run.misses;
  }

  sync(world: WorldView, units: ScreenUnits, alpha: number): void {
    const ids = units.ids;

    for (let index = 0; index < units.count; index += 1) {
      const id = ids[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null) {
        continue;
      }

      const quad = this.run.take();

      if (quad === null) {
        break;
      }

      quad.x = interpolate(unit.prev.x, unit.curr.x, alpha);
      quad.y = interpolate(unit.prev.y, unit.curr.y, alpha);
      quad.rotation = 0;
      quad.scale = this.radiusOf(unit) * this.scalePerUnit;
      quad.tint = this.tint;
      quad.alpha = RING_ALPHA;
      quad.visible = true;
    }

    this.run.finish();
  }

  hide(): void {
    this.run.hide();
  }
}
