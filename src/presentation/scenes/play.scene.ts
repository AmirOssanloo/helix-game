import Phaser from "phaser";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/public";
import type { EntityId, Rect } from "@shared/public";
import type { EventReader, WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { WorldCamera } from "../camera/world-camera";
import { bindSceneInput, cameraLens } from "../input/bind-scene-input";
import { InputMapper } from "../input/input-mapper";
import type { InputIntents } from "../input/input-ports";
import type { SceneContext } from "../scene-context";
import type { ObstacleViews } from "../views/obstacle.view";
import { createObstacleViews } from "../views/obstacle.view";
import type { OrbViews } from "../views/orb.view";
import { createOrbViews, orbSlotsOf } from "../views/orb.view";
import type { FrameSizes, QuadFactory } from "../views/quad";
import { interpolate } from "../views/quad";
import type { UnitViewPool } from "../views/unit.view";
import {
  createUnitViewPool,
  syncUnitViews,
  UNIT_VIEW_MARGIN,
} from "../views/unit.view";

export const PLAY_SCENE_KEY = "play";

const SHUTDOWN_EVENT = "shutdown";

/** Unit views: the live cap on screen plus a margin, and what the benchmark drives. A presentation number, not the unit capacity. */
const UNIT_VIEW_COUNT = 320;

/** Obstacle quads: room for a map several times as busy as the arena. */
const OBSTACLE_VIEW_COUNT = 64;

/** The unbind of a scene that has not bound its input yet. */
const NOT_BOUND = (): void => {};

/** What `create` makes and `update` drives. `null` until then. */
type Stage = {
  camera: WorldCamera;
  obstacles: ObstacleViews;
  units: UnitViewPool;
  orbs: OrbViews;
  /** The map whose obstacles and bounds are bound, so a map load rebinds them once. */
  boundMapId: string | null;
};

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands. `create`
 * makes every pool it will ever hold; `update` hands the frame to the driver, then reads the
 * world view and writes the views: the camera onto the hero, the obstacles and bounds on a
 * map load, the units inside the camera rectangle through the spatial hash, the orbs, and
 * the view misses into their ring, and drains the event ring with its own cursor.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private readonly candidates: EntityId[] =
    createCandidateBuffer(UNIT_CAPACITY);

  private readonly rect: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  private stage: Stage | null = null;

  private unbindInput: () => void = NOT_BOUND;

  constructor(context: SceneContext) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const camera = new WorldCamera(this.cameras.main);
    const makeQuad: QuadFactory = (frame) =>
      this.add.image(0, 0, ATLAS_TEXTURE_KEY, frame).setVisible(false);
    const frameSizes: FrameSizes = (frame) =>
      this.context.atlas.frameWidth(frame);
    const intents: InputIntents = {
      zoom: (direction): void => {
        camera.zoomBy(direction);
      },
      // The HUD takes a refused slot once it draws the squares.
      slotRefused: (): void => {},
    };

    this.stage = {
      camera,
      obstacles: createObstacleViews(OBSTACLE_VIEW_COUNT, makeQuad),
      units: createUnitViewPool(UNIT_VIEW_COUNT, makeQuad, frameSizes),
      orbs: createOrbViews(
        orbSlotsOf(this.context.world),
        makeQuad,
        frameSizes,
      ),
      boundMapId: null,
    };

    const mapper = new InputMapper({
      driver: this.context.driver,
      lens: cameraLens(this.cameras.main),
      world: this.context.world,
      intents,
    });

    this.unbindInput = bindSceneInput(this, mapper);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      this.unbindInput();
      this.unbindInput = NOT_BOUND;
      this.stage = null;
    });
  }

  override update(_time: number, delta: number): void {
    this.context.driver.onFrame(delta);

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
    syncUnitViews(stage.units, world, this.rect, alpha, this.candidates);
    stage.orbs.sync(world, alpha);
    this.context.rings.viewMisses.write(
      stage.units.misses + stage.obstacles.misses,
    );
    this.drainEvents();
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
