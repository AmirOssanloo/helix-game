import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry, heroDef } from "@content/public";
import type {
  Armory,
  DomainEvent,
  GroundItem,
  Inventory,
  Item,
  ItemBaseDef,
  ItemCommand,
  RefusalReason,
  World,
} from "@domain/public";
import { armoryPlace, NO_PLACE, NO_RECORD, recordAt } from "@domain/queries";
import { createItem, placeItem } from "@domain/rules";
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
  makeFormDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

/** The armory's helm slot and its two ring slots. */
const HELM = 0;
const RING_ONE = 8;
const RING_TWO = 9;

/** Long enough that every status outlasts every case. */
const STATUS_TICKS = 300;

const baseOf = (id: string): ItemBaseDef => {
  const base = contentRegistry.itemBases.find((each) => each.id === id);

  if (base === undefined) {
    throw new Error(`The content holds the base ${id}`);
  }

  return base;
};

const cap = baseOf("cap");
const band = baseOf("band");

/** A helm only a hero of level five may wear. */
const crown: ItemBaseDef = { ...cap, id: "crown", requirement: 5 };

/** An item of `base`, common, at item level one, with its one implicit line. */
const itemOf = (base: ItemBaseDef): Item => {
  const item = createItem();
  const implicit = item.lines[0];

  item.baseId = base.id;
  item.rarityId = "common";
  item.itemLevel = 1;
  item.lineCount = 1;

  if (implicit !== undefined) {
    implicit.sourceId = base.id;
    implicit.value = 1;
  }

  return item;
};

/** Places an item of `base` with its corner on `corner`. */
const put = (world: World, base: ItemBaseDef, corner: number): void => {
  placeItem(world.run.inventory, itemOf(base), base.width, base.height, corner);
};

/** Every free cell of the inventory filled with a band. */
const fillWithBands = (world: World): void => {
  for (let cell = 0; cell < 40; cell += 1) {
    if (recordAt(world.run.inventory, cell) === NO_RECORD) {
      put(world, band, cell);
    }
  }
};

type Arranged = Readonly<{
  world: Simulation;
  inventory: Inventory;
  armory: Armory;
  reader: EventReader;
}>;

/** A hero at the origin with an empty inventory and armory, and a reader at the start of the ring. */
const arrange = (): Arranged => {
  const form = makeFormDef.build({ abilities: [] });
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      itemBases: [...contentRegistry.itemBases, crown],
    }),
  });

  spawnHero(world);

  const armory = world.state.run.forms[0]?.armory;

  if (armory === undefined) {
    throw new Error("The hero has a form");
  }

  return {
    world,
    inventory: world.state.run.inventory,
    armory,
    reader: createEventReader(),
  };
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: ItemCommand): void => {
  submit(world, command);
  world.tick();
};

/** Every event of the item kinds or a refusal the reader has not seen, advancing it past everything. */
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

/** What the hero holds: the inventory's cells and items, each armory slot's base, and gold. */
const holdings = (world: Simulation) => ({
  cells: [...world.view.run.inventory.cells],
  placed: world.view.run.inventory.placed.map((placed) => ({
    live: placed.live,
    corner: placed.corner,
    baseId: placed.item.baseId,
  })),
  armory: world.view.run.forms.map((form) =>
    form.armory.slots.map((item) => item.baseId),
  ),
  gold: world.view.run.gold,
  groundItems: world.view.map.groundItems.count,
});

const baseAt = (inventory: Inventory, cell: number): string | null =>
  inventory.placed[recordAt(inventory, cell)]?.item.baseId ?? null;

