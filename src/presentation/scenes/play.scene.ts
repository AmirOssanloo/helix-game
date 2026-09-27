import Phaser from "phaser";
import { readTunable } from "@domain/queries";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { CameraFrame } from "../camera/camera-frame";
import { GroundLayer } from "../camera/ground-layer";
import { Projection, VIEW_SCALE } from "../camera/projection";
import { ScreenUnits } from "../camera/screen-units";
import { WorldCamera } from "../camera/world-camera";
import { refusalFlashTicks } from "../hud/slot-flashes";
import {
  bindSceneInput,
  cameraLens,
  claimedSink,
} from "../input/bind-scene-input";
import { InputMapper } from "../input/input-mapper";
import type { InputIntents } from "../input/input-ports";
import type { SceneContext } from "../scene-context";
import { DEPTH_DEBUG } from "../views/depth-bands";
import type { FloatingNumberViews } from "../views/floating-number.view";
import { createFloatingNumberViews } from "../views/floating-number.view";
import { HitFlashes, HitNumbers } from "../views/hit-feedback";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import { FLOATING_NUMBER_COUNT } from "../views/view-counts";
import type { PlayStage, PlayViewSyncer } from "./play-stage";
import { ViewSyncerList } from "./view-syncers";

export const PLAY_SCENE_KEY = "play";

const SHUTDOWN_EVENT = "shutdown";

/** Fired by the scene once its children have been rendered, so a frame's render time closes here. */
const RENDER_EVENT = Phaser.Scenes.Events.RENDER;

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/** The unbind of a scene that has not bound its input yet. */
const NOT_BOUND = (): void => {};

/** What `create` makes and `update` drives. */
type Built = Readonly<{
  ground: GroundLayer;
  syncers: ViewSyncerList<PlayStage>;
}>;

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands, asking the input
 * claim before the mapper sees any event. The world is
 * drawn through the projection: what lies on the ground is made inside the ground layer and
 * written in world coordinates, and what stands up off it, the icons, the numbers, and the
 * labels, is made in the scene and placed where its point is drawn. The frame's steps are the
 * view syncers the composition root registers: `create` makes the stage they share and then
 * each of them, with every pool it will ever hold, and `update` hands the frame to the driver
 * and walks them in their sync order. The scene names no view; after the last step it keeps
 * the ground layer in band order and writes the frame's view misses into their ring.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly entries: readonly PlayViewSyncer[];

  private built: Built | null = null;

  private unbindInput: () => void = NOT_BOUND;

  /** When this frame's sync began, on the driver's clock, so the render event measures sync and render together. */
  private frameStartMs = 0;

  /** `entries` are the frame's steps, made at `create` and walked in their sync order. */
  constructor(context: SceneContext, entries: readonly PlayViewSyncer[]) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
    this.entries = entries;
  }

  create(): void {
    const projection = new Projection();
    const ground = new GroundLayer(this, VIEW_SCALE);
    const camera = new WorldCamera(
      this.cameras.main,
      projection,
      readTunable(this.context.world.run.tuning, "camera_follow_lerp"),
    );
    // A quad on the ground is written in world coordinates; one standing up is placed in screen ones.
    const makeQuad: QuadFactory = (frame) =>
      ground.add(
        this.add.image(0, 0, ATLAS_TEXTURE_KEY, frame).setVisible(false),
      );
    const makeStandingQuad: QuadFactory = (frame) =>
      this.add.image(0, 0, ATLAS_TEXTURE_KEY, frame).setVisible(false);
    // The debug band is the default; a view whose labels belong in another sets its own.
    const makeLabel: LabelFactory = (size) =>
      this.add
        .bitmapText(0, 0, ATLAS_FONT_KEY, "", size)
        .setOrigin(LABEL_ORIGIN)
        .setDepth(DEPTH_DEBUG)
        .setVisible(false);
    const frameSizes: FrameSizes = (frame) =>
      this.context.atlas.frameWidth(frame);
    const intents: InputIntents = {
      slotRefused: (slot, reason): void => {
        this.context.flashes.flash(
          slot,
          reason,
          this.context.driver.nextTick,
          refusalFlashTicks(this.context.world),
        );
      },
    };
    const lens = cameraLens(this.cameras.main, projection);
    const mapper = new InputMapper({
      driver: this.context.driver,
      lens,
      world: this.context.world,
      intents,
      groundPick: this.context.groundPick,
    });

    let numbers: FloatingNumberViews | null = null;
    const sharedNumbers = (): FloatingNumberViews => {
      numbers ??= createFloatingNumberViews(
        FLOATING_NUMBER_COUNT,
        makeLabel,
        projection,
      );

      return numbers;
    };
    const stage: PlayStage = {
      context: this.context,
      world: this.context.world,
      projection,
      ground,
      camera,
      lens,
      mapper,
      makeQuad,
      makeStandingQuad,
      makeLabel,
      frameSizes,
      pointer: () => this.input.activePointer,
      screen: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      frame: new CameraFrame(projection),
      onScreen: new ScreenUnits(),
      numbers: sharedNumbers,
      flashes: new HitFlashes(),
      hitNumbers: new HitNumbers(),
    };

    this.built = {
      ground,
      syncers: new ViewSyncerList(this.entries, stage),
    };

    const onRender = (): void => {
      this.context.rings.renderTime.write(
        this.context.driver.now() - this.frameStartMs,
      );
    };

    this.context.claim.bindMapper(mapper);
    this.unbindInput = bindSceneInput(
      this,
      claimedSink(this.context.claim, mapper),
    );
    this.events.on(RENDER_EVENT, onRender);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      this.events.off(RENDER_EVENT, onRender);
      this.unbindInput();
      this.unbindInput = NOT_BOUND;
      this.context.claim.unbindMapper();
      this.built = null;
    });
  }

  override update(_time: number, delta: number): void {
    this.context.driver.onFrame(delta);

    // The ticks ran inside the frame above; what follows is the sync, and the render after it.
    this.frameStartMs = this.context.driver.now();

    const built = this.built;

    if (built === null) {
      return;
    }

    built.syncers.sync(this.context.driver.alpha);
    built.ground.keepSorted();
    this.context.rings.viewMisses.write(built.syncers.misses);
  }
}
