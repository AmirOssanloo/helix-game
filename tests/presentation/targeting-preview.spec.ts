import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Unit } from "@domain/public";
import type { TargetingCursor } from "@presentation/public";
import {
  closeCursor,
  createTargetingCursor,
  DEPTH_GROUND,
  RETICLE_SIZE,
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

/** The colour each spell below is drawn in, and what a preview past the range turns instead. */
const CIRCLE_TINT = 0x112233;
const RETICLE_TINT = 0x445566;
const RECTANGLE_TINT = 0x778899;
const CONE_TINT = 0xaabbcc;
const BARE_TINT = 0xddeeff;
const OUT_OF_RANGE_TINT = 0xff3030;

const HERO_X = 1000;
const HERO_Y = 500;

const CIRCLE_RADIUS = 250;
const RECTANGLE_WIDTH = 80;
const RECTANGLE_LENGTHS = [700, 800, 900, 1000, 1100, 1200, 1300];
const RECTANGLE_OFFSETS = [200, 250, 300, 350, 400, 450, 500];
const CONE_LENGTH = 450;

/** The Whorl level the rectangle spell's tables are read at, and where its entries sit. */
const WHORL_LEVEL = 3;
const WHORL_ENTRY = 2;

const circleSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
  range: RANGE,
  preview: { kind: "circle", radius: CIRCLE_RADIUS, atlasFrame: "ring_thin" },
  tint: CIRCLE_TINT,
});
const reticleSpell = makeSpellDef.build({
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "unit",
  range: RANGE,
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  tint: RETICLE_TINT,
});
const rectangleSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "whorl"],
  targeting: "direction",
  range: 0,
  preview: {
    kind: "rectangle",
    length: { orb: "whorl", byLevel: RECTANGLE_LENGTHS },
    width: RECTANGLE_WIDTH,
    offset: { orb: "whorl", byLevel: RECTANGLE_OFFSETS },
    atlasFrame: "square_outline",
  },
  tint: RECTANGLE_TINT,
});
const coneSpell = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "direction",
  range: 0,
  preview: {
    kind: "cone",
    angleDegrees: 60,
    length: CONE_LENGTH,
    atlasFrame: "cone_60",
  },
  tint: CONE_TINT,
});
const bareSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "ember"],
  targeting: "point",
  range: RANGE,
  preview: { kind: "none" },
  tint: BARE_TINT,
});

const spells = [
  circleSpell,
  reticleSpell,
  rectangleSpell,
  coneSpell,
  bareSpell,
];

