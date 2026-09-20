import { describe, expect, expectTypeOf, it } from "vitest";
import type { Unit } from "@domain/public";
import { readTunable, UNIT_CAPACITY } from "@domain/public";
import { createEventReader, nextFloat } from "@simulation/public";
import type { Simulation, WorldView } from "@simulation/public";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  submit,
  tickUntil,
} from "../helpers";

/** A live unit for a spec that needs one, taken straight from the pool. */
const spawnUnit = (world: Simulation): Unit => {
  const unit = world.state.map.units.acquire();

  if (unit === null) {
    throw new Error("The unit pool has room in a fresh world");
  }

  return unit;
};

describe("createWorld", () => {
  it("starts at tick zero on the given map with empty pools", () => {
    const world = makeWorld({ seed: 1, map: { id: "arena" } });

    expect(world.view.tick).toBe(0);
    expect(world.view.map.mapId).toBe("arena");
    expect(world.view.map.units.count).toBe(0);
    expect(world.view.map.projectiles.count).toBe(0);
    expect(world.view.map.effects.count).toBe(0);
    expect(world.view.map.zones.count).toBe(0);
    expect(world.view.map.walkability).toBeNull();
    expect(world.view.map.spatialHash).toBeNull();
    expect(world.view.run.heroId).toBeNull();
    expect(world.view.map.units.capacity).toBe(UNIT_CAPACITY);
  });

  it("copies the registry's tuning into run scope, converted into simulation units", () => {
    const registry = makeRegistry({
      tuning: { turn_ramp_ticks: 3, base_ms: 300, sim_hz: 30 },
    });
    const world = makeWorld({ seed: 1, registry });

    expect(readTunable(world.view.run.tuning, "turn_ramp_ticks")).toBe(3);
    expect(readTunable(world.view.run.tuning, "base_ms")).toBe(10);
  });

  it("gives two worlds with the same seed the same random sequence", () => {
    const first = makeWorld({ seed: 11 });
    const second = makeWorld({ seed: 11 });

    expect(nextFloat(first.state.run.random)).toBe(
      nextFloat(second.state.run.random),
    );
  });

  it("gives two worlds with different seeds different random sequences", () => {
    const first = makeWorld({ seed: 11 });
    const second = makeWorld({ seed: 12 });

    expect(nextFloat(first.state.run.random)).not.toBe(
      nextFloat(second.state.run.random),
    );
  });
});

describe("tick", () => {
  it("advances the tick count and announces the completed tick last", () => {
    const world = makeWorld({ seed: 1 });
    const reader = createEventReader();

    world.tick();
    world.tick();

    expect(world.view.tick).toBe(2);
    expect(world.events.read(reader)).toEqual({
      kind: "tick_completed",
      tick: 0,
    });
    expect(world.events.read(reader)).toEqual({
      kind: "tick_completed",
      tick: 1,
    });
    expect(world.events.read(reader)).toBeNull();
  });

  it("copies each unit's and projectile's current position into its previous position", () => {
    const world = makeWorld({ seed: 1 });
    const unit = spawnUnit(world);
    const projectile = world.state.map.projectiles.acquire();

    if (projectile === null) {
      throw new Error("The projectile pool has room in a fresh world");
    }

    unit.curr.x = 5;
    unit.curr.y = 7;
    projectile.curr.x = 2;
    projectile.curr.y = 3;

    world.tick();

    expect(unit.prev).toEqual({ x: 5, y: 7 });
    expect(projectile.prev).toEqual({ x: 2, y: 3 });
  });

  it("consumes the waiting commands in timestamp order and empties the buffer", () => {
    const world = makeWorld({ seed: 1 });
    const late = { kind: "noop", tick: 0, timestamp: 20 } as const;
    const early = { kind: "debug_noop", tick: 0, timestamp: 10 } as const;
    submit(world, late);
    submit(world, early);

    world.tick();

    expect(world.pendingCommands).toBe(0);
    expect(world.log.commandAt(0)).toBe(early);
    expect(world.log.commandAt(1)).toBe(late);
  });
});

describe("loadMap", () => {
  it("empties every map-scoped pool and leaves the hero id and tuning state unchanged", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({ tuning: { turn_ramp_ticks: 3 } }),
    });
    spawnUnit(world);
    world.state.map.projectiles.acquire();
    world.state.map.effects.acquire();
    world.state.map.zones.acquire();
    world.state.run.heroId = 42;

    world.loadMap({ id: "next" });

    expect(world.view.map.mapId).toBe("next");
    expect(world.view.map.units.count).toBe(0);
    expect(world.view.map.projectiles.count).toBe(0);
    expect(world.view.map.effects.count).toBe(0);
    expect(world.view.map.zones.count).toBe(0);
    expect(world.view.run.heroId).toBe(42);
    expect(world.view.run.tuning.get("turn_ramp_ticks")).toBe(3);
  });

  it("keeps the tick count and the random state", () => {
    const world = makeWorld({ seed: 1 });
    world.tick();
    const stateBefore = world.view.run.random.state;

    world.loadMap(makeMapDef.build());

    expect(world.view.tick).toBe(1);
    expect(world.view.run.random.state).toBe(stateBefore);
  });
});

describe("dispose", () => {
  it("releases every pool, forgets the log, and refuses further commands", () => {
    const world = makeWorld({ seed: 1 });
    spawnUnit(world);
    submit(world, { kind: "noop", tick: 0, timestamp: 1 });
    world.tick();

    world.dispose();

    expect(world.disposed).toBe(true);
    expect(world.view.map.units.count).toBe(0);
    expect(world.log.count).toBe(0);
    expect(world.submit({ kind: "noop", tick: 1, timestamp: 2 })).toBe(false);
  });
});

describe("the world view", () => {
  it("is the live state under a read-only type, not a copy", () => {
    const world = makeWorld({ seed: 1 });
    const view: WorldView = world.view;

    world.tick();

    expect(view.tick).toBe(1);
  });

  it("refuses a write at any depth at compile time", () => {
    const world = makeWorld({ seed: 1 });
    const view: WorldView = world.view;
    const unit = spawnUnit(world);
    const viewedUnit = view.map.units.at(0);

    if (viewedUnit === null) {
      throw new Error("The spawned unit is visible through the view");
    }

    const tick = view.tick;
    const x = viewedUnit.curr.x;

    // @ts-expect-error the view is read-only at its root
    view.tick = tick;
    // @ts-expect-error the view is read-only inside a pool entry
    viewedUnit.curr.x = x;
    expectTypeOf(viewedUnit.cooldowns).not.toHaveProperty("set");
    expectTypeOf(view.map.units).not.toHaveProperty("acquire");
    expectTypeOf(view.map.units).not.toHaveProperty("release");

    expect(unit.curr.x).toBe(0);
  });
});

describe("tickUntil", () => {
  it("ticks until the predicate holds and returns the ticks it took", () => {
    const world = makeWorld({ seed: 1 });

    const ticks = tickUntil(world, (view) => view.tick === 3, 10);

    expect(ticks).toBe(3);
    expect(world.view.tick).toBe(3);
  });

  it("fails loudly at its maximum", () => {
    const world = makeWorld({ seed: 1 });

    expect(() => tickUntil(world, () => false, 5)).toThrow(/5 ticks/);
  });
});
