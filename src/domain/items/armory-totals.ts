import type { StatusModifierKind } from "../definitions/status-def";
import type { TuningUnit } from "../definitions/tuning-def";
import { convertTunable } from "../definitions/tuning-state";
import { addToTotals, clearStatTotals } from "../entities/stat-totals";
import type { Stat } from "../entities/unit";
import type { Armory } from "./armory";
import type { Item } from "./item";
import type { RequirementContent } from "./requirement";

/** What a line reads of its source definition: the stat it adds to and whether flat or as a percentage. */
type LineSource = Readonly<{ stat: Stat; kind: StatusModifierKind }>;

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
  item: Readonly<Item>,
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
const lineSourceOf = (
  content: RequirementContent,
  item: Readonly<Item>,
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

/** Adds every live line of `item` to `armory`'s totals, each flat amount converted into the simulation's units at `simHz`. */
const addItemLines = (
  content: RequirementContent,
  simHz: number,
  item: Readonly<Item>,
  armory: Armory,
): void => {
  const totals = armory.totals;

  for (let line = 0; line < item.lineCount; line += 1) {
    const source = lineSourceOf(content, item, line);
    const value = item.lines[line]?.value ?? 0;

    if (source === null) {
      continue;
    }

    if (source.kind === "flat") {
      addToTotals(
        totals,
        source.stat,
        convertTunable(FLAT_UNITS[source.stat], value, simHz),
        0,
      );
    } else {
      addToTotals(totals, source.stat, 0, value);
    }
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
