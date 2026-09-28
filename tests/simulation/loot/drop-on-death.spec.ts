import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  GroundItem,
  LootTableDef,
  MapDef,
  PackDef,
  Registry,
  UnitId,
  World,
} from "@domain/public";
import { acquireGroundItem, isBlockedAt } from "@domain/rules";
import type { InputLogFile } from "@simulation/public";
import { isReplayRefusal } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  createSessionWorld,
  mapOfLog,
  Replay,
  stateDifference,
} from "@simulation/testing";
import {
  loadInputLog,
  makeMapDef,
  makeRegistry,
  makeWorld,
  submit,
  tickDifference,
} from "../../helpers";

/** The layer the hero paths on, which every drop must lie open on. */
const HERO_CLASS = 1;

/** The stored log a boss and its packs die in, recorded on the arena. */
const BOSS_ENCOUNTER = "boss-encounter";

/** A replay of the boss encounter compares two worlds at every one of its ticks. */
const REPLAY_TIMEOUT_MS = 60_000;

const PIECE = "rimecoil";

/** Every live ground item of `world`, with its slot. */
const groundItemsOf = (world: Simulation): Readonly<GroundItem>[] => {
  const items: Readonly<GroundItem>[] = [];
  const pool = world.view.map.groundItems;

  for (let index = 0; index < pool.end; index += 1) {
    const item = pool.at(index);

    if (item !== null) {
      items.push(item as Readonly<GroundItem>);
    }
  }

  return items;
};

/** The within-layer cell a point lies in. */
const cellOf = (world: Simulation, x: number, y: number): number => {
  const grid = world.view.map.walkability;

  return (
    Math.floor((y - grid.originY) / grid.cellSize) * grid.columns +
    Math.floor((x - grid.originX) / grid.cellSize)
  );
};

/** A replay of `file` on a fresh session world built from `registry`, whatever stamp the registry carries: the comparison below replays one log under two sets of tables. */
const replayUnder = (file: InputLogFile, registry: Registry): Replay => {
  const map = mapOfLog(file, registry);

  if (isReplayRefusal(map)) {
    throw new Error(map.message);
  }

  return new Replay(
    createSessionWorld({ seed: file.seed, registry, map }),
    file,
  );
};

/** Every loot table with nothing in it: no chance of gold, no globe, no item roll, and no Legendary. */
const emptiedTables = (): LootTableDef[] =>
  contentRegistry.lootTables.map((table) => ({
    ...table,
    goldChance: 0,
    healthGlobeChances: [],
    manaGlobeChances: [],
    itemRolls: [],
    legendaryChance: 0,
  }));

/**
 * The first thing two worlds disagree on at this tick besides what the loot tables are and what
 * lies on the ground: the full-state comparison over `b` with its ground items, its drops not
 * made, and its tuning table taken from `a`, once every tunable but the loot tables' is found
 * equal.
 */
const differenceBesideLoot = (a: World, b: World): string | null => {
  for (const [key, value] of a.run.tuning) {
    if (!key.startsWith("def:loot:") && b.run.tuning.get(key) !== value) {
      return `run.tuning{${key}}: ${String(value)} vs ${String(b.run.tuning.get(key))}`;
    }
  }

  return stateDifference(a, {
    ...b,
    run: { ...b.run, tuning: a.run.tuning },
    map: {
      ...b.map,
      groundItems: a.map.groundItems,
      groundItemCells: a.map.groundItemCells,
      dropsNotMade: a.map.dropsNotMade,
    },
  });
};

/** A pack of the map naming `legendaryId`, awake from the start. */
const bossPack = (
  x: number,
  y: number,
  legendaryId: string | null,
): PackDef => ({
  archetypeId: "melee_grunt",
  tier: "boss",
  count: 1,
  position: { x, y },
  dormant: false,
  legendaryId,
});

/** A map of 40 by 20 cells, the hero far from the corner a boss stands in. */
const wideMap = (packs: readonly PackDef[]): MapDef =>
  makeMapDef.build({
    bounds: { minX: 0, minY: 0, maxX: 32 * 40, maxY: 32 * 20 },
    spawnPoint: { x: 48, y: 48 },
    packs,
  });

/** A registry whose boss table drops its Legendary at every death, so a spec never waits on the 10%. */
const alwaysLegendary = (): Registry =>
  makeRegistry({
    lootTables: contentRegistry.lootTables.map((table) =>
      table.id === "boss" ? { ...table, legendaryChance: 1 } : table,
    ),
  });

