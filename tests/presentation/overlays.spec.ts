import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import {
  acquireUnit,
  acquireZone,
  applyDamage,
  setStraightPath,
} from "@domain/public";
import type { OverlayToggles } from "@presentation/public";
import { createOverlayToggles, DebugOverlays } from "@presentation/public";
import type { EntityId, Rect } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FixedHash,
  LabelRecorder,
  makeMapDef,
  makeWorld,
  makeWorldView,
  QuadRecorder,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The tuning table's collision radius, which the hero wears. */
const HERO_COLLISION_RADIUS = 27;

/** A rectangle around the origin, where the hero stands. */
const CAMERA_RECT: Rect = { minX: -500, minY: -500, maxX: 500, maxY: 500 };

/** A wall inside the rectangle, so the walkability overlay has cells to shade. */
const WALL: Rect = { minX: 200, minY: -100, maxX: 300, maxY: 100 };

/** Where the hero's straight path ends. */
const PATH_END_X = 300;
const PATH_END_Y = 0;

/** Where a zone the spell-areas case puts down stands, and how wide the circular one is. */
const ZONE_X = 120;
const ZONE_RADIUS = 80;

const COLLISION_FRAME = "ring_thick";
const AREA_CIRCLE_FRAME = "ring_thin";
const LINE_FRAME = "pixel";
const CELL_FRAME = "square";
const CELL_OUTLINE_FRAME = "square_outline";
const RANGE_FRAME = "ring_thin";

/** Where a grunt the ranges cases spawn stands, where its home is moved to, and how far off one the labels case spawns stands. */
const GRUNT_X = -150;
const GRUNT_HOME_X = -400;
const GRUNT_FAR_X = 1000;

/** Far enough past any leash that a grunt whose home moves this far is past its own. */
const BEYOND_LEASH = 4000;

/** How long a labels case waits for a state before it fails with a count. */
const MAX_TICKS = 900;

/** A state label's size, which tells it apart from a hash cell's count. */
const STATE_LABEL_SIZE = 16;

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  hash: FixedHash;
  overlays: DebugOverlays;
  toggles: OverlayToggles;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  sync: () => void;
};

