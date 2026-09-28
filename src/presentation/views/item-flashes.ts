import type { DomainEvent, GroundItemId, Tick } from "@domain/public";
import { GROUND_ITEM_CAPACITY } from "@domain/queries";
import { unpackIndex } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import { refusalFlashTicks } from "../hud/slot-flashes";

/** The slot of a ground item no flash has ever named. */
const NONE = -1;

/**
 * Which ground items' labels are flashing a refusal and until when: one entry per slot of the
 * ground-item pool, holding the id that was named and the tick its flash stops. The event drain
 * writes it and the label sync asks it once per bound label per frame, so the flash lives
 * beside the labels rather than on them.
 *
 * The end is a tick, not a frame count, so a flash pauses with the simulation. How long it is
 * comes with the refusal, from the tuning table, as the HUD's square flash does. The id is kept
 * beside the tick because a slot is reused: an item that took the slot of a refused one does
 * not inherit its flash.
 */
export class ItemLabelFlashes {
  private readonly ids: number[] = [];

  private readonly untilTicks: Tick[] = [];

  constructor() {
    for (let slot = 0; slot < GROUND_ITEM_CAPACITY; slot += 1) {
      this.ids.push(NONE);
      this.untilTicks.push(0);
    }
  }

  /** Starts a flash on `id` at tick `now`, showing for `durationTicks`. An id outside the pool is ignored. */
  flash(id: GroundItemId, now: Tick, durationTicks: number): void {
    const slot = unpackIndex(id);

    if (slot < 0 || slot >= this.ids.length) {
      return;
    }

    this.ids[slot] = id;
    this.untilTicks[slot] = now + durationTicks;
  }

  /** Whether `id`'s label is flashing at tick `now`. */
  isFlashing(id: GroundItemId, now: Tick): boolean {
    const slot = unpackIndex(id);
    const until = this.untilTicks[slot];

    return until !== undefined && this.ids[slot] === id && now < until;
  }
}

/**
 * What one drained event does to the ground-item labels: a refused command that names a ground
 * item, a pick up with no room above all, flashes that item's label, for as long as the world
 * view's tuning state says a refusal flash shows. An item already gone, or drawn outside the
 * widened screen `frame` shows, flashes nothing, since it has no label to flash. Every other
 * kind, and a refusal naming a slot or a place, is nothing to flash here.
 */
export const flashRefusedItem = (
  event: Readonly<DomainEvent>,
  world: WorldView,
  frame: CameraFrame,
  flashes: ItemLabelFlashes,
): void => {
  if (event.kind !== "command_refused" || event.groundItemId === null) {
    return;
  }

  const groundItem = world.map.groundItems.resolve(event.groundItemId);

  if (
    groundItem === null ||
    !frame.shows(groundItem.position.x, groundItem.position.y)
  ) {
    return;
  }

  flashes.flash(event.groundItemId, event.tick, refusalFlashTicks(world));
};
