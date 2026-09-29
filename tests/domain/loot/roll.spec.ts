import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  DropRoll,
  EnemyTier,
  Item,
  ItemBaseDef,
  LootTableDef,
  UnitId,
} from "@domain/public";
import {
  createDropRoll,
  ITEM_LINE_CAPACITY,
  levelRequirementOf,
  meetsRequirement,
  rollDrop,
} from "@domain/queries";
import { dropOnDeath } from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import { createHasher, stateChecksum } from "@simulation/testing";
import { makeWorld, spawnEnemy } from "../../helpers";

/** Rolls per tier: enough that four standard deviations of any outcome's share is a few hundredths or less. */
const ROLLS = 10_000;

/** The Legendary piece the content holds, which a test pack names. */
const PIECE = "rimecoil";

/**
 * How far a share of `ROLLS` outcomes may land from its chance `p`: four standard deviations of
 * a binomial share, and one roll's worth, so an outcome of chance none or always must be exact.
 */
const toleranceOf = (p: number, n: number): number =>
  4 * Math.sqrt((p * (1 - p)) / n) + 1 / n;

const tableOf = (id: string): LootTableDef => {
  const table = contentRegistry.lootTables.find((entry) => entry.id === id);

  if (table === undefined) {
    throw new Error(`The content holds a ${id} loot table`);
  }

  return table;
};

/** How many affixes an item of `id` rolls, as the rarity table gives it. */
const affixCountOf = (id: string | null): number =>
  contentRegistry.rarities.find((rarity) => rarity.id === id)?.affixCount ?? 0;

/** The rarity table's index of `id`, which ranks one rarity above another. */
const rankOf = (id: string | null): number =>
  contentRegistry.rarities.findIndex((rarity) => rarity.id === id);

/** The cap, the base a test copies to make one the content does not hold. */
const capBase = (): ItemBaseDef => {
  const found = contentRegistry.itemBases.find((entry) => entry.id === "cap");

  if (found === undefined) {
    throw new Error("The content holds the cap");
  }

  return found;
};

const base = (id: string | null): { min: number; max: number } => {
  const found = contentRegistry.itemBases.find((entry) => entry.id === id);

  if (found === undefined) {
    throw new Error(`The content holds a base ${String(id)}`);
  }

  return found.implicit;
};

/** Every roll of `tier` under keys 0 to `ROLLS - 1` on a fresh world's first tick, each a copy of what it dropped. */
type Tally = {
  gold: number;
  goldAmounts: number[];
  health: number;
  mana: number;
  items: number[];
  rarities: Map<string, number>[];
  bases: Map<string, number>;
  legendaries: number;
  drops: DropRoll[];
};

const tally = (
  world: Simulation,
  tier: EnemyTier,
  legendaryId: string | null,
): Tally => {
  const out = createDropRoll();
  const result: Tally = {
    gold: 0,
    goldAmounts: [],
    health: 0,
    mana: 0,
    items: [0, 0],
    rarities: [new Map(), new Map()],
    bases: new Map(),
    legendaries: 0,
    drops: [],
  };

  for (let key = 0; key < ROLLS; key += 1) {
    rollDrop(world.view, tier, key, legendaryId, out);

    if (out.gold > 0) {
      result.gold += 1;
      result.goldAmounts.push(out.gold);
    }

    result.health += out.healthGlobes;
    result.mana += out.manaGlobes;
    result.legendaries += out.hasLegendary ? 1 : 0;

    for (let index = 0; index < out.itemCount; index += 1) {
      const item = out.items[index];

      if (item === undefined || item.rarityId === null) {
        continue;
      }

      const rarities = result.rarities[index];

      result.items[index] = (result.items[index] ?? 0) + 1;
      rarities?.set(item.rarityId, (rarities.get(item.rarityId) ?? 0) + 1);
      result.bases.set(
        String(item.baseId),
        (result.bases.get(String(item.baseId)) ?? 0) + 1,
      );
    }

    result.drops.push(structuredClone(out));
  }

  return result;
};

/** Every rarity's share of one item roll lands within the tolerance of its weight over the sum of the weights, times the roll's chance of dropping. */
const expectRaritiesByWeight = (
  counts: Map<string, number>,
  weights: readonly { rarity: string; weight: number }[],
  chance: number,
): void => {
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);

  for (const { rarity, weight } of weights) {
    const p = chance * (weight / total);
    const share = (counts.get(rarity) ?? 0) / ROLLS;

    expect(
      Math.abs(share - p),
      `${rarity}: ${String(share)} against ${String(p)}`,
    ).toBeLessThanOrEqual(toleranceOf(p, ROLLS));
  }
};

