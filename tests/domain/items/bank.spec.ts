import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import type {
  ActiveItemDef,
  AnyCommand,
  DomainEvent,
  Item,
  ItemCommand,
  MapDef,
  Unit,
} from "@domain/public";
import {
  BANK_SLOT_COUNT,
  bankPlace,
  holdsActiveItem,
  listingPlace,
  NO_RECORD,
  recordAt,
} from "@domain/queries";
import { applyItemCommand, createItem, placeItem } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  GLASS,
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** Seven active items, one more than the bank has places, each Glass under another id. */
const SEVEN: readonly ActiveItemDef[] = ["a", "b", "c", "d", "e", "f", "g"].map(
  (letter) => ({ ...GLASS, id: `glass_${letter}`, name: `Glass ${letter}` }),
);

/** Enough gold for every buy a case makes. */
const PURSE = 100_000;

/** A single checkpoint the hero spawns on, whose store is the one every case buys at. */
const storeMap = (): MapDef =>
  makeMapDef.build({ checkpoints: [{ x: 0, y: 0 }] });

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  reader: EventReader;
}>;

/** A hero on the checkpoint with a purse, the store open, and a reader past the opening. */
const arrange = (): Arranged => {
  const map = storeMap();
  const world = makeWorld({
    seed: 1,
    map,
    registry: makeRegistry({ maps: [map], activeItems: SEVEN }),
  });
  const hero = spawnHero(world);

  world.state.run.gold = PURSE;
  send(world, { kind: "open_store", ...stamp(world), checkpoint: 0 });

  const reader = createEventReader();

  while (world.events.read(reader) !== null) {
    // Past the opening.
  }

  return { world, hero, reader };
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: AnyCommand): void => {
  submit(world, command);
  world.tick();
};

/** Buys the listing's entry `entry`. */
const buy = (world: Simulation, entry: number): void => {
  send(world, {
    kind: "buy_item",
    ...stamp(world),
    place: listingPlace(entry),
  });
};

/** Moves what is at `from` to `to`. */
const move = (world: Simulation, from: number, to: number): void => {
  send(world, { kind: "move_item", ...stamp(world), from, to });
};

/** The active item each bank place holds, `null` where empty. */
const bankOf = (world: Simulation): (string | null)[] =>
  world.view.run.bank.map((item) => item.activeId);

/** The active item whose corner is on `cell`, or `null`. */
const activeAt = (world: Simulation, cell: number): string | null => {
  const record = recordAt(world.view.run.inventory, cell);
  const placed = world.view.run.inventory.placed[record];

  return record === NO_RECORD || placed === undefined
    ? null
    : placed.item.activeId;
};

/** Every item, store, or refusal event the reader has not seen, advancing it past everything. */
const itemEvents = (world: Simulation, reader: EventReader): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind.startsWith("item_") || event.kind === "command_refused") {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** A common band at item level one, which the bank refuses. */
const aBand = (): Item => {
  const item = createItem();

  item.baseId = "band";
  item.rarityId = "common";
  item.itemLevel = 1;

  return item;
};

/** What the hero holds: the bank, the inventory's cells, and gold. */
const holdings = (world: Simulation) => ({
  bank: bankOf(world),
  cells: [...world.view.run.inventory.cells],
  gold: world.view.run.gold,
});

describe("a bought active item", () => {
  it("goes to the bank's first free place, T, X, V, then C, G, Space, and the seventh to the inventory's first fit", () => {
    const { world, reader } = arrange();

    for (let entry = 0; entry < SEVEN.length; entry += 1) {
      buy(world, entry);
    }

    expect(bankOf(world)).toEqual(SEVEN.slice(0, 6).map((each) => each.id));
    expect(activeAt(world, 0)).toBe("glass_g");
    expect(recordAt(world.view.run.inventory, 10)).toBe(
      recordAt(world.view.run.inventory, 0),
    );
    expect(world.view.run.gold).toBe(PURSE - 7 * GLASS.price);
    expect(
      itemEvents(world, reader).map((event) => [event.kind, event.place]),
    ).toEqual([
      ...[0, 1, 2, 3, 4, 5].map((slot) => ["item_bought", bankPlace(slot)]),
      ["item_bought", 0],
    ]);
  });

  it("fills a place the bank has freed before the inventory", () => {
    const { world } = arrange();

    buy(world, 0);
    buy(world, 1);
    move(world, bankPlace(0), 0);
    buy(world, 2);

    expect(bankOf(world)).toEqual([
      "glass_c",
      "glass_b",
      null,
      null,
      null,
      null,
    ]);
    expect(activeAt(world, 0)).toBe("glass_a");
  });

  it("is refused with no room when the bank is full and the inventory has no fit, and nothing changes", () => {
    const { world, reader } = arrange();

    for (let entry = 0; entry < 6; entry += 1) {
      buy(world, entry);
    }

    for (let cell = 0; cell < 40; cell += 1) {
      if (recordAt(world.state.run.inventory, cell) === NO_RECORD) {
        placeItem(world.state.run.inventory, aBand(), 1, 1, cell);
      }
    }

    itemEvents(world, reader);

    const before = holdings(world);

    buy(world, 6);

    expect(holdings(world)).toEqual(before);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "no_room", place: listingPlace(6) },
    ]);
  });
});