describe("equip_item", () => {
  it("wears the item in the slot its base takes, frees its cells, and announces the slot", () => {
    const { world, inventory, armory, reader } = arrange();

    put(world.state, cap, 12);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 23,
      armorySlot: null,
    });

    expect(armory.slots[HELM]?.baseId).toBe("cap");
    expect(armory.slots[HELM]?.lines[0]?.value).toBe(1);
    expect(recordAt(inventory, 12)).toBe(NO_RECORD);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_equipped", place: armoryPlace(HELM) },
    ]);
  });

  it("sends a ring to the empty ring slot, and to the one the command names", () => {
    const { world, armory } = arrange();

    put(world.state, band, 0);
    put(world.state, band, 1);
    put(world.state, band, 2);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    });
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 1,
      armorySlot: null,
    });

    expect(armory.slots[RING_ONE]?.baseId).toBe("band");
    expect(armory.slots[RING_TWO]?.baseId).toBe("band");

    const second = armory.slots[RING_TWO];

    if (second === undefined) {
      throw new Error("An armory has ten slots");
    }

    second.itemLevel = 7;
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 2,
      armorySlot: RING_TWO,
    });

    const inventory = world.state.run.inventory;

    expect(second.itemLevel).toBe(1);
    expect(baseAt(inventory, 0)).toBe("band");
    expect(inventory.placed[recordAt(inventory, 0)]?.item.itemLevel).toBe(7);
  });

  it("puts the worn item back at its first fit, announcing both", () => {
    const { world, inventory, armory, reader } = arrange();

    put(world.state, cap, 4);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 4,
      armorySlot: null,
    });
    put(world.state, band, 0);
    put(world.state, cap, 6);
    itemEvents(world, reader);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 6,
      armorySlot: HELM,
    });

    expect(armory.slots[HELM]?.baseId).toBe("cap");
    expect(baseAt(inventory, 1)).toBe("cap");
    expect(inventory.placed[recordAt(inventory, 1)]?.corner).toBe(1);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_equipped", place: armoryPlace(HELM) },
      { kind: "item_unequipped", place: 1 },
    ]);
  });
});

describe("unequip_item", () => {
  it("takes the worn item to its first fit, announcing the cell", () => {
    const { world, inventory, armory, reader } = arrange();

    put(world.state, cap, 0);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    });
    put(world.state, band, 0);
    itemEvents(world, reader);
    send(world, { kind: "unequip_item", ...stamp(world), armorySlot: HELM });

    expect(armory.slots[HELM]?.baseId).toBeNull();
    expect(baseAt(inventory, 1)).toBe("cap");
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_unequipped", place: 1 },
    ]);
  });
});

describe("move_item", () => {
  it("moves an item's corner to the cell named, its own cells counting as free", () => {
    const { world, inventory, reader } = arrange();

    put(world.state, cap, 0);
    send(world, { kind: "move_item", ...stamp(world), from: 11, to: 1 });

    expect(recordAt(inventory, 0)).toBe(NO_RECORD);
    expect(inventory.placed[recordAt(inventory, 1)]?.corner).toBe(1);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_moved", place: 1 },
    ]);
  });

  it("swaps with exactly one covered item, announcing both moves", () => {
    const { world, inventory, reader } = arrange();

    put(world.state, band, 0);
    put(world.state, cap, 2);
    send(world, { kind: "move_item", ...stamp(world), from: 0, to: 3 });

    expect(baseAt(inventory, 3)).toBe("band");
    expect(inventory.placed[recordAt(inventory, 0)]?.corner).toBe(0);
    expect(baseAt(inventory, 0)).toBe("cap");
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_moved", place: 3 },
      { kind: "item_moved", place: 0 },
    ]);
  });
});

describe("drop_item", () => {
  it("puts a copy of the item on the ground at the hero's feet and empties its cells", () => {
    const { world, inventory, reader } = arrange();

    put(world.state, cap, 5);
    send(world, { kind: "drop_item", ...stamp(world), cell: 16 });

    const pool = world.view.map.groundItems;
    let dropped: Readonly<GroundItem> | null = null;

    for (let index = 0; index < pool.end; index += 1) {
      dropped = (pool.at(index) as Readonly<GroundItem> | null) ?? dropped;
    }

    expect(recordAt(inventory, 5)).toBe(NO_RECORD);
    expect(dropped?.kind).toBe("item");
    expect(dropped?.item.baseId).toBe("cap");
    expect(dropped?.item.lines[0]?.value).toBe(1);
    expect(
      Math.hypot(dropped?.position.x ?? Infinity, dropped?.position.y ?? 0),
    ).toBeLessThan(64);
    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "item_dropped", unitId: world.view.run.heroId, amount: 0 },
    ]);
  });
});

/** One refusal case: how to arrange it, the command, and the reason and place it names. */
type RefusalCase = Readonly<{
  name: string;
  arrange: (arranged: Arranged) => void;
  command: (world: Simulation) => ItemCommand;
  reason: RefusalReason;
  place: number;
}>;