const expectShare = (count: number, p: number, what: string): void => {
  const share = count / ROLLS;

  expect(
    Math.abs(share - p),
    `${what}: ${String(share)} against ${String(p)}`,
  ).toBeLessThanOrEqual(toleranceOf(p, ROLLS));
};

describe("the loot roll", () => {
  const world = makeWorld({ seed: 11 });
  const level = world.view.map.level;

  describe.each(["normal", "elite", "boss"] as const)(
    "a %s enemy over 10 000 rolls",
    (tier) => {
      const table = tableOf(tier);
      const result = tally(world, tier, null);

      it("drops gold at its chance, each pile in the table's range at the item level", () => {
        expectShare(result.gold, table.goldChance, "gold");

        for (const amount of result.goldAmounts) {
          expect(amount).toBeGreaterThanOrEqual(
            Math.floor(table.goldMinPerLevel * level),
          );
          expect(amount).toBeLessThanOrEqual(
            Math.floor(table.goldMaxPerLevel * level),
          );
        }
      });

      it("drops each globe at its chance", () => {
        const health = table.healthGlobeChances.reduce((a, b) => a + b, 0);
        const mana = table.manaGlobeChances.reduce((a, b) => a + b, 0);

        expect(Math.abs(result.health / ROLLS - health)).toBeLessThanOrEqual(
          0.02 * table.healthGlobeChances.length,
        );
        expect(Math.abs(result.mana / ROLLS - mana)).toBeLessThanOrEqual(
          0.02 * table.manaGlobeChances.length,
        );
      });

      it("drops each item roll at its chance, and each rarity by its weight", () => {
        table.itemRolls.forEach((roll, index) => {
          const chance = index === 0 && tier !== "normal" ? 1 : roll.chance;

          expectShare(
            result.items[index] ?? 0,
            chance,
            `item roll ${String(index)}`,
          );
          expectRaritiesByWeight(
            result.rarities[index] ?? new Map<string, number>(),
            roll.weights,
            chance,
          );
        });
      });

      it("draws the base evenly among those the item level reaches, and its implicit in the base's range", () => {
        const reached = contentRegistry.itemBases.filter(
          (entry) => entry.qualityLevel <= level,
        );
        const items = result.items.reduce((a, b) => a + b, 0);

        for (const entry of reached) {
          const share = (result.bases.get(entry.id) ?? 0) / items;
          const p = 1 / reached.length;

          expect(Math.abs(share - p)).toBeLessThanOrEqual(
            toleranceOf(p, items),
          );
        }

        for (const drop of result.drops) {
          for (const item of drop.items.slice(0, drop.itemCount)) {
            const range = base(item.baseId);
            const implicit = item.lines[0];

            expect(item.itemLevel).toBe(level);
            expect(item.lineCount).toBe(1 + affixCountOf(item.rarityId));
            expect(implicit?.sourceId).toBe(item.baseId);
            expect(implicit?.value).toBeGreaterThanOrEqual(range.min);
            expect(implicit?.value).toBeLessThanOrEqual(range.max);
          }
        }
      });

      it("never drops a Legendary with no pack naming one", () => {
        expect(result.legendaries).toBe(0);
      });
    },
  );

  it("gives every elite roll an item", () => {
    const result = tally(world, "elite", null);

    expect(result.drops.every((drop) => drop.itemCount >= 1)).toBe(true);
  });

  it("gives every boss roll one item Rare or better", () => {
    const result = tally(world, "boss", null);
    const rare = rankOf("rare");

    for (const drop of result.drops) {
      const best = Math.max(
        ...drop.items
          .slice(0, drop.itemCount)
          .map((item) => rankOf(item.rarityId)),
      );

      expect(best).toBeGreaterThanOrEqual(rare);
    }
  });

  it("holds the elite and boss guarantees against a table tuned to drop nothing", () => {
    const tuned = makeWorld({ seed: 11 });

    for (const tier of ["elite", "boss"] as const) {
      const table = tableOf(tier);

      tuned.state.run.lootTables.set(tier, {
        ...table,
        itemRolls: table.itemRolls.map((roll) => ({
          chance: 0,
          weights: roll.weights.map((weight) => ({
            ...weight,
            weight: weight.rarity === "common" ? 1000 : weight.weight,
          })),
        })),
      });
    }

    const elite = tally(tuned, "elite", null);
    const boss = tally(tuned, "boss", null);

    expect(elite.drops.every((drop) => drop.itemCount === 1)).toBe(true);
    expect(
      boss.drops.every(
        (drop) =>
          drop.itemCount === 1 &&
          rankOf(drop.items[0]?.rarityId ?? null) >= rankOf("rare"),
      ),
    ).toBe(true);
  });

  it("reads a tuned chance clamped and a weight below zero as zero", () => {
    const tuned = makeWorld({ seed: 11 });
    const normal = tableOf("normal");

    tuned.state.run.lootTables.set("normal", {
      ...normal,
      goldChance: 2,
      healthGlobeChances: [-1],
      manaGlobeChances: [5],
      itemRolls: [
        {
          chance: 3,
          weights: [
            { rarity: "common", weight: -500 },
            { rarity: "rare", weight: 10 },
          ],
        },
      ],
    });

    const result = tally(tuned, "normal", null);

    expect(result.gold).toBe(ROLLS);
    expect(result.health).toBe(0);
    expect(result.mana).toBe(ROLLS);
    expect(result.items[0]).toBe(ROLLS);
    expect(result.rarities[0]?.get("rare")).toBe(ROLLS);
  });

  it("drops nothing from an item roll whose allowed weights sum to nothing", () => {
    const tuned = makeWorld({ seed: 11 });
    const normal = tableOf("normal");

    tuned.state.run.lootTables.set("normal", {
      ...normal,
      itemRolls: [{ chance: 1, weights: [{ rarity: "common", weight: 0 }] }],
    });

    expect(tally(tuned, "normal", null).items[0]).toBe(0);
  });

  it("drops a named boss's Legendary at the boss table's rate, and no other tier's", () => {
    const boss = tally(world, "boss", PIECE);

    expectShare(boss.legendaries, tableOf("boss").legendaryChance, "Legendary");
    expect(tally(world, "elite", PIECE).legendaries).toBe(0);
    expect(tally(world, "normal", PIECE).legendaries).toBe(0);

    const piece = boss.drops.find((drop) => drop.hasLegendary)?.legendary;

    expect(piece).toMatchObject({
      baseId: "band",
      rarityId: "legendary",
      legendaryId: PIECE,
      itemLevel: level,
      lineCount: 3,
    });
    expect(piece?.lines.slice(0, 3)).toEqual([
      { sourceId: PIECE, value: 0.5 },
      { sourceId: PIECE, value: 0.1 },
      { sourceId: PIECE, value: 30 },
    ]);
  });

  it("rolls the same drop for the same key on the same tick, and another for another key", () => {
    const first = createDropRoll();
    const second = createDropRoll();

    rollDrop(world.view, "boss", 42, PIECE, first);
    rollDrop(world.view, "boss", 42, PIECE, second);
    expect(second).toEqual(first);

    const keys = new Set<string>();

    for (let key = 0; key < 20; key += 1) {
      rollDrop(world.view, "normal", key, null, first);
      keys.add(JSON.stringify(first));
    }

    expect(keys.size).toBeGreaterThan(1);
  });

  it("writes nothing to the world it reads, as the panel's preview does", () => {
    const previewed = makeWorld({ seed: 3 });
    const hasher = createHasher();
    const before = stateChecksum(previewed.state, hasher);
    const out = createDropRoll();

    for (let key = 0; key < 100; key += 1) {
      rollDrop(previewed.view, "boss", key, PIECE, out);
    }

    expect(stateChecksum(previewed.state, hasher)).toBe(before);
    expect(previewed.events.cursor).toBe(0);
  });
});

