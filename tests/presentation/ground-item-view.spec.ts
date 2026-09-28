import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { rarities } from "@content/public";
import type { DomainEvent, GroundItemId, GroundItemKind } from "@domain/public";
import { acquireGroundItem, releaseGroundItem } from "@domain/rules";
import type { PickList } from "@presentation/public";
import {
  createGroundItemIcons,
  createGroundItemLabels,
  createPickPort,
  DEPTH_GROUND_ITEMS,
  FLASH_REFUSED_TINT,
  flashRefusedItem,
  DEPTH_ITEM_LABELS,
  GOLD_TINT,
  GROUND_GLOBE_FRAME,
  GROUND_GOLD_FRAME,
  GROUND_LABEL_SIZE,
  ItemLabelFlashes,
  LABEL_NUDGE_LIMIT,
  Projection,
  refusalFlashTicks,
} from "@presentation/public";
import type { Rect } from "@shared/public";
import type { Simulation } from "@simulation/testing";
import {
  frameAround,
  LabelRecorder,
  makeWorld,
  QuadRecorder,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** A glyph of the shipped font: 20 wide, 32 tall. */
const GLYPH_ASPECT = 20 / 32;

/** How wide one glyph of a label is drawn. */
const ADVANCE = GROUND_LABEL_SIZE * GLYPH_ASPECT;

/** The pools a case makes: more than any case lays on one screen. */
const POOL_SIZE = 64;

/** The world rectangle the screen shows in most cases, around the origin. */
const SCREEN: Rect = { minX: -300, minY: -300, maxX: 300, maxY: 300 };

/** Where the camera's view starts on the scene, so a pick rectangle is moved onto the canvas by it. */
const CANVAS: Rect = { minX: -700, minY: -200, maxX: 1220, maxY: 880 };

/** A walkability cell's side in the test map: two items this far apart lie on two cells. */
const CELL = 32;

/** What a case lays on the ground. */
type Drop = Readonly<{
  kind: GroundItemKind;
  x: number;
  y: number;
  amount: number;
  baseId: string | null;
  rarityId: string | null;
  legendaryId: string | null;
}>;

const drop = (
  kind: GroundItemKind,
  x: number,
  y: number,
  item: Partial<Omit<Drop, "kind" | "x" | "y">> = {},
): Drop => ({
  kind,
  x,
  y,
  amount: item.amount ?? 0,
  baseId: item.baseId ?? null,
  rarityId: item.rarityId ?? null,
  legendaryId: item.legendaryId ?? null,
});

/** A cap of `rarityId` at (`x`, `y`). */
const cap = (x: number, y: number, rarityId: string): Drop =>
  drop("item", x, y, { baseId: "cap", rarityId });

type Arranged = {
  world: Simulation;
  projection: Projection;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  icons: ReturnType<typeof createGroundItemIcons>;
  labelViews: ReturnType<typeof createGroundItemLabels>;
  picks: ReturnType<typeof createPickPort>;
  itemFlashes: ItemLabelFlashes;
};

const arrange = (size = POOL_SIZE): Arranged => {
  const world = makeWorld({ seed: 1 });
  const projection = new Projection();
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const icons = createGroundItemIcons(
    size,
    (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    () => FRAME_WIDTH,
    world.view,
    projection,
  );
  const labelViews = createGroundItemLabels(
    size,
    (lineSize) => {
      const label = new LabelRecorder(lineSize);

      labels.push(label);

      return label;
    },
    world.view,
    projection,
    GLYPH_ASPECT,
  );

  return {
    world,
    projection,
    quads,
    labels,
    icons,
    labelViews,
    picks: createPickPort(size, size),
    itemFlashes: new ItemLabelFlashes(),
  };
};

/** Lays `what` on the ground, by id. */
const lay = (arranged: Arranged, what: Drop): GroundItemId => {
  const id = acquireGroundItem(arranged.world.state, what.kind, what.x, what.y);
  const groundItem =
    id === null ? null : arranged.world.state.map.groundItems.resolve(id);

  if (id === null || groundItem === null) {
    throw new Error("The ground-item pool has room");
  }

  groundItem.amount = what.amount;
  groundItem.item.baseId = what.baseId;
  groundItem.item.rarityId = what.rarityId;
  groundItem.item.legendaryId = what.legendaryId;

  return id;
};

/** One frame of both view kinds over `screen`, with Alt held or not. */
const sync = (
  arranged: Arranged,
  everyLabel = false,
  screen: Rect = SCREEN,
): void => {
  const frame = frameAround(screen);

  arranged.icons.sync(arranged.world.view, frame, CANVAS, arranged.picks.icons);
  arranged.labelViews.sync(
    arranged.world.view,
    frame,
    everyLabel,
    arranged.itemFlashes,
    CANVAS,
    arranged.picks.labels,
  );
};

const shownQuads = (arranged: Arranged): QuadRecorder[] =>
  arranged.quads.filter((quad) => quad.visible);

const shownLabels = (arranged: Arranged): LabelRecorder[] =>
  arranged.labels.filter((label) => label.visible);

const shownTexts = (arranged: Arranged): (string | null)[] =>
  shownLabels(arranged)
    .map((label) => label.text)
    .sort();

/** The first `count` entries of a pick list, as plain rectangles and ids. */
const entries = (list: PickList): { rect: Rect; id: GroundItemId | null }[] => {
  const found: { rect: Rect; id: GroundItemId | null }[] = [];

  for (let index = 0; index < list.count; index += 1) {
    const rect = list.rects[index];

    if (rect !== undefined) {
      found.push({ rect: { ...rect }, id: list.ids[index] ?? null });
    }
  }

  return found;
};

/** The rectangle a label is drawn in on the scene, centred on it. */
const labelRect = (label: LabelRecorder): Rect => {
  const halfWidth = ((label.text ?? "").length * ADVANCE) / 2;
  const halfHeight = GROUND_LABEL_SIZE / 2;

  return {
    minX: label.x - halfWidth,
    minY: label.y - halfHeight,
    maxX: label.x + halfWidth,
    maxY: label.y + halfHeight,
  };
};

const overlaps = (a: Rect, b: Rect): boolean =>
  a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;

/** Every pair of the shown labels that overlaps. */
const overlappingPairs = (arranged: Arranged): number => {
  const rects = shownLabels(arranged).map(labelRect);
  let pairs = 0;

  for (let first = 0; first < rects.length; first += 1) {
    for (let second = first + 1; second < rects.length; second += 1) {
      const a = rects[first];
      const b = rects[second];

      if (a !== undefined && b !== undefined && overlaps(a, b)) {
        pairs += 1;
      }
    }
  }

  return pairs;
};

const tintOf = (rarityId: string): number => {
  const rarity = rarities.find((row) => row.id === rarityId);

  if (rarity === undefined) {
    throw new Error(`The catalogue has the rarity ${rarityId}`);
  }

  return rarity.tint;
};

describe("ground-item icons", () => {
  it("bind by the camera's rectangle: what the screen shows gets an icon, what it does not gets none", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "rare"));
    lay(arranged, cap(200, 0, "rare"));
    lay(arranged, cap(3000, 3000, "rare"));
    sync(arranged);

    expect(arranged.icons.pool.bound).toBe(2);
    expect(
      shownQuads(arranged)
        .map((quad) => quad.x)
        .sort(),
    ).toEqual([0, 200]);

    sync(arranged, false, {
      minX: 2700,
      minY: 2700,
      maxX: 3300,
      maxY: 3300,
    });

    expect(arranged.icons.pool.bound).toBe(1);
    expect(shownQuads(arranged).map((quad) => quad.x)).toEqual([3000]);
    expect(arranged.icons.misses).toBe(0);
  });

  it("release the icon of a ground item taken off the ground on the next frame", () => {
    const arranged = arrange();
    const id = lay(arranged, cap(0, 0, "rare"));

    sync(arranged);
    releaseGroundItem(arranged.world.state, id);
    sync(arranged);

    expect(arranged.icons.pool.bound).toBe(0);
    expect(shownQuads(arranged)).toEqual([]);
  });

  it("draw an item in its base's frame and its rarity's tint, gold and globes in their own, at the ground-items band", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "rare"));
    lay(
      arranged,
      drop("item", CELL * 2, 0, { baseId: "band", rarityId: "common" }),
    );
    lay(arranged, drop("gold", CELL * 4, 0, { amount: 25 }));
    lay(arranged, drop("health_globe", CELL * 6, 0));
    lay(arranged, drop("mana_globe", CELL * 8, 0));
    sync(arranged);

    const byX = new Map(shownQuads(arranged).map((quad) => [quad.x, quad]));

    expect(byX.get(0)?.frame).toBe("item_helm");
    expect(byX.get(0)?.tint).toBe(tintOf("rare"));
    expect(byX.get(CELL * 2)?.frame).toBe("item_ring");
    expect(byX.get(CELL * 2)?.tint).toBe(tintOf("common"));
    expect(byX.get(CELL * 4)?.frame).toBe(GROUND_GOLD_FRAME);
    expect(byX.get(CELL * 4)?.tint).toBe(GOLD_TINT);
    expect(byX.get(CELL * 6)?.frame).toBe(GROUND_GLOBE_FRAME);
    expect(byX.get(CELL * 8)?.frame).toBe(GROUND_GLOBE_FRAME);
    expect(byX.get(CELL * 6)?.tint).not.toBe(byX.get(CELL * 8)?.tint);
    expect(
      shownQuads(arranged).every((quad) => quad.depth === DEPTH_GROUND_ITEMS),
    ).toBe(true);
  });

  it("write each icon drawn to the pick port, on the canvas, around where its item is drawn, in drawing order", () => {
    const arranged = arrange();
    const first = lay(arranged, cap(0, 0, "rare"));
    const second = lay(arranged, drop("gold", 100, 60, { amount: 5 }));

    sync(arranged);

    const icons = entries(arranged.picks.icons);
    const drawn = { x: 0, y: 0 };

    expect(icons.map((entry) => entry.id)).toEqual([first, second]);

    for (const [index, [x, y]] of [
      [0, 0],
      [100, 60],
    ].entries()) {
      const rect = icons[index]?.rect;

      arranged.projection.toScreen(x ?? 0, y ?? 0, drawn);

      expect(rect).toBeDefined();
      expect(rect?.minX).toBeLessThan(drawn.x - CANVAS.minX);
      expect(rect?.maxX).toBeGreaterThan(drawn.x - CANVAS.minX);
      expect(rect?.minY).toBeLessThan(drawn.y - CANVAS.minY);
      expect(rect?.maxY).toBeGreaterThan(drawn.y - CANVAS.minY);
    }
  });
});

