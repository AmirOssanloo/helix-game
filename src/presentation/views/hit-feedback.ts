import type { DomainEvent, Tick } from "@domain/public";
import { UNIT_CAPACITY } from "@domain/public";
import type { EntityId } from "@shared/public";
import { unpackIndex } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { FloatingNumberViews } from "./floating-number.view";
import { interpolate } from "./quad";

/** How long a hit flash shows, in ticks: a seventh of a second at thirty ticks a second. */
export const HIT_FLASH_TICKS = 4;

/** The slot of a unit no flash has ever named. */
const NONE = -1;

/**
 * Which units are flashing white and until when: one entry per slot of the unit pool, holding
 * the id that was hit and the tick its flash stops. The unit sync asks it once per unit per
 * frame, so the flash lives beside the views rather than on them, and a view bound halfway
 * through a flash picks it up where it stands.
 *
 * The end is a tick, not a frame count, so a flash pauses with the simulation. The id is kept
 * beside the tick because a slot is reused: a unit that took the slot of one that was hit does
 * not inherit its flash.
 */
export class HitFlashes {
  private readonly ids: number[] = [];

  private readonly untilTicks: Tick[] = [];

  constructor() {
    for (let slot = 0; slot < UNIT_CAPACITY; slot += 1) {
      this.ids.push(NONE);
      this.untilTicks.push(0);
    }
  }

  /** Starts a flash on `id` at tick `now`. An id outside the pool is ignored. */
  flash(id: EntityId, now: Tick): void {
    const slot = unpackIndex(id);

    if (slot < 0 || slot >= this.ids.length) {
      return;
    }

    this.ids[slot] = id;
    this.untilTicks[slot] = now + HIT_FLASH_TICKS;
  }

  /** Whether `id` is flashing at tick `now`. */
  isFlashing(id: EntityId, now: Tick): boolean {
    const slot = unpackIndex(id);
    const until = this.untilTicks[slot];

    return until !== undefined && this.ids[slot] === id && now < until;
  }
}

/**
 * What one drained event does to the screen: a hit raises the flash on the unit that took it
 * and starts a number rising where it landed. The number is spawned at the unit as it is drawn
 * this frame, lifted clear of its body, and reads the amount that landed after mitigation,
 * which is the number the event carries even where the health it removed was less. Every other
 * kind is nothing to look at here; the HUD reads the ones about the squares.
 *
 * A unit already gone when the event is read — released inside the same tick — flashes nothing
 * and raises no number, since there is nowhere to put either.
 */
export const showHit = (
  event: Readonly<DomainEvent>,
  world: WorldView,
  alpha: number,
  flashes: HitFlashes,
  numbers: FloatingNumberViews,
): void => {
  if (event.kind !== "unit_damaged" || event.unitId === null) {
    return;
  }

  const unit = world.map.units.resolve(event.unitId);

  if (unit === null) {
    return;
  }

  flashes.flash(event.unitId, event.tick);
  numbers.spawn(
    interpolate(unit.prev.x, unit.curr.x, alpha),
    interpolate(unit.prev.y, unit.curr.y, alpha) - unit.collisionRadius,
    event.amount,
    event.tick,
  );
};
