import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  DomainEvent,
  Item,
  ItemBaseDef,
  MapDef,
  RefusalReason,
  StoreCommand,
  World,
} from "@domain/public";
import {
  NO_PLACE,
  NO_RECORD,
  NO_STORE,
  priceOf,
  recordAt,
  STOCK_SLOT_COUNT,
  stockPlace,
  storeTabOf,
} from "@domain/queries";
import { createItem, DRAW_PURPOSE, placeItem } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import {
  createEventReader,
  isReplayRefusal,
  parseInputLogFile,
} from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  beginReplay,
  contentVersionOf,
  createSessionWorld,
  serializeInputLog,
  stateDifference,
} from "@simulation/testing";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

/** The store rows of the catalogue: the rarities a store stocks. */
const STOCKED_RARITIES = ["common", "uncommon", "rare"];

/** The sell fraction as content writes it. */
const SELL_FRACTION = 0.25;

/** How far a checkpoint's ring reaches, as content writes it. */
const REACH = 256;

/** Two checkpoints far apart on a bare map: the hero spawns on the first. */
const storeMap = (): MapDef =>
  makeMapDef.build({
    checkpoints: [
      { x: 0, y: 0 },
      { x: 3000, y: 0 },
    ],
  });

const baseOf = (id: string): ItemBaseDef => {
  const base = contentRegistry.itemBases.find((each) => each.id === id);

  if (base === undefined) {
    throw new Error(`The content holds the base ${id}`);
  }

  return base;
};

const band = baseOf("band");

/** A common band at item level one, with its one implicit line. */
const aBand = (): Item => {
  const item = createItem();
  const implicit = item.lines[0];

  item.baseId = band.id;
  item.rarityId = "common";
  item.itemLevel = 1;
  item.lineCount = 1;

  if (implicit !== undefined) {
    implicit.sourceId = band.id;
    implicit.value = 1;
  }

  return item;
};

const put = (world: World, corner: number): void => {
  placeItem(world.run.inventory, aBand(), band.width, band.height, corner);
};

/** Every free cell of the inventory filled with a band. */
const fillWithBands = (world: World): void => {
  for (let cell = 0; cell < 40; cell += 1) {
    if (recordAt(world.run.inventory, cell) === NO_RECORD) {
      put(world, cell);
    }
  }
};

type Arranged = Readonly<{ world: Simulation; reader: EventReader }>;

/** A hero at `x`, on the first checkpoint's ring by default, on the store map, and a reader at the start of the ring. */
const arrange = (seed = 1, x = 0): Arranged => {
  const map = storeMap();
  const world = makeWorld({
    seed,
    map,
    registry: makeRegistry({ maps: [map] }),
  });

  spawnHero(world, { x });

  return { world, reader: createEventReader() };
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: StoreCommand): void => {
  submit(world, command);
  world.tick();
};

const openAt = (world: Simulation, checkpoint: number): void => {
  send(world, { kind: "open_store", ...stamp(world), checkpoint });
};

/** Every store event, item event, or refusal the reader has not seen, advancing it past everything. */
const storeEvents = (world: Simulation, reader: EventReader): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (
      event.kind.startsWith("store_") ||
      event.kind === "item_bought" ||
      event.kind === "item_sold" ||
      event.kind === "command_refused"
    ) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Each stock slot of the store at `checkpoint` as its base, rarity, item level, and lines, `null` where empty. */
const stockOf = (world: Simulation, checkpoint: number) =>
  world.view.map.stores[checkpoint]?.stock.map((item) =>
    item.baseId === null
      ? null
      : {
          baseId: item.baseId,
          rarityId: item.rarityId,
          itemLevel: item.itemLevel,
          lines: item.lines
            .slice(0, item.lineCount)
            .map((line) => [line.sourceId, line.value]),
        },
  );

/** What the hero holds and what the stores hold: the inventory, gold, every stock, and which store is open. */
const holdings = (world: Simulation) => ({
  cells: [...world.view.run.inventory.cells],
  gold: world.view.run.gold,
  stocks: world.view.map.stores.map((_, checkpoint) =>
    stockOf(world, checkpoint),
  ),
  stocked: world.view.map.stores.map((store) => store.stocked),
  openStore: world.view.map.openStore,
});

