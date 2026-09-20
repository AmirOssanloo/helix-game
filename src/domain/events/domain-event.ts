import type { Tick } from "../tick";

/**
 * Something the simulation announces after it happens: a plain value in the event ring, never
 * a callback. A view reacts to one; it never rebuilds state from them.
 */
export type DomainEvent = TickCompletedEvent;

/** Written once per tick, last, carrying the tick that just completed. */
export type TickCompletedEvent = {
  kind: "tick_completed";
  tick: Tick;
};

/** One ring slot's starting value, made once per slot when the ring is built. */
export const createDomainEvent = (): DomainEvent => ({
  kind: "tick_completed",
  tick: 0,
});

/** Writes `source`'s fields into `target`, so the ring stores an event without allocating. */
export const copyDomainEvent = (
  target: DomainEvent,
  source: Readonly<DomainEvent>,
): void => {
  target.kind = source.kind;
  target.tick = source.tick;
};
