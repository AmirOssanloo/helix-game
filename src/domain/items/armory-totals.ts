import type { DeepReadonly } from "@shared/public";
import type { StatusModifierKind } from "../definitions/status-def";
import type { TuningUnit } from "../definitions/tuning-def";
import { convertTunable } from "../definitions/tuning-state";
import { clearStatTotals, STAT_INDEX } from "../entities/stat-totals";
import type { Stat } from "../entities/unit";
import type { Armory } from "./armory";
import type { Item } from "./item";
import type { RequirementContent } from "./requirement";

/** What a line reads of its source definition: the stat it adds to and whether flat or as a percentage. */
export type LineSource = Readonly<{ stat: Stat; kind: StatusModifierKind }>;

/**
 * The unit a flat amount of each stat is written in on an item, as content writes it and a
 * tooltip shows it: a regeneration and a movement speed per second, a cooldown reduction in
 * seconds, and every other stat as the stat itself counts. A percentage is a fraction of one
 * for every stat, and is read as written.
 */
const FLAT_UNITS: Readonly<Record<Stat, TuningUnit>> = {
  movement_speed: "units_per_second",
  attack_damage: "as_written",
  cooldown_reduction: "seconds",
  magic_damage: "fraction",
  max_health: "as_written",
  health_regen: "units_per_second",
  max_mana: "as_written",
  mana_regen: "units_per_second",
  armour: "as_written",
  attack_speed: "as_written",
  magic_resistance: "fraction",
};

/** The fixed line `line` of the Legendary piece `item` is, or `null` when it is none. */
const pieceLineOf = (
  content: RequirementContent,
  item: DeepReadonly<Item>,
  line: number,
): LineSource | null => {
  for (let index = 0; index < content.legendaries.length; index += 1) {
    const piece = content.legendaries[index];

    if (piece !== undefined && piece.id === item.legendaryId) {
      return piece.lines[line] ?? null;
    }
  }

  return null;
};

/**
 * The definition line `line` of `item` came from: a Legendary piece's fixed line when the line
 * names the piece, its base's implicit when it names the base, or the affix it names, and
 * `null` when the content holds none of them.
 */
export const lineSourceOf = (
  content: RequirementContent,
  item: DeepReadonly<Item>,
  line: number,
): LineSource | null => {
  const id = item.lines[line]?.sourceId ?? null;

  if (id === null) {
    return null;
  }

  if (id === item.legendaryId) {
    return pieceLineOf(content, item, line);
  }

  for (let index = 0; index < content.itemBases.length; index += 1) {
    const base = content.itemBases[index];

    if (base !== undefined && base.id === id) {
      return base.implicit;
    }
  }

  for (let index = 0; index < content.affixes.length; index += 1) {
    const affix = content.affixes[index];

    if (affix !== undefined && affix.id === id) {
      return affix;
    }
  }

  return null;
};

/**
 * Whether a line of `source` is written as a fraction of one and read as a percentage: every
 * percentage line, and a flat line of a stat whose flat unit is a fraction, as magic damage
 * and magic resistance are.
 */
export const isPercentLine = (source: LineSource): boolean =>
  source.kind === "percent" || FLAT_UNITS[source.stat] === "fraction";

/**
 * Adds every live line of `item` to `armory`'s totals, each flat amount converted into the
 * simulation's units at `simHz`. Each line is added into the sums in place, and a percentage
 * is read where it is added, never beside a call: a percentage is a fraction, and a fraction
 * handed to a call the engine leaves out of line is boxed on the heap.
 */
const addItemLines = (
  content: RequirementContent,
  simHz: number,
  item: Readonly<Item>,
  armory: Armory,
): void => {
  const totals = armory.totals;

  for (let line = 0; line < item.lineCount; line += 1) {
    const source = lineSourceOf(content, item, line);
    const entry = item.lines[line];

    if (source === null || entry === undefined) {
      continue;
    }

    const index = STAT_INDEX[source.stat];

    if (source.kind === "flat") {
      totals.flat[index] =
        (totals.flat[index] ?? 0) +
        convertTunable(FLAT_UNITS[source.stat], entry.value, simHz);
    } else {
      totals.percent[index] = (totals.percent[index] ?? 0) + entry.value;
    }

    totals.lines += 1;
  }
};

/**
 * Rewrites `armory`'s totals whole from its ten slots: every live line of every worn item,
 * read in its source definition's stat and mode, flat or percentage, and converted from the
 * designer's units on the item into the simulation's at `simHz`, here and once. Run on the
 * tick an equip or an unequip lands, a walk of at most every slot's lines, and never
 * otherwise. Allocates nothing.
 */
export const rewriteArmoryTotals = (
  content: RequirementContent,
  simHz: number,
  armory: Armory,
): void => {
  clearStatTotals(armory.totals);

  for (let slot = 0; slot < armory.slots.length; slot += 1) {
    const item = armory.slots[slot];

    if (item !== undefined && item.baseId !== null) {
      addItemLines(content, simHz, item, armory);
    }
  }
};
