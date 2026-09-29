import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { Item, Unit } from "@domain/public";
import { acquireGroundItem, createItem } from "@domain/rules";
import type { TooltipPrice } from "@presentation/public";
import {
  ACTIVE_ITEM_TINT,
  createPickPort,
  itemUnderPointer,
  PRICE_TINT,
  Tooltip,
  TOOLTIP_LINE_CAPACITY,
  TOOLTIP_TEXT_SIZE,
  TOOLTIP_TEXT_TINT,
  UNMET_REQUIREMENT_TINT,
  writePick,
} from "@presentation/public";
import type { Simulation } from "@simulation/testing";
import {
  FIXTURE_ACTIVES,
  GLASS,
  LabelRecorder,
  makeRegistry,
  makeWorld,
  QuadRecorder,
  spawnHero,
} from "../helpers";

const FRAME_WIDTH = 128;
const GLYPH_ASPECT = 0.625;

const find = <T extends { id: string }>(list: readonly T[], id: string): T => {
  const found = list.find((each) => each.id === id);

  if (found === undefined) {
    throw new Error(`The content holds ${id}`);
  }

  return found;
};

const cap = find(contentRegistry.itemBases, "cap");
const health1 = find(contentRegistry.affixes, "health_1");
const resistance1 = find(contentRegistry.affixes, "magic_resistance_1");
const hallcrown = find(contentRegistry.legendaries, "hallcrown");
const rare = find(contentRegistry.rarities, "rare");
const legendary = find(contentRegistry.rarities, "legendary");

/** A Rare cap at item level 3: its implicit armour, then maximum health and magic resistance. */
const rolledCap = (): Item => {
  const item = createItem();
  const lines: readonly [string, number][] = [
    [cap.id, 2],
    [health1.id, 15],
    [resistance1.id, 0.03],
  ];

  item.baseId = cap.id;
  item.rarityId = rare.id;
  item.itemLevel = 3;
  lines.forEach(([sourceId, value], index) => {
    const line = item.lines[index];

    if (line !== undefined) {
      line.sourceId = sourceId;
      line.value = value;
    }
  });
  item.lineCount = lines.length;

  return item;
};

/** Hallcrown at item level 9, as a drop writes it: its base, the Legendary rarity, and its fixed lines. */
const hallcrownItem = (): Item => {
  const item = createItem();

  item.baseId = hallcrown.baseId;
  item.rarityId = legendary.id;
  item.legendaryId = hallcrown.id;
  item.itemLevel = 9;
  hallcrown.lines.forEach((fixed, index) => {
    const line = item.lines[index];

    if (line !== undefined) {
      line.sourceId = hallcrown.id;
      line.value = fixed.value;
    }
  });
  item.lineCount = hallcrown.lines.length;

  return item;
};

/** Glass, the fixture active item casting Quicken, as a buy leaves it: its active id and nothing else. */
const glassItem = (): Item => {
  const item = createItem();

  item.activeId = GLASS.id;

  return item;
};

/** Quicken, the ability Glass casts; the hero casts it at the first level, every orb at one. */
const quicken = find(contentRegistry.spells, GLASS.active.abilityId);
const GLASS_COOLDOWN = `COOLDOWN ${String(quicken.cooldownSeconds[0])}`;
const GLASS_MANA = `MANA ${String(quicken.manaCost[0])}`;

/** Whether a shown line is one only an active item's tooltip holds. */
const isActiveLine = (text: string | null): boolean =>
  text !== null && (text.startsWith("COOLDOWN ") || text.startsWith("MANA "));

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  tooltip: Tooltip;
  backdrop: QuadRecorder;
  labels: LabelRecorder[];
  /** The text of every label shown, in order. */
  shownText: () => (string | null)[];
}>;

const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ activeItems: FIXTURE_ACTIVES }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const tooltip = new Tooltip({
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
    glyphAspect: GLYPH_ASPECT,
  });
  const backdrop = quads[0];

  if (backdrop === undefined) {
    throw new Error("The tooltip made its backdrop");
  }

  return {
    world,
    hero,
    tooltip,
    backdrop,
    labels,
    shownText: () =>
      labels.filter((label) => label.visible).map((label) => label.text),
  };
};

const tintOf = (arranged: Arranged, text: string): number => {
  const label = arranged.labels.find(
    (each) => each.visible && each.text === text,
  );

  if (label === undefined) {
    throw new Error(`A shown line reads ${text}`);
  }

  return label.tint;
};