const REFUSALS: readonly RefusalCase[] = [
  {
    name: "an equip from a cell off the grid",
    arrange: () => undefined,
    command: (world) => ({
      kind: "equip_item",
      ...stamp(world),
      cell: 40,
      armorySlot: null,
    }),
    reason: "invalid_place",
    place: 40,
  },
  {
    name: "an equip into an armory slot past the ten",
    arrange: ({ world }) => {
      put(world.state, cap, 0);
    },
    command: (world) => ({
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: 10,
    }),
    reason: "invalid_place",
    place: 0,
  },
  {
    name: "an unequip of a slot that is not a whole number",
    arrange: () => undefined,
    command: (world) => ({
      kind: "unequip_item",
      ...stamp(world),
      armorySlot: 1.5,
    }),
    reason: "invalid_place",
    place: armoryPlace(1.5),
  },
  {
    name: "a move to a cell below zero",
    arrange: ({ world }) => {
      put(world.state, band, 0);
    },
    command: (world) => ({
      kind: "move_item",
      ...stamp(world),
      from: 0,
      to: -1,
    }),
    reason: "invalid_place",
    place: 0,
  },
  {
    name: "a drop from a cell off the grid",
    arrange: () => undefined,
    command: (world) => ({ kind: "drop_item", ...stamp(world), cell: 41 }),
    reason: "invalid_place",
    place: 41,
  },
  {
    name: "an equip from an empty cell",
    arrange: () => undefined,
    command: (world) => ({
      kind: "equip_item",
      ...stamp(world),
      cell: 3,
      armorySlot: null,
    }),
    reason: "no_item_at_place",
    place: 3,
  },
  {
    name: "an unequip of an empty slot",
    arrange: () => undefined,
    command: (world) => ({
      kind: "unequip_item",
      ...stamp(world),
      armorySlot: HELM,
    }),
    reason: "no_item_at_place",
    place: armoryPlace(HELM),
  },
  {
    name: "a move from an empty cell",
    arrange: () => undefined,
    command: (world) => ({
      kind: "move_item",
      ...stamp(world),
      from: 7,
      to: 8,
    }),
    reason: "no_item_at_place",
    place: 7,
  },
  {
    name: "a drop from an empty cell",
    arrange: () => undefined,
    command: (world) => ({ kind: "drop_item", ...stamp(world), cell: 9 }),
    reason: "no_item_at_place",
    place: 9,
  },
  {
    name: "a helm into a ring slot",
    arrange: ({ world }) => {
      put(world.state, cap, 0);
    },
    command: (world) => ({
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: RING_ONE,
    }),
    reason: "wrong_armory_slot",
    place: 0,
  },
  {
    name: "a helm above the hero's level",
    arrange: ({ world }) => {
      put(world.state, crown, 0);
    },
    command: (world) => ({
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    }),
    reason: "requirement_not_met",
    place: 0,
  },
  {
    name: "an unequip into a full inventory",
    arrange: ({ world, armory }) => {
      const worn = armory.slots[HELM];

      if (worn !== undefined) {
        worn.baseId = cap.id;
        worn.rarityId = "common";
      }

      fillWithBands(world.state);
    },
    command: (world) => ({
      kind: "unequip_item",
      ...stamp(world),
      armorySlot: HELM,
    }),
    reason: "no_room",
    place: armoryPlace(HELM),
  },
  {
    name: "a move whose cells leave the grid",
    arrange: ({ world }) => {
      put(world.state, cap, 0);
    },
    command: (world) => ({
      kind: "move_item",
      ...stamp(world),
      from: 0,
      to: 9,
    }),
    reason: "no_room",
    place: 0,
  },
  {
    name: "a move onto two items",
    arrange: ({ world }) => {
      put(world.state, cap, 0);
      put(world.state, band, 4);
      put(world.state, band, 15);
    },
    command: (world) => ({
      kind: "move_item",
      ...stamp(world),
      from: 0,
      to: 4,
    }),
    reason: "no_room",
    place: 0,
  },
  {
    name: "a drop with the ground-item pool full",
    arrange: ({ world }) => {
      put(world.state, band, 0);

      const pool = world.state.map.groundItems;

      // Every filler lies at the hero's feet, so each is an item, which walking never takes.
      while (pool.count < pool.capacity) {
        const filler = pool.at(pool.acquireIndex());

        if (filler !== null) {
          filler.kind = "item";
        }
      }
    },
    command: (world) => ({ kind: "drop_item", ...stamp(world), cell: 0 }),
    reason: "no_room",
    place: 0,
  },
];

