import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import { addOrb } from "@domain/public";
import type { OrbViews } from "@presentation/public";
import { createOrbViews, DEPTH_AIR, ORB_TINTS } from "@presentation/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, QuadRecorder, spawnHero } from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 32;

/** The hero stands here. */
const HERO_X = 400;
const HERO_Y = 300;

/** How many instances the hero's buffer holds. */
const SLOTS = 3;

const NO_ALPHA = 0;
const HALF_WAY = 0.5;

type Arranged = {
  world: Simulation;
  hero: Unit;
  orbs: OrbViews;
  quads: QuadRecorder[];
  /** Presses `orb` into the hero's buffer, at the newest end. */
  press: (orb: number) => void;
};

/** A world holding the hero, every orb learned, and an orb quad per slot of its buffer. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  const hero = spawnHero(world, {
    x: HERO_X,
    y: HERO_Y,
    orbLevels: [1, 1, 1],
  });

  const quads: QuadRecorder[] = [];
  const orbs = createOrbViews(
    SLOTS,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
  );

  return {
    world,
    hero,
    orbs,
    quads,
    press: (orb): void => {
      const form = world.state.run.forms[0];

      if (form === undefined) {
        throw new Error("The hero has a form");
      }

      addOrb(form.kit, orb);
    },
  };
};

/** The quads showing something this frame. */
const visible = (arranged: Arranged): QuadRecorder[] =>
  arranged.quads.filter((quad) => quad.visible);

describe("the orbs around the hero", () => {
  it("show nothing while the buffer is empty", () => {
    const arranged = arrange();

    arranged.orbs.sync(arranged.world.view, NO_ALPHA);

    expect(visible(arranged)).toHaveLength(0);
  });

  it("show the held instances oldest first in their orb's colour, as the bar orders them", () => {
    const arranged = arrange();

    arranged.press(2);
    arranged.press(0);
    arranged.orbs.sync(arranged.world.view, NO_ALPHA);

    expect(visible(arranged).map((quad) => quad.tint)).toEqual([
      ORB_TINTS[2],
      ORB_TINTS[0],
    ]);
  });

  it("circle the hero clear of its body, in the air band", () => {
    const arranged = arrange();

    for (let orb = 0; orb < SLOTS; orb += 1) {
      arranged.press(orb);
    }

    arranged.orbs.sync(arranged.world.view, NO_ALPHA);

    const distances = visible(arranged).map((quad) =>
      Math.hypot(quad.x - HERO_X, quad.y - HERO_Y),
    );

    expect(distances).toHaveLength(SLOTS);

    for (const distance of distances) {
      expect(distance).toBeGreaterThan(arranged.hero.collisionRadius);
      expect(distance).toBeCloseTo(distances[0] ?? Number.NaN);
    }

    for (const quad of arranged.quads) {
      expect(quad.depth).toBe(DEPTH_AIR);
    }
  });

  it("turn with the tick count and hold still while it does not move", () => {
    const arranged = arrange();

    arranged.press(0);
    arranged.orbs.sync(arranged.world.view, NO_ALPHA);

    const [orb] = visible(arranged);

    if (orb === undefined) {
      throw new Error("One held instance shows one orb");
    }

    const x = orb.x;

    arranged.orbs.sync(arranged.world.view, HALF_WAY);

    const turned = orb.x;

    expect(turned).not.toBe(x);

    // A paused driver hands the same tick and the same fraction every frame.
    arranged.orbs.sync(arranged.world.view, HALF_WAY);

    expect(orb.x).toBe(turned);
  });
});
