import Phaser from "phaser";
import {
  arenaDef,
  atlasFrames,
  contentRegistry,
  FLOOR_IMAGE,
  tuningTable,
} from "@content/public";
import { createDevApi, exposeDevApi, mountPanel } from "@devtools/public";
import { assertRegistryValid, definitionFields } from "@domain/public";
import { createRings } from "@instrumentation/public";
import type { SceneContext } from "@presentation/public";
import {
  BootScene,
  createGroundPick,
  createOverlayToggles,
  HudScene,
  installDrawCallCounter,
  PLAY_SCENE_KEY,
  PlayScene,
  ShapeAtlas,
  SlotFlashes,
} from "@presentation/public";
import { FixedStepDriver, wallClock } from "./fixed-step-driver";
import { gameConfig, readRendererOverrides, rendererType } from "./game-config";
import type { Boot } from "./public";
import { Session } from "./session";

const DEVTOOLS_HOST_ID = "devtools";

/** The maintainer's floor tile. Vite resolves and fingerprints an address written this way into the build. */
const FLOOR_TILE_URL = new URL("../../assets/floor.png", import.meta.url).href;

/** A fresh session's seed: the wall clock at boot, in its low 32 bits, which is all the random source reads. The app layer may read the clock; the seed goes into the log so the session replays under it. */
const drawSessionSeed = (): number => Date.now() >>> 0;

export const boot: Boot = (): void => {
  // A broken definition stops the game here, with every fault named, before a world exists.
  assertRegistryValid(contentRegistry);

  // The world with the hero at the map's spawn point; a recreate or a loaded log restarts it in place.
  const session = new Session({
    seed: drawSessionSeed(),
    registry: contentRegistry,
    map: arenaDef,
  });
  const world = session.world;

  const rings = createRings();
  const driver = new FixedStepDriver({
    world: session,
    rings,
    clock: wallClock,
  });
  // The maintainer's floor tile, copied into the atlas at boot.
  const atlas = new ShapeAtlas(
    atlasFrames,
    new Map([[FLOOR_IMAGE, FLOOR_TILE_URL]]),
  );
  // One object, read by the play scene and written by the panel; the two layers each name its fields.
  const overlays = createOverlayToggles();
  // One request, armed by the panel and answered by the play scene's next ground click.
  const groundPick = createGroundPick();
  const context: SceneContext = {
    atlas,
    driver,
    world: world.view,
    events: world.events,
    rings: { viewMisses: rings.viewMisses, renderTime: rings.renderTime },
    flashes: new SlotFlashes(),
    overlays,
    groundPick,
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

  if (__PANEL__) {
    const host = document.getElementById(DEVTOOLS_HOST_ID);

    if (host === null) {
      throw new Error(
        `index.html has no element with id "${DEVTOOLS_HOST_ID}" to mount the developer panel into`,
      );
    }

    const api = createDevApi({
      driver,
      session,
      view: world.view,
      events: world.events,
      rings,
      overlays,
      groundPick,
      tuningDefaults: tuningTable,
      definitionDefaults: definitionFields(contentRegistry),
      archetypes: contentRegistry.enemies.map((def): string => def.id),
      downloadAtlas: (): string => atlas.download(),
    });

    exposeDevApi(window, api);
    mountPanel(host, api, window.localStorage);
  }
};

boot();