describe("the tooltip", () => {
  it("makes its backdrop and every line once, hidden", () => {
    const arranged = arrange();

    expect(arranged.labels).toHaveLength(TOOLTIP_LINE_CAPACITY);
    expect(arranged.backdrop.visible).toBe(false);
    expect(arranged.shownText()).toEqual([]);
  });

  it("reads every line of a rolled item from its record and definitions", () => {
    const arranged = arrange();
    const requirement = Math.max(
      cap.requirement,
      health1.requirement,
      resistance1.requirement,
    );

    arranged.hero.progression.level = requirement;
    arranged.tooltip.show(rolledCap(), "none", 400, 400);

    expect(arranged.backdrop.visible).toBe(true);
    expect(arranged.shownText()).toEqual([
      "CAP",
      "RARE CAP",
      "ITEM LEVEL 3",
      `REQUIRED LEVEL ${requirement}`,
      "+2 ARMOUR",
      "+15 MAXIMUM HEALTH",
      "+3% MAGIC RESISTANCE",
    ]);
    expect(tintOf(arranged, "CAP")).toBe(rare.tint);
    expect(tintOf(arranged, `REQUIRED LEVEL ${requirement}`)).toBe(
      TOOLTIP_TEXT_TINT,
    );
  });

  it("shows a Legendary's name, its base, and its fixed lines", () => {
    const arranged = arrange();

    arranged.hero.progression.level = hallcrown.requirement;
    arranged.tooltip.show(hallcrownItem(), "none", 400, 400);

    expect(arranged.shownText()).toEqual([
      "HALLCROWN",
      "LEGENDARY CAP",
      "ITEM LEVEL 9",
      `REQUIRED LEVEL ${hallcrown.requirement}`,
      "+2 ARMOUR",
      "+12% MAGIC DAMAGE",
      "+6% COOLDOWN REDUCTION",
      "+40 MAXIMUM MANA",
    ]);
    expect(tintOf(arranged, "HALLCROWN")).toBe(legendary.tint);
  });

  it("sizes its backdrop to the widest line and every line, a glyph as wide as the label's size and as tall as that over its aspect", () => {
    const arranged = arrange();

    arranged.tooltip.show(hallcrownItem(), "none", 400, 400);

    const shown = arranged.shownText();
    const widest = Math.max(...shown.map((text) => text?.length ?? 0));
    const glyphHeight = TOOLTIP_TEXT_SIZE / GLYPH_ASPECT;

    expect(arranged.backdrop.scaleX * FRAME_WIDTH).toBeGreaterThan(
      widest * TOOLTIP_TEXT_SIZE,
    );
    expect(arranged.backdrop.scaleY * FRAME_WIDTH).toBeGreaterThan(
      shown.length * glyphHeight,
    );
  });

  it("marks a requirement above the hero's level as unmet, and clears the mark when the hero reaches it", () => {
    const arranged = arrange();
    const line = `REQUIRED LEVEL ${hallcrown.requirement}`;

    arranged.hero.progression.level = hallcrown.requirement - 1;
    arranged.tooltip.show(hallcrownItem(), "none", 400, 400);

    expect(tintOf(arranged, line)).toBe(UNMET_REQUIREMENT_TINT);

    arranged.hero.progression.level = hallcrown.requirement;
    arranged.tooltip.show(hallcrownItem(), "none", 400, 400);

    expect(tintOf(arranged, line)).toBe(TOOLTIP_TEXT_TINT);
  });

  it("shows the price or the sell price only while the store is open", () => {
    const arranged = arrange();
    const lineFor = (price: TooltipPrice): string | null | undefined => {
      arranged.tooltip.show(rolledCap(), price, 400, 400);

      return arranged.shownText().find((text) => text?.includes("GOLD"));
    };
    const price = cap.value * rare.priceMultiplier;

    expect(lineFor("none")).toBeUndefined();
    expect(lineFor("buy")).toBe(`PRICE ${price} GOLD`);
    expect(tintOf(arranged, `PRICE ${price} GOLD`)).toBe(PRICE_TINT);
    expect(lineFor("sell")).toBe(`SELL FOR ${Math.floor(price * 0.25)} GOLD`);
    expect(lineFor("none")).toBeUndefined();
  });

  it("writes no text while it follows the pointer over the same item, and rewrites it for another", () => {
    const arranged = arrange();
    const item = rolledCap();

    arranged.tooltip.show(item, "none", 400, 400);

    const rewrites = arranged.labels.map((label) => label.rewrites);
    const firstX = arranged.backdrop.x;

    arranged.tooltip.show(item, "none", 420, 380);
    arranged.tooltip.show(rolledCap(), "none", 440, 360);

    expect(arranged.labels.map((label) => label.rewrites)).toEqual(rewrites);
    expect(arranged.backdrop.x).toBe(firstX + 40);

    arranged.tooltip.show(hallcrownItem(), "none", 440, 360);

    expect(arranged.shownText()[0]).toBe("HALLCROWN");
  });

  it("shows an active item's name in emerald, then COOLDOWN and MANA, and no rarity, item level, or requirement", () => {
    const arranged = arrange();

    arranged.tooltip.show(glassItem(), "none", 400, 400);

    expect(arranged.shownText()).toEqual([
      GLASS.name.toUpperCase(),
      GLASS_COOLDOWN,
      GLASS_MANA,
    ]);
    expect(tintOf(arranged, GLASS.name.toUpperCase())).toBe(ACTIVE_ITEM_TINT);
    expect(tintOf(arranged, GLASS_COOLDOWN)).toBe(TOOLTIP_TEXT_TINT);
    expect(tintOf(arranged, GLASS_MANA)).toBe(TOOLTIP_TEXT_TINT);
  });

  it("puts an active item's price under its two lines while the store is open", () => {
    const arranged = arrange();

    arranged.tooltip.show(glassItem(), "buy", 400, 400);

    expect(arranged.shownText()).toEqual([
      GLASS.name.toUpperCase(),
      GLASS_COOLDOWN,
      GLASS_MANA,
      `PRICE ${String(GLASS.price)} GOLD`,
    ]);
  });

  it("shows COOLDOWN and MANA on an active item and on nothing else", () => {
    const arranged = arrange();

    arranged.hero.progression.level = hallcrown.requirement;

    for (const item of [rolledCap(), hallcrownItem()]) {
      for (const price of ["none", "buy", "sell"] as const) {
        arranged.tooltip.show(item, price, 400, 400);

        expect(arranged.shownText().filter(isActiveLine)).toEqual([]);
      }
    }

    arranged.tooltip.show(glassItem(), "sell", 400, 400);

    expect(arranged.shownText().filter(isActiveLine)).toEqual([
      GLASS_COOLDOWN,
      GLASS_MANA,
    ]);
  });

  it("rewrites its lines going from a piece of equipment to an active item and back", () => {
    const arranged = arrange();

    arranged.tooltip.show(rolledCap(), "none", 400, 400);
    arranged.tooltip.show(glassItem(), "none", 400, 400);

    expect(arranged.shownText()[0]).toBe(GLASS.name.toUpperCase());

    const rewrites = arranged.labels.map((label) => label.rewrites);

    arranged.tooltip.show(glassItem(), "none", 420, 380);

    expect(arranged.labels.map((label) => label.rewrites)).toEqual(rewrites);

    arranged.tooltip.show(rolledCap(), "none", 400, 400);

    expect(arranged.shownText()[0]).toBe("CAP");
  });

  it("stays on the canvas at its edges", () => {
    const arranged = arrange();

    arranged.tooltip.show(hallcrownItem(), "none", 1915, 5);

    const { backdrop } = arranged;
    const halfWidth = (backdrop.scaleX * FRAME_WIDTH) / 2;
    const halfHeight = (backdrop.scaleY * FRAME_WIDTH) / 2;

    expect(backdrop.x + halfWidth).toBeLessThanOrEqual(1920);
    expect(backdrop.x - halfWidth).toBeGreaterThanOrEqual(0);
    expect(backdrop.y - halfHeight).toBeGreaterThanOrEqual(0);
  });

  it("hides every line and the backdrop", () => {
    const arranged = arrange();

    arranged.tooltip.show(rolledCap(), "none", 400, 400);
    arranged.tooltip.hide();

    expect(arranged.backdrop.visible).toBe(false);
    expect(arranged.shownText()).toEqual([]);
  });
});

