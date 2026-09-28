import type { DeepReadonly } from "@shared/public";
import type { AffixDef } from "../definitions/affix-def";
import type { ItemBaseDef } from "../definitions/item-base-def";
import type { LegendaryDef } from "../definitions/legendary-def";
import type { Item } from "./item";

/** What a level requirement reads of run scope: the item content as written, which no tuning command reaches. */
export type RequirementContent = Readonly<{
  itemBases: readonly ItemBaseDef[];
  affixes: readonly AffixDef[];
  legendaries: readonly LegendaryDef[];
}>;

const baseRequirement = (
  bases: readonly ItemBaseDef[],
  id: string | null,
): number => {
  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base.requirement;
    }
  }

  return 0;
};

const affixRequirement = (
  affixes: readonly AffixDef[],
  id: string | null,
): number => {
  for (let index = 0; index < affixes.length; index += 1) {
    const affix = affixes[index];

    if (affix !== undefined && affix.id === id) {
      return affix.requirement;
    }
  }

  return 0;
};

const pieceRequirement = (
  legendaries: readonly LegendaryDef[],
  id: string | null,
): number => {
  for (let index = 0; index < legendaries.length; index += 1) {
    const piece = legendaries[index];

    if (piece !== undefined && piece.id === id) {
      return piece.requirement;
    }
  }

  return 0;
};

/**
 * The hero level `item` needs to be worn: the highest of its base's requirement, each live
 * line's affix's requirement, and its Legendary piece's when it is one. A part the content does
 * not name asks nothing, so a cleared item asks level 0. Read from the content by id, as an
 * item holds no requirement of its own.
 */
export const levelRequirementOf = (
  content: RequirementContent,
  item: DeepReadonly<Item>,
): number => {
  let requirement = Math.max(
    baseRequirement(content.itemBases, item.baseId),
    pieceRequirement(content.legendaries, item.legendaryId),
  );

  for (let line = 0; line < item.lineCount; line += 1) {
    const slot = item.lines[line];

    if (slot !== undefined) {
      requirement = Math.max(
        requirement,
        affixRequirement(content.affixes, slot.sourceId),
      );
    }
  }

  return requirement;
};

/** Whether a hero at `heroLevel` meets `item`'s level requirement and may wear it. */
export const meetsRequirement = (
  content: RequirementContent,
  item: DeepReadonly<Item>,
  heroLevel: number,
): boolean => heroLevel >= levelRequirementOf(content, item);
