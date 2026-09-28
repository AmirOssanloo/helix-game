import type { AffixDef } from "../definitions/affix-def";
import { ITEM_LINE_CAPACITY } from "../definitions/item-base-def";
import type { ArmorySlot } from "../definitions/item-base-def";
import type { StatusModifierKind } from "../definitions/status-def";
import type { Stat } from "../entities/unit-tables";
import type { Item } from "../items/item";
import type { DrawPurpose, DrawWorld } from "../random/keyed-draw";
import { KEYED_DRAW_RANGE, keyedDraw } from "../random/keyed-draw";

/** What an affix roll reads of a world beside the draw: the affixes as written. */
export type AffixRollWorld = Readonly<{
  tick: DrawWorld["tick"];
  run: DrawWorld["run"] & Readonly<{ affixes: readonly AffixDef[] }>;
}>;

/** The purposes one source of items draws each affix's stat, its tier, and its value under. */
export type AffixRollPurposes = Readonly<{
  affix: DrawPurpose;
  affixTier: DrawPurpose;
  lineValue: DrawPurpose;
}>;

/** An even pick among `count` by `draw`: an integer in [0, `count`). */
export const pickAmong = (draw: number, count: number): number =>
  Math.floor((draw * count) / KEYED_DRAW_RANGE);

/**
 * How many decimal places a flat line of each stat rolls to, as the item catalogue gives them:
 * a whole-number stat in whole numbers, a regeneration and a cooldown in tenths, and a stat
 * read as a fraction of one in hundredths, a whole percent. A percentage line of any stat is a
 * fraction of one and rolls in hundredths.
 */
const FLAT_ROLL_PLACES: Readonly<Record<Stat, number>> = {
  movement_speed: 0,
  attack_damage: 0,
  cooldown_reduction: 1,
  magic_damage: 2,
  max_health: 0,
  health_regen: 1,
  max_mana: 0,
  mana_regen: 1,
  armour: 0,
  attack_speed: 0,
  magic_resistance: 2,
};

const PERCENT_ROLL_PLACES = 2;

/** Tolerates the binary error of a decimal bound scaled to whole steps, such as 0.3 × 10. */
const STEP_EPSILON = 1e-9;

/**
 * A value in `[min, max]` by `draw`, evenly among the steps the stat rolls in, so a range of
 * +10 to 20 maximum health rolls one of its eleven whole numbers. A range narrower than one
 * step rolls its least bound.
 */
export const rollLineValue = (
  stat: Stat,
  kind: StatusModifierKind,
  min: number,
  max: number,
  draw: number,
): number => {
  const scale =
    10 ** (kind === "flat" ? FLAT_ROLL_PLACES[stat] : PERCENT_ROLL_PLACES);
  const least = Math.ceil(min * scale - STEP_EPSILON);
  const greatest = Math.floor(max * scale + STEP_EPSILON);

  if (greatest < least) {
    return min;
  }

  return (least + pickAmong(draw, greatest - least + 1)) / scale;
};

/** The affix `id`, or `null` for one the content does not hold. */
const affixById = (
  affixes: readonly AffixDef[],
  id: string | null,
): AffixDef | null => {
  for (let index = 0; index < affixes.length; index += 1) {
    const affix = affixes[index];

    if (affix !== undefined && affix.id === id) {
      return affix;
    }
  }

  return null;
};

/** Whether one of `item`'s affix lines, those after its implicit, names an affix of `stat`. */
const carriesAffixStat = (
  affixes: readonly AffixDef[],
  item: Readonly<Item>,
  stat: Stat,
): boolean => {
  for (let line = 1; line < item.lineCount; line += 1) {
    if (affixById(affixes, item.lines[line]?.sourceId ?? null)?.stat === stat) {
      return true;
    }
  }

  return false;
};

/** Whether `affix` may roll on an item of `slot` and `rarityId` at `itemLevel`: its slot, its rarity, and its affix level reached. */
const tierIsOpen = (
  affix: AffixDef,
  slot: ArmorySlot,
  rarityId: string,
  itemLevel: number,
): boolean =>
  affix.affixLevel <= itemLevel &&
  affix.armorySlots.includes(slot) &&
  affix.rarities.includes(rarityId);

/** Whether the affix at `index` is the first in the content of its stat, which stands for the stat when stats are counted. */
const isFirstOfStat = (
  affixes: readonly AffixDef[],
  index: number,
): boolean => {
  const stat = affixes[index]?.stat;

  for (let earlier = 0; earlier < index; earlier += 1) {
    if (affixes[earlier]?.stat === stat) {
      return false;
    }
  }

  return true;
};

