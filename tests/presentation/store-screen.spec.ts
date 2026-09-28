import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { Item, ItemBaseDef, MapDef, Unit } from "@domain/public";
import {
  NO_RECORD,
  NO_STORE,
  priceOf,
  recordAt,
  sellPriceOf,
  STOCK_SLOT_COUNT,
  storeTabOf,
} from "@domain/queries";
import { createItem, placeItem } from "@domain/rules";
import {
  ESCAPE_CODE,
  followStore,
  GRID_CELL_SIZE,
  GRID_RECT,
  InputClaim,
  InventoryScreen,
  layInLane,
  LEFT_BUTTON,
  priceAt,
  priceText,
  RIGHT_BUTTON,
  STOCK_LANE_COUNT,
  STOCK_RECT,
  STORE_RECT,
  STORE_TABS,
  StoreScreen,
  TAB_CENTRE_Y,
  TAB_SHOWN_TINT,
  TAB_TINT,
  tabAt,
  tabCentreX,
  Tooltip,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  CommandRecorder,
  LabelRecorder,
  makeMapDef,
  makeRegistry,
  makeWorld,
  QuadRecorder,
  spawnHero,
  submit,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** How the store makes its quads: the panel, a button per tab, a socket per cell of the ten by nine grid, then a backdrop, an icon, and a flash per stock slot. */
const TABS = 3;
const SOCKETS = 90;
const FIRST_BACKDROP = 1 + TABS + SOCKETS;
const FIRST_ICON = FIRST_BACKDROP + STOCK_SLOT_COUNT;
const FIRST_FLASH = FIRST_ICON + STOCK_SLOT_COUNT;

/** The inventory's width in cells. */
const COLUMNS = 10;

/** Enough gold for anything a store stocks. */
const RICH = 1_000_000;

/** Two checkpoints on a bare map, the second at (`secondX`, 0), far from the first unless a case says otherwise: the hero spawns on the first. */
const storeMap = (secondX: number): MapDef =>
  makeMapDef.build({
    checkpoints: [
      { x: 0, y: 0 },
      { x: secondX, y: 0 },
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

type Arranged = Readonly<{
  world: Simulation;
  claim: InputClaim;
  inventory: InventoryScreen;
  store: StoreScreen;
  driver: CommandRecorder;
  quads: QuadRecorder[];
  /** Sends `open_store` for `checkpoint` straight to the world, not through the screen's driver, and steps. */
  openStore: (checkpoint: number) => void;
  /** One tick, every event since drained into the screens and the claim as the HUD scene drains them, and a frame synced. */
  step: () => void;
  /** A press and its release at (`x`, `y`), through the claim. */
  click: (button: number, x: number, y: number) => void;
}>;

/** A hero on the first checkpoint's ring, the store screen and the inventory registered as the HUD scene registers them, and neither open. */
const arrange = (seed = 1, secondX = 3000): Arranged => {
  const map = storeMap(secondX);
  const world = makeWorld({
    seed,
    map,
    registry: makeRegistry({ maps: [map] }),
  });

  spawnHero(world);

  const quads: QuadRecorder[] = [];
  const driver = new CommandRecorder(world);
  const reader = createEventReader();
  const claim = new InputClaim({
    hold: (): void => {},
    release: (): void => {},
  });
  const inventory = new InventoryScreen({
    makeQuad: (frame) => new QuadRecorder(frame),
    makeLabel: (size) => new LabelRecorder(size),
    frameSizes: () => FRAME_WIDTH,
    world: world.view,
    driver,
    makeOverQuad: (frame) => new QuadRecorder(frame),
  });
  const store = new StoreScreen({
    makeQuad: (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    makeLabel: (size) => new LabelRecorder(size),
    frameSizes: () => FRAME_WIDTH,
    world: world.view,
    driver,
  });
  const step = (): void => {
    world.tick();

    let event = world.events.read(reader);

    while (event !== null) {
      inventory.react(event);
      store.react(event);
      followStore(event, claim, inventory, store);
      event = world.events.read(reader);
    }

    inventory.sync();
    store.sync();
  };

  return {
    world,
    claim,
    inventory,
    store,
    driver,
    quads,
    openStore: (checkpoint) => {
      submit(world, {
        kind: "open_store",
        tick: world.view.tick,
        timestamp: world.view.tick,
        checkpoint,
      });
      step();
    },
    step,
    click: (button, x, y) => {
      claim.pointerDown(button, x, y);
      claim.pointerUp(button, x, y);
    },
  };
};

const heroIn = (world: Simulation): Unit => {
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The world holds its hero");
  }

  return hero;
};

const quadAt = (
  quads: readonly QuadRecorder[],
  index: number,
): QuadRecorder => {
  const quad = quads[index];

  if (quad === undefined) {
    throw new Error(`The store made quad ${String(index)}`);
  }

  return quad;
};

/** The stock slots whose icon is drawn now. */
const shownSlots = (quads: readonly QuadRecorder[]): number[] => {
  const slots: number[] = [];

  for (let slot = 0; slot < STOCK_SLOT_COUNT; slot += 1) {
    if (quadAt(quads, FIRST_ICON + slot).visible) {
      slots.push(slot);
    }
  }

  return slots;
};

/** The stock slots of the open store whose base sits in tab `tab`. */
const slotsInTab = (world: Simulation, tab: number): number[] => {
  const stock = world.view.map.stores[world.view.map.openStore]?.stock ?? [];
  const slots: number[] = [];

  stock.forEach((item, slot) => {
    const base = contentRegistry.itemBases.find(
      (each) => each.id === item.baseId,
    );

    if (base !== undefined && storeTabOf(base.armorySlot) === STORE_TABS[tab]) {
      slots.push(slot);
    }
  });

  return slots;
};

/** The canvas point at the centre of stock slot `slot`'s icon, as drawn now. */
const iconPoint = (
  quads: readonly QuadRecorder[],
  slot: number,
): [number, number] => {
  const icon = quadAt(quads, FIRST_ICON + slot);

  return [icon.x, icon.y];
};

/** The rectangle the backdrop of stock slot `slot` covers, as drawn now. */
const boxOf = (quads: readonly QuadRecorder[], slot: number): Rect => {
  const backdrop = quadAt(quads, FIRST_BACKDROP + slot);
  const halfWidth = (backdrop.scaleX * FRAME_WIDTH) / 2;
  const halfHeight = (backdrop.scaleY * FRAME_WIDTH) / 2;

  return {
    minX: backdrop.x - halfWidth,
    minY: backdrop.y - halfHeight,
    maxX: backdrop.x + halfWidth,
    maxY: backdrop.y + halfHeight,
  };
};

const overlap = (a: Rect, b: Rect): boolean =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

/** The canvas point at the centre of inventory cell `cell`. */
const cellX = (cell: number): number =>
  GRID_RECT.minX + ((cell % COLUMNS) + 0.5) * GRID_CELL_SIZE;
const cellY = (cell: number): number =>
  GRID_RECT.minY + (Math.floor(cell / COLUMNS) + 0.5) * GRID_CELL_SIZE;

/** A seed and a tab whose store has at least one item in it, found by opening stores until one does. */
const stockedTab = (): Readonly<{ seed: number; tab: number }> => {
  for (let seed = 1; seed < 50; seed += 1) {
    const { world, openStore } = arrange(seed);

    openStore(0);

    for (let tab = 0; tab < TABS; tab += 1) {
      if (slotsInTab(world, tab).length > 0) {
        return { seed, tab };
      }
    }
  }

  throw new Error("Some seed stocks an item");
};

describe("the store screen", () => {
  it("is made hidden, neither modal nor pausing, and claims no key", () => {
    const { store, quads } = arrange();

    expect(store.modal).toBe(false);
    expect(store.pauses).toBe(false);
    expect(store.keys).toEqual([]);
    expect(quads.some((quad) => quad.visible)).toBe(false);
  });

  it("makes every quad it will show at construction: opening, switching tabs, and buying make none", () => {
    const { world, store, quads, openStore, step } = arrange();
    const made = quads.length;

    expect(made).toBe(FIRST_FLASH + STOCK_SLOT_COUNT);

    world.state.run.gold = RICH;
    openStore(0);

    for (let tab = 0; tab < TABS; tab += 1) {
      store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);
      step();
    }

    expect(quads).toHaveLength(made);
  });
});

describe("opening and closing with the world's store", () => {
  it("an opening drained from the ring opens the store and the inventory beside it, on the first tab, and sends nothing", () => {
    const { claim, inventory, store, driver, quads, openStore } = arrange();

    expect(claim.isOpen(store)).toBe(false);

    openStore(0);

    expect(claim.isOpen(store)).toBe(true);
    expect(claim.isOpen(inventory)).toBe(true);
    expect(store.shownTab).toBe(0);
    expect(quadAt(quads, 0).visible).toBe(true);
    expect(driver.commands).toEqual([]);
  });

  it("does not overlap the inventory, and covers what it draws", () => {
    const inventoryLeft = GRID_RECT.minX - GRID_CELL_SIZE;

    expect(STORE_RECT.maxX).toBeLessThan(inventoryLeft);
    expect(STOCK_RECT.minX).toBeGreaterThanOrEqual(STORE_RECT.minX);
    expect(STOCK_RECT.maxX).toBeLessThanOrEqual(STORE_RECT.maxX);
    expect(STOCK_RECT.maxY).toBeLessThanOrEqual(STORE_RECT.maxY);
  });

  it("closes, sending nothing, when the world closes the store: the hero walks off the ring", () => {
    const { world, claim, inventory, store, driver, openStore, step } =
      arrange();

    openStore(0);

    const hero = heroIn(world);

    hero.curr.x = 1000;
    step();

    expect(world.view.map.openStore).toBe(NO_STORE);
    expect(claim.isOpen(store)).toBe(false);
    expect(claim.isOpen(inventory)).toBe(true);
    expect(driver.commands).toEqual([]);
  });

  it("Escape closes it and sends close_store, and the closing that follows sends nothing more", () => {
    const { world, claim, store, driver, openStore, step } = arrange();

    openStore(0);
    claim.keyDown(ESCAPE_CODE);
    claim.keyUp(ESCAPE_CODE);

    expect(claim.isOpen(store)).toBe(false);
    expect(driver.commands.map((command) => command.kind)).toEqual([
      "close_store",
    ]);

    step();

    expect(world.view.map.openStore).toBe(NO_STORE);
    expect(driver.commands).toHaveLength(1);
  });

  it("a store opened at another checkpoint replaces it, and the screen's closing on the way sends nothing", () => {
    // Standing on two rings at once is not a map the game has; two rings that overlap are enough for the case.
    const { world, claim, store, driver, openStore } = arrange(1, 100);

    openStore(0);
    openStore(1);

    expect(world.view.map.openStore).toBe(1);
    expect(claim.isOpen(store)).toBe(true);
    expect(driver.commands).toEqual([]);
  });
});

describe("the tabs and their grids", () => {
  it("each tab shows the stocked items whose base sits in it, and only those, each laid inside the grid apart from the others", () => {
    const { world, store, quads, openStore } = arrange();

    openStore(0);

    let seen = 0;

    for (let tab = 0; tab < TABS; tab += 1) {
      store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

      const shown = shownSlots(quads);
      const boxes = shown.map((slot) => boxOf(quads, slot));

      expect(store.shownTab).toBe(tab);
      expect(shown).toEqual(slotsInTab(world, tab));

      for (let index = 0; index < boxes.length; index += 1) {
        const box = boxes[index];

        if (box === undefined) {
          continue;
        }

        expect(box.minX).toBeGreaterThanOrEqual(STOCK_RECT.minX);
        expect(box.maxX).toBeLessThanOrEqual(STOCK_RECT.maxX);
        expect(box.minY).toBeGreaterThanOrEqual(STOCK_RECT.minY);
        expect(box.maxY).toBeLessThanOrEqual(STOCK_RECT.maxY);
        expect(
          boxes.some((other, at) => at !== index && overlap(box, other)),
        ).toBe(false);
      }

      seen += shown.length;
    }

    expect(seen).toBe(STOCK_SLOT_COUNT);
  });

  it("draws each item's icon in its rarity's tint, and lights the tab shown", () => {
    const { world, store, quads, openStore } = arrange();

    openStore(0);

    for (let tab = 0; tab < TABS; tab += 1) {
      store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

      for (const slot of shownSlots(quads)) {
        const item = world.view.map.stores[0]?.stock[slot];
        const rarity = contentRegistry.rarities.find(
          (each) => each.id === item?.rarityId,
        );

        expect(quadAt(quads, FIRST_ICON + slot).tint).toBe(rarity?.tint);
      }

      for (let button = 0; button < TABS; button += 1) {
        expect(quadAt(quads, 1 + button).tint).toBe(
          button === tab ? TAB_SHOWN_TINT : TAB_TINT,
        );
      }
    }
  });

  it("a click on a tab sends nothing", () => {
    const { driver, openStore, click } = arrange();

    openStore(0);

    for (let tab = 0; tab < TABS; tab += 1) {
      click(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);
    }

    expect(driver.commands).toEqual([]);
  });

  it("finds a tab by its button and nothing beside the row", () => {
    expect(tabAt(tabCentreX(1), TAB_CENTRE_Y)).toBe(1);
    expect(tabAt(tabCentreX(2), TAB_CENTRE_Y + 100)).toBe(-1);
    expect(tabAt(STORE_RECT.minX + 1, TAB_CENTRE_Y)).toBe(-1);
  });

  it("lays twelve items of the tallest base in its lanes, and refuses one wider than a lane", () => {
    const tallest = Math.max(
      ...contentRegistry.itemBases.map((base) => base.height),
    );
    const widest = Math.max(
      ...contentRegistry.itemBases.map((base) => base.width),
    );
    const lanes = new Array<number>(STOCK_LANE_COUNT).fill(0);
    const out: Rect = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    for (let item = 0; item < STOCK_SLOT_COUNT; item += 1) {
      expect(layInLane(lanes, widest, tallest, out)).toBe(true);
    }

    expect(layInLane(lanes.fill(0), 3, 1, out)).toBe(false);
  });
});

describe("the price on hover", () => {
  it("is the price over a stocked item, the sell price over an item in the grid while a store is open, and none elsewhere", () => {
    const { seed, tab } = stockedTab();
    const { world, claim, inventory, store, quads, openStore, step } =
      arrange(seed);

    placeItem(world.state.run.inventory, aBand(), band.width, band.height, 0);
    openStore(0);
    store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

    const slot = shownSlots(quads)[0] ?? -1;
    const [x, y] = iconPoint(quads, slot);
    const open = claim.isOpen(inventory);

    expect(store.itemAt(x, y)).toBe(world.view.map.stores[0]?.stock[slot]);
    expect(priceAt(store, open, world.view, x, y)).toBe("buy");
    expect(priceAt(store, open, world.view, cellX(0), cellY(0))).toBe("sell");
    expect(priceAt(store, false, world.view, cellX(0), cellY(0))).toBe("none");
    expect(
      priceAt(store, open, world.view, STORE_RECT.minX + 1, TAB_CENTRE_Y),
    ).toBe("none");

    submit(world, {
      kind: "close_store",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    step();

    expect(store.itemAt(x, y)).toBeNull();
    expect(priceAt(store, open, world.view, x, y)).toBe("none");
    expect(priceAt(store, open, world.view, cellX(0), cellY(0))).toBe("none");
  });

  it("puts the price the domain asks on the tooltip's last line", () => {
    const { seed, tab } = stockedTab();
    const { world, store, quads, openStore } = arrange(seed);
    const labels: LabelRecorder[] = [];
    const tooltip = new Tooltip({
      makeQuad: (frame) => new QuadRecorder(frame),
      makeLabel: (size) => {
        const label = new LabelRecorder(size);

        labels.push(label);

        return label;
      },
      frameSizes: () => FRAME_WIDTH,
      world: world.view,
      glyphAspect: 0.625,
    });

    openStore(0);
    store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

    const [x, y] = iconPoint(quads, shownSlots(quads)[0] ?? -1);
    const item = store.itemAt(x, y);

    if (item === null) {
      throw new Error("The store shows an item there");
    }

    tooltip.show(item, priceAt(store, false, world.view, x, y), x, y);

    const shown = labels.filter((label) => label.visible);

    expect(shown.at(-1)?.text).toBe(
      priceText("buy", priceOf(world.view.run, item)),
    );
    expect(sellPriceOf(world.view.run, item, 0.25)).toBeLessThan(
      priceOf(world.view.run, item),
    );
  });
});

describe("the gestures", () => {
  it("a left click on a stocked item sends buy_item naming its slot and nothing else, and the world moves it into the inventory", () => {
    const { seed, tab } = stockedTab();
    const { world, store, driver, quads, openStore, step, click } =
      arrange(seed);

    world.state.run.gold = RICH;
    openStore(0);
    store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

    const slot = shownSlots(quads)[0] ?? -1;
    const [x, y] = iconPoint(quads, slot);

    click(LEFT_BUTTON, x, y);

    expect(driver.commands).toEqual([
      {
        kind: "buy_item",
        tick: world.view.tick,
        timestamp: 1,
        stockSlot: slot,
      },
    ]);

    step();

    expect(world.view.map.stores[0]?.stock[slot]?.baseId).toBeNull();
    expect(
      world.view.run.inventory.placed.filter((entry) => entry.live),
    ).toHaveLength(1);
    expect(shownSlots(quads)).not.toContain(slot);
  });

  it("a right click on a stocked item, or a click on an empty cell of the grid, sends nothing", () => {
    const { seed, tab } = stockedTab();
    const { store, driver, quads, openStore, click } = arrange(seed);

    openStore(0);
    store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

    const [x, y] = iconPoint(quads, shownSlots(quads)[0] ?? -1);

    click(RIGHT_BUTTON, x, y);
    click(LEFT_BUTTON, STOCK_RECT.maxX - 2, STOCK_RECT.maxY - 2);

    expect(driver.commands).toEqual([]);
  });

  it("a refused buy flashes the item it named, until the refusal's time runs out", () => {
    const { seed, tab } = stockedTab();
    const { world, store, quads, openStore, step, click } = arrange(seed);

    world.state.run.gold = 0;
    openStore(0);
    store.pointerDown(LEFT_BUTTON, tabCentreX(tab), TAB_CENTRE_Y);

    const slot = shownSlots(quads)[0] ?? -1;
    const flash = quadAt(quads, FIRST_FLASH + slot);
    const [x, y] = iconPoint(quads, slot);

    expect(flash.visible).toBe(false);

    click(LEFT_BUTTON, x, y);
    step();

    expect(flash.visible).toBe(true);

    for (let tick = 0; tick < 60; tick += 1) {
      step();
    }

    expect(flash.visible).toBe(false);
  });

  it("while the store is open a right click on an item in the inventory sends sell_item instead of drop_item, and nothing else", () => {
    const { world, driver, openStore, step, click } = arrange();

    placeItem(world.state.run.inventory, aBand(), band.width, band.height, 3);
    openStore(0);
    click(RIGHT_BUTTON, cellX(3), cellY(3));

    expect(driver.commands).toEqual([
      { kind: "sell_item", tick: world.view.tick, timestamp: 1, cell: 3 },
    ]);

    const gold = world.view.run.gold;

    step();

    expect(world.view.run.gold).toBeGreaterThan(gold);
    expect(recordAt(world.view.run.inventory, 3)).toBe(NO_RECORD);
  });

  it("with no store open the same right click drops the item, as before", () => {
    const { world, claim, inventory, driver, click } = arrange();

    placeItem(world.state.run.inventory, aBand(), band.width, band.height, 3);
    claim.open(inventory);
    click(RIGHT_BUTTON, cellX(3), cellY(3));

    expect(driver.commands.map((command) => command.kind)).toEqual([
      "drop_item",
    ]);
  });

  it("a click anywhere on the store is claimed, so the world under it hears nothing", () => {
    const { claim, openStore } = arrange();

    openStore(0);

    expect(
      claim.pointerDown(LEFT_BUTTON, STORE_RECT.minX + 5, STORE_RECT.maxY - 5),
    ).toBe(true);
    expect(
      claim.pointerUp(LEFT_BUTTON, STORE_RECT.minX + 5, STORE_RECT.maxY - 5),
    ).toBe(true);
  });
});
