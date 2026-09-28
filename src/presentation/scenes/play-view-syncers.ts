import type { DomainEvent } from "@domain/public";
import { readTunable } from "@domain/queries";
import type { WorldView } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { VIEW_SCREEN_MARGIN } from "../camera/camera-frame";
import type { WorldCamera } from "../camera/world-camera";
import { TargetingPreview } from "../input/targeting-preview";
import {
  CHECKPOINT_FRAME,
  createCheckpointViews,
  showCheckpointReached,
} from "../views/checkpoint.view";
import {
  DEPTH_AIR,
  DEPTH_FLOOR,
  DEPTH_GROUND,
  DEPTH_OBSTACLES,
  DEPTH_PROJECTILES,
  DEPTH_TEXT,
  DEPTH_UNITS,
} from "../views/depth-bands";
import {
  createFloorView,
  createVoidViews,
  FLOOR_FRAME,
} from "../views/floor.view";
import { showHit } from "../views/hit-feedback";
import { createObstacleViews } from "../views/obstacle.view";
import { createOrbViews, orbSlotsOf } from "../views/orb.view";
import {
  createProjectileViewPool,
  syncProjectileViews,
} from "../views/projectile.view";
import { interpolate } from "../views/quad";
import {
  createStatusIconViewPool,
  syncStatusIconViews,
} from "../views/status-icon.view";
import {
  createOutlineViewPool,
  createUnitViewPool,
  syncOutlineViews,
  syncUnitViews,
  unitDefinitionsOf,
} from "../views/unit.view";
import {
  CHECKPOINT_VIEW_COUNT,
  FLOOR_TILE_COUNT,
  OBSTACLE_VIEW_COUNT,
  OUTLINE_VIEW_COUNT,
  PROJECTILE_VIEW_COUNT,
  STATUS_ICON_VIEW_COUNT,
  UNIT_VIEW_COUNT,
  ZONE_VIEW_COUNT,
} from "../views/view-counts";
import { createZoneViewPool, syncZoneViews } from "../views/zone.view";
import { groundItemLabels, groundItems } from "./ground-item-syncers";
import type { PlayViewSyncer } from "./play-stage";
import { SYNC_ORDER } from "./sync-order";
import { NO_MISSES } from "./view-syncers";

export { SYNC_ORDER } from "./sync-order";

/** How far past the canvas the floor is laid, in pixels, so the follow's step before the render never shows a bare edge; the walkability overlay keeps to the same rectangle. */
const FLOOR_MARGIN = 64;

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

/** The camera's lerp from the tuning table, and its follow onto where the hero is drawn. */
const camera: PlayViewSyncer = {
  name: "camera",
  order: SYNC_ORDER.camera,
  band: null,
  create: ({ camera: worldCamera, world }) => ({
    sync: (alpha) => {
      worldCamera.setLerp(readTunable(world.run.tuning, "camera_follow_lerp"));
      followHero(worldCamera, world, alpha);
    },
    misses: NO_MISSES,
  }),
};

/** On a map load, once: the void around the new bounds, no number left from the old map, and the camera clamped and snapped. */
const mapLoad: PlayViewSyncer = {
  name: "map load",
  order: SYNC_ORDER.mapLoad,
  band: DEPTH_FLOOR,
  create: ({ camera: worldCamera, world, makeQuad, numbers }) => {
    const voids = createVoidViews(makeQuad);
    let boundMapId: string | null = null;

    return {
      sync: () => {
        if (world.map.mapId === boundMapId) {
          return;
        }

        boundMapId = world.map.mapId;
        voids.bind(world.map.bounds);
        numbers().releaseAll();
        worldCamera.fitBounds(world.map.bounds);
      },
      misses: NO_MISSES,
    };
  },
};

/** The screen the floor covers and the frame the views bind by, from where the camera stands now. */
const cameraFrame: PlayViewSyncer = {
  name: "camera frame",
  order: SYNC_ORDER.cameraFrame,
  band: null,
  create: ({ camera: worldCamera, screen, frame }) => {
    const shown = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    return {
      sync: () => {
        worldCamera.screenRect(FLOOR_MARGIN, screen);
        worldCamera.screenRect(VIEW_SCREEN_MARGIN, shown);
        frame.fit(shown);
      },
      misses: NO_MISSES,
    };
  },
};