/** Whether some tier of `stat` is open to an item of `slot` and `rarityId` at `itemLevel`. */
const statIsOpen = (
  affixes: readonly AffixDef[],
  stat: Stat,
  slot: ArmorySlot,
  rarityId: string,
  itemLevel: number,
): boolean => {
  for (let index = 0; index < affixes.length; index += 1) {
    const affix = affixes[index];

    if (
      affix !== undefined &&
      affix.stat === stat &&
      tierIsOpen(affix, slot, rarityId, itemLevel)
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Whether the affix at `index` stands for a stat `into` may roll its next affix on: the first
 * affix of its stat in the content's order, with a tier open to the item's slot, rarity, and
 * item level, and its stat not already on one of the item's affixes. The implicit's stat does
 * not count, so a main hand finds its five stats whatever its implicit is.
 */
const standsForOpenStat = (
  affixes: readonly AffixDef[],
  index: number,
  into: Readonly<Item>,
  slot: ArmorySlot,
  rarityId: string,
): boolean => {
  const affix = affixes[index];

  return (
    affix !== undefined &&
    isFirstOfStat(affixes, index) &&
    statIsOpen(affixes, affix.stat, slot, rarityId, into.itemLevel) &&
    !carriesAffixStat(affixes, into, affix.stat)
  );
};

/** How many stats `into` may roll its next affix on. */
const countOpenStats = (
  affixes: readonly AffixDef[],
  into: Readonly<Item>,
  slot: ArmorySlot,
  rarityId: string,
): number => {
  let count = 0;

  for (let index = 0; index < affixes.length; index += 1) {
    if (standsForOpenStat(affixes, index, into, slot, rarityId)) {
      count += 1;
    }
  }

  return count;
};

/** The `nth` stat, from 0, of those `into` may roll its next affix on, in the content's order, or `null` past the last. */
const openStatAt = (
  affixes: readonly AffixDef[],
  into: Readonly<Item>,
  slot: ArmorySlot,
  rarityId: string,
  nth: number,
): Stat | null => {
  let seen = 0;

  for (let index = 0; index < affixes.length; index += 1) {
    if (!standsForOpenStat(affixes, index, into, slot, rarityId)) {
      continue;
    }

    if (seen === nth) {
      return affixes[index]?.stat ?? null;
    }

    seen += 1;
  }

  return null;
};

/** How many tiers of `stat` are open to `into`'s slot, rarity, and item level. */
const countOpenTiers = (
  affixes: readonly AffixDef[],
  into: Readonly<Item>,
  stat: Stat,
  slot: ArmorySlot,
  rarityId: string,
): number => {
  let count = 0;

  for (let index = 0; index < affixes.length; index += 1) {
    const affix = affixes[index];

    if (
      affix !== undefined &&
      affix.stat === stat &&
      tierIsOpen(affix, slot, rarityId, into.itemLevel)
    ) {
      count += 1;
    }
  }

  return count;
};

/** The `nth` tier, from 0, of `stat` open to `into`'s slot, rarity, and item level, in the content's order, or `null` past the last. */
const openTierAt = (
  affixes: readonly AffixDef[],
  into: Readonly<Item>,
  stat: Stat,
  slot: ArmorySlot,
  rarityId: string,
  nth: number,
): AffixDef | null => {
  let seen = 0;

  for (let index = 0; index < affixes.length; index += 1) {
    const affix = affixes[index];

    if (
      affix === undefined ||
      affix.stat !== stat ||
      !tierIsOpen(affix, slot, rarityId, into.itemLevel)
    ) {
      continue;
    }

    if (seen === nth) {
      return affix;
    }

    seen += 1;
  }

  return null;
};

/**
 * Rolls `count` affixes onto `into`, lines 1 on, for roll `roll` of `key` under `purposes`:
 * each a stat among those open to it by the `affix` purpose's draw, a tier of that stat by
 * `affixTier`'s, and a value in the tier's range by `lineValue`'s, every draw at
 * `roll × ITEM_LINE_CAPACITY + line`, so what one line rolls moves no other line's draws. Stops
 * early when no stat is open, as an emptied affix table leaves every item its base.
 */
export const rollAffixes = (
  world: AffixRollWorld,
  key: number,
  purposes: AffixRollPurposes,
  roll: number,
  slot: ArmorySlot,
  rarityId: string,
  count: number,
  into: Item,
): void => {
  const affixes = world.run.affixes;
  const lines = Math.min(count + 1, into.lines.length);

  for (let line = 1; line < lines; line += 1) {
    const index = roll * ITEM_LINE_CAPACITY + line;
    const stats = countOpenStats(affixes, into, slot, rarityId);

    if (stats === 0) {
      return;
    }

    const stat = openStatAt(
      affixes,
      into,
      slot,
      rarityId,
      pickAmong(keyedDraw(world, key, purposes.affix, index), stats),
    );

    if (stat === null) {
      return;
    }

    const tier = openTierAt(
      affixes,
      into,
      stat,
      slot,
      rarityId,
      pickAmong(
        keyedDraw(world, key, purposes.affixTier, index),
        countOpenTiers(affixes, into, stat, slot, rarityId),
      ),
    );
    const target = into.lines[line];

    if (tier === null || target === undefined) {
      return;
    }

    target.sourceId = tier.id;
    target.value = rollLineValue(
      tier.stat,
      tier.kind,
      tier.min,
      tier.max,
      keyedDraw(world, key, purposes.lineValue, index),
    );
    into.lineCount = line + 1;
  }
};
