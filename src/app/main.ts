import Phaser from "phaser";
import {
  arenaDef,
  atlasFrames,
  forms,
  heroDef,
  spells,
  tuningTable,
} from "@content/public";
import { createDevApi, exposeDevApi, mountPanel } from "@devtools/public";
import type { Registry } from "@domain/public";
import { acquireHero } from "@domain/public";
import { createRings } from "@instrumentation/public";
import type { SceneContext } from "@presentation/public";
import {
  BootScene,
  createOverlayToggles,
  HudScene,
  installDrawCallCounter,
  PLAY_SCENE_KEY,
  PlayScene,
  ShapeAtlas,
  SlotFlashes,
} from "@presentation/public";
import { createWorld } from "@simulation/public";
import { FixedStepDriver, wallClock } from "./fixed-step-driver";
import { gameConfig, readRendererOverrides, rendererType } from "./game-config";
import type { Boot } from "./public";

const DEVTOOLS_HOST_ID = "devtools";

/** Every session starts from this seed until a session can be recorded and replayed under its own. */
const SESSION_SEED = 1;

/** The content layer holds the tuning table, the hero and its forms, the spells, and the maps; the registry of every other kind does not exist yet. */
const REGISTRY: Registry = {
  tuning: tuningTable,
  hero: heroDef,
  forms,
  spells,
};

export const boot: Boot = (): void => {
  const world = createWorld({
    seed: SESSION_SEED,
    registry: REGISTRY,
    map: arenaDef,
  });

  // The hero enters once per session, here, at the map's spawn point; a map load carries it.
  if (
    acquireHero(world.state, arenaDef.spawnPoint.x, arenaDef.spawnPoint.y) ===
    null
  ) {
    throw new Error("The unit pool of a fresh world has room for the hero");
  }

  const rings = createRings();
  const driver = new FixedStepDriver({ world, rings, clock: wallClock });
  const atlas = new ShapeAtlas(atlasFrames);
  // One object, read by the play scene and written by the panel; the two layers each name its fields.
  const overlays = createOverlayToggles();
  const context: SceneContext = {
    atlas,
    driver,
    world: world.view,
    events: world.events,
    rings: { viewMisses: rings.viewMisses, renderTime: rings.renderTime },
    flashes: new SlotFlashes(),
    overlays,
    report: (message: string): void => {
      console.log(message);
    },
  };

  document.addEventListener("visibilitychange", (): void => {
    driver.setHidden(document.hidden);
  });

  const game = new Phaser.Game({
    ...gameConfig,
    type: rendererType(readRendererOverrides(window)),
    scene: [
      new BootScene(context),
      new PlayScene(context),
      new HudScene(context),
    ],
  });

  // The renderer exists once the game is ready; the Canvas renderer has nothing to count.
  game.events.once(Phaser.Core.Events.READY, (): void => {
    const renderer = game.renderer;

    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      installDrawCallCounter(renderer, rings, PLAY_SCENE_KEY);
    }
  });

  if (__DEV__) {
    const host = document.getElementById(DEVTOOLS_HOST_ID);

    if (host === null) {
      throw new Error(
        `index.html has no element with id "${DEVTOOLS_HOST_ID}" to mount the developer panel into`,
      );
    }

    const api = createDevApi({
      driver,
      view: world.view,
      events: world.events,
      log: world.log,
      rings,
      overlays,
      tuningDefaults: tuningTable,
      downloadAtlas: (): string => atlas.download(),
    });

    exposeDevApi(window, api);
    mountPanel(host, api, window.localStorage);
  }
};

boot();