describe("an item's level", () => {
  /** Every item level the rolls of `tier` under keys 0 to 199 drop at, the Legendary's included. */
  const itemLevelsOf = (world: Simulation, tier: EnemyTier): Set<number> => {
    const out = createDropRoll();
    const levels = new Set<number>();

    for (let key = 0; key < 200; key += 1) {
      rollDrop(world.view, tier, key, tier === "boss" ? PIECE : null, out);

      for (const item of out.items.slice(0, out.itemCount)) {
        levels.add(item.itemLevel);
      }

      if (out.hasLegendary) {
        levels.add(out.legendary.itemLevel);
      }
    }

    return levels;
  };

  it.each(["normal", "elite", "boss"] as const)(
    "is the map's level for a %s enemy, and the new level once the map's changes",
    (tier) => {
      const world = makeWorld({ seed: 5 });

      world.state.map.level = 3;
      expect([...itemLevelsOf(world, tier)]).toEqual([3]);

      world.state.map.level = 7;
      expect([...itemLevelsOf(world, tier)]).toEqual([7]);
    },
  );

  it("never drops a base whose quality level is above it, over 10 000 rolls a tier, and drops it once the level reaches it", () => {
    const world = makeWorld({ seed: 11 });

    world.state.run.itemBases = [
      ...contentRegistry.itemBases,
      { ...capBase(), id: "crown", qualityLevel: 5 },
    ];
    world.state.map.level = 4;

    for (const tier of ["normal", "elite", "boss"] as const) {
      expect(tally(world, tier, null).bases.get("crown")).toBeUndefined();
    }

    world.state.map.level = 5;
    expect(tally(world, "boss", null).bases.get("crown")).toBeGreaterThan(0);
  });
});