/** The overlays over a world with the hero at the origin and a hash that answers what the test says, every toggle off. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    map: makeMapDef.build({ obstacles: [WALL] }),
  });
  const hero = spawnHero(world);
  const heroId = world.state.run.heroId;

  if (heroId === null) {
    throw new Error("The hero was spawned");
  }

  const hash = new FixedHash();
  const view = makeWorldView(world, hash);
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const overlays = new DebugOverlays(
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    (size) => {
      const label = new LabelRecorder(size);

      labels.push(label);

      return label;
    },
    () => FRAME_WIDTH,
  );
  const toggles = createOverlayToggles();

  setStraightPath(hero.path, PATH_END_X, PATH_END_Y);

  for (const quad of quads) {
    quad.forgetWrites();
  }

  return {
    world,
    hero,
    heroId,
    hash,
    overlays,
    toggles,
    quads,
    labels,
    sync: (): void => {
      overlays.sync(view, CAMERA_RECT, 0, toggles);
    },
  };
};

const visible = (
  quads: readonly QuadRecorder[],
  frame: string,
): QuadRecorder[] =>
  quads.filter((quad) => quad.frame === frame && quad.visible);

const writesOf = (quads: readonly QuadRecorder[]): number =>
  quads.reduce((total, quad) => total + quad.writes.length, 0);

describe("the debug overlays", () => {
  it("bind nothing and write nothing while every toggle is off", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.sync();

    expect(writesOf(arranged.quads)).toBe(0);
    expect(arranged.quads.some((quad) => quad.visible)).toBe(false);
    expect(arranged.labels.some((label) => label.visible)).toBe(false);
    expect(arranged.hash.rectangleQueries).toBe(0);
  });

  it("draw one collision ring per unit the hash answers, scaled to its collision radius", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    const rings = visible(arranged.quads, COLLISION_FRAME);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.scale).toBeCloseTo(
      (HERO_COLLISION_RADIUS * 2) / FRAME_WIDTH,
    );
    expect(rings[0]?.depth).toBe(90);
  });

  it("hide what an overlay showed the frame it goes off, and write nothing after", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.collisionDiscs = true;
    arranged.sync();
    arranged.toggles.collisionDiscs = false;
    arranged.sync();

    expect(visible(arranged.quads, COLLISION_FRAME)).toHaveLength(0);

    for (const quad of arranged.quads) {
      quad.forgetWrites();
    }

    arranged.sync();

    expect(writesOf(arranged.quads)).toBe(0);
  });

  it("draw the hero's heading and the two edges of its cone as three lines", () => {
    const arranged = arrange();

    arranged.toggles.facingCone = true;
    arranged.sync();

    expect(visible(arranged.quads, LINE_FRAME)).toHaveLength(3);
  });

  it("draw a path line from where the unit stands to its next waypoint", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.pathLines = true;
    arranged.sync();

    const lines = visible(arranged.quads, LINE_FRAME);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.x).toBe(PATH_END_X / 2);
    expect(lines[0]?.y).toBe(PATH_END_Y);
    expect(lines[0]?.scaleX).toBeCloseTo(PATH_END_X / FRAME_WIDTH);
  });

  it("shade the cells the hero's radius class may not stand in", () => {
    const arranged = arrange();

    arranged.toggles.walkabilityGrid = true;
    arranged.sync();

    const cells = visible(arranged.quads, CELL_FRAME);

    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.x >= WALL.minX - 100)).toBe(true);
  });

  it("outline each occupied hash cell inside the rectangle with its count, rewriting the count only when it changes", () => {
    const arranged = arrange();

    arranged.hash.cells = [
      { cellX: 0, cellY: 0, count: 3 },
      { cellX: 50, cellY: 50, count: 1 },
    ];
    arranged.toggles.hashCells = true;
    arranged.sync();
    arranged.sync();

    const outlines = visible(arranged.quads, CELL_OUTLINE_FRAME);
    const shown = arranged.labels.filter((label) => label.visible);

    expect(outlines).toHaveLength(1);
    expect(outlines[0]?.x).toBe(arranged.hash.cellSize / 2);
    expect(outlines[0]?.scale).toBeCloseTo(
      arranged.hash.cellSize / FRAME_WIDTH,
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]?.text).toBe("3");
    expect(shown[0]?.rewrites).toBe(1);
  });

  it("outline every zone on the ground as the simulation holds it, whatever its shape", () => {
    const arranged = arrange();
    const circle = acquireZone(arranged.world.state, ZONE_X, 0, 0);
    const box = acquireZone(arranged.world.state, 0, ZONE_X, Math.PI / 2);
    const zones = arranged.world.state.map.zones;
    const circleZone = circle === null ? null : zones.resolve(circle);
    const boxZone = box === null ? null : zones.resolve(box);

    if (circleZone === null || boxZone === null) {
      throw new Error("The zone pool has room for both zones");
    }

    circleZone.circle.radius = ZONE_RADIUS;
    boxZone.shape = { kind: "rectangle", length: 256, width: 64 };
    arranged.toggles.spellAreas = true;
    arranged.sync();

    const rings = visible(arranged.quads, AREA_CIRCLE_FRAME);
    const boxes = visible(arranged.quads, CELL_OUTLINE_FRAME);

    expect(rings).toHaveLength(1);
    expect(rings[0]?.x).toBe(ZONE_X);
    expect(rings[0]?.scaleX).toBeCloseTo((ZONE_RADIUS * 2) / FRAME_WIDTH);
    expect(rings[0]?.rotation).toBe(0);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]?.scaleX).toBeCloseTo(256 / FRAME_WIDTH);
    expect(boxes[0]?.scaleY).toBeCloseTo(64 / FRAME_WIDTH);
    expect(boxes[0]?.rotation).toBe(Math.PI / 2);
  });

  it("count a miss instead of growing when an overlay wants more quads than its pool holds", () => {
    const arranged = arrange();
    const units = arranged.world.state.map.units;

    for (let index = 0; index < 340; index += 1) {
      const id = units.acquire() === null ? null : units.idAt(units.end - 1);

      if (id !== null) {
        arranged.hash.ids.push(id);
      }
    }

    arranged.toggles.collisionDiscs = true;
    arranged.sync();

    expect(visible(arranged.quads, COLLISION_FRAME)).toHaveLength(320);
    expect(arranged.overlays.misses).toBe(1);
  });

  it("ring the hero's attack range to a target's edge and its acquire radius, around where it is drawn", () => {
    const arranged = arrange();
    const attack = arranged.world.state.run.heroAttack.def;

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.unitRanges = true;
    arranged.sync();

    const rings = visible(arranged.quads, RANGE_FRAME);
    const diameters = rings.map((ring) => (ring.scale * FRAME_WIDTH) / 2);

    expect(rings).toHaveLength(2);
    expect(rings.every((ring) => ring.x === 0 && ring.y === 0)).toBe(true);
    expect(diameters[0]).toBeCloseTo(attack.range + arranged.hero.boundRadius);
    expect(diameters[1]).toBeCloseTo(attack.acquireRadius);
  });

  it("ring each enemy's aggro radius around it and its leash radius around its spawn point, and nothing for a zero radius", () => {
    const arranged = arrange();
    const grunt = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: GRUNT_X,
      y: 0,
    });
    const dummy = spawnEnemy(arranged.world, {
      definitionId: "training_dummy",
      x: 0,
      y: GRUNT_X,
    });

    grunt.spawnPoint.x = GRUNT_HOME_X;
    arranged.hash.ids = [
      unitIdOf(arranged.world, grunt),
      unitIdOf(arranged.world, dummy),
    ];
    arranged.toggles.unitRanges = true;
    arranged.sync();

    const rings = visible(arranged.quads, RANGE_FRAME);
    const aggro = rings.find((ring) => ring.x === GRUNT_X);
    const leash = rings.find((ring) => ring.x === GRUNT_HOME_X);

    expect(rings).toHaveLength(2);
    expect(((aggro?.scale ?? 0) * FRAME_WIDTH) / 2).toBeCloseTo(700);
    expect(((leash?.scale ?? 0) * FRAME_WIDTH) / 2).toBeCloseTo(1500);
  });

  it("label an enemy idle, then chase, then attack, then return, as the enemies page's states run", () => {
    const arranged = arrange();
    const grunt = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: -GRUNT_FAR_X,
      y: 0,
    });
    const gruntId = unitIdOf(arranged.world, grunt);
    const shown: (string | null)[] = [];
    const record = (): void => {
      arranged.sync();

      const label = arranged.labels.find(
        (candidate) =>
          candidate.visible &&
          candidate.x === grunt.prev.x &&
          candidate.size === STATE_LABEL_SIZE,
      );

      shown.push(label === undefined ? null : label.text);
    };

    arranged.hash.ids = [gruntId];
    arranged.toggles.stateLabels = true;
    record();

    applyDamage(arranged.world.state, gruntId, 1, "pure", arranged.heroId);
    tickUntil(arranged.world, () => grunt.ai.state === "chase", MAX_TICKS);
    record();
    tickUntil(arranged.world, () => grunt.ai.state === "attack", MAX_TICKS);
    record();
    grunt.spawnPoint.x = grunt.curr.x + BEYOND_LEASH;
    tickUntil(arranged.world, () => grunt.ai.state === "return", MAX_TICKS);
    record();

    expect(shown).toEqual(["IDLE", "CHASE", "ATTACK", "RETURN"]);
  });

  it("label the hero with its order state, and rewrite a label only when the state under it changes", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.stateLabels = true;
    arranged.sync();
    arranged.sync();

    const label = arranged.labels.find(
      (candidate) => candidate.visible && candidate.size === STATE_LABEL_SIZE,
    );

    expect(label?.text).toBe("IDLE");
    expect(label?.rewrites).toBe(1);
    expect(label?.y).toBeLessThan(-HERO_COLLISION_RADIUS);

    arranged.hero.state = "attack_windup";
    arranged.sync();

    expect(label?.text).toBe("ATTACK-WINDUP");
    expect(label?.rewrites).toBe(2);
  });

  it("label the dummy, which the machine holds in Idle, and nothing over a body with no definition", () => {
    const arranged = arrange();
    const dummy = spawnEnemy(arranged.world, {
      definitionId: "training_dummy",
      x: GRUNT_X,
      y: 0,
    });
    const bareId = acquireUnit(arranged.world.state, "enemy", 0, GRUNT_X);

    if (bareId === null) {
      throw new Error("The unit pool has room for a bare body");
    }

    arranged.hash.ids = [unitIdOf(arranged.world, dummy), bareId];
    arranged.toggles.stateLabels = true;
    arranged.sync();

    const shown = arranged.labels.filter((label) => label.visible);

    expect(shown).toHaveLength(1);
    expect(shown[0]?.x).toBe(GRUNT_X);
    expect(shown[0]?.text).toBe("IDLE");
  });

  it("hide the ranges and the labels the frame they go off, and write nothing after", () => {
    const arranged = arrange();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.unitRanges = true;
    arranged.toggles.stateLabels = true;
    arranged.sync();
    arranged.toggles.unitRanges = false;
    arranged.toggles.stateLabels = false;
    arranged.sync();

    expect(visible(arranged.quads, RANGE_FRAME)).toHaveLength(0);
    expect(arranged.labels.some((label) => label.visible)).toBe(false);

    for (const quad of arranged.quads) {
      quad.forgetWrites();
    }

    arranged.sync();

    expect(writesOf(arranged.quads)).toBe(0);
  });
});
