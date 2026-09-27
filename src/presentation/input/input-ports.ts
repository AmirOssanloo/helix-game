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
 * What the mapper says that is not a command. A refused slot is a cursor the mapper would not
 * open, for the HUD to flash the square with the reason, since nothing reached the buffer to
 * be refused there.
 */
export type InputIntents = Readonly<{
  slotRefused: (slot: number, reason: RefusalReason) => void;
}>;

/** The driver as the mapper sees it: the command door, and the fraction between ticks the frame is drawn at, so a pick names what is drawn. */
export type InputDriver = CommandDriver & Readonly<{ alpha: number }>;

/** Everything the mapper is built over. It holds these and the cursor, and nothing else. */
export type InputPorts = Readonly<{
  driver: InputDriver;
  lens: CameraLens;
  world: WorldView;
  intents: InputIntents;
  groundPick: GroundPick;
}>;

/**
 * A pause a screen holds while it is open. Presentation declares it and the composition root
 * implements it over the driver as a pause reason of its own, so presentation never imports
 * the driver. A pause decides whether a tick runs, never what it does: it is not world state
 * and sends no command.
 */
export type PausePort = Readonly<{
  hold: () => void;
  release: () => void;
}>;

/**
 * The mapper as the input claim sees it: whether a targeting cursor is open, which Escape
 * closes before anything else, and a release of every key and held press it has, with nothing
 * sent, for a modal screen opening over it.
 */
export type ClaimedMapper = Readonly<{
  cursorOpen: boolean;
  releaseKeys: () => void;
}>;
