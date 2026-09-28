import type { Rect, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import type { GroundLayer } from "../camera/ground-layer";
import type { Projection } from "../camera/projection";
import type { ScreenUnits } from "../camera/screen-units";
import type { WorldCamera } from "../camera/world-camera";
import type { InputMapper } from "../input/input-mapper";
import type { CameraLens, PickPort } from "../input/input-ports";
import type { SceneContext } from "../scene-context";
import type { FloatingNumberViews } from "../views/floating-number.view";
import type { HitFlashes, HitNumbers } from "../views/hit-feedback";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import type { ViewSyncerEntry } from "./view-syncers";

/**
 * What the play scene makes at `create` and shares with every step of its frame: the context,
 * the camera and what it shows this frame, the factories a pool makes its quads and labels
 * with, and the few things more than one step reads or writes. A step's own pool is made by
 * its entry, not here. The rectangles are scratch one step writes and later steps read; the
 * sync order says which comes first.
 */
export type PlayStage = Readonly<{
  context: SceneContext;
  world: WorldView;
  projection: Projection;
  ground: GroundLayer;
  camera: WorldCamera;
  lens: CameraLens;
  mapper: InputMapper;
  /** What the ground-item views say is drawn where, rewritten by them each frame for a right click to read. */
  picks: PickPort;
  /** A quad on the ground, written in world coordinates. */
  makeQuad: QuadFactory;
  /** A quad that stands up off the ground, placed at its projected point. */
  makeStandingQuad: QuadFactory;
  /** A label at the debug band; a view whose labels belong in another sets its own. */
  makeLabel: LabelFactory;
  frameSizes: FrameSizes;
  /** Where the pointer is on the canvas this frame. */
  pointer: () => Readonly<Vec2>;
  /** The screen rectangle the floor covers this frame. */
  screen: Rect;
  /** What the camera shows this frame, for the views that bind by it. */
  frame: CameraFrame;
  /** The units inside the camera's world box, gathered once a frame for every view that binds by unit. */
  onScreen: ScreenUnits;
  /**
   * The numbers rising where hits landed, written by the event drain and released on a map
   * load. Made on the first ask, which is the numbers step's `create`, so its labels take their
   * place in pool order there and draw over the status icons in the band they share; a step
   * that only writes to it asks during the sync.
   */
  numbers: () => FloatingNumberViews;
  /** Which units were hit and until which tick, written by the event drain and read by the unit views. */
  flashes: HitFlashes;
  hitNumbers: HitNumbers;
}>;

/** A step of the play scene's frame, as the composition root registers it. */
export type PlayViewSyncer = ViewSyncerEntry<PlayStage>;