const levelUp = (world: Simulation, times: number): void => {
  for (let level = 0; level < times; level += 1) {
    submit(world, { kind: "level_up", ...stamp(world) });
  }

  world.tick();
};

describe("open_store", () => {
  it("opens the store of the ring the hero stands in, on its edge included, and announces it", () => {
    const { world, reader } = arrange(1, REACH);

    openAt(world, 0);

    expect(world.view.map.openStore).toBe(0);
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "store_opened", checkpoint: 0, unitId: world.view.run.heroId },
    ]);
  });

  it("refuses a checkpoint whose ring the hero stands one unit outside of", () => {
    const { world, reader } = arrange(1, REACH + 1);

    openAt(world, 0);

    expect(world.view.map.openStore).toBe(NO_STORE);
    expect(world.view.map.stores[0]?.stocked).toBe(false);
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "not_at_checkpoint", checkpoint: 0 },
    ]);
  });

  it("closes the store open at another checkpoint", () => {
    const world = makeWorld({
      seed: 1,
      map: makeMapDef.build({
        checkpoints: [
          { x: 0, y: 0 },
          { x: 300, y: 0 },
        ],
      }),
    });
    const reader = createEventReader();

    spawnHero(world, { x: 150 });
    openAt(world, 0);
    openAt(world, 1);

    expect(world.view.map.openStore).toBe(1);
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "store_opened", checkpoint: 0 },
      { kind: "store_closed", checkpoint: 0 },
      { kind: "store_opened", checkpoint: 1 },
    ]);
  });

  it("changes nothing when the store named is already open", () => {
    const { world, reader } = arrange();

    openAt(world, 0);
    storeEvents(world, reader);

    const before = holdings(world);

    openAt(world, 0);

    expect(holdings(world)).toEqual(before);
    expect(storeEvents(world, reader)).toEqual([]);
  });
});

