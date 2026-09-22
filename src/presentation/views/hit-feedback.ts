import type { DomainEvent, Tick } from "@domain/public";
import { UNIT_CAPACITY } from "@domain/public";
import type { EntityId } from "@shared/public";
import { unpackIndex } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { FloatingNumberViews } from "./floating-number.view";
import { NO_NUMBER } from "./floating-number.view";
import { interpolate } from "./quad";

/** How long a hit flash shows, in ticks: a seventh of a second at thirty ticks a second. */
export const HIT_FLASH_TICKS = 4;

/**
 * How long after a number starts rising a further hit on the same unit joins it rather than
 * raising a second one beside it, in ticks: a third of a second at thirty ticks a second.
 *
 * Damage over time is taken every tick, so a rule of a number a hit turns one burning unit into
 * thirty numbers a second, which overlap into a block nobody can read and empty the set on top
 * of that, costing a real hit landing beside it its own number. A third of a second leaves three
 * numbers a second, and two hits far enough apart to read as two still get one each.
 */
export const HIT_NUMBER_MERGE_TICKS = 10;

/** The slot of a unit no flash has ever named. */
const NONE = -1;

/** The spawn on a slot no number has ever been raised for. */
const NO_SPAWN = 0;

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
 * Which unit has a number rising and which of the set's labels it is on: one entry per slot of
 * the unit pool, holding the id it was raised for, the label, the spawn running there, and the
 * tick the rise began. A hit landing while that rise is inside the window joins the number
 * instead of raising a second one, so damage taken every tick reads as one number a window
 * worth what the window cost rather than a number a tick.
 *
 * The id is kept beside the label because a slot is reused: a unit that took the slot of one
 * that was hit joins nothing. The spawn is kept because the set recycles a label whose rise is
 * still running once every label is busy, and a hit must not add to the number that took it.
 *
 * The window is one length for every unit and every kind of damage, which is all white numbers
 * need. A colour per damage type is what would make it one window per unit per type.
 */
export class HitNumbers {
  private readonly ids: number[] = [];

  private readonly labels: number[] = [];

  private readonly spawns: number[] = [];

  private readonly startTicks: Tick[] = [];

  constructor() {
    for (let slot = 0; slot < UNIT_CAPACITY; slot += 1) {
      this.ids.push(NONE);
      this.labels.push(NO_NUMBER);
      this.spawns.push(NO_SPAWN);
      this.startTicks.push(0);
    }
  }

  /**
   * Shows `amount` on `id` at (`x`, `y`) on tick `now`: added to the number already rising for
   * it where one began inside the window and the set still has it, and raised as a number of
   * its own where it did not. An id outside the pool always raises its own, since there is
   * nowhere to remember it.
   */
  show(
    id: EntityId,
    x: number,
    y: number,
    amount: number,
    now: Tick,
    numbers: FloatingNumberViews,
  ): void {
    const slot = unpackIndex(id);

    if (slot < 0 || slot >= this.ids.length) {
      numbers.spawn(x, y, amount, now);

      return;
    }

    if (
      this.joins(slot, id, now) &&
      numbers.addTo(
        this.labels[slot] ?? NO_NUMBER,
        this.spawns[slot] ?? NO_SPAWN,
        amount,
      )
    ) {
      return;
    }

    const label = numbers.spawn(x, y, amount, now);

    this.ids[slot] = label === NO_NUMBER ? NONE : id;
    this.labels[slot] = label;
    this.spawns[slot] = numbers.spawnAt(label);
    this.startTicks[slot] = now;
  }

  /** Whether the number remembered for `slot` is still `id`'s and still inside the window at `now`. */
  private joins(slot: number, id: EntityId, now: Tick): boolean {
    const started = this.startTicks[slot];

    return (
      this.ids[slot] === id &&
      started !== undefined &&
      now - started < HIT_NUMBER_MERGE_TICKS
    );
  }
}

/**
 * What one drained event does to the screen: a hit raises the flash on the unit that took it
 * and shows what it was worth where it landed, either as a number of its own or added to the
 * one already rising for that unit. The number is shown at the unit as it is drawn this frame,
 * lifted clear of its body, and reads the amount that landed after mitigation, which is the
 * number the event carries even where the health it removed was less. Every other kind is
 * nothing to look at here; the HUD reads the ones about the squares.
 *
 * A unit already gone when the event is read — released inside the same tick — flashes nothing
 * and shows no number, since there is nowhere to put either.
 */
export const showHit = (
  event: Readonly<DomainEvent>,
  world: WorldView,
  alpha: number,
  flashes: HitFlashes,
  hitNumbers: HitNumbers,
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
  hitNumbers.show(
    event.unitId,
    interpolate(unit.prev.x, unit.curr.x, alpha),
    interpolate(unit.prev.y, unit.curr.y, alpha) - unit.collisionRadius,
    event.amount,
    event.tick,
    numbers,
  );
};