describe("a refused item command", () => {
  it.each(REFUSALS.map((each) => [each.name, each] as const))(
    "refuses %s, names its reason and place, and changes nothing",
    (_, refusal) => {
      const arranged = arrange();
      const { world, reader } = arranged;

      refusal.arrange(arranged);

      const before = holdings(world);
      const dropsNotMade = world.view.map.dropsNotMade;

      send(world, refusal.command(world));

      expect(holdings(world)).toEqual(before);
      expect(world.view.map.dropsNotMade).toBe(dropsNotMade);
      expect(itemEvents(world, reader)).toMatchObject([
        {
          kind: "command_refused",
          reason: refusal.reason,
          place: refusal.place,
        },
      ]);
    },
  );

  it("refuses every item command while the hero is dead", () => {
    const { world, reader } = arrange();

    put(world.state, band, 0);
    submit(world, { kind: "kill_hero", ...stamp(world) });
    world.tick();
    itemEvents(world, reader);

    const before = holdings(world);

    submit(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 0,
      armorySlot: null,
    });
    submit(world, { kind: "unequip_item", ...stamp(world), armorySlot: 0 });
    submit(world, { kind: "move_item", ...stamp(world), from: 0, to: 1 });
    submit(world, { kind: "drop_item", ...stamp(world), cell: 0 });
    world.tick();

    expect(holdings(world)).toEqual(before);
    expect(itemEvents(world, reader).map((event) => event.reason)).toEqual([
      "dead",
      "dead",
      "dead",
      "dead",
    ]);
  });

  it("is not a refusal naming a place when the command was not an item command", () => {
    const { world, reader } = arrange();

    submit(world, { kind: "kill_hero", ...stamp(world) });
    world.tick();
    itemEvents(world, reader);
    submit(world, { kind: "stop", ...stamp(world) });
    world.tick();

    expect(itemEvents(world, reader)).toMatchObject([
      { kind: "command_refused", reason: "dead", place: NO_PLACE },
    ]);
  });
});

describe("an item command under a disable", () => {
  it.each([["stun"], ["silence"], ["root"], ["disarm"], ["lift"]])(
    "is applied while the hero wears %s",
    (status) => {
      const { world, inventory, armory } = arrange();

      put(world.state, cap, 0);
      put(world.state, band, 2);
      put(world.state, band, 3);
      submit(world, {
        kind: "apply_status",
        ...stamp(world),
        statusId: status,
        ticks: STATUS_TICKS,
      });
      world.tick();
      world.tick();
      send(world, {
        kind: "equip_item",
        ...stamp(world),
        cell: 0,
        armorySlot: null,
      });
      send(world, { kind: "unequip_item", ...stamp(world), armorySlot: HELM });
      send(world, { kind: "move_item", ...stamp(world), from: 2, to: 30 });
      send(world, { kind: "drop_item", ...stamp(world), cell: 3 });

      expect(armory.slots[HELM]?.baseId).toBeNull();
      expect(baseAt(inventory, 0)).toBe("cap");
      expect(baseAt(inventory, 30)).toBe("band");
      expect(recordAt(inventory, 3)).toBe(NO_RECORD);
      expect(world.view.map.groundItems.count).toBe(1);
    },
  );
});

/** The hero's items at the start of a recorded session, arranged alike in the recorder and the replay. */
const stock = (world: World): void => {
  put(world, cap, 0);
  put(world, band, 2);
  put(world, band, 3);
  put(world, cap, 20);
};

/** The session's commands, one on each of these ticks. */
const SESSION: readonly ((tick: number) => ItemCommand)[] = [
  (tick) => ({
    kind: "equip_item",
    tick,
    timestamp: tick,
    cell: 0,
    armorySlot: null,
  }),
  (tick) => ({
    kind: "equip_item",
    tick,
    timestamp: tick,
    cell: 2,
    armorySlot: RING_TWO,
  }),
  (tick) => ({ kind: "move_item", tick, timestamp: tick, from: 3, to: 0 }),
  (tick) => ({
    kind: "equip_item",
    tick,
    timestamp: tick,
    cell: 20,
    armorySlot: HELM,
  }),
  (tick) => ({
    kind: "unequip_item",
    tick,
    timestamp: tick,
    armorySlot: RING_TWO,
  }),
  (tick) => ({ kind: "drop_item", tick, timestamp: tick, cell: 0 }),
  (tick) => ({ kind: "move_item", tick, timestamp: tick, from: 7, to: 8 }),
];

describe("the item commands in the log", () => {
  it("land in the input log and replay to the state the recording ended in", () => {
    const recorder = createSessionWorld({
      seed: 3,
      registry: contentRegistry,
      map: arenaDef,
    });

    stock(recorder.state);

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
    expect(recorder.view.map.groundItems.count).toBe(1);

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        recorder.mapDef.id,
        contentVersionOf(contentRegistry),
        [],
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, {
      registry: contentRegistry,
      map: arenaDef,
    });

    if (isReplayRefusal(replay)) {
      throw new Error(replay.message);
    }

    stock(replay.world.state);
    tickUntil(replay, () => replay.done, recorder.view.tick + 1);

    expect(replay.view.tick).toBe(recorder.view.tick);
    expect(stateDifference(replay.world.state, recorder.state)).toBeNull();
  });
});
