import type { Item, Stat } from "@domain/public";
import { isPercentLine, lineSourceOf } from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";

/**
 * Which price a tooltip shows under an item's lines: none while no store is open, the price of
 * an item the store sells, or the sell price of one the hero holds.
 */
export type TooltipPrice = "none" | "buy" | "sell";

/** How a stat line names its stat, upper-cased as the atlas font holds only capitals. */
const STAT_WORDS: Readonly<Record<Stat, string>> = {
  movement_speed: "MOVEMENT SPEED",
  attack_damage: "ATTACK DAMAGE",
  cooldown_reduction: "COOLDOWN REDUCTION",
  magic_damage: "MAGIC DAMAGE",
  max_health: "MAXIMUM HEALTH",
  health_regen: "HEALTH REGENERATION",
  max_mana: "MAXIMUM MANA",
  mana_regen: "MANA REGENERATION",
  armour: "ARMOUR",
  attack_speed: "ATTACK SPEED",
  magic_resistance: "MAGIC RESISTANCE",
};

/** A percentage is held as a fraction of one; it is shown in hundredths, rounded to two places so a fraction's float noise never shows. */
const PERCENT = 100;
const ROUNDING = 100;

const shownNumber = (value: number): string => {
  const rounded = Math.round(value * ROUNDING) / ROUNDING;

  return rounded < 0 ? String(rounded) : `+${String(rounded)}`;
};

/**
 * One stat line as the tooltip shows it: its value as the item holds it, in the designer's
 * units, and its stat's words, with a percentage in hundredths and its sign, as the item
 * catalogue writes each affix on screen. A line whose source the content does not hold reads
 * as its value alone.
 */
export const statLineText = (
  world: WorldView,
  item: DeepReadonly<Item>,
  line: number,
): string => {
  const value = item.lines[line]?.value ?? 0;
  const source = lineSourceOf(world.run, item, line);

  if (source === null) {
    return shownNumber(value);
  }

  return isPercentLine(source)
    ? `${shownNumber(value * PERCENT)}% ${STAT_WORDS[source.stat]}`
    : `${shownNumber(value)} ${STAT_WORDS[source.stat]}`;
};

/** The words of the price line: what the store asks, or what it gives. */
export const priceText = (price: TooltipPrice, gold: number): string =>
  price === "sell"
    ? `SELL FOR ${String(gold)} GOLD`
    : `PRICE ${String(gold)} GOLD`;