describe("the stock", () => {
  it("is twelve items, Common to Rare, at the hero's level on the tick it first opens", () => {
    const { world } = arrange(5);

    levelUp(world, 3);
    openAt(world, 0);

    const stock = world.view.map.stores[0]?.stock ?? [];

    expect(world.view.map.stores[0]?.stocked).toBe(true);
    expect(stock).toHaveLength(STOCK_SLOT_COUNT);

    for (const item of stock) {
      expect(item.baseId).not.toBeNull();
      expect(item.itemLevel).toBe(4);
      expect(STOCKED_RARITIES).toContain(item.rarityId);
      expect(item.legendaryId).toBeNull();
      expect(
        contentRegistry.itemBases.find((base) => base.id === item.baseId)
          ?.qualityLevel,
      ).toBeLessThanOrEqual(4);
    }
  });

  it("sits each item in its tab by its base's armory slot", () => {
    expect(storeTabOf("helm")).toBe("armour");
    expect(storeTabOf("body")).toBe("armour");
    expect(storeTabOf("gloves")).toBe("armour");
    expect(storeTabOf("belt")).toBe("armour");
    expect(storeTabOf("boots")).toBe("armour");
    expect(storeTabOf("main_hand")).toBe("weapons");
    expect(storeTabOf("off_hand")).toBe("weapons");
    expect(storeTabOf("amulet")).toBe("misc");
    expect(storeTabOf("ring")).toBe("misc");
  });

  it("is the same for the same seed, checkpoint, hero level, and opening tick", () => {
    const first = arrange(9).world;
    const second = arrange(9).world;

    openAt(first, 0);
    openAt(second, 0);

    expect(stockOf(first, 0)).toEqual(stockOf(second, 0));
  });

  it("keys on the checkpoint and on the tick it opens", () => {
    const here = arrange(9).world;
    const later = arrange(9).world;
    const there = arrange(9, 3000).world;

    openAt(here, 0);
    later.tick();
    openAt(later, 0);
    openAt(there, 1);

    expect(stockOf(later, 0)).not.toEqual(stockOf(here, 0));
    expect(stockOf(there, 1)).not.toEqual(stockOf(here, 0));
  });

  it("shows what the first opening left on a second, whatever the hero's level is by then", () => {
    const { world } = arrange(3);

    openAt(world, 0);
    world.state.run.gold = 100_000;
    send(world, { kind: "buy_item", ...stamp(world), place: stockPlace(4) });
    send(world, { kind: "close_store", ...stamp(world) });

    const left = stockOf(world, 0);

    levelUp(world, 5);
    openAt(world, 0);

    expect(stockOf(world, 0)).toEqual(left);
    expect(left?.[4]).toBeNull();
    expect(left?.[0]?.itemLevel).toBe(1);
  });

  it("draws nothing in common with a boss dying on the tick it opens", () => {
    const quiet = arrange(11).world;
    const fight = arrange(11).world;

    for (const world of [quiet, fight]) {
      world.tick();
    }

    submit(fight, {
      kind: "spawn_pack",
      ...stamp(fight),
      archetypeId: "melee_grunt",
      tier: "boss",
      count: 1,
      position: { x: 1200, y: 0 },
    });
    fight.tick();
    quiet.tick();
    submit(fight, { kind: "kill_all", ...stamp(fight) });
    openAt(fight, 0);
    openAt(quiet, 0);

    const stock = stockOf(fight, 0) ?? [];
    const dropped: unknown[] = [];

    for (let index = 0; index < fight.view.map.groundItems.end; index += 1) {
      const groundItem = fight.view.map.groundItems.at(index);

      if (groundItem !== null && groundItem.kind === "item") {
        dropped.push({
          baseId: groundItem.item.baseId,
          rarityId: groundItem.item.rarityId,
          itemLevel: groundItem.item.itemLevel,
          lines: groundItem.item.lines
            .slice(0, groundItem.item.lineCount)
            .map((line) => [line.sourceId, line.value]),
        });
      }
    }

    expect(dropped.length).toBeGreaterThan(0);
    expect(stock).toEqual(stockOf(quiet, 0));

    for (const item of dropped) {
      expect(stock).not.toContainEqual(item);
    }

    const stockPurposes = [
      DRAW_PURPOSE.storeStock,
      DRAW_PURPOSE.storeRarity,
      DRAW_PURPOSE.storeAffix,
      DRAW_PURPOSE.storeAffixTier,
      DRAW_PURPOSE.storeAffixValue,
    ];
    const dropPurposes = Object.entries(DRAW_PURPOSE)
      .filter(([name]) => name.startsWith("loot"))
      .map(([, purpose]) => purpose);

    expect(new Set(stockPurposes).size).toBe(stockPurposes.length);

    for (const purpose of stockPurposes) {
      expect(dropPurposes).not.toContain(purpose);
    }
  });
});

describe("buy_item", () => {
  it("takes the price, puts the item at its first fit, empties the slot, and announces the cell and the price", () => {
    const { world, reader } = arrange(4);

    put(world.state, 0);
    openAt(world, 0);
    storeEvents(world, reader);

    const item = world.view.map.stores[0]?.stock[2];

    if (item === undefined) {
      throw new Error("A store has twelve slots");
    }

    const baseId = item.baseId;
    const price = priceOf(world.view.run, item);

    world.state.run.gold = price + 7;
    send(world, { kind: "buy_item", ...stamp(world), place: stockPlace(2) });

    const inventory = world.view.run.inventory;

    expect(price).toBeGreaterThan(0);
    expect(world.view.run.gold).toBe(7);
    expect(inventory.placed[recordAt(inventory, 1)]?.item.baseId).toBe(baseId);
    expect(inventory.placed[recordAt(inventory, 1)]?.corner).toBe(1);
    expect(world.view.map.stores[0]?.stock[2]?.baseId).toBeNull();
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "item_bought", place: 1, amount: price, checkpoint: 0 },
    ]);
  });
});

