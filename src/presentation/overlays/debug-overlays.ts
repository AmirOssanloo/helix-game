import type { Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenPlacement } from "../camera/projection";
import type { ScreenUnits } from "../camera/screen-units";
import type {
  FrameSizes,
  Label,
  LabelFactory,
  QuadFactory,
} from "../views/quad";
import {
  OVERLAY_AREA_COUNT,
  OVERLAY_BLOCKED_CELL_COUNT,
  OVERLAY_FACING_QUAD_COUNT,
  OVERLAY_HASH_CELL_COUNT,
  OVERLAY_HERO_RANGE_QUAD_COUNT,
  OVERLAY_PATH_SEGMENT_COUNT,
  OVERLAY_RING_COUNT,
  OVERLAY_STATE_LABEL_COUNT,
} from "../views/view-counts";
import { BlockedCells } from "./blocked-cells";
import { FacingCone } from "./facing-cone";
import { HashCells } from "./hash-cells";
import { makeOverlayQuads } from "./overlay-marks";
import type { OverlayToggles } from "./overlay-toggles";
import { PathLines } from "./path-lines";
import {
  AREA_CIRCLE_FRAME,
  AREA_CONE_FRAME,
  AREA_RECTANGLE_FRAME,
  SpellAreas,
} from "./spell-areas";
import { STATE_LABEL_SIZE, StateLabels } from "./state-labels";
import { UnitRanges } from "./unit-ranges";
import { UnitRings } from "./unit-rings";

/** A ring marks a radius; a stretched pixel is a line; a square shades a cell and its outline frames one. */
const COLLISION_FRAME = "ring_thick";
const BOUND_FRAME = "ring_thin";
const LINE_FRAME = "pixel";
const CELL_FRAME = "square";
const CELL_OUTLINE_FRAME = "square_outline";

/** A range is a thin ring, as the targeting cursor's is. */
const RANGE_FRAME = "ring_thin";

const COLLISION_TINT = 0x4fc3f7;
const BOUND_TINT = 0xffd166;

/** The count label's line height, in pixels of the atlas font. */
const COUNT_LABEL_SIZE = 20;

/** `size` labels of `lineHeight`, hidden, made once. */
const makeLabels = (
  size: number,
  lineHeight: number,
  makeLabel: LabelFactory,
): Label[] => {
  const labels: Label[] = [];

  for (let index = 0; index < size; index += 1) {
    labels.push(makeLabel(lineHeight));
  }

  return labels;
};

/**
 * The debug overlays the play scene draws over the world where the panel is, each from its own
 * quads at the debug band and each behind one toggle. An overlay that is on reads the world
 * view, the units on screen, and the camera rectangle and writes its quads like any view; one
 * that is off binds nothing and writes nothing, past hiding what it showed the frame it went
 * off. Every quad and label is made once, at scene `create`; nothing here allocates during play.
 */
export class DebugOverlays {
  private readonly collision: UnitRings;

  private readonly bound: UnitRings;

  private readonly facing: FacingCone;

  private readonly paths: PathLines;

  private readonly blocked: BlockedCells;

  private readonly hash: HashCells;

  private readonly areas: SpellAreas;

  private readonly ranges: UnitRanges;

  private readonly states: StateLabels;