/** The units inside the frame's world box, asked of the hash once for every view that binds by unit. */
const onScreen: PlayViewSyncer = {
  name: "on screen",
  order: SYNC_ORDER.onScreen,
  band: null,
  create: ({ world, frame, onScreen: units }) => ({
    sync: () => {
      units.gather(world, frame.world);
    },
    misses: NO_MISSES,
  }),
};

const floor: PlayViewSyncer = {
  name: "floor",
  order: SYNC_ORDER.floor,
  band: DEPTH_FLOOR,
  create: ({ context, makeStandingQuad, screen }) => {
    const view = createFloorView(FLOOR_TILE_COUNT, makeStandingQuad, {
      width: context.atlas.frameWidth(FLOOR_FRAME),
      height: context.atlas.frameHeight(FLOOR_FRAME),
    });

    return {
      sync: () => {
        view.sync(screen);
      },
      misses: () => view.misses,
    };
  },
};

/**
 * Reads every event since last frame and shows what each one is worth on screen, before the
 * views, so a hit the ticks just landed is flashing and counted on this frame. The HUD drains
 * the same ring with a cursor of its own.
 */
const events: PlayViewSyncer = {
  name: "events",
  order: SYNC_ORDER.events,
  band: DEPTH_TEXT,
  create: ({ context, world, flashes, hitNumbers, numbers }) => {
    const reader = createEventReader();

    return {
      sync: (alpha) => {
        let event: Readonly<DomainEvent> | null = context.events.read(reader);

        while (event !== null) {
          showHit(event, world, alpha, flashes, hitNumbers, numbers());
          showCheckpointReached(event, world, alpha, numbers());
          event = context.events.read(reader);
        }
      },
      misses: NO_MISSES,
    };
  },
};

const obstacles: PlayViewSyncer = {
  name: "obstacles",
  order: SYNC_ORDER.obstacles,
  band: DEPTH_OBSTACLES,
  create: ({ world, makeQuad, frame }) => {
    const views = createObstacleViews(OBSTACLE_VIEW_COUNT, makeQuad);

    return {
      sync: () => {
        views.sync(world.map.obstacles, frame.world);
      },
      misses: () => views.misses,
    };
  },
};

const checkpoints: PlayViewSyncer = {
  name: "checkpoints",
  order: SYNC_ORDER.checkpoints,
  band: DEPTH_GROUND,
  create: ({ context, world, makeQuad, frame }) => {
    const views = createCheckpointViews(
      CHECKPOINT_VIEW_COUNT,
      makeQuad,
      context.atlas.frameWidth(CHECKPOINT_FRAME),
    );

    return {
      sync: () => {
        views.sync(world, frame.world);
      },
      misses: () => views.misses,
    };
  },
};

const zones: PlayViewSyncer = {
  name: "zones",
  order: SYNC_ORDER.zones,
  band: DEPTH_GROUND,
  create: ({ world, makeQuad, frameSizes, frame }) => {
    const pool = createZoneViewPool(ZONE_VIEW_COUNT, makeQuad, frameSizes);

    return {
      sync: (alpha) => {
        syncZoneViews(pool, world, frame.world, alpha);
      },
      misses: () => pool.misses,
    };
  },
};

const units: PlayViewSyncer = {
  name: "units",
  order: SYNC_ORDER.units,
  band: DEPTH_UNITS,
  create: ({
    world,
    makeQuad,
    frameSizes,
    frame,
    onScreen: units,
    flashes,
  }) => {
    const pool = createUnitViewPool(
      UNIT_VIEW_COUNT,
      makeQuad,
      frameSizes,
      unitDefinitionsOf(world),
    );

    return {
      sync: (alpha) => {
        syncUnitViews(pool, world, frame, alpha, units, flashes);
      },
      misses: () => pool.misses,
    };
  },
};