describe("sell_item", () => {
  it("gives the price times the sell fraction, rounded down, and the item is gone", () => {
    const { world, reader } = arrange();

    put(world.state, 5);
    world.state.run.gold = 10;
    openAt(world, 0);
    storeEvents(world, reader);

    const gold = Math.floor(priceOf(world.view.run, aBand()) * SELL_FRACTION);

    send(world, { kind: "sell_item", ...stamp(world), place: 5 });

    expect(gold).toBeGreaterThan(0);
    expect(world.view.run.gold).toBe(10 + gold);
    expect(recordAt(world.view.run.inventory, 5)).toBe(NO_RECORD);
    expect(world.view.map.groundItems.count).toBe(0);
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "item_sold", place: 5, amount: gold, checkpoint: 0 },
    ]);
  });
});

/** One refusal case: how to arrange it, the command, and the reason, place, and checkpoint it names. */
type RefusalCase = Readonly<{
  name: string;
  open: boolean;
  arrange: (world: World) => void;
  command: (world: Simulation) => StoreCommand;
  reason: RefusalReason;
  place: number;
  checkpoint: number;
}>;

const REFUSALS: readonly RefusalCase[] = [
  {
    name: "an opening at a checkpoint index that is not a whole number",
    open: false,
    arrange: () => undefined,
    command: (world) => ({
      kind: "open_store",
      ...stamp(world),
      checkpoint: 0.5,
    }),
    reason: "invalid_checkpoint",
    place: NO_PLACE,
    checkpoint: 0.5,
  },
  {
    name: "an opening at a checkpoint the map has not got",
    open: false,
    arrange: () => undefined,
    command: (world) => ({
      kind: "open_store",
      ...stamp(world),
      checkpoint: 2,
    }),
    reason: "unknown_checkpoint",
    place: NO_PLACE,
    checkpoint: 2,
  },
  {
    name: "an opening at a checkpoint whose ring the hero is not in",
    open: false,
    arrange: () => undefined,
    command: (world) => ({
      kind: "open_store",
      ...stamp(world),
      checkpoint: 1,
    }),
    reason: "not_at_checkpoint",
    place: NO_PLACE,
    checkpoint: 1,
  },
  {
    name: "a buy from a slot past the twelve",
    open: true,
    arrange: () => undefined,
    command: (world) => ({
      kind: "buy_item",
      ...stamp(world),
      place: stockPlace(12),
    }),
    reason: "invalid_place",
    place: stockPlace(12),
    checkpoint: -1,
  },
  {
    name: "a sell from a cell off the grid",
    open: true,
    arrange: () => undefined,
    command: (world) => ({ kind: "sell_item", ...stamp(world), place: 40 }),
    reason: "invalid_place",
    place: 40,
    checkpoint: -1,
  },
  {
    name: "a buy with no store open",
    open: false,
    arrange: (world) => {
      world.run.gold = 100_000;
    },
    command: (world) => ({
      kind: "buy_item",
      ...stamp(world),
      place: stockPlace(0),
    }),
    reason: "store_closed",
    place: stockPlace(0),
    checkpoint: -1,
  },
  {
    name: "a sell with no store open",
    open: false,
    arrange: (world) => {
      put(world, 0);
    },
    command: (world) => ({ kind: "sell_item", ...stamp(world), place: 0 }),
    reason: "store_closed",
    place: 0,
    checkpoint: -1,
  },
  {
    name: "a buy from a slot bought empty",
    open: true,
    arrange: (world) => {
      world.run.gold = 100_000;
      world.map.stores[0]?.stock[3]?.lines.forEach((line) => {
        line.value = 0;
      });

      const item = world.map.stores[0]?.stock[3];

      if (item !== undefined) {
        item.baseId = null;
      }
    },
    command: (world) => ({
      kind: "buy_item",
      ...stamp(world),
      place: stockPlace(3),
    }),
    reason: "no_item_at_place",
    place: stockPlace(3),
    checkpoint: -1,
  },
  {
    name: "a sell from an empty cell",
    open: true,
    arrange: () => undefined,
    command: (world) => ({ kind: "sell_item", ...stamp(world), place: 9 }),
    reason: "no_item_at_place",
    place: 9,
    checkpoint: -1,
  },
  {
    name: "a buy with a gold short of the price",
    open: true,
    arrange: (world) => {
      const item = world.map.stores[0]?.stock[0];

      world.run.gold = item === undefined ? 0 : priceOf(world.run, item) - 1;
    },
    command: (world) => ({
      kind: "buy_item",
      ...stamp(world),
      place: stockPlace(0),
    }),
    reason: "not_enough_gold",
    place: stockPlace(0),
    checkpoint: -1,
  },
  {
    name: "a buy into a full inventory",
    open: true,
    arrange: (world) => {
      world.run.gold = 100_000;
      fillWithBands(world);
    },
    command: (world) => ({
      kind: "buy_item",
      ...stamp(world),
      place: stockPlace(0),
    }),
    reason: "no_room",
    place: stockPlace(0),
    checkpoint: -1,
  },
];

