import Phaser from "phaser";
import type { DomainEvent } from "@domain/public";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/public";
import type { EntityId, Rect, Vec2 } from "@shared/public";
import type { EventReader, WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { CameraFrame, VIEW_SCREEN_MARGIN } from "../camera/camera-frame";
import { GroundLayer } from "../camera/ground-layer";
import { Projection, VIEW_SCALE } from "../camera/projection";
import { WorldCamera } from "../camera/world-camera";
import { bindSceneInput, cameraLens } from "../input/bind-scene-input";
import { InputMapper } from "../input/input-mapper";
import type { CameraLens, InputIntents } from "../input/input-ports";
import { TargetingPreview } from "../input/targeting-preview";
import { DebugOverlays } from "../overlays/debug-overlays";
import type { SceneContext } from "../scene-context";
import { DEPTH_DEBUG } from "../views/depth-bands";
import type { FloatingNumberViews } from "../views/floating-number.view";
import {
  createFloatingNumberViews,
  FLOATING_NUMBER_COUNT,
} from "../views/floating-number.view";
import type { FloorView, VoidViews } from "../views/floor.view";
import {
  createFloorView,
  createVoidViews,
  FLOOR_FRAME,
} from "../views/floor.view";
import { HitFlashes, HitNumbers, showHit } from "../views/hit-feedback";
import type { ObstacleViews } from "../views/obstacle.view";
import { createObstacleViews } from "../views/obstacle.view";
import type { OrbViews } from "../views/orb.view";
import { createOrbViews, orbSlotsOf } from "../views/orb.view";
import type { ProjectileViewPool } from "../views/projectile.view";
import {
  createProjectileViewPool,
  syncProjectileViews,
} from "../views/projectile.view";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";
import { interpolate } from "../views/quad";
import type { StatusIconViewPool } from "../views/status-icon.view";
import {
  createStatusIconViewPool,
  syncStatusIconViews,
} from "../views/status-icon.view";
import type { OutlineViewPool, UnitViewPool } from "../views/unit.view";
import {
  createOutlineViewPool,
  createUnitViewPool,
  syncOutlineViews,
  syncUnitViews,
  unitDefinitionsOf,
} from "../views/unit.view";
import {
  FLOOR_TILE_COUNT,
  OBSTACLE_VIEW_COUNT,
  OUTLINE_VIEW_COUNT,
  PROJECTILE_VIEW_COUNT,
  STATUS_ICON_VIEW_COUNT,
  UNIT_VIEW_COUNT,
  ZONE_VIEW_COUNT,
} from "../views/view-counts";
import type { ZoneViewPool } from "../views/zone.view";
import { createZoneViewPool, syncZoneViews } from "../views/zone.view";

export const PLAY_SCENE_KEY = "play";

const SHUTDOWN_EVENT = "shutdown";

/** Fired by the scene once its children have been rendered, so a frame's render time closes here. */
const RENDER_EVENT = Phaser.Scenes.Events.RENDER;

/** How far past the canvas the floor is laid, in pixels, so the follow's step before the render never shows a bare edge; the walkability overlay keeps to the same rectangle. */
const FLOOR_MARGIN = 64;

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/** The unbind of a scene that has not bound its input yet. */
const NOT_BOUND = (): void => {};

/** What `create` makes and `update` drives. `null` until then. */
type Stage = {
  ground: GroundLayer;
  camera: WorldCamera;
  lens: CameraLens;
  mapper: InputMapper;
  preview: TargetingPreview;
  floor: FloorView;
  voids: VoidViews;
  obstacles: ObstacleViews;
  units: UnitViewPool;
  outlines: OutlineViewPool;
  statusIcons: StatusIconViewPool;
  projectiles: ProjectileViewPool;
  zones: ZoneViewPool;
  orbs: OrbViews;
  numbers: FloatingNumberViews;
  flashes: HitFlashes;
  hitNumbers: HitNumbers;
  overlays: DebugOverlays;
  /** The map whose obstacles and bounds are bound, so a map load rebinds them once. */
  boundMapId: string | null;
};

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands. The world is
 * drawn through the projection: what lies on the ground is made inside the ground layer and
 * written in world coordinates, and what stands up off it, the icons, the numbers, and the
 * labels, is made in the scene and placed where its point is drawn. `create` makes every pool
 * it will ever hold; `update` hands the frame to the driver, then drains the event ring with
 * its own cursor so a hit the ticks just landed shows on this frame, then reads the world view
 * and writes the views: the camera onto the hero, the obstacles, bounds, and void on a map
 * load, the floor under the camera, the zones, the units and their flashes, the outlines of the elites and
 * bosses among them, their status icons inside the camera rectangle, the projectiles in
 * flight, the orbs, the numbers rising where hits landed, the targeting preview under the
 * pointer, the debug overlays the toggles ask for, and the view misses into their ring. A
 * cursor the hero may no longer commit is closed before the preview reads it.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private readonly candidates: EntityId[] =
    createCandidateBuffer(UNIT_CAPACITY);

  /** Scratch for the screen rectangle the views bind by this frame. */
  private readonly shown: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** Scratch for the screen rectangle the floor covers this frame. */
  private readonly screen: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  /** Scratch for the world point under the pointer this frame. */
  private readonly pointer: Vec2 = { x: 0, y: 0 };

  private readonly projection = new Projection();

  /** What the camera shows this frame, for the views that bind by it. */
  private readonly frame = new CameraFrame(this.projection);

  private stage: Stage | null = null;

  private unbindInput: () => void = NOT_BOUND;

  /** When this frame's sync began, on the driver's clock, so the render event measures sync and render together. */
  private frameStartMs = 0;

  constructor(context: SceneContext) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const projection = this.projection;
    const ground = new GroundLayer(this, VIEW_SCALE);
    const camera = new WorldCamera(this.cameras.main, projection);
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
    const definitions = unitDefinitionsOf(this.context.world);
    const intents: InputIntents = {
      slotRefused: (slot, reason): void => {
        this.context.flashes.flash(slot, reason, this.context.driver.nextTick);
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

    this.stage = {
      ground,
      camera,
      lens,
      mapper,
      floor: createFloorView(FLOOR_TILE_COUNT, makeStandingQuad, {
        width: this.context.atlas.frameWidth(FLOOR_FRAME),
        height: this.context.atlas.frameHeight(FLOOR_FRAME),
      }),
      voids: createVoidViews(makeQuad),
      preview: new TargetingPreview(makeQuad, frameSizes),
      obstacles: createObstacleViews(OBSTACLE_VIEW_COUNT, makeQuad),
      units: createUnitViewPool(
        UNIT_VIEW_COUNT,
        makeQuad,
        frameSizes,
        definitions,
      ),
      outlines: createOutlineViewPool(
        OUTLINE_VIEW_COUNT,
        makeQuad,
        frameSizes,
        definitions,
      ),
      statusIcons: createStatusIconViewPool(
        STATUS_ICON_VIEW_COUNT,
        makeStandingQuad,
        frameSizes,
        projection,
      ),
      projectiles: createProjectileViewPool(
        PROJECTILE_VIEW_COUNT,
        makeQuad,
        frameSizes,
      ),
      zones: createZoneViewPool(ZONE_VIEW_COUNT, makeQuad, frameSizes),
      orbs: createOrbViews(
        orbSlotsOf(this.context.world),
        makeQuad,
        frameSizes,
      ),
      numbers: createFloatingNumberViews(
        FLOATING_NUMBER_COUNT,
        makeLabel,
        projection,
      ),
      flashes: new HitFlashes(),
      hitNumbers: new HitNumbers(),
      overlays: new DebugOverlays(makeQuad, makeLabel, frameSizes, projection),
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
      stage.voids.bind(world.map.bounds);
      stage.numbers.releaseAll();
      stage.camera.fitBounds(world.map.bounds);
    }

    stage.camera.screenRect(FLOOR_MARGIN, this.screen);
    stage.floor.sync(this.screen);

    // Before the views, so a hit the ticks just landed is flashing and counted on this frame.
    this.drainEvents(stage, alpha);
    stage.camera.screenRect(VIEW_SCREEN_MARGIN, this.shown);
    this.frame.fit(this.shown);

    const frame = this.frame;

    syncZoneViews(stage.zones, world, frame.world, alpha);
    syncUnitViews(
      stage.units,
      world,
      frame,
      alpha,
      this.candidates,
      stage.flashes,
    );
    syncOutlineViews(stage.outlines, world, frame, alpha, this.candidates);
    syncStatusIconViews(
      stage.statusIcons,
      world,
      frame,
      alpha,
      this.candidates,
    );
    syncProjectileViews(stage.projectiles, world, frame, alpha);
    stage.orbs.sync(world, alpha);
    stage.numbers.sync(world.tick, alpha);
    stage.mapper.syncCursor();
    this.syncPreview(stage);
    stage.overlays.sync(
      world,
      frame.world,
      this.screen,
      alpha,
      this.context.overlays,
    );
    stage.ground.keepSorted();
    this.context.rings.viewMisses.write(
      stage.units.misses +
        stage.outlines.misses +
        stage.statusIcons.misses +
        stage.projectiles.misses +
        stage.zones.misses +
        stage.obstacles.misses +
        stage.floor.misses +
        stage.overlays.misses,
    );
  }

  /** The cursor's ring, shape, and drag line, at the pointer's world point as the camera stands this frame and its canvas point for the drag. */
  private syncPreview(stage: Stage): void {
    const pointer = this.input.activePointer;

    stage.lens.worldPointAt(pointer.x, pointer.y, this.pointer);
    stage.preview.sync(
      this.context.world,
      stage.mapper.cursor,
      this.pointer.x,
      this.pointer.y,
      pointer.x,
      pointer.y,
      this.context.driver.alpha,
    );
  }

  /** Reads every event since last frame and shows what each one is worth on screen. The HUD drains the same ring with a cursor of its own. */
  private drainEvents(stage: Stage, alpha: number): void {
    let event: Readonly<DomainEvent> | null = this.context.events.read(
      this.reader,
    );

    while (event !== null) {
      showHit(
        event,
        this.context.world,
        alpha,
        stage.flashes,
        stage.hitNumbers,
        stage.numbers,
      );
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
