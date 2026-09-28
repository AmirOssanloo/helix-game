import { describe, expect, it } from "vitest";
import { contentRegistry, heroDef } from "@content/public";
import type { Item, ItemBaseDef } from "@domain/public";
import { createItem, placeItem } from "@domain/rules";
import {
  ARMORY_SLOT_RECTS,
  goldText,
  GRID_CELL_SIZE,
  GRID_RECT,
  gridCellAt,
  INVENTORY_RECT,
  InventoryScreen,
  ITEM_BACKDROP_TINT,
  LEFT_BUTTON,
  RIGHT_BUTTON,
  SOCKET_TINT,
  UNMET_BACKDROP_TINT,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  CommandRecorder,
  FEEDBACK_TIMINGS,
  LabelRecorder,
  makeFormDef,
  makeRegistry,
  makeWorld,
  QuadRecorder,
  spawnHero,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The inventory's width in cells, and its whole count. */
const COLUMNS = 10;
const CELLS = 40;

/** The armory's ten slots, the helm first and the two rings last. */
const SLOTS = 10;
const HELM = 0;
const RING_ONE = 8;

/** How the screen makes its quads: the panel, a socket per cell, then a backdrop, an icon, and a flash per box, the armory's ten boxes before the grid's forty. */
const BOXES = SLOTS + CELLS;
const FIRST_BACKDROP = 1 + CELLS;
const FIRST_ICON = FIRST_BACKDROP + BOXES;
const FIRST_FLASH = FIRST_ICON + BOXES;

/** How far a backdrop sits inside the cells it covers. */
const CELL_INSET = 2;

/** How long a refusal flash shows, as a fresh world's tuning table sets it. */
const FLASH_TICKS = FEEDBACK_TIMINGS.refusalFlashTicks;

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

const commonTint = (): number => {
  const common = contentRegistry.rarities.find((each) => each.id === "common");

  if (common === undefined) {
    throw new Error("The content holds the common rarity");
  }

  return common.tint;
};

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

type Arranged = Readonly<{
  world: Simulation;
  screen: InventoryScreen;
  driver: CommandRecorder;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  /** Places an item of `base` with its corner on `corner`, and returns its placed record. */
  put: (base: ItemBaseDef, corner: number) => number;
  /** A press and its release at the centre of `rect`, handed to the screen as the claim would. */
  clickIn: (button: number, rect: Readonly<Rect>) => void;
  /** A press at the centre of grid cell `cell`. */
  clickCell: (button: number, cell: number) => void;
  /** One tick, every event since drained into the screen, and a frame synced. */
  step: () => void;
}>;

/** An open screen over a hero of level one with an empty inventory and armory. */
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

  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const driver = new CommandRecorder(world);
  const reader = createEventReader();
  const screen = new InventoryScreen({
    makeQuad: (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    makeLabel: (size) => {
      const label = new LabelRecorder(size);

      labels.push(label);

      return label;
    },
    frameSizes: () => FRAME_WIDTH,
    world: world.view,
    driver,
  });
  const centreOf = (rect: Readonly<Rect>): [number, number] => [
    (rect.minX + rect.maxX) / 2,
    (rect.minY + rect.maxY) / 2,
  ];
  const clickAt = (button: number, x: number, y: number): void => {
    if (screen.contains(x, y)) {
      screen.pointerDown(button, x, y);
    }
  };

  screen.show();

  return {
    world,
    screen,
    driver,
    quads,
    labels,
    put: (base, corner) =>
      placeItem(
        world.state.run.inventory,
        itemOf(base),
        base.width,
        base.height,
        corner,
      ),
    clickIn: (button, rect) => {
      const [x, y] = centreOf(rect);

      clickAt(button, x, y);
    },
    clickCell: (button, cell) => {
      clickAt(
        button,
        GRID_RECT.minX + ((cell % COLUMNS) + 0.5) * GRID_CELL_SIZE,
        GRID_RECT.minY + (Math.floor(cell / COLUMNS) + 0.5) * GRID_CELL_SIZE,
      );
    },
    step: () => {
      world.tick();

      let event = world.events.read(reader);

      while (event !== null) {
        screen.react(event);
        event = world.events.read(reader);
      }

      screen.sync();
    },
  };
};

const quadAt = (
  quads: readonly QuadRecorder[],
  index: number,
): QuadRecorder => {
  const quad = quads[index];

  if (quad === undefined) {
    throw new Error(`The screen made quad ${index}`);
  }

  return quad;
};

/** The backdrop, icon, and flash of the armory's slot `slot`. */
const slotQuads = (quads: readonly QuadRecorder[], slot: number) => ({
  backdrop: quadAt(quads, FIRST_BACKDROP + slot),
  icon: quadAt(quads, FIRST_ICON + slot),
  flash: quadAt(quads, FIRST_FLASH + slot),
});

/** The backdrop, icon, and flash of the inventory's placed record `record`. */
const recordQuads = (quads: readonly QuadRecorder[], record: number) =>
  slotQuads(quads, SLOTS + record);

const overlaps = (a: Readonly<Rect>, b: Readonly<Rect>): boolean =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

const inside = (inner: Readonly<Rect>, outer: Readonly<Rect>): boolean =>
  inner.minX >= outer.minX &&
  inner.maxX <= outer.maxX &&
  inner.minY >= outer.minY &&
  inner.maxY <= outer.maxY;

describe("the inventory screen's layout", () => {
  it("lays the armory's ten slots and the grid inside the panel, none over another", () => {
    expect(ARMORY_SLOT_RECTS).toHaveLength(SLOTS);
    expect(inside(GRID_RECT, INVENTORY_RECT)).toBe(true);

    ARMORY_SLOT_RECTS.forEach((rect, slot) => {
      expect(inside(rect, INVENTORY_RECT)).toBe(true);
      expect(overlaps(rect, GRID_RECT)).toBe(false);

      ARMORY_SLOT_RECTS.forEach((other, next) => {
        if (next !== slot) {
          expect(overlaps(rect, other)).toBe(false);
        }
      });
    });
  });

  it("lays the grid ten cells across and four down, in reading order", () => {
    expect(GRID_RECT.maxX - GRID_RECT.minX).toBe(COLUMNS * GRID_CELL_SIZE);
    expect(GRID_RECT.maxY - GRID_RECT.minY).toBe(4 * GRID_CELL_SIZE);
    expect(gridCellAt(GRID_RECT.minX, GRID_RECT.minY)).toBe(0);
    expect(gridCellAt(GRID_RECT.maxX, GRID_RECT.minY)).toBe(COLUMNS - 1);
    expect(gridCellAt(GRID_RECT.minX, GRID_RECT.maxY)).toBe(CELLS - COLUMNS);
    expect(gridCellAt(GRID_RECT.maxX, GRID_RECT.maxY)).toBe(CELLS - 1);
    expect(gridCellAt(GRID_RECT.minX - 1, GRID_RECT.minY)).toBe(-1);
  });

  it("shows a socket for each empty cell and armory slot, and no item", () => {
    const { quads } = arrange();

    for (let cell = 0; cell < CELLS; cell += 1) {
      expect(quadAt(quads, 1 + cell).visible).toBe(true);
      expect(quadAt(quads, 1 + cell).tint).toBe(SOCKET_TINT);
    }

    for (let slot = 0; slot < SLOTS; slot += 1) {
      const { backdrop, icon, flash } = slotQuads(quads, slot);

      expect(backdrop.visible).toBe(true);
      expect(backdrop.tint).toBe(SOCKET_TINT);
      expect(icon.visible).toBe(false);
      expect(flash.visible).toBe(false);
    }

    for (let record = 0; record < CELLS; record += 1) {
      expect(recordQuads(quads, record).icon.visible).toBe(false);
    }
  });
});

describe("the inventory screen's items", () => {
  it("draws an item across the cells it covers, its icon its base's frame in its rarity's tint", () => {
    const { quads, screen, put } = arrange();
    const corner = 12;
    const record = put(cap, corner);

    screen.sync();

    const { backdrop, icon, flash } = recordQuads(quads, record);
    const left = GRID_RECT.minX + 2 * GRID_CELL_SIZE;
    const top = GRID_RECT.minY + GRID_CELL_SIZE;
    const side = 2 * GRID_CELL_SIZE - 2 * CELL_INSET;

    expect(backdrop.visible).toBe(true);
    expect(backdrop.x).toBe(left + GRID_CELL_SIZE);
    expect(backdrop.y).toBe(top + GRID_CELL_SIZE);
    expect(backdrop.scaleX).toBeCloseTo(side / FRAME_WIDTH);
    expect(backdrop.scaleY).toBeCloseTo(side / FRAME_WIDTH);
    expect(backdrop.tint).toBe(ITEM_BACKDROP_TINT);
    expect(icon.visible).toBe(true);
    expect(icon.frame).toBe(cap.atlasFrame);
    expect(icon.tint).toBe(commonTint());
    expect(icon.x).toBe(backdrop.x);
    expect(icon.y).toBe(backdrop.y);
    expect(flash.visible).toBe(false);
  });

  it("draws an item at the corner and the size its placed record holds, reading the view and working nothing out", () => {
    const { quads, screen, world, put } = arrange();
    const record = put(band, 0);
    const placed = world.state.run.inventory.placed[record];

    if (placed === undefined) {
      throw new Error("The band was placed");
    }

    placed.corner = 5;
    placed.width = 3;
    placed.height = 2;
    screen.sync();

    const { backdrop } = recordQuads(quads, record);

    expect(backdrop.x).toBe(GRID_RECT.minX + 6.5 * GRID_CELL_SIZE);
    expect(backdrop.y).toBe(GRID_RECT.minY + GRID_CELL_SIZE);
    expect(backdrop.scaleX).toBeCloseTo(
      (3 * GRID_CELL_SIZE - 2 * CELL_INSET) / FRAME_WIDTH,
    );
    expect(backdrop.scaleY).toBeCloseTo(
      (2 * GRID_CELL_SIZE - 2 * CELL_INSET) / FRAME_WIDTH,
    );
  });

  it("shows the gold run scope holds, as it holds it, rewriting the text only when it changes", () => {
    const { labels, screen, world } = arrange();
    const gold = labels[1];

    expect(gold?.text).toBe(goldText(0));

    world.state.run.gold = 1234;
    screen.sync();

    expect(gold?.text).toBe("GOLD 1234");

    const rewrites = gold?.rewrites;

    screen.sync();

    expect(gold?.rewrites).toBe(rewrites);
  });

  it("backs an item in red whose requirement the hero's level does not meet, as the domain says", () => {
    const { quads, screen, put } = arrange();
    const record = put(crown, 0);

    screen.sync();

    expect(recordQuads(quads, record).backdrop.tint).toBe(UNMET_BACKDROP_TINT);
  });
});

describe("the inventory screen's gestures", () => {
  it("a left click on an item in the grid, on any of its cells, sends equip_item for that cell and nothing else", () => {
    const { driver, put, clickCell } = arrange();

    put(cap, 12);
    clickCell(LEFT_BUTTON, 23);

    expect(driver.commands).toEqual([
      expect.objectContaining({
        kind: "equip_item",
        cell: 23,
        armorySlot: null,
      }),
    ]);
  });

  it("shows the worn item in its slot on the next frame, and a left click on it sends unequip_item, back in the grid the frame after", () => {
    const { driver, quads, put, clickCell, clickIn, step } = arrange();
    const record = put(cap, 0);

    clickCell(LEFT_BUTTON, 0);
    step();

    const helm = slotQuads(quads, HELM);

    expect(helm.icon.visible).toBe(true);
    expect(helm.icon.frame).toBe(cap.atlasFrame);
    expect(helm.backdrop.tint).toBe(ITEM_BACKDROP_TINT);
    expect(recordQuads(quads, record).icon.visible).toBe(false);

    const [helmRect] = ARMORY_SLOT_RECTS;

    if (helmRect === undefined) {
      throw new Error("The armory has a helm slot");
    }

    clickIn(LEFT_BUTTON, helmRect);

    expect(driver.commands.map((command) => command.kind)).toEqual([
      "equip_item",
      "unequip_item",
    ]);
    expect(driver.commands[1]).toEqual(
      expect.objectContaining({ armorySlot: HELM }),
    );

    step();

    expect(helm.icon.visible).toBe(false);
    expect(helm.backdrop.tint).toBe(SOCKET_TINT);
    expect(
      quads.slice(FIRST_ICON + SLOTS, FIRST_FLASH).some((icon) => icon.visible),
    ).toBe(true);
  });

  it("a right click on an item in the grid sends drop_item for that cell, and the item leaves the grid on the next frame", () => {
    const { driver, quads, put, clickCell, step } = arrange();
    const record = put(band, 7);

    clickCell(RIGHT_BUTTON, 7);

    expect(driver.commands).toEqual([
      expect.objectContaining({ kind: "drop_item", cell: 7 }),
    ]);

    step();

    expect(recordQuads(quads, record).icon.visible).toBe(false);
  });

  it("a click on an empty cell, an empty armory slot, a right click on a worn item, or the panel between sends nothing", () => {
    const { driver, world, put, clickCell, clickIn, step } = arrange();
    const ring = ARMORY_SLOT_RECTS[RING_ONE];
    const [helmRect] = ARMORY_SLOT_RECTS;

    if (ring === undefined || helmRect === undefined) {
      throw new Error("The armory has a helm and a ring slot");
    }

    clickCell(LEFT_BUTTON, 3);
    clickCell(RIGHT_BUTTON, 3);
    clickIn(LEFT_BUTTON, ring);
    clickIn(RIGHT_BUTTON, ring);
    clickIn(LEFT_BUTTON, {
      minX: INVENTORY_RECT.minX,
      minY: INVENTORY_RECT.minY,
      maxX: INVENTORY_RECT.minX + 10,
      maxY: INVENTORY_RECT.minY + 10,
    });

    expect(driver.commands).toEqual([]);

    put(cap, 0);
    clickCell(LEFT_BUTTON, 0);
    step();
    driver.commands.length = 0;
    clickIn(RIGHT_BUTTON, helmRect);

    expect(driver.commands).toEqual([]);
    expect(world.view.run.forms[0]?.armory.slots[HELM]?.baseId).toBe(cap.id);
  });

  it("flashes an item whose requirement is above the hero's level on a click, and it stays where it was", () => {
    const { driver, quads, world, put, clickCell, step } = arrange();
    const record = put(crown, 0);

    clickCell(LEFT_BUTTON, 11);

    expect(driver.commands).toEqual([
      expect.objectContaining({ kind: "equip_item", cell: 11 }),
    ]);

    step();

    const { icon, flash } = recordQuads(quads, record);

    expect(flash.visible).toBe(true);
    expect(icon.visible).toBe(true);
    expect(world.view.run.inventory.placed[record]?.corner).toBe(0);
    expect(slotQuads(quads, HELM).icon.visible).toBe(false);

    for (let tick = 0; tick < FLASH_TICKS; tick += 1) {
      step();
    }

    expect(flash.visible).toBe(false);
    expect(icon.visible).toBe(true);
  });

  it("hides every item and socket when it closes, and draws nothing while closed", () => {
    const { quads, labels, screen, put } = arrange();

    put(cap, 0);
    screen.sync();
    screen.hide();
    screen.sync();

    expect(quads.every((quad) => !quad.visible)).toBe(true);
    expect(labels.every((label) => !label.visible)).toBe(true);
  });
});
