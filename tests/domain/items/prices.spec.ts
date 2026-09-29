import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { Item } from "@domain/public";
import { priceOf, sellPriceOf } from "@domain/queries";
import { createItem } from "@domain/rules";
import { GLASS } from "../../helpers";

const content = {
  itemBases: contentRegistry.itemBases,
  rarities: contentRegistry.rarities,
  activeItems: [GLASS],
};

const itemOf = (
  baseId: string | null,
  rarityId: string | null,
  legendaryId: string | null = null,
): Item => {
  const item = createItem();

  item.baseId = baseId;
  item.rarityId = rarityId;
  item.legendaryId = legendaryId;

  return item;
};

describe("an item's price", () => {
  it("is its base's value times its rarity's price multiplier, as the item catalogue gives them", () => {
    expect(priceOf(content, itemOf("cap", "common"))).toBe(25);
    expect(priceOf(content, itemOf("cap", "rare"))).toBe(125);
    expect(priceOf(content, itemOf("band", "mythical"))).toBe(1600);
  });

  it("prices a Legendary piece on the base it is built on", () => {
    expect(priceOf(content, itemOf("band", "legendary", "rimecoil"))).toBe(
      2400,
    );
  });

  it("is nothing for a cleared item, or a part the content does not name", () => {
    expect(priceOf(content, createItem())).toBe(0);
    expect(priceOf(content, itemOf("crown", "rare"))).toBe(0);
    expect(priceOf(content, itemOf("cap", "shiny"))).toBe(0);
  });

  it("is an active item's price as its definition writes it, and sells for a quarter of it", () => {
    const glass = createItem();

    glass.activeId = GLASS.id;

    expect(priceOf(content, glass)).toBe(1800);
    expect(sellPriceOf(content, glass, 0.25)).toBe(450);
  });

  it("sells for its price times the sell fraction, rounded down", () => {
    expect(sellPriceOf(content, itemOf("cap", "rare"), 0.25)).toBe(31);
    expect(sellPriceOf(content, itemOf("cap", "common"), 0.25)).toBe(6);
    expect(sellPriceOf(content, createItem(), 0.25)).toBe(0);
  });
});
