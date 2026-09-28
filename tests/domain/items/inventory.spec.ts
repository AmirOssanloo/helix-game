import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { contentRegistry, heroDef } from "@content/public";
import type {
  Armory,
  Inventory,
  Item,
  ItemBaseDef,
  ItemCommand,
  Unit,
} from "@domain/public";
import {
  ARMORY_SLOT_KINDS,
  firstFit,
  fitsAt,
  MOVE_BLOCKED,
  MOVE_FITS,
  moveOutcome,
  NO_RECORD,
  recordAt,
  slotFor,
} from "@domain/queries";
import {
  createArmory,
  createInventory,
  createItem,
  placeItem,
  removeItem,
} from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import {
  makeFormDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** The armory's two ring slots, and the helm's. */
const RING_ONE = 8;
const RING_TWO = 9;
const HELM = 0;

/** Fit tests timed while the heap is watched: one object per call would be megabytes. */
const MEASURED_CALLS = 200_000;
const WARM_UP_CALLS = 10_000;
const HEAP_ALLOWANCE_BYTES = 256 * 1024;

const baseOf = (id: string): ItemBaseDef => {
  const base = contentRegistry.itemBases.find((each) => each.id === id);

  if (base === undefined) {
    throw new Error(`The content holds the base ${id}`);
  }

  return base;
};

const cap = baseOf("cap");
const band = baseOf("band");

/** A body piece two cells wide and three tall, the largest shape in the rules. */
const plate: ItemBaseDef = {
  ...cap,
  id: "plate",
  name: "PLATE",
  armorySlot: "body",
  width: 2,
  height: 3,
};

/** An item of `base`, common, at item level one, with no lines. */
const itemOf = (base: ItemBaseDef): Item => {
  const item = createItem();

  item.baseId = base.id;
  item.rarityId = "common";
  item.itemLevel = 1;

  return item;
};

/** Places an item of `base` with its corner on `corner`, and returns its record. */
const put = (inventory: Inventory, base: ItemBaseDef, corner: number): number =>
  placeItem(inventory, itemOf(base), base.width, base.height, corner);

/** The cells, in reading order, that `record` covers. */
const cellsOf = (inventory: Inventory, record: number): number[] => {
  const cells: number[] = [];

  for (let cell = 0; cell < inventory.cells.length; cell += 1) {
    if (recordAt(inventory, cell) === record) {
      cells.push(cell);
    }
  }

  return cells;
};

describe("the inventory's grid", () => {
  it("covers the cells an item's size gives from its corner, and frees them when it leaves", () => {
    const inventory = createInventory();
    const record = put(inventory, plate, 3);

    expect(cellsOf(inventory, record)).toEqual([3, 4, 13, 14, 23, 24]);
    expect(inventory.placed[record]).toMatchObject({
      live: true,
      corner: 3,
      width: 2,
      height: 3,
    });

    removeItem(inventory, record);

    expect(cellsOf(inventory, record)).toEqual([]);
    expect(inventory.placed[record]?.live).toBe(false);
    expect(inventory.placed[record]?.item.baseId).toBeNull();
  });

  it("fits a 2 by 3 item where six free cells make that shape, and nowhere else", () => {
    const inventory = createInventory();

    // Fill every cell but a 2 by 3 block with its corner on cell 16, and one stray free cell.
    for (let cell = 0; cell < 40; cell += 1) {
      const inBlock = [16, 17, 26, 27, 36, 37].includes(cell);

      if (!inBlock && cell !== 9) {
        put(inventory, band, cell);
      }
    }

    const corners: number[] = [];

    for (let corner = 0; corner < 40; corner += 1) {
      if (fitsAt(inventory, 2, 3, corner, NO_RECORD)) {
        corners.push(corner);
      }
    }

    expect(corners).toEqual([16]);
    expect(firstFit(inventory, 2, 3, NO_RECORD)).toBe(16);
    expect(firstFit(inventory, 1, 1, NO_RECORD)).toBe(9);
  });

  it("refuses a corner whose cells leave the grid on the right or at the bottom", () => {
    const inventory = createInventory();

    expect(fitsAt(inventory, 2, 3, 8, NO_RECORD)).toBe(true);
    expect(fitsAt(inventory, 2, 3, 9, NO_RECORD)).toBe(false);
    expect(fitsAt(inventory, 2, 3, 10, NO_RECORD)).toBe(true);
    expect(fitsAt(inventory, 2, 3, 20, NO_RECORD)).toBe(false);
  });

  it("tries corners in reading order, left to right and then top to bottom", () => {
    const inventory = createInventory();

    put(inventory, cap, 0);

    expect(firstFit(inventory, 2, 2, NO_RECORD)).toBe(2);
    expect(firstFit(inventory, 1, 1, NO_RECORD)).toBe(2);

    for (let corner = 2; corner < 10; corner += 2) {
      put(inventory, cap, corner);
    }

    expect(firstFit(inventory, 2, 2, NO_RECORD)).toBe(20);
    expect(firstFit(inventory, 2, 3, NO_RECORD)).toBe(-1);
  });

  it("counts a moving item's own cells as free", () => {
    const inventory = createInventory();
    const record = put(inventory, cap, 0);

    expect(fitsAt(inventory, 2, 2, 1, NO_RECORD)).toBe(false);
    expect(fitsAt(inventory, 2, 2, 1, record)).toBe(true);
  });

  it("allocates nothing in the fit test or the first fit", () => {
    const inventory = createInventory();

    for (let cell = 0; cell < 39; cell += 1) {
      put(inventory, band, cell);
    }

    let sink = 0;

    for (let call = 0; call < WARM_UP_CALLS; call += 1) {
      sink += firstFit(inventory, 1, 1, NO_RECORD);
      sink += fitsAt(inventory, 2, 3, call % 40, NO_RECORD) ? 1 : 0;
    }

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    for (let call = 0; call < MEASURED_CALLS; call += 1) {
      sink += firstFit(inventory, 1, 1, NO_RECORD);
      sink += fitsAt(inventory, 2, 3, call % 40, NO_RECORD) ? 1 : 0;
    }

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    expect(sink).toBe((WARM_UP_CALLS + MEASURED_CALLS) * 39);
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});

describe("the armory's ring rule", () => {
  it("lays out ten slots, the last two for rings", () => {
    expect(ARMORY_SLOT_KINDS).toHaveLength(10);
    expect(ARMORY_SLOT_KINDS[RING_ONE]).toBe("ring");
    expect(ARMORY_SLOT_KINDS[RING_TWO]).toBe("ring");
    expect(ARMORY_SLOT_KINDS.filter((kind) => kind === "ring")).toHaveLength(2);
  });

  it("sends a ring to the empty ring slot, the first when both are empty or both worn", () => {
    const armory = createArmory();

    expect(slotFor(armory, "ring")).toBe(RING_ONE);

    const first = armory.slots[RING_ONE];

    if (first === undefined) {
      throw new Error("An armory has ten slots");
    }

    first.baseId = band.id;

    expect(slotFor(armory, "ring")).toBe(RING_TWO);

    const second = armory.slots[RING_TWO];

    if (second === undefined) {
      throw new Error("An armory has ten slots");
    }

    second.baseId = band.id;

    expect(slotFor(armory, "ring")).toBe(RING_ONE);
    expect(slotFor(armory, "helm")).toBe(HELM);
  });
});

/** A helm two cells wide and three tall, which the cells a cap leaves cannot hold. */
const greathelm: ItemBaseDef = {
  ...plate,
  id: "greathelm",
  armorySlot: "helm",
};

/** Every free cell of `inventory` filled with a band. */
const fillWithBands = (inventory: Inventory): void => {
  for (let cell = 0; cell < 40; cell += 1) {
    if (recordAt(inventory, cell) === NO_RECORD) {
      put(inventory, band, cell);
    }
  }
};

/** Puts an item of `base` in armory slot `slot`, and returns it. */
const wear = (armory: Armory, slot: number, base: ItemBaseDef): Item => {
  const worn = armory.slots[slot];

  if (worn === undefined) {
    throw new Error("An armory has ten slots");
  }

  worn.baseId = base.id;
  worn.rarityId = "common";
  worn.itemLevel = 1;

  return worn;
};

/** A world whose hero wears the factory form, with an empty inventory and armory. */
const heroWorld = (): Readonly<{
  world: Simulation;
  hero: Unit;
  armory: Armory;
}> => {
  const form = makeFormDef.build({ abilities: [] });
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      itemBases: [...contentRegistry.itemBases, plate, greathelm],
    }),
  });
  const hero = spawnHero(world);
  const armory = world.state.run.forms[0]?.armory;

  if (armory === undefined) {
    throw new Error("The hero has a form");
  }

  return { world, hero, armory };
};

