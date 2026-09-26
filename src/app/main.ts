/// <reference types="vite/client" />
import Phaser from "phaser";
import { atlasFrames, contentRegistry, FLOOR_IMAGE } from "@content/public";
import type { ContentStatus, PanelHandle } from "@devtools/public";
import { createDevApi, exposeDevApi, mountPanel } from "@devtools/public";
import type { Registry } from "@domain/public";
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
import { reloadContent } from "./content-reload";
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

  // The world on the first map the maps index lists, with the hero at its spawn point; a
  // recreate, a map chosen from the panel, or a loaded log restarts it in place.
  const [firstMap] = contentRegistry.maps;

  if (firstMap === undefined) {
    throw new Error("The content registers no map to start a session on");
  }

  const session = new Session({
    seed: drawSessionSeed(),
    registry: contentRegistry,
    mapId: firstMap.id,
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

  // What the last content reload came to, written below and shown by the panel.
  const contentStatus: ContentStatus = { message: "" };
  // Builds the panel over `registry`'s defaults again; set once the panel is mounted.
  let remountPanel: ((registry: Registry) => void) | null = null;

  if (__PANEL__) {
    const host = document.getElementById(DEVTOOLS_HOST_ID);

    if (host === null) {
      throw new Error(
        `index.html has no element with id "${DEVTOOLS_HOST_ID}" to mount the developer panel into`,
      );
    }

    const mount = (registry: Registry): PanelHandle => {
      const api = createDevApi({
        driver,
        session,
        view: world.view,
        events: world.events,
        rings,
        overlays,
        groundPick,
        tuningDefaults: registry.tuning,
        definitionDefaults: definitionFields(registry),
        archetypes: registry.enemies.map((def): string => def.id),
        contentStatus,
        downloadAtlas: (): string => atlas.download(),
        build: __BUILD_STAMP__,
      });

      exposeDevApi(window, api);

      return mountPanel(host, api, window.localStorage);
    };
    let panel = mount(contentRegistry);

    // A slider shows its default beside it, so a reload that changed a default builds the panel again over the new ones.
    remountPanel = (registry: Registry): void => {
      panel.unmount();
      panel = mount(registry);
    };
  }

  // Under the dev server, an edit under src/content/ stops here rather than reloading the page.
  // The callback runs between frames, so between ticks: the session takes the new registry and
  // its changed numbers go in as tuning commands for the next tick, or it is refused and the
  // game runs on. Every other module has no boundary, so an edit under src/domain/ or
  // src/simulation/ reloads the page, since a world cannot be patched mid-tick.
  if (import.meta.hot) {
    import.meta.hot.accept("@content/public", (next): void => {
      const registry = next?.["contentRegistry"] as Registry | undefined;

      if (registry === undefined) {
        window.location.reload();

        return;
      }

      const reload = reloadContent(session, driver, registry);

      contentStatus.message = reload.message;
      console.log(reload.message);

      if (reload.outcome === "reload_page") {
        window.location.reload();
      } else if (reload.outcome === "taken" && remountPanel !== null) {
        remountPanel(registry);
      }
    });
  }
};

boot();
