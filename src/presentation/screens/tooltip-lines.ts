import type { Item } from "@domain/public";
import { ITEM_LINE_CAPACITY, levelRequirementOf } from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { itemBaseOf, legendaryOf, rarityOf } from "../views/ground-item.view";
import type { Label, LabelFactory } from "../views/quad";
import type { TooltipPrice } from "./tooltip-text";
import { priceText, statLineText } from "./tooltip-text";

/**
 * The size a tooltip's labels are made at. The atlas font's size is its glyph width, so this is
 * how wide one glyph is drawn, in pixels; a glyph is drawn this over its aspect tall.
 */
export const TOOLTIP_TEXT_SIZE = 16;

/**
 * The most lines a tooltip holds: the name, the rarity and base, the item level, the
 * requirement, every stat line an item holds, and the price.
 */
export const TOOLTIP_LINE_CAPACITY = 4 + ITEM_LINE_CAPACITY + 1;

/** The tint of every line but the name, of an unmet requirement, and of a price. */
export const TOOLTIP_TEXT_TINT = 0xd8d8d8;
export const UNMET_REQUIREMENT_TINT = 0xe04040;
export const PRICE_TINT = 0xf2c230;

const OPAQUE = 1;
const HALF = 0.5;

/** What a name reads when run scope cannot name the item: a content error still shows. */
const UNNAMED = "ITEM";

/**
 * A tooltip's lines: one label a line, made here once, and the builders that write an item's
 * lines into them in the order they are shown. Each builder is one line, so a line a kind of
 * item adds is one builder in its place. Every line is read from the item and run scope's
 * definitions, and the requirement is asked of the domain; it sums nothing.
 */
export class TooltipLines {
  private readonly labels: readonly Label[];

  /** How many labels the shown item fills, and its widest line in glyphs. */
  private count = 0;

  private widestGlyphs = 0;

  constructor(makeLabel: LabelFactory) {
    const labels: Label[] = [];

    for (let line = 0; line < TOOLTIP_LINE_CAPACITY; line += 1) {
      const label = makeLabel(TOOLTIP_TEXT_SIZE);

      label.alpha = OPAQUE;
      label.visible = false;
      labels.push(label);
    }

    this.labels = labels;
  }

  /** How many lines the shown item fills. */
  get lineCount(): number {
    return this.count;
  }

  /** The widest line the shown item fills, in glyphs. */
  get widest(): number {
    return this.widestGlyphs;
  }

  /**
   * Writes every line of `item` with this requirement mark and price, and shows the labels it
   * fills when `visible`, hiding the rest: the name in the rarity's tint, the rarity and the
   * base, the item level, the level requirement, each stat line in the order the item holds
   * them, and the price when there is one.
   */
  write(
    world: WorldView,
    item: DeepReadonly<Item>,
    met: boolean,
    price: TooltipPrice,
    gold: number,
    visible: boolean,
  ): void {
    const base = itemBaseOf(world, item.baseId);
    const rarity = rarityOf(world, item.rarityId);
    const piece = legendaryOf(world, item.legendaryId);
    const baseName = base === null ? UNNAMED : base.name.toUpperCase();
    const name = piece === null ? baseName : piece.name.toUpperCase();
    const rarityName = rarity === null ? "" : `${rarity.name.toUpperCase()} `;

    this.count = 0;
    this.widestGlyphs = 0;
    this.writeLine(name, rarity === null ? TOOLTIP_TEXT_TINT : rarity.tint);
    this.writeLine(`${rarityName}${baseName}`, TOOLTIP_TEXT_TINT);
    this.writeLine(`ITEM LEVEL ${String(item.itemLevel)}`, TOOLTIP_TEXT_TINT);
    this.writeLine(
      `REQUIRED LEVEL ${String(levelRequirementOf(world.run, item))}`,
      met ? TOOLTIP_TEXT_TINT : UNMET_REQUIREMENT_TINT,
    );

    for (let line = 0; line < item.lineCount; line += 1) {
      this.writeLine(statLineText(world, item, line), TOOLTIP_TEXT_TINT);
    }

    if (price !== "none") {
      this.writeLine(priceText(price, gold), PRICE_TINT);
    }

    this.setShown(visible);
  }

  /** Shows the labels the shown item fills, or hides every label. */
  setShown(visible: boolean): void {
    for (let line = 0; line < this.labels.length; line += 1) {
      const label = this.labels[line];

      if (label !== undefined) {
        label.visible = visible && line < this.count;
      }
    }
  }

  /** Puts the lines down the middle at `centreX`, the first `top` down, one `lineHeight` apart. */
  place(
    centreX: number,
    top: number,
    lineHeight: number,
    glyphHeight: number,
  ): void {
    for (let line = 0; line < this.count; line += 1) {
      const label = this.labels[line];

      if (label !== undefined) {
        label.x = centreX;
        label.y = top + line * lineHeight + glyphHeight * HALF;
      }
    }
  }

  /** Writes the next label, and keeps the widest line so far in glyphs. */
  private writeLine(text: string, tint: number): void {
    const label = this.labels[this.count];

    if (label === undefined) {
      return;
    }

    label.setText(text);
    label.tint = tint;
    this.count += 1;
    this.widestGlyphs = Math.max(this.widestGlyphs, text.length);
  }
}
