import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { AffixDef, DropRoll, EnemyTier, Item } from "@domain/public";
import { createDropRoll, levelRequirementOf, rollDrop } from "@domain/queries";
import type { Simulation } from "@simulation/testing";
import { makeRegistry, makeWorld } from "../../helpers";

/** Keys rolled per case: enough that every rarity of the boss's first roll comes up. */
const KEYS = 2_000;

/** The Legendary piece the content holds. */
const PIECE = "rimecoil";

/** The highest affix level a tier of the content asks. */
const TOP_AFFIX_LEVEL = Math.max(
  ...contentRegistry.affixes.map((affix) => affix.affixLevel),
);

const affixOf = (id: string | null): AffixDef => {
  const affix = contentRegistry.affixes.find((each) => each.id === id);

  if (affix === undefined) {
    throw new Error(`The content holds the affix ${String(id)}`);
  }

  return affix;
};

const slotOf = (baseId: string | null): string => {
  const base = contentRegistry.itemBases.find((each) => each.id === baseId);

  if (base === undefined) {
    throw new Error(`The content holds the base ${String(baseId)}`);
  }

  return base.armorySlot;
};

const affixCountOf = (rarityId: string | null): number =>
  contentRegistry.rarities.find((rarity) => rarity.id === rarityId)
    ?.affixCount ?? 0;

/** A copy of every item the drops of `tier` under keys 0 to `KEYS - 1` make at map level `level`, on a world's first tick. */
const rolledItems = (
  world: Simulation,
  tier: EnemyTier,
  level: number,
): Item[] => {
  const out = createDropRoll();
  const items: Item[] = [];

  world.state.map.level = level;

  for (let key = 0; key < KEYS; key += 1) {
    rollDrop(world.view, tier, key, null, out);
    items.push(...structuredClone(out.items.slice(0, out.itemCount)));
  }

  return items;
};

/** The affix lines of `item`, those after its implicit. */
const affixLinesOf = (item: Item): Item["lines"] =>
  item.lines.slice(1, item.lineCount);

/** How many hundredths, tenths, or whole numbers a value of `affix` rolls in, as the catalogue gives it. */
const stepOf = (affix: AffixDef): number => {
  if (affix.kind === "percent") {
    return 0.01;
  }

  switch (affix.stat) {
    case "health_regen":
    case "mana_regen":
    case "cooldown_reduction":
      return 0.1;
    case "magic_damage":
    case "magic_resistance":
      return 0.01;
    default:
      return 1;
  }
};

