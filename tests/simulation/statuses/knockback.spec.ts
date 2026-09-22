import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { makeWorld, spawnHero, submit, tickUntil } from "../../helpers";

/** Short enough that a spec ticks past the end of the knockback. */
const SHORT_TICKS = 3;

type Arranged = { world: Simulation; hero: Unit };

/** A world with the hero at the origin, facing the point it is sent to. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);

  return { world, hero };
};

/** Puts `statusId` on the hero for `ticks` by the panel's door. */
const apply = (world: Simulation, statusId: string, ticks: number): void => {
  submit(world, {
    kind: "apply_status",
    tick: world.view.tick,
    timestamp: world.view.tick,
    statusId,
    ticks,
  });
};

/** Sends the hero walking along +X, which it already faces. */
const walk = (world: Simulation): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x: 5000, y: 0 },
  });
};

describe("a knockback on the hero", () => {
  it("keeps the order it was walking", () => {
    const { world, hero } = arrange();
    walk(world);
    world.tick();

    apply(world, "knockback", SHORT_TICKS);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.disables.displaced).toBe(true);
  });

  it("stops the unit moving itself while it lasts", () => {
    const { world, hero } = arrange();
    walk(world);
    world.tick();

    apply(world, "knockback", SHORT_TICKS);
    world.tick();

    const x = hero.curr.x;

    world.tick();

    expect(hero.curr.x).toBe(x);
  });

  it("walks the order again on the tick it expires", () => {
    const { world, hero } = arrange();
    walk(world);
    world.tick();

    apply(world, "knockback", SHORT_TICKS);
    world.tick();

    const x = hero.curr.x;

    tickUntil(world, () => !hero.disables.displaced, 20);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.curr.x).toBeGreaterThan(x);
  });

  it("is ignored while one is already carrying the unit: the first end stands", () => {
    const { world, hero } = arrange();
    apply(world, "knockback", SHORT_TICKS + SHORT_TICKS);
    world.tick();
    apply(world, "knockback", SHORT_TICKS);
    world.tick();

    const rows = hero.statuses.filter((row) => row.definitionId !== null);

    expect(rows.map((row) => row.definitionId)).toEqual(["knockback"]);
    expect(rows[0]?.endsAtTick).toBe(SHORT_TICKS + SHORT_TICKS);
  });
});
