export {
  type BuildStamp,
  type BuildStampSource,
  readBuildStamp,
  UNKNOWN_COMMIT,
} from "./build-stamp";
export { type ContentReload, reloadContent } from "./content-reload";
export {
  type Clock,
  FixedStepDriver,
  type FixedStepDriverOptions,
  MAX_TICKS_PER_FRAME,
  RUN_TO_FRAME_BUDGET_MS,
  stepMsOf,
  wallClock,
} from "./fixed-step-driver";
export {
  GAME_HEIGHT,
  GAME_PARENT_ID,
  GAME_WIDTH,
  gameConfig,
  readRendererOverrides,
  type RendererOverrides,
  rendererType,
} from "./game-config";

export {
  type CommandStamps,
  Session,
  type SessionOptions,
  type SessionRetune,
} from "./session";

/** Starts the game: builds the world, the renderer, and the fixed-step driver, and wires them together. */
export type Boot = () => void;
