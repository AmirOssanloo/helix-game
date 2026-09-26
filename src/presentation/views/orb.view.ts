import { orbAt } from "@domain/public";
import type { WorldView } from "@simulation/public";
import { orbTint } from "../hud/palette";
import { DEPTH_AIR } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";

const ORB_FRAME = "disc";

const ORB_DIAMETER = 14;

/** How far outside the hero's body the orbs circle. */
const ORBIT_MARGIN = 14;

/** Radians the orbit turns per tick: one revolution every four seconds at thirty ticks a second. */
const ORBIT_RATE = (Math.PI * 2) / 120;

const FULL_TURN = Math.PI * 2;

const OPAQUE = 1;

/**
 * The held orb instances circling the hero in age order, oldest first, each in its orb's
 * colour. Read from the hero's active form each frame: which instances are held, and where
 * the hero is, interpolated like the hero's own view. The orbit turns with the tick count,
 * so it pauses with the simulation and replays the same. One quad per slot of the orb
 * buffer; a slot with no instance is hidden.
 */
export class OrbViews {
  private readonly quads: readonly Quad[];

  private readonly scalePerUnit: number;

  constructor(quads: readonly Quad[], frameSizes: FrameSizes) {
    this.quads = quads;
    this.scalePerUnit = 1 / frameSizes(ORB_FRAME);
  }

  sync(world: WorldView, alpha: number): void {
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : world.map.units.resolve(heroId);
    const form =
      hero === null ? undefined : world.run.forms[hero.activeFormIndex];

    if (hero === null || form === undefined) {
      this.hide();

      return;
    }

    const centreX = interpolate(hero.prev.x, hero.curr.x, alpha);
    const centreY = interpolate(hero.prev.y, hero.curr.y, alpha);
    const radius = hero.boundRadius + ORBIT_MARGIN;
    const base = (world.tick + alpha) * ORBIT_RATE;
    const step = FULL_TURN / this.quads.length;

    for (let index = 0; index < this.quads.length; index += 1) {
      const quad = this.quads[index];
      const orb = orbAt(form.kit, index);

      if (quad === undefined) {
        continue;
      }

      if (orb === null) {
        quad.visible = false;

        continue;
      }

      const angle = base + index * step;

      quad.x = centreX + Math.cos(angle) * radius;
      quad.y = centreY + Math.sin(angle) * radius;
      quad.rotation = 0;
      quad.scale = ORB_DIAMETER * this.scalePerUnit;
      quad.tint = orbTint(orb);
      quad.alpha = OPAQUE;
      quad.visible = true;
    }
  }

  private hide(): void {
    for (let index = 0; index < this.quads.length; index += 1) {
      const quad = this.quads[index];

      if (quad !== undefined) {
        quad.visible = false;
      }
    }
  }
}

/** The largest orb buffer any of the hero's forms holds: how many orb quads the scene needs. */
export const orbSlotsOf = (world: WorldView): number => {
  let slots = 0;

  for (let index = 0; index < world.run.forms.length; index += 1) {
    const form = world.run.forms[index];

    if (form !== undefined && form.kit.orbs.length > slots) {
      slots = form.kit.orbs.length;
    }
  }

  return slots;
};

/** `size` orb quads from `makeQuad`, framed and banded once, at scene `create`. */
export const createOrbViews = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
): OrbViews => {
  const quads: Quad[] = [];

  for (let index = 0; index < size; index += 1) {
    const quad = makeQuad(ORB_FRAME);

    quad.setDepth(DEPTH_AIR);
    quads.push(quad);
  }

  return new OrbViews(quads, frameSizes);
};