describe("one copy of each", () => {
  it("refuses a second copy while the first is in the bank or in the inventory, and sells it back to buy again", () => {
    const { world, reader } = arrange();

    buy(world, 0);
    itemEvents(world, reader);

    const before = holdings(world);

    buy(world, 0);

    expect(holdings(world)).toEqual(before);
    expect(itemEvents(world, reader)).toMatchObject([
      {
        kind: "command_refused",
        reason: "already_held",
        place: listingPlace(0),
      },
    ]);

    move(world, bankPlace(0), 12);
    expect(holdsActiveItem(world.view.run, "glass_a")).toBe(true);
    itemEvents(world, reader);
    buy(world, 0);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "already_held" },
    ]);

    send(world, { kind: "sell_item", ...stamp(world), place: 12 });
    expect(holdsActiveItem(world.view.run, "glass_a")).toBe(false);
    buy(world, 0);
    expect(bankOf(world)[0]).toBe("glass_a");
  });
});

describe("moving with the bank", () => {
  it("swaps two places of the bank, or moves to an empty one, so the player chooses the key", () => {
    const { world, reader } = arrange();

    buy(world, 0);
    buy(world, 1);
    itemEvents(world, reader);
    move(world, bankPlace(0), bankPlace(1));

    expect(bankOf(world).slice(0, 2)).toEqual(["glass_b", "glass_a"]);
    expect(
      itemEvents(world, reader).map((event) => [event.kind, event.place]),
    ).toEqual([
      ["item_moved", bankPlace(1)],
      ["item_moved", bankPlace(0)],
    ]);

    move(world, bankPlace(1), bankPlace(5));

    expect(bankOf(world)).toEqual([
      "glass_b",
      null,
      null,
      null,
      null,
      "glass_a",
    ]);
  });

  it("moves an active item out to a cell and back in to a place", () => {
    const { world } = arrange();

    buy(world, 0);
    move(world, bankPlace(0), 13);

    expect(bankOf(world)[0]).toBeNull();
    expect(activeAt(world, 13)).toBe("glass_a");
    expect(recordAt(world.view.run.inventory, 23)).toBe(
      recordAt(world.view.run.inventory, 13),
    );

    move(world, 23, bankPlace(4));

    expect(bankOf(world)[4]).toBe("glass_a");
    expect(
      [...world.view.run.inventory.cells].every((cell) => cell === 0),
    ).toBe(true);
  });

  it("sends the active item a place holds to the inventory's first fit when another is moved onto it", () => {
    const { world } = arrange();

    buy(world, 0);
    buy(world, 1);
    move(world, bankPlace(1), 5);
    move(world, 5, bankPlace(0));

    expect(bankOf(world)[0]).toBe("glass_b");
    expect(activeAt(world, 0)).toBe("glass_a");
  });

  it("sets an item out of the bank down over exactly one item, which goes to its first fit, and refuses two", () => {
    const { world, reader } = arrange();

    placeItem(world.state.run.inventory, aBand(), 1, 1, 0);
    placeItem(world.state.run.inventory, aBand(), 1, 1, 10);
    buy(world, 0);
    itemEvents(world, reader);

    const before = holdings(world);

    move(world, bankPlace(0), 0);

    expect(holdings(world)).toEqual(before);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "no_room", place: bankPlace(0) },
    ]);

    move(world, bankPlace(0), 1);
    move(world, 1, bankPlace(0));
    send(world, {
      kind: "drop_item",
      ...stamp(world),
      cell: 10,
    });
    move(world, bankPlace(0), 0);

    expect(activeAt(world, 0)).toBe("glass_a");
    expect(
      world.view.run.inventory.placed.filter((each) => each.live),
    ).toHaveLength(2);
    expect(recordAt(world.view.run.inventory, 1)).not.toBe(NO_RECORD);
  });

  it("refuses anything but an active item a place of the bank, and changes nothing", () => {
    const { world, reader } = arrange();

    placeItem(world.state.run.inventory, aBand(), 1, 1, 0);

    const before = holdings(world);

    move(world, 0, bankPlace(2));

    expect(holdings(world)).toEqual(before);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "not_active_item", place: 0 },
    ]);
  });

  it("refuses a move from an empty place, and one to a place past the bank as invalid", () => {
    const { world, reader } = arrange();

    move(world, bankPlace(3), 0);
    move(world, 0, bankPlace(BANK_SLOT_COUNT));

    expect(itemEvents(world, reader)).toMatchObject([
      {
        kind: "command_refused",
        reason: "no_item_at_place",
        place: bankPlace(3),
      },
      { kind: "command_refused", reason: "invalid_place" },
    ]);
  });

  it("refuses to wear an active item as the wrong slot", () => {
    const { world, reader } = arrange();

    buy(world, 0);
    move(world, bankPlace(0), 0);
    itemEvents(world, reader);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    });

    expect(activeAt(world, 0)).toBe("glass_a");
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "wrong_armory_slot", place: 0 },
    ]);
  });

  it("allocates nothing moving an item between the bank and the grid, and between two places, once warm", () => {
    const { world, hero } = arrange();

    buy(world, 0);

    const stamped = { tick: 0, timestamp: 0 };
    const commands: readonly ItemCommand[] = [
      { kind: "move_item", ...stamped, from: bankPlace(0), to: 7 },
      { kind: "move_item", ...stamped, from: 7, to: bankPlace(1) },
      { kind: "move_item", ...stamped, from: bankPlace(1), to: bankPlace(0) },
    ];
    const cycle = (): number => {
      let refused = 0;

      for (const command of commands) {
        refused +=
          applyItemCommand(world.state, hero, command) === null ? 0 : 1;
      }

      return refused;
    };
    let sink = 0;

    for (let call = 0; call < 10_000; call += 1) {
      sink += cycle();
    }

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    for (let call = 0; call < 100_000; call += 1) {
      sink += cycle();
    }

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    expect(sink).toBe(0);
    expect(bankOf(world)[0]).toBe("glass_a");
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(256 * 1024);
  });
});

