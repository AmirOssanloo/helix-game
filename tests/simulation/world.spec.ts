import { describe, expect, expectTypeOf, it } from "vitest";
import { meleeGruntDef } from "@content/public";
import type { Unit } from "@domain/public";
import {
  GROUND_ITEM_CAPACITY,
  readTunable,
  UNIT_CAPACITY,
} from "@domain/queries";
import {
  acquireGroundItem,
  cellCount,
  walkabilityCovers,
  loadMap,
} from "@domain/rules";
import { createEventReader } from "@simulation/public";
import type { WorldView } from "@simulation/public";
import {
  createSessionWorld,
  nextFloat,
  serializeInputLog,
} from "@simulation/testing";
import type { Simulation } from "@simulation/testing";
import {
  idOf,
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
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
  it("starts at tick zero on the given map with empty pools and the map's grid", () => {
    const map = makeMapDef.build({ id: "arena" });
    const world = makeWorld({ seed: 1, map });

    expect(world.view.tick).toBe(0);
    expect(world.view.map.mapId).toBe("arena");
    expect(world.view.map.units.count).toBe(0);
    expect(world.view.map.projectiles.count).toBe(0);
    expect(world.view.map.effects.count).toBe(0);
    expect(world.view.map.zones.count).toBe(0);
    expect(world.view.map.bounds).toBe(map.bounds);
    expect(world.view.map.obstacles).toBe(map.obstacles);
    expect(walkabilityCovers(world.view.map.walkability, map.bounds)).toBe(
      true,
    );
    expect(world.view.map.spatialHash.count).toBe(0);
    expect(world.view.run.heroId).toBeNull();
    expect(world.view.map.units.capacity).toBe(UNIT_CAPACITY);
  });

  it("starts with no ground item, a free byte for every cell of the grid, and no drop not made", () => {
    const world = makeWorld({ seed: 1 });
    const map = world.view.map;

    expect(map.groundItems.count).toBe(0);
    expect(map.groundItems.capacity).toBe(GROUND_ITEM_CAPACITY);
    expect(map.groundItemCells.length).toBe(cellCount(map.walkability));
    expect(Array.from(map.groundItemCells).every((byte) => byte === 0)).toBe(
      true,
    );
    expect(map.dropsNotMade).toBe(0);
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
    expect(world.events.read(reader)).toMatchObject({
      kind: "tick_completed",
      tick: 0,
    });
    expect(world.events.read(reader)).toMatchObject({
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
    world.state.run.heroId = idOf(42);

    loadMap(world.state, makeMapDef.build({ id: "next" }));

    expect(world.view.map.mapId).toBe("next");
    expect(world.view.map.units.count).toBe(0);
    expect(world.view.map.projectiles.count).toBe(0);
    expect(world.view.map.effects.count).toBe(0);
    expect(world.view.map.zones.count).toBe(0);
    expect(world.view.run.heroId).toBe(42);
    expect(world.view.run.tuning.get("turn_ramp_ticks")).toBe(3);
  });

  it("releases every ground item, makes the cells to the new grid all free, and leaves run scope as it was", () => {
    const world = makeWorld({ seed: 1 });
    const spawn = world.view.map.spawnPoint;
    const cellSize = world.view.map.walkability.cellSize;
    const run = world.view.run;
    const randomBefore = { ...run.random };
    const tuningBefore = new Map(run.tuning);
    const formsBefore = run.forms;
    const first = acquireGroundItem(world.state, "gold", spawn.x, spawn.y);
    acquireGroundItem(world.state, "item", spawn.x + cellSize, spawn.y);
    world.state.map.dropsNotMade = 2;
    const next = makeMapDef.build({
      id: "next",
      bounds: { minX: 0, minY: 0, maxX: 640, maxY: 320 },
      spawnPoint: { x: 320, y: 160 },
    });

    loadMap(world.state, next);

    const map = world.view.map;

    expect(map.groundItems.count).toBe(0);
    expect(first === null ? null : map.groundItems.resolve(first)).toBeNull();
    expect(map.groundItemCells.length).toBe(cellCount(map.walkability));
    expect(Array.from(map.groundItemCells).every((byte) => byte === 0)).toBe(
      true,
    );
    expect(map.dropsNotMade).toBe(0);
    expect(world.view.run).toBe(run);
    expect(run.random).toEqual(randomBefore);
    expect(new Map(run.tuning)).toEqual(tuningBefore);
    expect(run.forms).toBe(formsBefore);
    expect(run.heroId).toBeNull();
  });

  it("releases every ground item on the panel's map reset too", () => {
    const world = makeWorld({ seed: 1 });
    const spawn = world.view.map.spawnPoint;
    acquireGroundItem(world.state, "mana_globe", spawn.x, spawn.y);
    world.state.map.dropsNotMade = 1;

    submit(world, { kind: "reset_map", tick: 0, timestamp: 0 });
    world.tick();

    expect(world.view.map.groundItems.count).toBe(0);
    expect(
      Array.from(world.view.map.groundItemCells).every((byte) => byte === 0),
    ).toBe(true);
    expect(world.view.map.dropsNotMade).toBe(0);
  });

  it("keeps the tick count and the random state", () => {
    const world = makeWorld({ seed: 1 });
    world.tick();
    const stateBefore = world.view.run.random.state;

    loadMap(world.state, makeMapDef.build());

    expect(world.view.tick).toBe(1);
    expect(world.view.run.random.state).toBe(stateBefore);
  });

  it("carries the hero to the new map's spawn point with its order cleared, and releases every other unit", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world, { x: 10, y: 20, facing: 1 });
    spawnUnit(world);
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 600, y: 0 },
    });
    world.tick();
    const facingBefore = hero.facing;

    loadMap(world.state, makeMapDef.build({ spawnPoint: { x: 300, y: 400 } }));

    expect(world.view.map.units.count).toBe(1);
    expect(
      world.view.map.units.resolve(world.view.run.heroId ?? idOf(-1)),
    ).toBe(hero);
    expect(hero.curr).toEqual({ x: 300, y: 400 });
    expect(hero.prev).toEqual({ x: 300, y: 400 });
    expect(hero.spawnPoint).toEqual({ x: 300, y: 400 });
    expect(hero.facing).toBe(facingBefore);
    expect(hero.order.kind).toBe("none");
    expect(hero.state).toBe("idle");
    expect(world.view.map.spatialHash.count).toBe(1);
  });

  it("derives the walkability grid for the new map's bounds and takes its obstacles", () => {
    const world = makeWorld({ seed: 1 });
    const next = makeMapDef.build({
      bounds: { minX: 0, minY: 0, maxX: 640, maxY: 320 },
      obstacles: [{ minX: 96, minY: 96, maxX: 160, maxY: 160 }],
      spawnPoint: { x: 320, y: 160 },
    });

    loadMap(world.state, next);

    expect(world.view.map.bounds).toBe(next.bounds);
    expect(world.view.map.obstacles).toBe(next.obstacles);
    expect(world.view.map.walkability.columns).toBe(20);
    expect(world.view.map.walkability.rows).toBe(10);
    expect(walkabilityCovers(world.view.map.walkability, next.bounds)).toBe(
      true,
    );
  });
});