describe("an item's level requirement", () => {
  const content = {
    itemBases: contentRegistry.itemBases,
    affixes: contentRegistry.affixes,
    legendaries: contentRegistry.legendaries,
  };

  /** An item of `baseId` whose live lines come from `sources`, in order. */
  const itemOf = (
    baseId: string,
    legendaryId: string | null,
    sources: readonly string[],
  ): Item => ({
    baseId,
    rarityId: legendaryId === null ? "magic" : "legendary",
    legendaryId,
    activeId: null,
    itemLevel: 12,
    lines: Array.from({ length: ITEM_LINE_CAPACITY }, (_, line) => ({
      sourceId: sources[line] ?? null,
      value: line < sources.length ? 1 : 0,
    })),
    lineCount: sources.length,
  });

  it("is its base's requirement for a rolled item whose affixes ask no more", () => {
    const world = makeWorld({ seed: 11 });
    const out = createDropRoll();

    world.state.map.level = 1;

    for (let key = 0; key < 200; key += 1) {
      rollDrop(world.view, "boss", key, null, out);

      for (const item of out.items.slice(0, out.itemCount)) {
        const base = contentRegistry.itemBases.find(
          (entry) => entry.id === item.baseId,
        );

        expect(levelRequirementOf(world.view.run, item)).toBe(
          base?.requirement,
        );
      }
    }
  });

  it("is the highest of its base's and its affixes' requirements", () => {
    const item = itemOf("cap", null, [
      "cap",
      "health_1",
      "health_3",
      "armour_2",
    ]);

    expect(levelRequirementOf(content, item)).toBe(9);
    expect(meetsRequirement(content, item, 8)).toBe(false);
    expect(meetsRequirement(content, item, 9)).toBe(true);
  });

  it("is the base's when the base asks more than every affix", () => {
    const circlet = { ...capBase(), id: "circlet", requirement: 4 };
    const item = itemOf("circlet", null, ["circlet", "health_1"]);

    expect(levelRequirementOf({ ...content, itemBases: [circlet] }, item)).toBe(
      4,
    );
  });

  it("is a Legendary piece's own requirement, whatever its base asks", () => {
    const item = itemOf("band", PIECE, [PIECE, PIECE, PIECE]);

    expect(levelRequirementOf(content, item)).toBe(4);
  });

  it("asks nothing of a cleared item", () => {
    const cleared = itemOf("cap", null, []);

    cleared.baseId = null;
    cleared.rarityId = null;
    expect(levelRequirementOf(content, cleared)).toBe(0);
  });

  it("reads no line past the live ones", () => {
    const stale = itemOf("cap", null, ["cap", "health_3"]);

    stale.lineCount = 1;
    expect(levelRequirementOf(content, stale)).toBe(1);
  });
});

describe("a death's drop", () => {
  const dropsOf = (world: Simulation): number => {
    let live = 0;

    for (let index = 0; index < world.view.map.groundItems.end; index += 1) {
      live += world.view.map.groundItems.at(index) === null ? 0 : 1;
    }

    return live;
  };

  const idOfUnit = (world: Simulation, x: number): UnitId => {
    for (let index = 0; index < world.view.map.units.end; index += 1) {
      const unit = world.view.map.units.at(index);
      const id = world.view.map.units.idAt(index);

      if (unit !== null && id !== null && unit.curr.x === x) {
        return id;
      }
    }

    throw new Error("The spawned unit is live");
  };

  it("drops nothing from an add, an imp its summoner owns", () => {
    const world = makeWorld({ seed: 5 });
    const summoner = spawnEnemy(world, {
      definitionId: "summoner",
      x: 200,
      y: 0,
    });
    const imp = spawnEnemy(world, { definitionId: "imp", x: 300, y: 0 });

    summoner.tier = "elite";
    imp.tier = "elite";
    imp.summon.ownerId = idOfUnit(world, 200);
    dropOnDeath(world.state, imp, idOfUnit(world, 300));
    expect(dropsOf(world)).toBe(0);

    dropOnDeath(world.state, summoner, idOfUnit(world, 200));
    expect(dropsOf(world)).toBeGreaterThan(0);
  });
});
