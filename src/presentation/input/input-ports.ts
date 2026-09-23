import type { RefusalReason } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CommandDriver } from "../scene-context";
import type { GroundPick } from "./ground-pick";

/**
 * Screen to world at the moment it is asked. The scene hands the mapper its camera behind
 * this, so a pick is resolved when the event arrives and a camera move before the tick cannot
 * retarget it.
 */
export type CameraLens = Readonly<{
  worldPointAt: (screenX: number, screenY: number, out: Vec2) => void;
}>;

/**
 * What the mapper says that is not a command. A zoom is a camera intent: the camera consumes
 * it and the world never hears of it. A refused slot is a cursor the mapper would not open,
 * for the HUD to flash the square with the reason, since nothing reached the buffer to be
 * refused there.
 */
export type InputIntents = Readonly<{
  /** `+1` to zoom in, `-1` to zoom out. */
  zoom: (direction: number) => void;
  slotRefused: (slot: number, reason: RefusalReason) => void;
}>;

/** Everything the mapper is built over. It holds these and the cursor, and nothing else. */
export type InputPorts = Readonly<{
  driver: CommandDriver;
  lens: CameraLens;
  world: WorldView;
  intents: InputIntents;
  groundPick: GroundPick;
}>;