describe("a refused store command", () => {
  it.each(REFUSALS.map((each) => [each.name, each] as const))(
    "refuses %s, names its reason, and changes nothing",
    (_, refusal) => {
      const { world, reader } = arrange();

      if (refusal.open) {
        openAt(world, 0);
      }

      refusal.arrange(world.state);
      storeEvents(world, reader);

      const before = holdings(world);

      send(world, refusal.command(world));

      expect(holdings(world)).toEqual(before);
      expect(storeEvents(world, reader)).toMatchObject([
        {
          kind: "command_refused",
          reason: refusal.reason,
          place: refusal.place,
          checkpoint: refusal.checkpoint,
        },
      ]);
    },
  );

  it("refuses every store command while the hero is dead", () => {
    const { world, reader } = arrange();

    put(world.state, 0);
    openAt(world, 0);
    submit(world, { kind: "kill_hero", ...stamp(world) });
    world.tick();
    storeEvents(world, reader);

    const before = holdings(world);

    submit(world, { kind: "open_store", ...stamp(world), checkpoint: 0 });
    submit(world, { kind: "close_store", ...stamp(world) });
    submit(world, { kind: "buy_item", ...stamp(world), place: stockPlace(0) });
    submit(world, { kind: "sell_item", ...stamp(world), place: 0 });
    world.tick();

    expect(holdings(world)).toEqual(before);
    expect(storeEvents(world, reader).map((event) => event.reason)).toEqual([
      "dead",
      "dead",
      "dead",
      "dead",
    ]);
  });

  it("is not a refusal when no store is open to close", () => {
    const { world, reader } = arrange();
    const before = holdings(world);

    send(world, { kind: "close_store", ...stamp(world) });

    expect(holdings(world)).toEqual(before);
    expect(storeEvents(world, reader)).toEqual([]);
  });

  it("is taken under every disable", () => {
    const { world } = arrange();

    put(world.state, 0);
    submit(world, {
      kind: "apply_status",
      ...stamp(world),
      statusId: "stun",
      ticks: 300,
    });
    world.tick();
    openAt(world, 0);
    send(world, { kind: "sell_item", ...stamp(world), place: 0 });

    expect(world.view.map.openStore).toBe(0);
    expect(recordAt(world.view.run.inventory, 0)).toBe(NO_RECORD);
  });
});

describe("the store closing", () => {
  it("closes on the tick the hero walks out of the ring, and not before", () => {
    const { world, reader } = arrange();

    openAt(world, 0);
    storeEvents(world, reader);
    submit(world, {
      kind: "move",
      ...stamp(world),
      destination: { x: 1000, y: 0 },
    });

    const heroId = world.view.run.heroId;
    const hero = () =>
      heroId === null ? null : world.view.map.units.resolve(heroId);
    let closedAt = -1;

    tickUntil(
      world,
      () => {
        const x = hero()?.curr.x ?? 0;

        expect(world.view.map.openStore === NO_STORE).toBe(x > REACH);

        if (world.view.map.openStore === NO_STORE) {
          closedAt = world.view.tick - 1;
        }

        return closedAt !== -1;
      },
      600,
    );

    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "store_closed", checkpoint: 0, tick: closedAt },
    ]);
  });

  it("closes on the tick the hero dies", () => {
    const { world, reader } = arrange();

    openAt(world, 0);
    storeEvents(world, reader);

    const tick = world.view.tick;

    submit(world, { kind: "kill_hero", ...stamp(world) });
    world.tick();

    expect(world.view.map.openStore).toBe(NO_STORE);
    expect(storeEvents(world, reader)).toMatchObject([
      { kind: "store_closed", checkpoint: 0, tick },
    ]);
  });

  it("stays open while the hero stands in the ring and the world runs", () => {
    const { world } = arrange();

    openAt(world, 0);

    for (let tick = 0; tick < 60; tick += 1) {
      world.tick();
    }

    expect(world.view.map.openStore).toBe(0);
  });
});