describe("ground-item labels", () => {
  it("show by default for a rarity whose row says so and hide the rest, gold's included; a globe has none", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "common"));
    lay(arranged, cap(0, CELL * 4, "uncommon"));
    lay(arranged, cap(0, CELL * 8, "rare"));
    lay(arranged, cap(CELL * 8, 0, "mythical"));
    lay(arranged, drop("gold", CELL * 8, CELL * 8, { amount: 25 }));
    lay(arranged, drop("health_globe", -CELL * 8, 0));
    sync(arranged);

    expect(shownTexts(arranged)).toEqual(["CAP", "CAP"]);
    expect(arranged.labelViews.pool.bound).toBe(5);
    expect(
      shownLabels(arranged)
        .map((label) => label.tint)
        .sort(),
    ).toEqual([tintOf("rare"), tintOf("mythical")].sort());
  });

  it("show every one while Alt is held, gold's with its amount, and hide the default-hidden ones on the next frame after", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "common"));
    lay(arranged, cap(0, CELL * 8, "rare"));
    lay(arranged, drop("gold", CELL * 8, CELL * 8, { amount: 25 }));
    lay(arranged, drop("mana_globe", -CELL * 8, 0));
    sync(arranged, true);

    expect(shownTexts(arranged)).toEqual(["25 GOLD", "CAP", "CAP"]);
    expect(
      shownLabels(arranged).find((label) => label.text === "25 GOLD")?.tint,
    ).toBe(GOLD_TINT);

    const rewrites = arranged.labels.reduce(
      (sum, label) => sum + label.rewrites,
      0,
    );

    sync(arranged, false);

    expect(shownTexts(arranged)).toEqual(["CAP"]);
    expect(
      arranged.labels.reduce((sum, label) => sum + label.rewrites, 0),
    ).toBe(rewrites);
  });

  it("name a Legendary by its piece, in its rarity's tint, at the item-labels band", () => {
    const arranged = arrange();

    lay(
      arranged,
      drop("item", 0, 0, {
        baseId: "band",
        rarityId: "legendary",
        legendaryId: "rimecoil",
      }),
    );
    sync(arranged);

    const [label] = shownLabels(arranged);

    expect(label?.text).toBe("RIMECOIL");
    expect(label?.tint).toBe(tintOf("legendary"));
    expect(label?.depth).toBe(DEPTH_ITEM_LABELS);
  });

  it("stand above where the item is drawn when nothing crowds them", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "rare"));
    sync(arranged);

    const drawn = { x: 0, y: 0 };
    const [label] = shownLabels(arranged);

    arranged.projection.toScreen(0, 0, drawn);

    expect(label?.x).toBe(drawn.x);
    expect(label?.y).toBeLessThan(drawn.y);
  });

  it("are moved apart until no two on screen overlap", () => {
    const arranged = arrange();

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        lay(arranged, cap(column * CELL, row * CELL, "rare"));
      }
    }

    sync(arranged, true);

    expect(shownLabels(arranged)).toHaveLength(16);
    expect(overlappingPairs(arranged)).toBe(0);
  });

  it("hide a label the bounded pass cannot place rather than draw it over another", () => {
    const arranged = arrange();
    const pile = LABEL_NUDGE_LIMIT + 8;

    for (let index = 0; index < pile; index += 1) {
      lay(
        arranged,
        cap((index % 3) * CELL, Math.floor(index / 3) * CELL, "rare"),
      );
    }

    sync(arranged, true);

    expect(shownLabels(arranged).length).toBeGreaterThan(LABEL_NUDGE_LIMIT);
    expect(overlappingPairs(arranged)).toBe(0);
  });

  it("write each label drawn to the pick port, on the canvas, as drawn, in drawing order, and none hidden", () => {
    const arranged = arrange();
    const common = lay(arranged, cap(0, 0, "common"));
    const rare = lay(arranged, cap(CELL * 6, 0, "rare"));
    const gold = lay(arranged, drop("gold", 0, CELL * 6, { amount: 7 }));

    sync(arranged);

    expect(entries(arranged.picks.labels).map((entry) => entry.id)).toEqual([
      rare,
    ]);

    sync(arranged, true);

    const labels = entries(arranged.picks.labels);

    expect(labels.map((entry) => entry.id)).toEqual([common, rare, gold]);

    const drawnLabels = arranged.labels.filter((label) => label.visible);

    for (const [index, label] of drawnLabels.entries()) {
      const rect = labelRect(label);

      expect(labels[index]?.rect).toEqual({
        minX: rect.minX - CANVAS.minX,
        minY: rect.minY - CANVAS.minY,
        maxX: rect.maxX - CANVAS.minX,
        maxY: rect.maxY - CANVAS.minY,
      });
    }
  });
});