describe("load_map", () => {
  const FIRST = makeMapDef.build({ id: "first" });
  const SECOND = makeMapDef.build({
    id: "second",
    spawnPoint: { x: 300, y: -200 },
    packs: [
      {
        archetypeId: meleeGruntDef.id,
        tier: "normal",
        count: 2,
        position: { x: 900, y: 0 },
        dormant: false,
        legendaryId: null,
      },
    ],
  });

  /** A session world on the first map with the second one registered beside it. */
  const arrangeWorld = (): Simulation =>
    createSessionWorld({
      seed: 1,
      registry: makeRegistry({ maps: [FIRST, SECOND] }),
      map: FIRST,
    });

  /** The reasons every refusal the ring holds was announced with. */
  const refusals = (world: Simulation): string[] => {
    const reader = createEventReader();
    const found: string[] = [];

    for (
      let event = world.events.read(reader);
      event !== null;
      event = world.events.read(reader)
    ) {
      if (event.kind === "command_refused" && event.reason !== null) {
        found.push(event.reason);
      }
    }

    return found;
  };

  it("keeps run scope, the hero's level, experience, orbs, slots, and cooldowns among it, and resets map scope to the new map's packs", () => {
    const world = arrangeWorld();
    const hero = world.state.map.units.resolve(
      world.state.run.heroId ?? idOf(-1),
    );

    if (hero === null) {
      throw new Error("A session world has a hero");
    }

    submit(world, { kind: "level_up", tick: 0, timestamp: 1 });
    submit(world, {
      kind: "set_orb_levels",
      tick: 0,
      timestamp: 2,
      levels: [1, 1, 0],
    });
    submit(world, {
      kind: "spawn_units",
      tick: 0,
      timestamp: 3,
      count: 4,
      position: { x: 200, y: 200 },
    });
    world.tick();
    world.state.map.projectiles.acquire();
    world.state.map.effects.acquire();
    world.state.map.zones.acquire();
    hero.cooldowns.set("some_ability", 90);
    hero.progression.experience = 17;

    const form = world.state.run.forms[0];
    const kitBefore = JSON.stringify(form?.kit);
    const progressionBefore = { ...hero.progression };
    const heroId = world.state.run.heroId;
    const randomBefore = world.view.run.random.state;

    submit(world, {
      kind: "load_map",
      tick: 1,
      timestamp: 10,
      mapId: SECOND.id,
    });
    world.tick();

    expect(world.view.map.mapId).toBe(SECOND.id);
    expect(world.view.run.heroId).toBe(heroId);
    expect(world.view.map.units.resolve(heroId ?? idOf(-1))).toBe(hero);
    expect(hero.progression).toEqual(progressionBefore);
    expect(hero.progression.level).toBe(2);
    expect(JSON.stringify(world.state.run.forms[0]?.kit)).toBe(kitBefore);
    expect(hero.cooldowns.get("some_ability")).toBe(90);
    expect(hero.curr).toEqual(SECOND.spawnPoint);
    expect(hero.spawnPoint).toEqual(SECOND.spawnPoint);
    expect(world.view.map.units.count).toBe(1 + 2);
    expect(world.view.map.projectiles.count).toBe(0);
    expect(world.view.map.effects.count).toBe(0);
    expect(world.view.map.zones.count).toBe(0);
    expect(world.view.map.packs.map((pack) => pack.state)).toEqual(["awake"]);
    expect(world.view.map.furthestCheckpoint).toBe(-1);
    expect(world.view.run.random.state).toBe(randomBefore);
    expect(world.log.commandAt(world.log.count - 1)).toMatchObject({
      kind: "load_map",
      mapId: SECOND.id,
    });
  });

  it("is refused for a map no one registered, announcing why, and changes nothing", () => {
    const world = arrangeWorld();

    submit(world, {
      kind: "load_map",
      tick: 0,
      timestamp: 1,
      mapId: "nowhere",
    });
    world.tick();

    expect(world.view.map.mapId).toBe(FIRST.id);
    expect(refusals(world)).toEqual(["unknown_map"]);
  });

  it("carries a dead hero dead to the new spawn point, where it stands up when its delay runs out", () => {
    const world = arrangeWorld();
    const heroId = world.state.run.heroId ?? idOf(-1);
    const hero = world.state.map.units.resolve(heroId);

    if (hero === null) {
      throw new Error("A session world has a hero");
    }

    submit(world, { kind: "kill_hero", tick: 0, timestamp: 1 });
    world.tick();

    expect(hero.state).toBe("dead");

    submit(world, {
      kind: "load_map",
      tick: 1,
      timestamp: 2,
      mapId: SECOND.id,
    });
    world.tick();

    expect(world.view.map.mapId).toBe(SECOND.id);
    expect(hero.state).toBe("dead");
    expect(hero.curr).toEqual(SECOND.spawnPoint);

    tickUntil(world, () => hero.state !== "dead", 1000);

    expect(hero.curr).toEqual(SECOND.spawnPoint);
  });

  it("keeps the map the world was made on as its start, which a saved log names", () => {
    const world = arrangeWorld();

    submit(world, {
      kind: "load_map",
      tick: 0,
      timestamp: 1,
      mapId: SECOND.id,
    });
    world.tick();

    expect(world.mapDef.id).toBe(FIRST.id);
    expect(
      JSON.parse(
        serializeInputLog(world.view, world.log, world.mapDef.id, "stamp", []),
      ),
    ).toMatchObject({ mapId: FIRST.id });
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
