import type { Item, Unit } from "@domain/public";
import {
  ITEM_LINE_CAPACITY,
  levelRequirementOf,
  meetsRequirement,
  priceOf,
  readTunable,
  sellPriceOf,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { HUD_HEIGHT, HUD_WIDTH } from "../hud/hud-layout";
import type { PickList } from "../input/input-ports";
import { topPickAt } from "../input/input-ports";
import { itemBaseOf, legendaryOf, rarityOf } from "../views/ground-item.view";
import type {
  FrameSizes,
  Label,
  LabelFactory,
  Quad,
  QuadFactory,
} from "../views/quad";
import { placeQuad, SCREEN_FRAME } from "./screen-parts";
import type { TooltipPrice } from "./tooltip-text";
import { priceText, statLineText } from "./tooltip-text";

export type { TooltipPrice } from "./tooltip-text";

/**
 * The size a tooltip's labels are made at. The atlas font's size is its glyph width, so this is
 * how wide one glyph is drawn, in pixels; a glyph is drawn this over its aspect tall.
 */
export const TOOLTIP_TEXT_SIZE = 16;

/** The gap between two of a tooltip's lines, in pixels. */
const LINE_GAP = 4;

/** The space between the text and the backdrop's edge, and between the pointer and the backdrop, in pixels. */
const PADDING = 12;
const POINTER_OFFSET = 16;

/**
 * The most lines a tooltip holds: the name, the rarity and base, the item level, the
 * requirement, every stat line an item holds, and the price.
 */
export const TOOLTIP_LINE_CAPACITY = 4 + ITEM_LINE_CAPACITY + 1;

const BACKDROP_TINT = 0x0a0a0a;
const BACKDROP_ALPHA = 0.92;
const OPAQUE = 1;
const HALF = 0.5;

/** The tint of every line but the name, of an unmet requirement, and of a price. */
export const TOOLTIP_TEXT_TINT = 0xd8d8d8;
export const UNMET_REQUIREMENT_TINT = 0xe04040;
export const PRICE_TINT = 0xf2c230;

/** What a name reads when run scope cannot name the item: a content error still shows. */
const UNNAMED = "ITEM";

/** What the pointer can be over that has a tooltip: the item a screen shows there, else an item's label on the ground. */
export type TooltipSources = Readonly<{
  world: WorldView;
  /** The item a screen shows at (`x`, `y`), or `null`; asked first, since a screen draws over the ground. */
  screenItemAt: (x: number, y: number) => DeepReadonly<Item> | null;
  /** Whether a screen or the bar covers (`x`, `y`), so the ground under it is hidden from the pointer. */
  covers: (x: number, y: number) => boolean;
  /** The ground labels drawn this frame, on the canvas. */
  labels: Readonly<PickList>;
}>;

/**
 * The item whose tooltip the pointer at (`x`, `y`) asks for: the one a screen shows there,
 * else, where nothing on the canvas covers the ground, the item whose label is drawn on top
 * there. Gold and globes have no tooltip. Reads only; allocates nothing.
 */
export const itemUnderPointer = (
  sources: TooltipSources,
  x: number,
  y: number,
): DeepReadonly<Item> | null => {
  const onScreen = sources.screenItemAt(x, y);

  if (onScreen !== null) {
    return onScreen;
  }

  if (sources.covers(x, y)) {
    return null;
  }

  const id = topPickAt(sources.labels, x, y);
  const groundItem =
    id === null ? null : sources.world.map.groundItems.resolve(id);

  return groundItem === null || groundItem.kind !== "item"
    ? null
    : groundItem.item;
};

/** Everything the tooltip is built over: the HUD scene's factories for the band over the screens, the world view, and a glyph's width over its height. */
export type TooltipPorts = Readonly<{
  makeQuad: QuadFactory;
  makeLabel: LabelFactory;
  frameSizes: FrameSizes;
  world: WorldView;
  glyphAspect: number;
}>;

/**
 * The tooltip over an item on a screen or a ground label, drawn in the band over the screens:
 * a backdrop and one label a line. It shows the name in the rarity's tint, the rarity and the
 * base, the item level, the level requirement, marked when above the hero's level, each stat
 * line in the order the item holds them, the implicit first, and, while a store is open, the
 * price or the sell price. Every line is read from the item and run scope's definitions, and
 * the requirement and prices are asked of the domain; it sums nothing.
 *
 * The text is written only when what it shows changes: another item, the hero's level crossing
 * the requirement, or the price. Following the pointer moves the backdrop and the labels and
 * allocates nothing. Everything it shows is made here, once.
 */
export class Tooltip {
  private readonly world: WorldView;

  private readonly backdrop: Quad;

  private readonly lines: readonly Label[];

  /** How tall one glyph is drawn, and how far one line is below the last, in pixels, and the backdrop frame's baked width. */
  private readonly glyphHeight: number;

  private readonly lineHeight: number;

  private readonly frameSize: number;

  /** What the labels show now: the item's fields, copied so a change of item under the same pointer is seen. */
  private shownBaseId: string | null = null;

  private shownRarityId: string | null = null;

  private shownLegendaryId: string | null = null;

  private shownItemLevel = 0;

  private shownLineCount = 0;

  private readonly shownSources: (string | null)[] = [];

  private readonly shownValues: number[] = [];

  private shownMet = true;

  private shownPrice: TooltipPrice = "none";

  private shownGold = 0;

  /** How many labels the shown item fills, and how wide and tall the backdrop is, in pixels. */
  private lineCount = 0;

  private width = 0;

  private height = 0;

  private visible = false;

  constructor(ports: TooltipPorts) {
    const lines: Label[] = [];

    this.world = ports.world;
    this.glyphHeight = TOOLTIP_TEXT_SIZE / ports.glyphAspect;
    this.lineHeight = this.glyphHeight + LINE_GAP;
    this.frameSize = ports.frameSizes(SCREEN_FRAME);
    this.backdrop = ports.makeQuad(SCREEN_FRAME);
    this.backdrop.tint = BACKDROP_TINT;
    this.backdrop.alpha = BACKDROP_ALPHA;
    this.backdrop.visible = false;

    for (let line = 0; line < TOOLTIP_LINE_CAPACITY; line += 1) {
      const label = ports.makeLabel(TOOLTIP_TEXT_SIZE);

      label.alpha = OPAQUE;
      label.visible = false;
      lines.push(label);
    }

    for (let line = 0; line < ITEM_LINE_CAPACITY; line += 1) {
      this.shownSources.push(null);
      this.shownValues.push(0);
    }

    this.lines = lines;
  }

  /** Whether it is drawn. */
  get shown(): boolean {
    return this.visible;
  }

  /**
   * Shows `item`'s tooltip beside the pointer at (`x`, `y`), kept on the canvas, with `price`
   * under its lines. Rewrites the text only when what it shows changed since the last call.
   */
  show(
    item: DeepReadonly<Item>,
    price: TooltipPrice,
    x: number,
    y: number,
  ): void {
    const world = this.world;
    const hero = heroOf(world);
    const met =
      hero === null ||
      meetsRequirement(world.run, item, hero.progression.level);
    const gold = this.goldOf(item, price);

    if (!this.showing(item, met, price, gold)) {
      this.remember(item, met, price, gold);
      this.write(item, met, price, gold);
    }

    this.place(x, y);

    if (!this.visible) {
      this.visible = true;
      this.backdrop.visible = true;

      for (let line = 0; line < this.lines.length; line += 1) {
        const label = this.lines[line];

        if (label !== undefined) {
          label.visible = line < this.lineCount;
        }
      }
    }
  }

  hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.backdrop.visible = false;

    for (let line = 0; line < this.lines.length; line += 1) {
      const label = this.lines[line];

      if (label !== undefined) {
        label.visible = false;
      }
    }
  }

  /** The gold the price line names, asked of the domain, or 0 with no price line. */
  private goldOf(item: DeepReadonly<Item>, price: TooltipPrice): number {
    const run = this.world.run;

    switch (price) {
      case "none":
        return 0;

      case "buy":
        return priceOf(run, item);

      case "sell":
        return sellPriceOf(
          run,
          item,
          readTunable(run.tuning, "store_sell_fraction"),
        );
    }
  }

  /** Whether the labels already show `item` with this requirement mark and price. */
  private showing(
    item: DeepReadonly<Item>,
    met: boolean,
    price: TooltipPrice,
    gold: number,
  ): boolean {
    if (
      this.lineCount === 0 ||
      item.baseId !== this.shownBaseId ||
      item.rarityId !== this.shownRarityId ||
      item.legendaryId !== this.shownLegendaryId ||
      item.itemLevel !== this.shownItemLevel ||
      item.lineCount !== this.shownLineCount ||
      met !== this.shownMet ||
      price !== this.shownPrice ||
      gold !== this.shownGold
    ) {
      return false;
    }

    for (let line = 0; line < item.lineCount; line += 1) {
      const held = item.lines[line];

      if (
        held === undefined ||
        held.sourceId !== this.shownSources[line] ||
        held.value !== this.shownValues[line]
      ) {
        return false;
      }
    }

    return true;
  }

  private remember(
    item: DeepReadonly<Item>,
    met: boolean,
    price: TooltipPrice,
    gold: number,
  ): void {
    this.shownBaseId = item.baseId;
    this.shownRarityId = item.rarityId;
    this.shownLegendaryId = item.legendaryId;
    this.shownItemLevel = item.itemLevel;
    this.shownLineCount = item.lineCount;
    this.shownMet = met;
    this.shownPrice = price;
    this.shownGold = gold;

    for (let line = 0; line < this.shownSources.length; line += 1) {
      const held = item.lines[line];

      this.shownSources[line] = held === undefined ? null : held.sourceId;
      this.shownValues[line] = held === undefined ? 0 : held.value;
    }
  }

  /** Writes every line's text and tint, hides the labels past the last, and sizes the backdrop to the widest. */
  private write(
    item: DeepReadonly<Item>,
    met: boolean,
    price: TooltipPrice,
    gold: number,
  ): void {
    const world = this.world;
    const base = itemBaseOf(world, item.baseId);
    const rarity = rarityOf(world, item.rarityId);
    const piece = legendaryOf(world, item.legendaryId);
    const baseName = base === null ? UNNAMED : base.name.toUpperCase();
    const name = piece === null ? baseName : piece.name.toUpperCase();
    const rarityName = rarity === null ? "" : `${rarity.name.toUpperCase()} `;
    let widest = 0;

    this.lineCount = 0;
    widest = this.writeLine(
      name,
      rarity === null ? TOOLTIP_TEXT_TINT : rarity.tint,
      widest,
    );
    widest = this.writeLine(
      `${rarityName}${baseName}`,
      TOOLTIP_TEXT_TINT,
      widest,
    );
    widest = this.writeLine(
      `ITEM LEVEL ${String(item.itemLevel)}`,
      TOOLTIP_TEXT_TINT,
      widest,
    );
    widest = this.writeLine(
      `REQUIRED LEVEL ${String(levelRequirementOf(world.run, item))}`,
      met ? TOOLTIP_TEXT_TINT : UNMET_REQUIREMENT_TINT,
      widest,
    );

    for (let line = 0; line < item.lineCount; line += 1) {
      widest = this.writeLine(
        statLineText(world, item, line),
        TOOLTIP_TEXT_TINT,
        widest,
      );
    }

    if (price !== "none") {
      widest = this.writeLine(priceText(price, gold), PRICE_TINT, widest);
    }

    for (let line = 0; line < this.lines.length; line += 1) {
      const label = this.lines[line];

      if (label !== undefined) {
        label.visible = this.visible && line < this.lineCount;
      }
    }

    this.width = widest * TOOLTIP_TEXT_SIZE + PADDING * 2;
    this.height = this.lineCount * this.lineHeight - LINE_GAP + PADDING * 2;
    this.backdrop.scaleX = this.width / this.frameSize;
    this.backdrop.scaleY = this.height / this.frameSize;
  }

  /** Writes the next label, and returns the widest line so far in glyphs. */
  private writeLine(text: string, tint: number, widest: number): number {
    const label = this.lines[this.lineCount];

    if (label === undefined) {
      return widest;
    }

    label.setText(text);
    label.tint = tint;
    this.lineCount += 1;

    return Math.max(widest, text.length);
  }

  /**
   * Puts the backdrop above and to the right of the pointer, flipped to the left or below
   * where the canvas would cut it, and the lines down its middle.
   */
  private place(x: number, y: number): void {
    let left = x + POINTER_OFFSET;
    let top = y - POINTER_OFFSET - this.height;

    if (left + this.width > HUD_WIDTH) {
      left = x - POINTER_OFFSET - this.width;
    }

    if (top < 0) {
      top = y + POINTER_OFFSET;
    }

    left = Math.max(0, Math.min(left, HUD_WIDTH - this.width));
    top = Math.max(0, Math.min(top, HUD_HEIGHT - this.height));

    const centreX = left + this.width * HALF;

    placeQuad(
      this.backdrop,
      centreX,
      top + this.height * HALF,
      this.width / this.frameSize,
      this.height / this.frameSize,
    );

    for (let line = 0; line < this.lineCount; line += 1) {
      const label = this.lines[line];

      if (label !== undefined) {
        label.x = centreX;
        label.y =
          top + PADDING + line * this.lineHeight + this.glyphHeight * HALF;
      }
    }
  }
}

/** The hero the world view holds, or `null`. */
const heroOf = (world: WorldView): DeepReadonly<Unit> | null => {
  const heroId = world.run.heroId;

  return heroId === null ? null : world.map.units.resolve(heroId);
};