/** Frames run to warm the sync up, then frames measured; heap growth past the allowance over them fails. */
/** A `command_refused` for `reason` at the world's tick, naming `groundItemId` and `place`. */
const refusal = (
  arranged: Arranged,
  groundItemId: GroundItemId | null,
  place = -1,
): Readonly<DomainEvent> => ({
  kind: "command_refused",
  tick: arranged.world.view.tick,
  orb: -1,
  abilityId: null,
  statusId: null,
  slot: 0,
  reason: "no_room",
  unitId: null,
  sourceId: null,
  zoneId: null,
  projectileId: null,
  groundItemId,
  amount: 0,
  damageType: null,
  checkpoint: -1,
  place,
});

/** Hands `event` to the label flashes as the play scene's event drain does, over `screen`. */
const drain = (
  arranged: Arranged,
  event: Readonly<DomainEvent>,
  screen: Rect = SCREEN,
): void => {
  flashRefusedItem(
    event,
    arranged.world.view,
    frameAround(screen),
    arranged.itemFlashes,
  );
};

/** Runs the world on by `ticks`. */
const runTicks = (arranged: Arranged, ticks: number): void => {
  for (let tick = 0; tick < ticks; tick += 1) {
    arranged.world.tick();
  }
};

describe("a refused pick up", () => {
  it("flashes the item's label in the refusal tint for the refusal flash's ticks, then returns it to its tint", () => {
    const arranged = arrange();

    lay(arranged, cap(0, CELL * 8, "rare"));
    sync(arranged);

    const [label] = shownLabels(arranged);

    expect(label?.tint).toBe(tintOf("rare"));

    const id = arranged.world.view.map.groundItems.idAt(0);

    if (id === null) {
      throw new Error("The cap lies at the first index");
    }

    drain(arranged, refusal(arranged, id));
    sync(arranged);

    expect(shownLabels(arranged)).toEqual([label]);
    expect(label?.tint).toBe(FLASH_REFUSED_TINT);

    const ticks = refusalFlashTicks(arranged.world.view);

    runTicks(arranged, ticks - 1);
    sync(arranged);

    expect(label?.tint).toBe(FLASH_REFUSED_TINT);

    runTicks(arranged, 1);
    sync(arranged);

    expect(shownLabels(arranged)).toEqual([label]);
    expect(label?.tint).toBe(tintOf("rare"));
  });

  it("shows a label hidden with Alt up for the flash, and hides it again after", () => {
    const arranged = arrange();
    const id = lay(arranged, cap(0, 0, "common"));

    sync(arranged);

    expect(shownLabels(arranged)).toEqual([]);

    drain(arranged, refusal(arranged, id));
    sync(arranged);

    expect(shownTexts(arranged)).toEqual(["CAP"]);
    expect(shownLabels(arranged)[0]?.tint).toBe(FLASH_REFUSED_TINT);
    expect(entries(arranged.picks.labels).map((entry) => entry.id)).toEqual([
      id,
    ]);

    runTicks(arranged, refusalFlashTicks(arranged.world.view));
    sync(arranged);

    expect(shownLabels(arranged)).toEqual([]);

    sync(arranged, true);

    expect(shownLabels(arranged)[0]?.tint).toBe(tintOf("common"));
  });

  it("flashes no label for a refusal that names a place and no ground item", () => {
    const arranged = arrange();

    lay(arranged, cap(0, 0, "common"));
    lay(arranged, cap(0, CELL * 8, "rare"));
    drain(arranged, refusal(arranged, null, 3));
    sync(arranged);

    expect(shownTexts(arranged)).toEqual(["CAP"]);
    expect(shownLabels(arranged)[0]?.tint).toBe(tintOf("rare"));
  });

  it("flashes nothing for an item drawn off the screen, even once the screen reaches it", () => {
    const arranged = arrange();
    const id = lay(arranged, cap(0, 0, "common"));
    const away: Rect = { minX: 4000, minY: 4000, maxX: 4600, maxY: 4600 };

    drain(arranged, refusal(arranged, id), away);
    sync(arranged, false, away);
    sync(arranged);

    expect(shownLabels(arranged)).toEqual([]);
  });
});