describe("an item's affixes", () => {
  const world = makeWorld({ seed: 23 });

  describe.each([1, 4, 5, 9, TOP_AFFIX_LEVEL])("at item level %i", (level) => {
    const items = [
      ...rolledItems(world, "boss", level),
      ...rolledItems(world, "elite", level),
    ];

    it("number what the item's rarity gives, every rarity Common to Mythical rolled", () => {
      const rarities = new Set(items.map((item) => item.rarityId));

      expect(rarities).toEqual(
        new Set(["common", "uncommon", "rare", "epic", "imperial", "mythical"]),
      );

      for (const item of items) {
        expect(item.lineCount, String(item.rarityId)).toBe(
          1 + affixCountOf(item.rarityId),
        );
      }
    });

    it("never name one stat twice", () => {
      for (const item of items) {
        const stats = affixLinesOf(item).map(
          (line) => affixOf(line.sourceId).stat,
        );

        expect(new Set(stats).size).toBe(stats.length);
      }
    });

    it("are each a tier the item level reaches, the rarity allows, and the slot rolls", () => {
      for (const item of items) {
        for (const line of affixLinesOf(item)) {
          const affix = affixOf(line.sourceId);

          expect(affix.affixLevel).toBeLessThanOrEqual(level);
          expect(affix.rarities).toContain(item.rarityId);
          expect(affix.armorySlots).toContain(slotOf(item.baseId));
        }
      }
    });

    it("roll each value in its tier's range, on the step its stat rolls in", () => {
      for (const item of items) {
        for (const line of affixLinesOf(item)) {
          const affix = affixOf(line.sourceId);
          const steps = line.value / stepOf(affix);

          expect(line.value).toBeGreaterThanOrEqual(affix.min);
          expect(line.value).toBeLessThanOrEqual(affix.max);
          expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-9);
        }
      }
    });

    it("make the level requirement the highest of the base's and theirs", () => {
      for (const item of items) {
        const base = contentRegistry.itemBases.find(
          (each) => each.id === item.baseId,
        );
        const highest = Math.max(
          base?.requirement ?? 0,
          ...affixLinesOf(item).map(
            (line) => affixOf(line.sourceId).requirement,
          ),
        );

        expect(levelRequirementOf(world.view.run, item)).toBe(highest);
      }
    });
  });

  it("reach every tier the content's slots roll once the item level reaches the top affix level, and none above it before", () => {
    const slots = new Set(
      contentRegistry.itemBases.map((base) => base.armorySlot),
    );
    const low = rolledItems(world, "boss", 4).flatMap(affixLinesOf);
    const high = rolledItems(world, "boss", TOP_AFFIX_LEVEL).flatMap(
      affixLinesOf,
    );
    const tiersOf = (lines: Item["lines"]): Set<string | null> =>
      new Set(lines.map((line) => line.sourceId));

    expect(tiersOf(high)).toEqual(
      new Set(
        contentRegistry.affixes
          .filter((affix) => affix.armorySlots.some((slot) => slots.has(slot)))
          .map((affix) => affix.id),
      ),
    );
    expect(tiersOf(low)).not.toContain("health_2");
    expect(tiersOf(low)).toContain("cooldown_reduction_1");
    expect(
      rolledItems(world, "boss", 3)
        .flatMap(affixLinesOf)
        .some((line) => line.sourceId === "cooldown_reduction_1"),
    ).toBe(false);
  });

  it("are rolled the same for the same key on the same tick, and otherwise for another key", () => {
    const first = createDropRoll();
    const second = createDropRoll();

    world.state.map.level = TOP_AFFIX_LEVEL;
    rollDrop(world.view, "boss", 41, null, first);
    rollDrop(world.view, "boss", 41, null, second);

    expect(second).toEqual(first);

    rollDrop(world.view, "boss", 42, null, second);

    expect(second.items).not.toEqual(first.items);
  });

  it("are none with the affix table emptied, every item its base and implicit alone", () => {
    const emptied = makeWorld({
      seed: 23,
      registry: makeRegistry({ affixes: [] }),
    });

    for (const item of rolledItems(emptied, "boss", TOP_AFFIX_LEVEL)) {
      expect(item.lineCount).toBe(1);
    }
  });

  it("leave the rarity, the base, and the implicit what they are with the affix table emptied", () => {
    const emptied = makeWorld({
      seed: 23,
      registry: makeRegistry({ affixes: [] }),
    });
    const on = rolledItems(world, "boss", TOP_AFFIX_LEVEL);
    const off = rolledItems(emptied, "boss", TOP_AFFIX_LEVEL);
    const bare = (item: Item) => ({
      baseId: item.baseId,
      rarityId: item.rarityId,
      itemLevel: item.itemLevel,
      implicit: item.lines[0],
    });

    expect(off.map(bare)).toEqual(on.map(bare));
  });
});

describe("a Legendary's lines", () => {
  const legendaryOf = (world: Simulation): DropRoll => {
    const out = createDropRoll();

    for (let key = 0; key < KEYS; key += 1) {
      rollDrop(world.view, "boss", key, PIECE, out);

      if (out.hasLegendary) {
        return out;
      }
    }

    throw new Error("A boss drops its Legendary within the keys rolled");
  };

  it("are its piece's fixed lines copied in, and nothing rolled", () => {
    const world = makeWorld({ seed: 23 });
    const piece = contentRegistry.legendaries.find((each) => each.id === PIECE);
    const { legendary } = legendaryOf(world);

    expect(legendary.rarityId).toBe("legendary");
    expect(legendary.legendaryId).toBe(PIECE);
    expect(legendary.lineCount).toBe(piece?.lines.length);
    expect(
      legendary.lines.slice(0, legendary.lineCount).map((line) => line.value),
    ).toEqual(piece?.lines.map((line) => line.value));
    expect(
      legendary.lines
        .slice(0, legendary.lineCount)
        .every((line) => line.sourceId === PIECE),
    ).toBe(true);
    expect(levelRequirementOf(world.view.run, legendary)).toBe(
      piece?.requirement,
    );
  });

  it("are the same with the affix table emptied", () => {
    const on = legendaryOf(makeWorld({ seed: 23 }));
    const off = legendaryOf(
      makeWorld({ seed: 23, registry: makeRegistry({ affixes: [] }) }),
    );

    expect(off.legendary).toEqual(on.legendary);
  });
});
