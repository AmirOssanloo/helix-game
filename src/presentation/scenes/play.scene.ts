import Phaser from "phaser";
import {
  createCandidateBuffer,
  UNIT_CAPACITY,
  ZONE_CAPACITY,
} from "@domain/public";
import type { EntityId, Rect, Vec2 } from "@shared/public";
import type { EventReader, WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { WorldCamera } from "../camera/world-camera";
import { bindSceneInput, cameraLens } from "../input/bind-scene-input";
import { InputMapper } from "../input/input-mapper";
import type { CameraLens, InputIntents } from "../input/input-ports";
import { TargetingPreview } from "../input/targeting-preview";
import { DebugOverlays } from "../overlays/debug-overlays";
import type { SceneContext } from "../scene-context";
import { DEPTH_DEBUG } from "../views/depth-bands";
import type { ObstacleViews } from "../views/obstacle.view";
import { createObstacleViews } from "../views/obstacle.view";
import type { OrbViews } from "../views/orb.view";
import { createOrbViews, orbSlotsOf } from "../views/orb.view";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import { interpolate } from "../views/quad";
import type { UnitViewPool } from "../views/unit.view";
import {
  createUnitViewPool,
  syncUnitViews,
  UNIT_VIEW_MARGIN,
} from "../views/unit.view";
import type { ZoneViewPool } from "../views/zone.view";
import { createZoneViewPool, syncZoneViews } from "../views/zone.view";

export const PLAY_SCENE_KEY = "play";

const SHUTDOWN_EVENT = "shutdown";

/** Fired by the scene once its children have been rendered, so a frame's render time closes here. */
const RENDER_EVENT = Phaser.Scenes.Events.RENDER;

/** Unit views: the live cap on screen plus a margin, and what the benchmark drives. A presentation number, not the unit capacity. */
const UNIT_VIEW_COUNT = 320;

/** Obstacle quads: room for a map several times as busy as the arena. */
const OBSTACLE_VIEW_COUNT = 64;

/** Zone views: the zone pool's whole capacity, since every zone alive can be on screen at once. */
const ZONE_VIEW_COUNT = ZONE_CAPACITY;

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/** The unbind of a scene that has not bound its input yet. */
const NOT_BOUND = (): void => {};

/** What `create` makes and `update` drives. `null` until then. */
type Stage = {
  camera: WorldCamera;
  lens: CameraLens;
  mapper: InputMapper;
  preview: TargetingPreview;
  obstacles: ObstacleViews;
  units: UnitViewPool;
  zones: ZoneViewPool;
  orbs: OrbViews;
  overlays: DebugOverlays;
  /** The map whose obstacles and bounds are bound, so a map load rebinds them once. */
  boundMapId: string | null;
};

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands. `create`
 * makes every pool it will ever hold; `update` hands the frame to the driver, then reads the
 * world view and writes the views: the camera onto the hero, the obstacles and bounds on a
 * map load, the zones and the units inside the camera rectangle, the orbs, the
 * targeting preview under the pointer, the debug overlays the toggles ask for, and the view
 * misses into their ring, and drains the event ring with its own cursor.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private readonly candidates: EntityId[] =
    createCandidateBuffer(UNIT_CAPACITY);

  private readonly rect: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** Scratch for the world point under the pointer this frame. */
  private readonly pointer: Vec2 = { x: 0, y: 0 };

  private stage: Stage | null = null;

  private unbindInput: () => void = NOT_BOUND;

  /** When this frame's sync began, on the driver's clock, so the render event measures sync and render together. */
  private frameStartMs = 0;

  constructor(context: SceneContext) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const camera = new WorldCamera(this.cameras.main);
    const makeQuad: QuadFactory = (frame) =>
      this.add.image(0, 0, ATLAS_TEXTURE_KEY, frame).setVisible(false);
    // The only labels this scene makes are the overlays', so they sit in the debug band.
    const makeLabel: LabelFactory = (size) =>
      this.add
        .bitmapText(0, 0, ATLAS_FONT_KEY, "", size)
        .setOrigin(LABEL_ORIGIN)
        .setDepth(DEPTH_DEBUG)
        .setVisible(false);
    const frameSizes: FrameSizes = (frame) =>
      this.context.atlas.frameWidth(frame);
    const intents: InputIntents = {
      zoom: (direction): void => {
        camera.zoomBy(direction);
      },
      slotRefused: (slot, reason): void => {
        this.context.flashes.flash(slot, reason, this.context.driver.nextTick);
      },
    };
    const lens = cameraLens(this.cameras.main);
    const mapper = new InputMapper({
      driver: this.context.driver,
      lens,
      world: this.context.world,
      intents,
    });

    this.stage = {
      camera,
      lens,
      mapper,
      preview: new TargetingPreview(makeQuad, frameSizes),
      obstacles: createObstacleViews(OBSTACLE_VIEW_COUNT, makeQuad),
      units: createUnitViewPool(UNIT_VIEW_COUNT, makeQuad, frameSizes),
      zones: createZoneViewPool(ZONE_VIEW_COUNT, makeQuad, frameSizes),
      orbs: createOrbViews(
        orbSlotsOf(this.context.world),
        makeQuad,
        frameSizes,
      ),
      overlays: new DebugOverlays(makeQuad, makeLabel, frameSizes),
      boundMapId: null,
    };

    const onRender = (): void => {
      this.context.rings.renderTime.write(
        this.context.driver.now() - this.frameStartMs,
      );
    };

    this.unbindInput = bindSceneInput(this, mapper);
    this.events.on(RENDER_EVENT, onRender);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      this.events.off(RENDER_EVENT, onRender);
      this.unbindInput();
      this.unbindInput = NOT_BOUND;
      this.stage = null;
    });
  }

  override update(_time: number, delta: number): void {
    this.context.driver.onFrame(delta);

    // The ticks ran inside the frame above; what follows is the sync, and the render after it.
    this.frameStartMs = this.context.driver.now();

    const stage = this.stage;

    if (stage === null) {
      return;
    }

    const world = this.context.world;
    const alpha = this.context.driver.alpha;

    followHero(stage.camera, world, alpha);

    if (world.map.mapId !== stage.boundMapId) {
      stage.boundMapId = world.map.mapId;
      stage.obstacles.bind(world.map.obstacles);
      stage.camera.fitBounds(world.map.bounds);
    }

    stage.camera.worldRect(UNIT_VIEW_MARGIN, this.rect);
    syncZoneViews(stage.zones, world, this.rect, alpha);
    syncUnitViews(stage.units, world, this.rect, alpha, this.candidates);
    stage.orbs.sync(world, alpha);
    this.syncPreview(stage);
    stage.overlays.sync(world, this.rect, alpha, this.context.overlays);
    this.context.rings.viewMisses.write(
      stage.units.misses +
        stage.zones.misses +
        stage.obstacles.misses +
        stage.overlays.misses,
    );
    this.drainEvents();
  }

  /** The cursor's ring and shape, at the pointer's world point as the camera stands this frame. */
  private syncPreview(stage: Stage): void {
    const pointer = this.input.activePointer;

    stage.lens.worldPointAt(pointer.x, pointer.y, this.pointer);
    stage.preview.sync(
      this.context.world,
      stage.mapper.cursor,
      this.pointer.x,
      this.pointer.y,
      this.context.driver.alpha,
    );
  }

  /** Reads every event since last frame. Nothing in this scene reacts to one yet; the cursor stays current for the day something does. */
  private drainEvents(): void {
    let event = this.context.events.read(this.reader);

    while (event !== null) {
      event = this.context.events.read(this.reader);
    }
  }
}

/** Points the camera at where the hero is drawn this frame. A world with no hero leaves it where it is. */
const followHero = (
  camera: WorldCamera,
  world: WorldView,
  alpha: number,
): void => {
  const heroId = world.run.heroId;
  const hero = heroId === null ? null : world.map.units.resolve(heroId);

  if (hero === null) {
    return;
  }

  camera.follow(
    interpolate(hero.prev.x, hero.curr.x, alpha),
    interpolate(hero.prev.y, hero.curr.y, alpha),
  );
};
