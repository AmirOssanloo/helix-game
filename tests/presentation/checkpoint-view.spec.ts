import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { Unit } from "@domain/public";
import { checkpointSystem } from "@domain/public";
import type { CheckpointViews } from "@presentation/public";
import {
  CHECKPOINT_AHEAD_TINT,
  CHECKPOINT_FRAME,
  CHECKPOINT_REACHED_TINT,
  CHECKPOINT_WORD,
  createCheckpointViews,
  createFloatingNumberViews,
  DEPTH_GROUND,
  showCheckpointReached,
} from "@presentation/public";
import type { Rect, Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  FLAT_PLACEMENT,
  LabelRecorder,
  makeMapDef,
  makeWorld,
  QuadRecorder,
  SYNC_FIELDS,
  spawnHero,
  submit,
} from "../helpers";

/** Every frame the test atlas holds is this wide, so a scale reads as a world size over it. */
const FRAME_WIDTH = 128;

/** The shipped reach, which the ring is as wide as. */
const REACH = tuningTable.checkpoint_reach_radius;

/** Three checkpoints along the +X axis, far enough apart that one screen shows one. */
const CHECKPOINTS: readonly Readonly<Vec2>[] = [
  { x: 0, y: 0 },
  { x: 4000, y: 0 },
  { x: 8000, y: 0 },
];

const map = makeMapDef.build({ checkpoints: CHECKPOINTS });

/** A world rectangle the size of a screen around `x`, `y`. */
const screenAround = (x: number, y: number): Rect => ({
  minX: x - 1000,
  minY: y - 600,
  maxX: x + 1000,
  maxY: y + 600,
});

/** A rectangle holding every checkpoint of the map. */
const WHOLE_MAP: Rect = { minX: -1000, minY: -1000, maxX: 9000, maxY: 1000 };

type Arranged = {
  world: Simulation;
  hero: Unit;
  views: CheckpointViews;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  reader: EventReader;
  /** Stands the hero at (`x`, `y`), runs the rule once, and shows every event it announced. */
  standAt: (x: number, y: number) => void;
};

/** A hero at the first checkpoint with none reached, `size` checkpoint quads, and a set of four floating labels. */
const arrange = (size: number): Arranged => {
  const world = makeWorld({ seed: 1, map });
  const hero = spawnHero(world);
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const views = createCheckpointViews(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    FRAME_WIDTH,
  );
  const numbers = createFloatingNumberViews(
    4,
    (labelSize) => {
      const label = new LabelRecorder(labelSize);

      labels.push(label);

      return label;
    },
    FLAT_PLACEMENT,
  );
  const reader = createEventReader();

  return {
    world,
    hero,
    views,
    quads,
    labels,
    reader,
    standAt: (x, y): void => {
      hero.curr.x = x;
      hero.curr.y = y;
      hero.prev.x = x;
      hero.prev.y = y;
      checkpointSystem(world.state);

      let event = world.events.read(reader);

      while (event !== null) {
        showCheckpointReached(event, world.view, 0, numbers);
        event = world.events.read(reader);
      }
    },
  };
};

const shown = (quads: readonly QuadRecorder[]): QuadRecorder[] =>
  quads.filter((quad) => quad.visible);

const words = (labels: readonly LabelRecorder[]): LabelRecorder[] =>
  labels.filter((label) => label.visible || label.text !== null);