const WARM_UP_FRAMES = 5_000;
const MEASURED_FRAMES = 2_000;
const HEAP_ALLOWANCE_BYTES = 256 * 1024;

describe("the sync with a full screen of drops", () => {
  it("allocates nothing once warm, Alt held and released, with the overlap pass running", () => {
    const arranged = arrange();
    const frame = frameAround(SCREEN);
    const kinds: readonly GroundItemKind[] = [
      "item",
      "item",
      "gold",
      "health_globe",
    ];
    let laid = 0;

    for (let row = 0; row < 8 && laid < POOL_SIZE; row += 1) {
      for (let column = 0; column < 8 && laid < POOL_SIZE; column += 1) {
        const kind = kinds[laid % kinds.length] ?? "item";

        lay(
          arranged,
          kind === "item"
            ? cap(column * CELL - 128, row * CELL - 128, "rare")
            : drop(kind, column * CELL - 128, row * CELL - 128, { amount: 9 }),
        );
        laid += 1;
      }
    }

    const view = arranged.world.view;
    const { icons, labelViews, picks, itemFlashes } = arranged;
    const run = (frames: number): void => {
      for (let index = 0; index < frames; index += 1) {
        const everyLabel = index % 30 < 15;

        icons.sync(view, frame, CANVAS, picks.icons);
        labelViews.sync(
          view,
          frame,
          everyLabel,
          itemFlashes,
          CANVAS,
          picks.labels,
        );
      }
    };

    run(WARM_UP_FRAMES);

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    run(MEASURED_FRAMES);

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    expect(icons.pool.bound).toBe(64);
    expect(icons.misses).toBe(0);
    expect(labelViews.misses).toBe(0);
    expect(picks.icons.count).toBe(64);
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});
