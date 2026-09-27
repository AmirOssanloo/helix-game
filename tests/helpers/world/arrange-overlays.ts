import type { UnitId } from "@domain/public";
import type { Unit } from "@domain/public";
import { setStraightPath } from "@domain/public";
import type { OverlayToggles, ScreenPlacement } from "@presentation/public";
import {
  createOverlayToggles,
  DebugOverlays,
  ScreenUnits,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import type { Simulation, WorldView } from "@simulation/public";
import { makeMapDef } from "../content/make-map-def";
import { FixedHash } from "../doubles/fixed-hash";
import { FLAT_PLACEMENT } from "../doubles/flat-placement";
import { LabelRecorder } from "../doubles/label-recorder";
import { QuadRecorder } from "../doubles/quad-recorder";
import { makeWorld } from "./make-world";
import { makeWorldView } from "./make-world-view";
import { spawnHero } from "./spawn-hero";

/** Every frame the test atlas holds is this wide. */
export const OVERLAY_FRAME_WIDTH = 128;

/** A rectangle around the origin, where the hero stands; flat, it is the screen as well. */
export const OVERLAY_CAMERA_RECT: Rect = {
  minX: -500,
  minY: -500,
  maxX: 500,
  maxY: 500,
};

/** A wall inside the rectangle, so the walkability overlay has cells to shade. */
export const OVERLAY_WALL: Rect = {
  minX: 200,
  minY: -100,
  maxX: 300,
  maxY: 100,
};

/** Where the hero's straight path ends. */
export const OVERLAY_PATH_END_X = 300;

/** The overlays with every quad and label they made, in the order they made them. */
export type MadeOverlays = {
  overlays: DebugOverlays;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
};

/** Makes the overlays over recorders, placed by `placement`. */
export const makeOverlays = (placement: ScreenPlacement): MadeOverlays => {
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
    () => OVERLAY_FRAME_WIDTH,
    placement,
  );

  return { overlays, quads, labels };
};

/** One frame of the overlays as the play scene draws it: the units inside `rect` gathered once, then the overlays. */
export const syncOverlays = (
  overlays: DebugOverlays,
  view: WorldView,
  rect: Readonly<Rect>,
  screen: Readonly<Rect>,
  toggles: Readonly<OverlayToggles>,
): void => {
  const units = new ScreenUnits();

  units.gather(view, rect);
  overlays.sync(view, units, rect, screen, 0, toggles);
};

export type ArrangedOverlays = MadeOverlays & {
  world: Simulation;
  hero: Unit;
  heroId: UnitId;
  hash: FixedHash;
  toggles: OverlayToggles;
  sync: () => void;
};

/**
 * The overlays, placed by `placement`, over a world with the wall, the hero at the origin on a
 * straight path to the path's end, and a hash that answers what the test says, every toggle off.
 */
export const arrangeOverlays = (
  placement: ScreenPlacement = FLAT_PLACEMENT,
): ArrangedOverlays => {
  const world = makeWorld({
    seed: 1,
    map: makeMapDef.build({ obstacles: [OVERLAY_WALL] }),
  });
  const hero = spawnHero(world);
  const heroId = world.state.run.heroId;

  if (heroId === null) {
    throw new Error("The hero was spawned");
  }

  const hash = new FixedHash();
  const view = makeWorldView(world, hash);
  const made = makeOverlays(placement);
  const toggles = createOverlayToggles();

  setStraightPath(hero.path, OVERLAY_PATH_END_X, 0);

  for (const quad of made.quads) {
    quad.forgetWrites();
  }

  return {
    ...made,
    world,
    hero,
    heroId,
    hash,
    toggles,
    sync: (): void => {
      syncOverlays(
        made.overlays,
        view,
        OVERLAY_CAMERA_RECT,
        OVERLAY_CAMERA_RECT,
        toggles,
      );
    },
  };
};

/** The quads of `frame` showing now. */
export const visibleQuads = (
  quads: readonly QuadRecorder[],
  frame: string,
): QuadRecorder[] =>
  quads.filter((quad) => quad.frame === frame && quad.visible);

/** Every field write the quads recorded since they last forgot. */
export const quadWritesOf = (quads: readonly QuadRecorder[]): number =>
  quads.reduce((total, quad) => total + quad.writes.length, 0);