describe("selling from the bank", () => {
  it("sells the item in a place for a quarter of its price, and the place is empty", () => {
    const { world, reader } = arrange();

    buy(world, 0);
    itemEvents(world, reader);
    send(world, { kind: "sell_item", ...stamp(world), place: bankPlace(0) });

    expect(bankOf(world)[0]).toBeNull();
    expect(world.view.run.gold).toBe(PURSE - GLASS.price + GLASS.price / 4);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_sold", place: bankPlace(0), amount: GLASS.price / 4 },
    ]);
  });

  it("refuses an empty place, and changes nothing", () => {
    const { world, reader } = arrange();

    send(world, { kind: "sell_item", ...stamp(world), place: bankPlace(2) });

    expect(world.view.run.gold).toBe(PURSE);
    expect(itemEvents(world, reader)).toMatchObject([
      {
        kind: "command_refused",
        reason: "no_item_at_place",
        place: bankPlace(2),
      },
    ]);
  });
});

describe("the listing's places", () => {
  it("refuses an entry no active item fills as nothing at the place, and a place past the range as invalid", () => {
    const { world, reader } = arrange();

    send(world, { kind: "buy_item", ...stamp(world), place: listingPlace(7) });
    send(world, {
      kind: "buy_item",
      ...stamp(world),
      place: listingPlace(100),
    });

    expect(world.view.run.gold).toBe(PURSE);
    expect(itemEvents(world, reader)).toMatchObject([
      {
        kind: "command_refused",
        reason: "no_item_at_place",
        place: listingPlace(7),
      },
      { kind: "command_refused", reason: "invalid_place" },
    ]);
  });

  it("holds no state: a buy empties nothing, and the content's list is read as written", () => {
    const { world } = arrange();

    buy(world, 0);
    send(world, { kind: "sell_item", ...stamp(world), place: bankPlace(0) });
    buy(world, 0);

    expect(bankOf(world)[0]).toBe("glass_a");
    expect(world.view.run.activeItems).toBe(SEVEN);
  });
});