describe("a map load or reset", () => {
  it.each([["reset_map"], ["load_map"]] as const)(
    "on %s, closes the open store and clears every store's stock",
    (kind) => {
      const { world, reader } = arrange();

      openAt(world, 0);
      storeEvents(world, reader);
      submit(
        world,
        kind === "reset_map"
          ? { kind, ...stamp(world) }
          : { kind, ...stamp(world), mapId: world.view.map.mapId },
      );
      world.tick();

      expect(world.view.map.openStore).toBe(NO_STORE);
      expect(world.view.map.stores.map((store) => store.stocked)).toEqual([
        false,
        false,
      ]);
      expect(
        world.view.map.stores.every((store) =>
          store.stock.every((item) => item.baseId === null),
        ),
      ).toBe(true);
      expect(storeEvents(world, reader)).toMatchObject([
        { kind: "store_closed", checkpoint: 0 },
      ]);
    },
  );
});

/** The session's arrangement, alike in the recorder and the replay: a band to sell and gold to buy with. */
const prepare = (world: World): void => {
  put(world, 0);
  world.run.gold = 5000;
};

/** The session's commands, one on each of these ticks. */
const SESSION: readonly ((tick: number) => StoreCommand)[] = [
  (tick) => ({ kind: "open_store", tick, timestamp: tick, checkpoint: 0 }),
  (tick) => ({ kind: "buy_item", tick, timestamp: tick, place: stockPlace(0) }),
  (tick) => ({ kind: "sell_item", tick, timestamp: tick, place: 0 }),
  (tick) => ({ kind: "buy_item", tick, timestamp: tick, place: stockPlace(0) }),
  (tick) => ({ kind: "close_store", tick, timestamp: tick }),
  (tick) => ({ kind: "sell_item", tick, timestamp: tick, place: 1 }),
  (tick) => ({ kind: "open_store", tick, timestamp: tick, checkpoint: 0 }),
  (tick) => ({ kind: "buy_item", tick, timestamp: tick, place: stockPlace(7) }),
];

describe("the store commands in the log", () => {
  it("land in the input log and replay to the state the recording ended in", () => {
    const map = storeMap();
    const recorder = createSessionWorld({
      seed: 3,
      registry: contentRegistry,
      map,
    });

    prepare(recorder.state);

    for (const make of SESSION) {
      submit(recorder, make(recorder.view.tick));
      recorder.tick();
      recorder.tick();
    }

    const kinds: string[] = [];

    for (let index = 0; index < recorder.log.count; index += 1) {
      kinds.push(recorder.log.commandAt(index)?.kind ?? "");
    }

    expect(kinds).toEqual(SESSION.map((make) => make(0).kind));
    expect(recorder.view.map.openStore).toBe(0);
    expect(recorder.view.map.stores[0]?.stock[0]?.baseId).toBeNull();
    expect(recorder.view.map.stores[0]?.stock[7]?.baseId).toBeNull();
    expect(recorder.view.run.gold).not.toBe(5000);

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        map.id,
        contentVersionOf(contentRegistry),
        [],
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, { registry: contentRegistry, map });

    if (isReplayRefusal(replay)) {
      throw new Error(replay.message);
    }

    prepare(replay.world.state);
    tickUntil(replay, () => replay.done, recorder.view.tick + 1);

    expect(replay.view.tick).toBe(recorder.view.tick);
    expect(stateDifference(replay.world.state, recorder.state)).toBeNull();
  });
});