describe("a drop on death", () => {
  it("lies on walkable cells open to the hero within the search radius of the body, one to a cell", () => {
    const world = makeWorld({ seed: 17 });
    const radius = world.view.run.tuning.get("drop_placement_radius") ?? 0;

    for (const tier of ["normal", "elite", "boss"] as const) {
      submit(world, {
        kind: "spawn_pack",
        tick: 0,
        timestamp: 0,
        archetypeId: "melee_grunt",
        tier,
        count: 3,
        position: { x: 600, y: 600 },
      });
    }

    world.tick();

    const bodies = new Map<number, { x: number; y: number }>();

    for (let index = 0; index < world.view.map.units.end; index += 1) {
      const unit = world.view.map.units.at(index);
      const id = world.view.map.units.idAt(index);

      if (unit !== null && id !== null && unit.kind === "enemy") {
        bodies.set(id, { x: unit.curr.x, y: unit.curr.y });
      }
    }

    submit(world, { kind: "kill_all", tick: 1, timestamp: 0 });
    world.tick();

    const cells = new Set<number>();
    let dropped = 0;

    for (
      let sequence = world.events.oldest;
      sequence < world.events.cursor;
      sequence += 1
    ) {
      const event = world.events.at(sequence);

      if (event === null || event.kind !== "item_dropped") {
        continue;
      }

      const item =
        event.groundItemId === null
          ? null
          : world.view.map.groundItems.resolve(event.groundItemId);
      const body = event.unitId === null ? undefined : bodies.get(event.unitId);

      expect(item).not.toBeNull();
      expect(body).toBeDefined();

      if (item === null || body === undefined) {
        continue;
      }

      dropped += 1;
      expect(
        isBlockedAt(
          world.view.map.walkability,
          HERO_CLASS,
          item.position.x,
          item.position.y,
        ),
      ).toBe(false);
      expect(
        Math.hypot(item.position.x - body.x, item.position.y - body.y),
      ).toBeLessThanOrEqual(radius);
      expect(item.droppedAtTick).toBe(1);
      expect(item.kind === "gold").toBe(event.amount > 0);
      cells.add(cellOf(world, item.position.x, item.position.y));
    }

    expect(dropped).toBeGreaterThanOrEqual(3 + 3 * 2);
    expect(dropped).toBe(groundItemsOf(world).length);
    expect(cells.size).toBe(dropped);
    expect(world.view.map.dropsNotMade).toBe(0);
  });

  it("leaves no drop on a blocked cell beside a wall, and refuses and counts what finds no free cell", () => {
    const world = makeWorld({
      seed: 17,
      registry: makeRegistry({ tuning: { drop_placement_radius: 0 } }),
      map: makeMapDef.build({
        obstacles: [{ minX: 640, minY: 0, maxX: 1280, maxY: 1280 }],
      }),
    });
    const grid = world.view.map.walkability;
    const x =
      grid.originX +
      (Math.floor((600 - grid.originX) / grid.cellSize) + 0.5) * grid.cellSize;
    const y =
      grid.originY +
      (Math.floor((600 - grid.originY) / grid.cellSize) + 0.5) * grid.cellSize;

    submit(world, {
      kind: "spawn_pack",
      tick: 0,
      timestamp: 0,
      archetypeId: "melee_grunt",
      tier: "boss",
      count: 1,
      position: { x, y },
    });
    world.tick();
    submit(world, { kind: "kill_all", tick: 1, timestamp: 0 });
    world.tick();

    const items = groundItemsOf(world);

    // A radius of nothing reaches only the body's own cell when the body stands at its centre.
    expect(items.length).toBeLessThanOrEqual(1);

    for (const item of items) {
      expect(
        isBlockedAt(grid, HERO_CLASS, item.position.x, item.position.y),
      ).toBe(false);
    }

    // A boss drops gold, two health globes, two mana globes, and two items: seven in all.
    expect(items.length + world.view.map.dropsNotMade).toBe(7);
  });

  it("with the pool three slots short of full, makes a boss's Legendary and its two items and refuses the rest, counted", () => {
    const world = makeWorld({
      seed: 23,
      registry: alwaysLegendary(),
      map: wideMap([bossPack(32 * 36, 32 * 17, PIECE)]),
    });
    const grid = world.view.map.walkability;
    let filled = 0;

    for (let cell = 0; filled < 512 - 3; cell += 1) {
      const column = cell % grid.columns;
      const row = (cell - column) / grid.columns;
      const id = acquireGroundItem(
        world.state,
        "gold",
        grid.originX + (column + 0.5) * grid.cellSize,
        grid.originY + (row + 0.5) * grid.cellSize,
      );

      expect(id).not.toBeNull();
      filled += 1;
    }

    const missesBefore = world.view.map.groundItems.misses;

    submit(world, { kind: "kill_all", tick: 0, timestamp: 0 });
    world.tick();

    const made = groundItemsOf(world).filter(
      (item) => item.droppedAtTick === 0 && item.kind === "item",
    );

    expect(world.view.map.groundItems.count).toBe(512);
    expect(made).toHaveLength(3);
    expect(made.map((item) => item.item.legendaryId)).toContain(PIECE);
    expect(world.view.map.dropsNotMade).toBe(5);
    expect(world.view.map.groundItems.misses - missesBefore).toBe(5);
  });

  it("drops a named boss's Legendary, and never from a boss the panel spawns", () => {
    const world = makeWorld({
      seed: 29,
      registry: alwaysLegendary(),
      map: wideMap([bossPack(32 * 10, 32 * 10, PIECE)]),
    });

    submit(world, {
      kind: "spawn_pack",
      tick: 0,
      timestamp: 0,
      archetypeId: "melee_grunt",
      tier: "boss",
      count: 1,
      position: { x: 32 * 30, y: 32 * 10 },
    });
    world.tick();
    submit(world, { kind: "kill_all", tick: 1, timestamp: 0 });
    world.tick();

    const pieces = groundItemsOf(world).filter(
      (item) => item.item.legendaryId === PIECE,
    );

    expect(pieces).toHaveLength(1);
    expect(pieces[0]?.position.x).toBeLessThan(32 * 20);
  });

  it("drops nothing from an imp a summoner owns, killed with it", () => {
    const world = makeWorld({ seed: 31 });

    for (const [archetypeId, x] of [
      ["summoner", 300],
      ["imp", 600],
    ] as const) {
      submit(world, {
        kind: "spawn_pack",
        tick: 0,
        timestamp: 0,
        archetypeId,
        tier: "elite",
        count: archetypeId === "imp" ? 2 : 1,
        position: { x, y: 600 },
      });
    }

    world.tick();

    const units = world.state.map.units;
    let summonerId: UnitId | null = null;

    for (let index = 0; index < units.end; index += 1) {
      if (units.at(index)?.definitionId === "summoner") {
        summonerId = units.idAt(index);
      }
    }

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);

      if (unit !== null && unit.definitionId === "imp") {
        unit.summon.ownerId = summonerId;
      }
    }

    expect(summonerId).not.toBeNull();
    submit(world, { kind: "kill_all", tick: 1, timestamp: 0 });
    world.tick();

    const droppers = new Set<number | null>();

    for (
      let sequence = world.events.oldest;
      sequence < world.events.cursor;
      sequence += 1
    ) {
      const event = world.events.at(sequence);

      if (event?.kind === "item_dropped") {
        droppers.add(event.unitId);
      }
    }

    expect([...droppers]).toEqual([summonerId]);
    expect(world.view.map.dropsNotMade).toBe(0);
  });

  it("drops at the level a set_map_level gives the map, a panel-spawned pack's items included", () => {
    const world = makeWorld({ seed: 17 });

    submit(world, { kind: "set_map_level", tick: 0, timestamp: 0, level: 7 });
    submit(world, {
      kind: "spawn_pack",
      tick: 0,
      timestamp: 0,
      archetypeId: "melee_grunt",
      tier: "boss",
      count: 2,
      position: { x: 600, y: 600 },
    });
    world.tick();
    submit(world, { kind: "kill_all", tick: 1, timestamp: 0 });
    world.tick();

    const levels = groundItemsOf(world)
      .filter((item) => item.kind === "item")
      .map((item) => item.item.itemLevel);

    expect(levels.length).toBeGreaterThanOrEqual(2);
    expect(new Set(levels)).toEqual(new Set([7]));
  });

  it(
    "drops the same things in the same places on two replays of the boss encounter",
    () => {
      const file = loadInputLog(BOSS_ENCOUNTER);
      const first = replayUnder(file, contentRegistry);
      const second = replayUnder(file, contentRegistry);

      while (!first.done) {
        first.tick();
        second.tick();

        expect(
          tickDifference(first.world.state, second.world.state),
          `after tick ${String(first.view.tick)}`,
        ).toBeNull();
      }

      expect(groundItemsOf(first.world).length).toBeGreaterThan(0);
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "moves nothing but the ground items over the boss encounter with every table on and every table emptied",
    () => {
      const file = loadInputLog(BOSS_ENCOUNTER);
      const on = replayUnder(file, contentRegistry);
      const emptied = replayUnder(
        file,
        makeRegistry({ lootTables: emptiedTables() }),
      );

      while (!on.done) {
        on.tick();
        emptied.tick();

        expect(
          differenceBesideLoot(on.world.state, emptied.world.state),
          `after tick ${String(on.view.tick)}`,
        ).toBeNull();
      }

      expect(groundItemsOf(on.world).length).toBeGreaterThan(0);
      expect(groundItemsOf(emptied.world)).toHaveLength(0);
    },
    REPLAY_TIMEOUT_MS,
  );
});
