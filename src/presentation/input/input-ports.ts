import type { GroundItemId, RefusalReason } from "@domain/public";
import type { Rect, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
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
  picks: PickPort;
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

/**
 * One list of the pick port: the canvas rectangle and the ground item of each of the first
 * `count` entries, in drawing order, so the last drawn is the last written and a reader
 * walking for the top one walks back from `count`. Every entry is made with the list; a frame
 * rewrites them in place.
 */
export type PickList = {
  count: number;
  readonly rects: readonly Rect[];
  readonly ids: (GroundItemId | null)[];
};

/**
 * What the ground-item views say is drawn where, for a right click to read: a fixed record the
 * label views and the icon views each rewrite every frame. The mapper reads it and never asks a
 * view. A label stands over everything on the ground and an icon lies under the units, so the
 * two are kept apart for the pick to read in turn.
 */
export type PickPort = Readonly<{
  labels: PickList;
  icons: PickList;
}>;

const createPickList = (capacity: number): PickList => {
  const rects: Rect[] = [];
  const ids: (GroundItemId | null)[] = [];

  for (let index = 0; index < capacity; index += 1) {
    rects.push(new ScratchRect());
    ids.push(null);
  }

  return { count: 0, rects, ids };
};

/** An empty port with room for `labels` labels and `icons` icons: the sizes of the pools that write it. */
export const createPickPort = (labels: number, icons: number): PickPort => ({
  labels: createPickList(labels),
  icons: createPickList(icons),
});

/**
 * Writes the rectangle (`minX`, `minY`) to (`maxX`, `maxY`) and `id` as the next entry of
 * `list`. A list is as long as the pool that writes it, so an entry past its end is a view the
 * pool never made and is dropped.
 */
export const writePick = (
  list: PickList,
  id: GroundItemId,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void => {
  const rect = list.rects[list.count];

  if (rect === undefined) {
    return;
  }

  rect.minX = minX;
  rect.minY = minY;
  rect.maxX = maxX;
  rect.maxY = maxY;
  list.ids[list.count] = id;
  list.count += 1;
};

/**
 * The ground item of the entry of `list` drawn on top at canvas point (`x`, `y`): the last
 * written whose rectangle holds the point, edges included, or `null` when none does.
 */
export const topPickAt = (
  list: Readonly<PickList>,
  x: number,
  y: number,
): GroundItemId | null => {
  for (let index = list.count - 1; index >= 0; index -= 1) {
    const rect = list.rects[index];

    if (
      rect !== undefined &&
      x >= rect.minX &&
      x <= rect.maxX &&
      y >= rect.minY &&
      y <= rect.maxY
    ) {
      return list.ids[index] ?? null;
    }
  }

  return null;
};