const send = (world: Simulation, command: ItemCommand): void => {
  submit(world, command);
  world.tick();
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

describe("a swap must fit", () => {
  it("answers a move's outcome without changing anything: fits, the covered item's first fit, or blocked", () => {
    const inventory = createInventory();
    const helm = put(inventory, cap, 0);

    put(inventory, band, 16);

    const cells = Uint8Array.from(inventory.cells);

    expect(moveOutcome(inventory, helm, 4)).toBe(MOVE_FITS);
    expect(moveOutcome(inventory, helm, 1)).toBe(MOVE_FITS);
    // Onto the band alone: the band goes to the first cell left free once the helm lies at 5.
    expect(moveOutcome(inventory, helm, 5)).toBe(0);
    // Past the grid's right edge.
    expect(moveOutcome(inventory, helm, 9)).toBe(MOVE_BLOCKED);
    expect(Uint8Array.from(inventory.cells)).toEqual(cells);

    // Onto two bands.
    put(inventory, band, 15);
    expect(moveOutcome(inventory, helm, 5)).toBe(MOVE_BLOCKED);
  });

  it("moves an item onto exactly one other and puts that one at its first fit", () => {
    const { world } = heroWorld();
    const inventory = world.state.run.inventory;

    put(inventory, band, 0);
    put(inventory, cap, 4);
    send(world, { kind: "move_item", ...stamp(world), from: 0, to: 15 });

    expect(recordAt(inventory, 4)).toBe(NO_RECORD);
    expect(inventory.placed[recordAt(inventory, 15)]?.item.baseId).toBe("band");
    // The cap is the only other item the band landed on; it goes back to the first place a 2 by 2 fits.
    expect(inventory.placed[recordAt(inventory, 0)]?.item.baseId).toBe("cap");
    expect(inventory.placed[recordAt(inventory, 0)]?.corner).toBe(0);
  });

  it("refuses a swap whose covered item fits nowhere, and moves nothing", () => {
    const { world } = heroWorld();
    const inventory = world.state.run.inventory;

    // A plate in the corner and a band in every other cell: the plate has nowhere else to go.
    put(inventory, plate, 0);
    fillWithBands(inventory);

    const cells = Uint8Array.from(inventory.cells);

    send(world, { kind: "move_item", ...stamp(world), from: 2, to: 0 });

    expect(Uint8Array.from(inventory.cells)).toEqual(cells);
    expect(inventory.placed[recordAt(inventory, 0)]?.item.baseId).toBe("plate");
    expect(inventory.placed[recordAt(inventory, 2)]?.item.baseId).toBe("band");
  });

  it("puts the worn item into the cells the new one leaves when it fits there", () => {
    const { world, armory } = heroWorld();
    const inventory = world.state.run.inventory;
    const worn = wear(armory, HELM, cap);

    put(inventory, cap, 18);
    fillWithBands(inventory);
    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 18,
      armorySlot: null,
    });

    expect(worn.baseId).toBe("cap");
    expect(inventory.placed[recordAt(inventory, 18)]?.item.baseId).toBe("cap");
    expect(inventory.placed[recordAt(inventory, 18)]?.corner).toBe(18);
  });

  it("refuses an equip whose worn item fits nowhere once the new one has left its cells, and moves nothing", () => {
    const { world, armory } = heroWorld();
    const inventory = world.state.run.inventory;
    const worn = wear(armory, HELM, greathelm);

    put(inventory, cap, 18);
    fillWithBands(inventory);

    const cells = Uint8Array.from(inventory.cells);

    send(world, {
      kind: "equip_item",
      ...stamp(world),
      cell: 18,
      armorySlot: null,
    });

    expect(Uint8Array.from(inventory.cells)).toEqual(cells);
    expect(inventory.placed[recordAt(inventory, 18)]?.item.baseId).toBe("cap");
    expect(worn.baseId).toBe("greathelm");
  });
});
