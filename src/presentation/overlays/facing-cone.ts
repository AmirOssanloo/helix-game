import { readTunable } from "@domain/queries";
import type { WorldView } from "@simulation/public";
import type { Quad } from "../views/quad";
import { interpolate } from "../views/quad";
import { layLine } from "./overlay-marks";

const FACING_TINT = 0xffffff;
const CONE_TINT = 0x80ff80;

/** How far the facing line and the cone edges reach from the hero, in world units. */
const FACING_LENGTH = 160;

/** The hero's heading and the two edges of its action cone, from the tuned half-angle. */
export class FacingCone {
  private readonly quads: readonly Quad[];

  private readonly scalePerUnit: number;

  private shown = false;

  constructor(quads: readonly Quad[], frameWidth: number) {
    this.quads = quads;
    this.scalePerUnit = 1 / frameWidth;
  }

  sync(world: WorldView, alpha: number): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);
    const [heading, left, right] = this.quads;

    if (
      hero === null ||
      heading === undefined ||
      left === undefined ||
      right === undefined
    ) {
      this.hide();

      return;
    }

    const x = interpolate(hero.prev.x, hero.curr.x, alpha);
    const y = interpolate(hero.prev.y, hero.curr.y, alpha);
    const halfAngle = readTunable(world.run.tuning, "action_cone_deg");

    this.ray(heading, x, y, hero.facing, FACING_TINT);
    this.ray(left, x, y, hero.facing - halfAngle, CONE_TINT);
    this.ray(right, x, y, hero.facing + halfAngle, CONE_TINT);
    this.shown = true;
  }

  hide(): void {
    if (!this.shown) {
      return;
    }

    for (let index = 0; index < this.quads.length; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }

    this.shown = false;
  }

  private ray(
    quad: Quad,
    x: number,
    y: number,
    angle: number,
    tint: number,
  ): void {
    layLine(
      quad,
      x,
      y,
      x + Math.cos(angle) * FACING_LENGTH,
      y + Math.sin(angle) * FACING_LENGTH,
      this.scalePerUnit,
      tint,
    );
  }
}