describe("the checkpoint markers", () => {
  it("makes every quad a ring at the ground band, hidden until a checkpoint is on screen", () => {
    const { quads } = arrange(4);

    expect(quads).toHaveLength(4);

    for (const quad of quads) {
      expect(quad.frame).toBe(CHECKPOINT_FRAME);
      expect(quad.depth).toBe(DEPTH_GROUND);
      expect(quad.visible).toBe(false);
    }
  });

  it("draws a ring where each checkpoint stands, as wide as the reach, when all are on screen", () => {
    const { world, views, quads } = arrange(4);

    views.sync(world.view, WHOLE_MAP);

    expect(shown(quads).map((quad) => [quad.x, quad.y])).toEqual(
      CHECKPOINTS.map((point) => [point.x, point.y]),
    );
    expect(quads[0]?.scale).toBe((REACH * 2) / FRAME_WIDTH);
    expect(views.bound).toBe(3);
    expect(views.misses).toBe(0);
  });

  it("draws only the checkpoints on screen, and follows the camera with no miss", () => {
    const { world, views, quads } = arrange(1);

    for (const point of CHECKPOINTS) {
      views.sync(world.view, screenAround(point.x, point.y));

      expect(shown(quads).map((quad) => [quad.x, quad.y])).toEqual([
        [point.x, point.y],
      ]);
    }

    views.sync(world.view, screenAround(2000, 5000));

    expect(shown(quads)).toHaveLength(0);
    expect(views.bound).toBe(0);
    expect(views.misses).toBe(0);
  });

  it("keeps a ring whose edge is on screen though its centre is not", () => {
    const { world, views, quads } = arrange(1);
    const edgeOnly: Rect = {
      minX: 4000 + REACH - 10,
      minY: -600,
      maxX: 4000 + REACH + 2000,
      maxY: 600,
    };

    views.sync(world.view, edgeOnly);

    expect(shown(quads).map((quad) => quad.x)).toEqual([4000]);
  });

  it("counts a checkpoint on screen with no quad free as a miss, and draws the rest", () => {
    const { world, views, quads } = arrange(2);

    views.sync(world.view, WHOLE_MAP);

    expect(shown(quads)).toHaveLength(2);
    expect(views.misses).toBe(1);
  });

  it("writes only sync fields each frame", () => {
    const { world, views, quads } = arrange(4);

    views.sync(world.view, WHOLE_MAP);

    for (const quad of quads) {
      quad.forgetWrites();
    }

    views.sync(world.view, WHOLE_MAP);

    for (const quad of quads) {
      expect(quad.writes.every((field) => SYNC_FIELDS.includes(field))).toBe(
        true,
      );
    }
  });

  it("tints a reached checkpoint apart from one not reached yet", () => {
    const arranged = arrange(4);

    arranged.standAt(4000, 0);
    arranged.views.sync(arranged.world.view, WHOLE_MAP);

    expect(arranged.quads.slice(0, 3).map((quad) => quad.tint)).toEqual([
      CHECKPOINT_REACHED_TINT,
      CHECKPOINT_REACHED_TINT,
      CHECKPOINT_AHEAD_TINT,
    ]);
    expect(CHECKPOINT_REACHED_TINT).not.toBe(CHECKPOINT_AHEAD_TINT);
  });

  it("hides the rings of a map with fewer checkpoints on the next frame", () => {
    const { world, views, quads } = arrange(4);

    views.sync(world.view, WHOLE_MAP);
    views.sync(world.view, screenAround(8000, 0));

    expect(shown(quads)).toHaveLength(1);
  });

  it("widens the rings on the frame after the reach is retuned", () => {
    const { world, views, quads } = arrange(4);

    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "checkpoint_reach_radius",
      value: REACH * 2,
    });
    world.tick();
    views.sync(world.view, WHOLE_MAP);

    expect(quads[0]?.scale).toBe((REACH * 4) / FRAME_WIDTH);
  });
});

describe("the word on a checkpoint reached", () => {
  it("raises the word over the hero once when it reaches a new checkpoint, in the reached tint", () => {
    const arranged = arrange(4);

    arranged.standAt(4000, 0);

    const raised = words(arranged.labels);

    expect(raised).toHaveLength(1);
    expect(raised[0]?.text).toBe(CHECKPOINT_WORD);
    expect(raised[0]?.tint).toBe(CHECKPOINT_REACHED_TINT);

    arranged.standAt(4000, 0);

    expect(words(arranged.labels)).toHaveLength(1);
  });

  it("raises nothing walking back past an earlier checkpoint", () => {
    const arranged = arrange(4);

    arranged.standAt(8000, 0);
    arranged.standAt(4000, 0);
    arranged.standAt(0, 0);

    expect(words(arranged.labels)).toHaveLength(1);
    expect(arranged.world.view.map.furthestCheckpoint).toBe(2);
  });

  it("raises a word for each new furthest along the way", () => {
    const arranged = arrange(4);

    arranged.standAt(0, 0);
    arranged.standAt(4000, 0);
    arranged.standAt(8000, 0);

    expect(words(arranged.labels).map((label) => label.text)).toEqual([
      CHECKPOINT_WORD,
      CHECKPOINT_WORD,
      CHECKPOINT_WORD,
    ]);
  });
});
