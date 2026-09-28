import type { DropRoll, EnemyTier } from "@domain/public";
import { rollDrop } from "@domain/queries";
import type { WorldView } from "@simulation/public";

/**
 * What a loot table's preview counted over its rolls: the gold piles and the gold in them, the
 * globes, the items by rarity, the Legendary pieces, and the drops by the rarest item each
 * held, so a boss's promise of one item Rare or better reads as no drop's rarest below Rare.
 * Every rarity is counted by its index in the run's rarity table, commonest first.
 */
export type LootPreview = Readonly<{
  tier: EnemyTier;
  count: number;
  itemLevel: number;
  goldPiles: number;
  gold: number;
  healthGlobes: number;
  manaGlobes: number;
  /** Items by rarity index, the Legendary piece among them. */
  items: readonly number[];
  /** Drops by the rarity index of the rarest item they held. */
  rarest: readonly number[];
  /** Drops that held no item. */
  empty: number;
  legendaries: number;
}>;

/** The index of rarity `id` in `rarities`, or `-1` for none. */
const rarityIndex = (
  rarities: readonly Readonly<{ id: string }>[],
  id: string | null,
): number => rarities.findIndex((rarity): boolean => rarity.id === id);

/**
 * Rolls what `count` enemies of `tier` would drop on the world's tick at the map's level, keys
 * 0 up to `count`, through the one roll a death makes, into `out`, and counts it. The keys are
 * not units' ids, so a preview shows a table's spread, never what a standing enemy will drop.
 * No pack names a Legendary piece here, so a boss's piece is never among them. A pure read of
 * the view: it writes nothing to the world and sends no command.
 */
export const previewLoot = (
  view: WorldView,
  tier: EnemyTier,
  count: number,
  out: DropRoll,
): LootPreview => {
  const rarities = view.run.rarities;
  const items = rarities.map((): number => 0);
  const rarest = rarities.map((): number => 0);
  let goldPiles = 0;
  let gold = 0;
  let healthGlobes = 0;
  let manaGlobes = 0;
  let empty = 0;
  let legendaries = 0;

  for (let key = 0; key < count; key += 1) {
    rollDrop(view, tier, key, null, out);

    if (out.gold > 0) {
      goldPiles += 1;
      gold += out.gold;
    }

    healthGlobes += out.healthGlobes;
    manaGlobes += out.manaGlobes;

    let best = -1;

    for (let index = 0; index < out.itemCount; index += 1) {
      const rarity = rarityIndex(rarities, out.items[index]?.rarityId ?? null);

      if (rarity !== -1) {
        items[rarity] = (items[rarity] ?? 0) + 1;
        best = Math.max(best, rarity);
      }
    }

    if (out.hasLegendary) {
      const rarity = rarityIndex(rarities, out.legendary.rarityId);

      legendaries += 1;

      if (rarity !== -1) {
        items[rarity] = (items[rarity] ?? 0) + 1;
        best = Math.max(best, rarity);
      }
    }

    if (best === -1) {
      empty += 1;
    } else {
      rarest[best] = (rarest[best] ?? 0) + 1;
    }
  }

  return {
    tier,
    count,
    itemLevel: view.map.level,
    goldPiles,
    gold,
    healthGlobes,
    manaGlobes,
    items,
    rarest,
    empty,
    legendaries,
  };
};

/** `name n` for every rarity counted at least once, commonest first, or `none`. */
const countsText = (
  rarities: readonly Readonly<{ name: string }>[],
  counts: readonly number[],
): string => {
  const parts: string[] = [];

  counts.forEach((count, index): void => {
    const rarity = rarities[index];

    if (count > 0 && rarity !== undefined) {
      parts.push(`${rarity.name} ${String(count)}`);
    }
  });

  return parts.length === 0 ? "none" : parts.join(", ");
};

/** The preview as the panel shows it, a line per count, the rarities named as the run's table names them. */
export const previewText = (view: WorldView, preview: LootPreview): string => {
  const rarities = view.run.rarities;

  return [
    `${String(preview.count)} ${preview.tier} drops at level ${String(preview.itemLevel)}`,
    `Gold: ${String(preview.goldPiles)} piles, ${String(preview.gold)} in all`,
    `Globes: ${String(preview.healthGlobes)} health, ${String(preview.manaGlobes)} mana`,
    `Items: ${countsText(rarities, preview.items)}`,
    `Rarest per drop: ${countsText(rarities, preview.rarest)}, no item ${String(preview.empty)}`,
    `Legendary pieces: ${String(preview.legendaries)}`,
  ].join("\n");
};