/** The outlines of the elites and bosses on screen. */
const outlines: PlayViewSyncer = {
  name: "outlines",
  order: SYNC_ORDER.outlines,
  band: DEPTH_UNITS,
  create: ({ world, makeQuad, frameSizes, frame, onScreen: units }) => {
    const pool = createOutlineViewPool(
      OUTLINE_VIEW_COUNT,
      makeQuad,
      frameSizes,
      unitDefinitionsOf(world),
    );

    return {
      sync: (alpha) => {
        syncOutlineViews(pool, world, frame, alpha, units);
      },
      misses: () => pool.misses,
    };
  },
};

const statusIcons: PlayViewSyncer = {
  name: "status icons",
  order: SYNC_ORDER.statusIcons,
  band: DEPTH_TEXT,
  create: ({
    world,
    makeStandingQuad,
    frameSizes,
    projection,
    frame,
    onScreen: units,
  }) => {
    const pool = createStatusIconViewPool(
      STATUS_ICON_VIEW_COUNT,
      makeStandingQuad,
      frameSizes,
      projection,
    );

    return {
      sync: (alpha) => {
        syncStatusIconViews(pool, world, frame, alpha, units);
      },
      misses: () => pool.misses,
    };
  },
};

const projectiles: PlayViewSyncer = {
  name: "projectiles",
  order: SYNC_ORDER.projectiles,
  band: DEPTH_PROJECTILES,
  create: ({ world, makeQuad, frameSizes, frame }) => {
    const pool = createProjectileViewPool(
      PROJECTILE_VIEW_COUNT,
      makeQuad,
      frameSizes,
    );

    return {
      sync: (alpha) => {
        syncProjectileViews(pool, world, frame, alpha);
      },
      misses: () => pool.misses,
    };
  },
};

const orbs: PlayViewSyncer = {
  name: "orbs",
  order: SYNC_ORDER.orbs,
  band: DEPTH_AIR,
  create: ({ world, makeQuad, frameSizes }) => {
    const views = createOrbViews(orbSlotsOf(world), makeQuad, frameSizes);

    return {
      sync: (alpha) => {
        views.sync(world, alpha);
      },
      misses: NO_MISSES,
    };
  },
};

/** The numbers rising where hits landed, and the word over a hero that reached a checkpoint. */
const numbers: PlayViewSyncer = {
  name: "numbers",
  order: SYNC_ORDER.numbers,
  band: DEPTH_TEXT,
  create: ({ world, numbers: shared }) => {
    const views = shared();

    return {
      sync: (alpha) => {
        views.sync(
          world.tick,
          alpha,
          readTunable(world.run.tuning, "damage_number_rise"),
        );
      },
      misses: NO_MISSES,
    };
  },
};

/**
 * The cursor closed if the hero may no longer commit it, then the targeting preview at the
 * pointer's world point as the camera stands this frame, and its canvas point for the drag.
 */
const cursor: PlayViewSyncer = {
  name: "cursor",
  order: SYNC_ORDER.cursor,
  band: DEPTH_GROUND,
  create: ({ world, mapper, lens, makeQuad, frameSizes, pointer }) => {
    const preview = new TargetingPreview(makeQuad, frameSizes);
    const at = { x: 0, y: 0 };

    return {
      sync: (alpha) => {
        const canvas = pointer();

        mapper.syncCursor();
        lens.worldPointAt(canvas.x, canvas.y, at);
        preview.sync(
          world,
          mapper.cursor,
          at.x,
          at.y,
          canvas.x,
          canvas.y,
          alpha,
        );
      },
      misses: NO_MISSES,
    };
  },
};

/**
 * Every step the play scene draws a frame with. Each walks in its place in the sync order;
 * the list is in the order the steps are made, which is the pool order and so the draw order
 * inside a band: the preview under the checkpoints and the zones, the units under their
 * outlines, the status icons under the numbers. The ground items' icons and their labels have
 * bands of their own. The composition root hands this list, or this
 * list and more, to the scene; a new view registers beside it and the scene is not edited. The
 * debug overlays are not in it: the composition root adds their step where the panel is.
 */
export const PLAY_VIEW_SYNCERS: readonly PlayViewSyncer[] = [
  camera,
  cameraFrame,
  onScreen,
  events,
  floor,
  mapLoad,
  cursor,
  obstacles,
  checkpoints,
  groundItems,
  units,
  outlines,
  statusIcons,
  projectiles,
  zones,
  orbs,
  groundItemLabels,
  numbers,
];