const form = makeFormDef.build({
  abilities: spells.map((spell) => spell.id),
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
  orbLevels: readonly number[] = [],
): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells,
    }),
  });
  const hero = spawnHero(world, { x: HERO_X, y: HERO_Y, orbLevels });
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
    const arranged = arrange(circleSpell.id, "point");

    closeCursor(arranged.cursor);
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.ring.depth).toBe(DEPTH_GROUND);
    expect(arranged.shape.depth).toBe(DEPTH_GROUND);
    expect(arranged.ring.visible).toBe(false);
    expect(arranged.shape.visible).toBe(false);
    expect(arranged.preview.open).toBe(false);
  });

  it("draws the ring at the spell's range around where the hero is drawn this frame", () => {
    const arranged = arrange(circleSpell.id, "point");

    arranged.hero.curr.x = HERO_X + 60;
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0.5);

    expect(arranged.ring.visible).toBe(true);
    expect(arranged.ring.x).toBe(HERO_X + 30);
    expect(arranged.ring.y).toBe(HERO_Y);
    expect(arranged.ring.scale).toBe((RANGE * 2) / FRAME_WIDTH);
    expect(arranged.ring.frame).toBe("ring_thin");
  });

  it("hides the ring for a spell with no range", () => {
    const arranged = arrange(coneSpell.id, "direction");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + 100,
      HERO_Y,
      0,
    );

    expect(arranged.ring.visible).toBe(false);
  });

  it("wears the spell's tint at the range and red at range plus one unit", () => {
    const arranged = arrange(circleSpell.id, "point");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + RANGE,
      HERO_Y,
      0,
    );

    expect(arranged.ring.tint).toBe(CIRCLE_TINT);
    expect(arranged.shape.tint).toBe(CIRCLE_TINT);

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

  it("puts a circle preview under the pointer at its radius, unrotated", () => {
    const arranged = arrange(circleSpell.id, "point");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X + 100,
      HERO_Y - 50,
      0,
    );

    expect(arranged.shape.visible).toBe(true);
    expect(arranged.shape.frame).toBe("ring_thin");
    expect(arranged.shape.x).toBe(HERO_X + 100);
    expect(arranged.shape.y).toBe(HERO_Y - 50);
    expect(arranged.shape.rotation).toBe(0);
    expect(arranged.shape.scaleX).toBe((CIRCLE_RADIUS * 2) / FRAME_WIDTH);
    expect(arranged.shape.scaleY).toBe((CIRCLE_RADIUS * 2) / FRAME_WIDTH);
  });

  it("puts a unit reticle under the pointer at the reticle's own size", () => {
    const arranged = arrange(reticleSpell.id, "unit");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X - 200,
      HERO_Y,
      0,
    );

    expect(arranged.shape.frame).toBe("ring_thick");
    expect(arranged.shape.x).toBe(HERO_X - 200);
    expect(arranged.shape.y).toBe(HERO_Y);
    expect(arranged.shape.rotation).toBe(0);
    expect(arranged.shape.scaleX).toBe(RETICLE_SIZE / FRAME_WIDTH);
  });

  it("places a rectangle preview its offset in front of the hero, turned toward the pointer", () => {
    const arranged = arrange(rectangleSpell.id, "direction", [
      0,
      WHORL_LEVEL,
      0,
    ]);
    const offset = RECTANGLE_OFFSETS[WHORL_ENTRY] ?? 0;
    const length = RECTANGLE_LENGTHS[WHORL_ENTRY] ?? 0;

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X,
      HERO_Y + 300,
      0,
    );

    expect(arranged.shape.frame).toBe("square_outline");
    expect(arranged.shape.x).toBeCloseTo(HERO_X);
    expect(arranged.shape.y).toBeCloseTo(HERO_Y + offset);
    expect(arranged.shape.rotation).toBeCloseTo(Math.PI / 2);
    expect(arranged.shape.scaleX).toBe(length / FRAME_WIDTH);
    expect(arranged.shape.scaleY).toBe(RECTANGLE_WIDTH / FRAME_WIDTH);
  });

  it("reads a rectangle preview's tables at the hero's orb levels", () => {
    const first = arrange(rectangleSpell.id, "direction", [0, 1, 0]);
    const seventh = arrange(rectangleSpell.id, "direction", [
      0,
      heroDef.maxOrbLevel,
      0,
    ]);

    first.preview.sync(first.world.view, first.cursor, HERO_X + 100, HERO_Y, 0);
    seventh.preview.sync(
      seventh.world.view,
      seventh.cursor,
      HERO_X + 100,
      HERO_Y,
      0,
    );

    expect(first.shape.scaleX).toBe((RECTANGLE_LENGTHS[0] ?? 0) / FRAME_WIDTH);
    expect(seventh.shape.scaleX).toBe(
      (RECTANGLE_LENGTHS[heroDef.maxOrbLevel - 1] ?? 0) / FRAME_WIDTH,
    );
    expect(seventh.shape.x).toBeCloseTo(
      HERO_X + (RECTANGLE_OFFSETS[heroDef.maxOrbLevel - 1] ?? 0),
    );
  });

  it("puts a cone preview on the hero turned toward the pointer, its length a radius, and is never out of range", () => {
    const arranged = arrange(coneSpell.id, "direction");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X,
      HERO_Y + 5000,
      0,
    );

    expect(arranged.shape.frame).toBe("cone_60");
    expect(arranged.shape.x).toBe(HERO_X);
    expect(arranged.shape.y).toBe(HERO_Y);
    expect(arranged.shape.rotation).toBeCloseTo(Math.PI / 2);
    expect(arranged.shape.scaleX).toBe((CONE_LENGTH * 2) / FRAME_WIDTH);
    expect(arranged.shape.scaleY).toBe((CONE_LENGTH * 2) / FRAME_WIDTH);
    expect(arranged.shape.tint).toBe(CONE_TINT);
  });

  it("shows the range ring and no shape for a spell that previews nothing", () => {
    const arranged = arrange(bareSpell.id, "point");

    arranged.preview.sync(
      arranged.world.view,
      arranged.cursor,
      HERO_X,
      HERO_Y,
      0,
    );

    expect(arranged.ring.visible).toBe(true);
    expect(arranged.shape.visible).toBe(false);
    expect(arranged.preview.open).toBe(true);
  });

  it("changes the shape's frame only when the spell does", () => {
    const arranged = arrange(circleSpell.id, "point");

    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);
    arranged.shape.forgetWrites();
    arranged.preview.sync(arranged.world.view, arranged.cursor, 1, 1, 0);

    expect(arranged.shape.writes).not.toContain("setFrame");

    arranged.cursor.abilityId = coneSpell.id;
    arranged.cursor.targeting = "direction";
    arranged.preview.sync(arranged.world.view, arranged.cursor, 1, 1, 0);

    expect(arranged.shape.frame).toBe("cone_60");
  });

  it("closes when the cursor closes", () => {
    const arranged = arrange(circleSpell.id, "point");

    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.preview.open).toBe(true);

    closeCursor(arranged.cursor);
    arranged.preview.sync(arranged.world.view, arranged.cursor, 0, 0, 0);

    expect(arranged.preview.open).toBe(false);
  });
});