describe("the item under the pointer", () => {
  const arrangeGround = () => {
    const world = makeWorld({ seed: 1 });
    const picks = createPickPort(4, 4);
    const lay = (kind: "item" | "gold", minX: number): void => {
      const id = acquireGroundItem(world.state, kind, minX * 4, 0);
      const groundItem =
        id === null ? null : world.state.map.groundItems.resolve(id);

      if (id === null || groundItem === null) {
        throw new Error("The ground-item pool has room");
      }

      if (kind === "item") {
        groundItem.item.baseId = cap.id;
        groundItem.item.rarityId = rare.id;
      } else {
        groundItem.amount = 10;
      }

      writePick(picks.labels, id, minX, 100, minX + 80, 120);
    };

    lay("item", 100);
    lay("gold", 300);

    return { world, picks };
  };

  it("is an item's on a ground label, and none on gold's or on nothing", () => {
    const { world, picks } = arrangeGround();
    const sources = {
      world: world.view,
      screenItemAt: () => null,
      covers: () => false,
      labels: picks.labels,
    };

    expect(itemUnderPointer(sources, 140, 110)?.baseId).toBe(cap.id);
    expect(itemUnderPointer(sources, 340, 110)).toBeNull();
    expect(itemUnderPointer(sources, 140, 300)).toBeNull();
  });

  it("is a screen's item before a label's, and none on a label a screen covers", () => {
    const { world, picks } = arrangeGround();
    const onScreen = hallcrownItem();

    expect(
      itemUnderPointer(
        {
          world: world.view,
          screenItemAt: () => onScreen,
          covers: () => true,
          labels: picks.labels,
        },
        140,
        110,
      ),
    ).toBe(onScreen);
    expect(
      itemUnderPointer(
        {
          world: world.view,
          screenItemAt: () => null,
          covers: () => true,
          labels: picks.labels,
        },
        140,
        110,
      ),
    ).toBeNull();
  });
});
