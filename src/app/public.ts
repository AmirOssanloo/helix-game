export {
  type Clock,
  FixedStepDriver,
  type FixedStepDriverOptions,
  MAX_TICKS_PER_FRAME,
  STEP_MS,
  TICK_RATE,
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

/** Starts the game: builds the world, the renderer, and the fixed-step driver, and wires them together. */
export type Boot = () => void;
