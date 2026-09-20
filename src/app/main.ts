import Phaser from "phaser";
import { atlasFrames, tuningTable } from "@content/public";
import { exposeDevApi, mountPanel } from "@devtools/public";
import type { MapDef, Registry } from "@domain/public";
import { createRings } from "@instrumentation/public";
import type { SceneContext } from "@presentation/public";
import {
  BootScene,
  HudScene,
  PlayScene,
  ShapeAtlas,
} from "@presentation/public";
import { createWorld } from "@simulation/public";
import { FixedStepDriver, wallClock } from "./fixed-step-driver";
import { gameConfig, readRendererOverrides, rendererType } from "./game-config";
import type { Boot } from "./public";

const DEVTOOLS_HOST_ID = "devtools";

/** Every session starts from this seed until a session can be recorded and replayed under its own. */
const SESSION_SEED = 1;

/** The content layer holds the tuning table and no definition yet; a world needs a registry and a map to exist. */
const REGISTRY: Registry = { tuning: tuningTable };
const BLANK_MAP: MapDef = { id: "blank" };

export const boot: Boot = (): void => {
  const world = createWorld({
    seed: SESSION_SEED,
    registry: REGISTRY,
    map: BLANK_MAP,
  });
  const rings = createRings();
  const driver = new FixedStepDriver({ world, rings, clock: wallClock });
  const atlas = new ShapeAtlas(atlasFrames);
  const context: SceneContext = {
    atlas,
    driver,
    world: world.view,
    report: (message: string): void => {
      console.log(message);
    },
  };

  document.addEventListener("visibilitychange", (): void => {
    driver.setHidden(document.hidden);
  });

  new Phaser.Game({
    ...gameConfig,
    type: rendererType(readRendererOverrides(window)),
    scene: [
      new BootScene(context),
      new PlayScene(context),
      new HudScene(context),
    ],
  });

  if (__DEV__) {
    const host = document.getElementById(DEVTOOLS_HOST_ID);

    if (host === null) {
      throw new Error(
        `index.html has no element with id "${DEVTOOLS_HOST_ID}" to mount the developer panel into`,
      );
    }

    mountPanel(host);
    exposeDevApi(window, {
      rings,
      downloadAtlas: (): string => atlas.download(),
    });
  }
};

boot();
