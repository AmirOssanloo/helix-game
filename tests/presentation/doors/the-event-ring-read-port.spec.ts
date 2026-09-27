import { describe, expect, expectTypeOf, it } from "vitest";
import type { DevApiPorts } from "@devtools/public";
import type { DomainEvent } from "@domain/public";
import { createDomainEvent } from "@domain/rules";
import type { SceneContext } from "@presentation/public";
import type { EventRingView, SessionHandle } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { EventRing } from "@simulation/testing";

const CAPACITY = 4;

const eventAt = (tick: number): DomainEvent => ({
  ...createDomainEvent(),
  tick,
});

/**
 * Calls the ring's writes through its read port. Never run: the lines only have to fail to
 * compile, and each `@ts-expect-error` fails the typecheck if one ever compiles.
 */
export const writeThroughThePort = (
  port: EventRingView,
  event: DomainEvent,
): void => {
  // @ts-expect-error The read port has no write.
  port.write(event);
  // @ts-expect-error The read port has no clear.
  port.clear();
};

describe("the event ring's read port", () => {
  it("is what the scenes, the panel, and a session's handle hold", () => {
    expectTypeOf<SceneContext["events"]>().toEqualTypeOf<EventRingView>();
    expectTypeOf<DevApiPorts["events"]>().toEqualTypeOf<EventRingView>();
    expectTypeOf<SessionHandle["events"]>().toEqualTypeOf<EventRingView>();
  });

  it("has neither a write nor a clear", () => {
    expectTypeOf<EventRingView>().not.toHaveProperty("write");
    expectTypeOf<EventRingView>().not.toHaveProperty("clear");
  });

  it("reads every event the ring holds, moving only its own reader", () => {
    const ring = new EventRing(CAPACITY);
    const port: EventRingView = ring;
    const reader = createEventReader();
    const other = createEventReader();

    ring.write(eventAt(1));
    ring.write(eventAt(2));

    expect(port.pending(reader)).toBe(2);
    expect(port.read(reader)?.tick).toBe(1);
    expect(port.read(reader)?.tick).toBe(2);
    expect(port.read(reader)).toBeNull();
    expect(port.pending(other)).toBe(2);
    expect(port.cursor).toBe(2);
  });

  it("skips a reader to now without reading or losing a thing", () => {
    const ring = new EventRing(CAPACITY);
    const port: EventRingView = ring;
    const reader = createEventReader();

    ring.write(eventAt(1));
    port.skip(reader);

    expect(port.pending(reader)).toBe(0);
    expect(port.overwrites).toBe(0);
  });
});