  constructor(
    makeQuad: QuadFactory,
    makeLabel: LabelFactory,
    frameSizes: FrameSizes,
    placement: ScreenPlacement,
  ) {
    // The count labels are made before the state labels, which keeps their draw order.
    const countLabels = makeLabels(
      OVERLAY_HASH_CELL_COUNT,
      COUNT_LABEL_SIZE,
      makeLabel,
    );
    const stateLabels = makeLabels(
      OVERLAY_STATE_LABEL_COUNT,
      STATE_LABEL_SIZE,
      makeLabel,
    );

    this.collision = new UnitRings(
      makeOverlayQuads(OVERLAY_RING_COUNT, COLLISION_FRAME, makeQuad),
      frameSizes(COLLISION_FRAME),
      COLLISION_TINT,
      (unit) => unit.collisionRadius,
    );
    this.bound = new UnitRings(
      makeOverlayQuads(OVERLAY_RING_COUNT, BOUND_FRAME, makeQuad),
      frameSizes(BOUND_FRAME),
      BOUND_TINT,
      (unit) => unit.boundRadius,
    );
    this.facing = new FacingCone(
      makeOverlayQuads(OVERLAY_FACING_QUAD_COUNT, LINE_FRAME, makeQuad),
      frameSizes(LINE_FRAME),
    );
    this.paths = new PathLines(
      makeOverlayQuads(OVERLAY_PATH_SEGMENT_COUNT, LINE_FRAME, makeQuad),
      frameSizes(LINE_FRAME),
    );
    this.blocked = new BlockedCells(
      makeOverlayQuads(OVERLAY_BLOCKED_CELL_COUNT, CELL_FRAME, makeQuad),
      frameSizes(CELL_FRAME),
      placement,
    );
    this.hash = new HashCells(
      makeOverlayQuads(OVERLAY_HASH_CELL_COUNT, CELL_OUTLINE_FRAME, makeQuad),
      countLabels,
      frameSizes(CELL_OUTLINE_FRAME),
      placement,
    );
    this.areas = new SpellAreas(
      makeOverlayQuads(OVERLAY_AREA_COUNT, AREA_CIRCLE_FRAME, makeQuad),
      makeOverlayQuads(OVERLAY_AREA_COUNT, AREA_RECTANGLE_FRAME, makeQuad),
      makeOverlayQuads(OVERLAY_AREA_COUNT, AREA_CONE_FRAME, makeQuad),
      frameSizes,
    );
    this.ranges = new UnitRanges(
      makeOverlayQuads(OVERLAY_HERO_RANGE_QUAD_COUNT, RANGE_FRAME, makeQuad),
      makeOverlayQuads(OVERLAY_RING_COUNT, RANGE_FRAME, makeQuad),
      makeOverlayQuads(OVERLAY_RING_COUNT, RANGE_FRAME, makeQuad),
      frameSizes(RANGE_FRAME),
    );
    this.states = new StateLabels(stateLabels, placement);
  }

  /** Frames an overlay wanted more quads than its pool holds, summed over every overlay since creation. */
  get misses(): number {
    return (
      this.collision.misses +
      this.bound.misses +
      this.paths.misses +
      this.blocked.misses +
      this.hash.misses +
      this.areas.misses +
      this.ranges.misses +
      this.states.misses
    );
  }

  /**
   * One frame: each overlay that is on reads the world inside `rect` and writes its quads; each
   * that is off hides once and is left alone. `units` are the units inside `rect`, gathered
   * once this frame for every view that binds by unit. `screen` is the screen rectangle, before
   * the camera's scroll and widened past a cell's drawn half-width, that the two cell overlays
   * keep to.
   */
  sync(
    world: WorldView,
    units: ScreenUnits,
    rect: Readonly<Rect>,
    screen: Readonly<Rect>,
    alpha: number,
    toggles: Readonly<OverlayToggles>,
  ): void {
    if (toggles.collisionDiscs) {
      this.collision.sync(world, units, alpha);
    } else {
      this.collision.hide();
    }

    if (toggles.boundRadii) {
      this.bound.sync(world, units, alpha);
    } else {
      this.bound.hide();
    }

    if (toggles.facingCone) {
      this.facing.sync(world, alpha);
    } else {
      this.facing.hide();
    }

    if (toggles.pathLines) {
      this.paths.sync(world, units, alpha);
    } else {
      this.paths.hide();
    }

    if (toggles.walkabilityGrid) {
      this.blocked.sync(world, rect, screen);
    } else {
      this.blocked.hide();
    }

    if (toggles.hashCells) {
      this.hash.sync(world, rect, screen);
    } else {
      this.hash.hide();
    }

    if (toggles.spellAreas) {
      this.areas.sync(world, rect, alpha);
    } else {
      this.areas.hide();
    }

    if (toggles.unitRanges) {
      this.ranges.sync(world, units, alpha);
    } else {
      this.ranges.hide();
    }

    if (toggles.stateLabels) {
      this.states.sync(world, units, alpha);
    } else {
      this.states.hide();
    }
  }
}
