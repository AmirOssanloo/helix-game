import type { RefusalReason } from "../orders/validator";
import type { Tick } from "../tick";

/**
 * The fields every event carries, so a ring slot is one shape and a write copies values,
 * never objects. A kind reads the fields its docblock names; the rest hold their neutral
 * value: `-1` for an orb, `0` for a slot, `null` for an id or a reason.
 */
type EventFields = {
  tick: Tick;
  /** An orb index in slot-key order, Q, W, E as 0, 1, 2. */
  orb: number;
  abilityId: string | null;
  /** A slot key, 1 to 6 in the order Q, W, E, R, D, F. */
  slot: number;
  reason: RefusalReason | null;
};

/**
 * Something the simulation announces after it happens: a plain value in the event ring, never
 * a callback. A view reacts to one; it never rebuilds state from them.
 */
export type DomainEvent =
  | TickCompletedEvent
  | OrbAddedEvent
  | SpellInvokedEvent
  | SlotsChangedEvent
  | CastCommittedEvent
  | CommandRefusedEvent;

/** Written once per tick, last, carrying the tick that just completed. */
export type TickCompletedEvent = EventFields & { kind: "tick_completed" };

/** An orb press appended `orb` to the buffer, evicting the oldest instance if it was full. */
export type OrbAddedEvent = EventFields & { kind: "orb_added" };

/** A first invoke wrote `abilityId` into slot `slot`. A swap or an unchanged re-invoke announces `slots_changed` alone. */
export type SpellInvokedEvent = EventFields & { kind: "spell_invoked" };

/** The prepared slots hold something different: an insert, a shift, an eviction, or a swap. The view reads them from the world. */
export type SlotsChangedEvent = EventFields & { kind: "slots_changed" };

/** A cast of `abilityId` committed: its cast point ended, its mana is spent, its clock has started, and its effects ran. */
export type CastCommittedEvent = EventFields & { kind: "cast_committed" };

/** A player command was refused for `reason`; `slot` names the key when it was a slot key and `abilityId` the spell when it was a cast, so the view can flash the square. */
export type CommandRefusedEvent = EventFields & { kind: "command_refused" };

/** A ring slot: every field, and a kind that may be any of them. It is assignable to the union, so a reader narrows on `kind`. */
export type EventSlot = EventFields & { kind: DomainEvent["kind"] };

/** Where a system announces an event: the ring's write side, and nothing else of it. */
export type EventSink = {
  write: (event: Readonly<DomainEvent>) => void;
};

/** One slot's starting value: a `tick_completed` at tick zero with every other field neutral. Made once per slot when a ring is built, and once per module that announces. */
export const createDomainEvent = (): EventSlot => ({
  kind: "tick_completed",
  tick: 0,
  orb: -1,
  abilityId: null,
  slot: 0,
  reason: null,
});

/** Writes `source`'s fields into `target`, so the ring stores an event without allocating. */
export const copyDomainEvent = (
  target: EventSlot,
  source: Readonly<DomainEvent>,
): void => {
  target.kind = source.kind;
  target.tick = source.tick;
  target.orb = source.orb;
  target.abilityId = source.abilityId;
  target.slot = source.slot;
  target.reason = source.reason;
};

/** Puts every field back to its neutral value, so an announcer that fills only what its kind needs never carries the last event's fields. */
export const resetDomainEvent = (event: EventSlot): void => {
  event.kind = "tick_completed";
  event.tick = 0;
  event.orb = -1;
  event.abilityId = null;
  event.slot = 0;
  event.reason = null;
};
