import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Unit } from "@domain/public";
import type { TargetingCursor } from "@presentation/public";
import {
  closeCursor,
  createTargetingCursor,
  DEPTH_GROUND,
  PREVIEW_SIZE,
  TargetingPreview,
} from "@presentation/public";
import type { Simulation } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  QuadRecorder,
  spawnHero,
} from "../helpers";

const FRAME_WIDTH = 128;

const RANGE = 600;

const IN_RANGE_TINT = 0xffffff;
const OUT_OF_RANGE_TINT = 0xff3030;

const HERO_X = 1000;
const HERO_Y = 500;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
  range: RANGE,
  atlasFrame: "square",
});
const unitSpell = makeSpellDef.build({
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "unit",
  range: RANGE,
});
const directionSpell = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "direction",
  range: RANGE,
  atlasFrame: "triangle",
});

const form = makeFormDef.build({
  abilities: [pointSpell.id, unitSpell.id, directionSpell.id],
});

type Arranged = {
  world: Simulation;
  hero: Unit;
  cursor: TargetingCursor;
  preview: TargetingPreview;
  ring: QuadRecorder;
  shape: QuadRecorder;
};

/** A preview over a world whose hero stands at (1000, 500), with a cursor open on `abilityId` and its targeting kind. */
const arrange = (
  abilityId: string,
  targeting: TargetingCursor["targeting"],
): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, unitSpell, directionSpell],
    }),
  });
  const hero = spawnHero(world, { x: HERO_X, y: HERO_Y });
  const quads: QuadRecorder[] = [];
  const preview = new TargetingPreview(
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
  );
  const [ring, shape] = quads;
  const cursor = createTargetingCursor();

  if (ring === undefined || shape === undefined) {
    throw new Error("The preview makes a ring and a shape");
  }

  cursor.kind = "slot";
  cursor.slot = 5;
  cursor.abilityId = abilityId;
  cursor.targeting = targeting;

  return { world, hero, cursor, preview, ring, shape };
};

describe("the targeting preview", () => {
  it("makes two quads at the ground band and shows nothing while the cursor is closed", () => {
    const arranged = arrange(pointSpell.id, "point");

    closeCursor(arranged.cursor);
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.ring.depth).toBe(DEPTH_GROUND);
    expect(arranged.shape.depth).toBe(DEPTH_GROUND);
    expect(arranged.ring.visible).toBe(false);
    expect(arranged.shape.visible).toBe(false);
    expect(arranged.preview.open).toBe(false);
  });

  it("draws the ring at the spell's range around where the hero is drawn this frame", () => {
    const arranged = arrange(pointSpell.id, "point");

    arranged.hero.curr.x = HERO_X + 60;
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0.5);

    expect(arranged.ring.visible).toBe(true);
    expect(arranged.ring.x).toBe(HERO_X + 30);
    expect(arranged.ring.y).toBe(HERO_Y);
    expect(arranged.ring.scale).toBe((RANGE * 2) / FRAME_WIDTH);
    expect(arranged.ring.frame).toBe("ring_thin");
  });

  it("is white at the range and red at range plus one unit", () => {
    const arranged = arrange(pointSpell.id, "point");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + RANGE,
      HERO_Y,
      0,
    );

    expect(arranged.ring.tint).toBe(IN_RANGE_TINT);
    expect(arranged.shape.tint).toBe(IN_RANGE_TINT);

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + RANGE + 1,
      HERO_Y,
      0,
    );

    expect(arranged.ring.tint).toBe(OUT_OF_RANGE_TINT);
    expect(arranged.shape.tint).toBe(OUT_OF_RANGE_TINT);
  });

  it("puts a point spell's shape under the pointer, from the definition's frame, unrotated", () => {
    const arranged = arrange(pointSpell.id, "point");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + 100,
      HERO_Y - 50,
      0,
    );

    expect(arranged.shape.visible).toBe(true);
    expect(arranged.shape.frame).toBe("square");
    expect(arranged.shape.x).toBe(HERO_X + 100);
    expect(arranged.shape.y).toBe(HERO_Y - 50);
    expect(arranged.shape.rotation).toBe(0);
    expect(arranged.shape.scale).toBe(PREVIEW_SIZE / FRAME_WIDTH);
  });

  it("puts a unit spell's shape under the pointer the same way", () => {
    const arranged = arrange(unitSpell.id, "unit");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X - 200,
      HERO_Y,
      0,
    );

    expect(arranged.shape.frame).toBe("disc");
    expect(arranged.shape.x).toBe(HERO_X - 200);
    expect(arranged.shape.y).toBe(HERO_Y);
  });

  it("turns a direction spell's shape on the hero toward the pointer, and is never out of range", () => {
    const arranged = arrange(directionSpell.id, "direction");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X,
      HERO_Y + 5000,
      0,
    );

    expect(arranged.shape.frame).toBe("triangle");
    expect(arranged.shape.x).toBe(HERO_X);
    expect(arranged.shape.y).toBe(HERO_Y);
    expect(arranged.shape.rotation).toBeCloseTo(Math.PI / 2);
    expect(arranged.shape.tint).toBe(IN_RANGE_TINT);
    expect(arranged.ring.tint).toBe(IN_RANGE_TINT);
  });

  it("changes the shape's frame only when the spell does", () => {
    const arranged = arrange(pointSpell.id, "point");

    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);
    arranged.shape.forgetWrites();
    arranged.preview.sync(arranged.world.view, arranged.cursor, 1, 1, 0);

    expect(arranged.shape.writes).not.toContain("setFrame");

    arranged.cursor.abilityId = directionSpell.id;
    arranged.cursor.targeting = "direction";
    arranged.preview.sync(arranged.world.view, arranged.cursor, 1, 1, 0);

    expect(arranged.shape.frame).toBe("triangle");
  });

  it("closes when the cursor closes", () => {
    const arranged = arrange(pointSpell.id, "point");

    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.preview.open).toBe(true);

    closeCursor(arranged.cursor);
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.preview.open).toBe(false);
  });
});
