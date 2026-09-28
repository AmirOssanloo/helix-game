import type { Stat } from "../entities/unit-tables";
import type { StatusModifierKind } from "./status-def";

/** One fixed stat line of a Legendary piece, in the designer's units, as a rolled line's value would be. */
export type FixedLineDef = Readonly<{
  stat: Stat;
  kind: StatusModifierKind;
  value: number;
}>;

/**
 * One Legendary piece: a fixed identity on a base, whose size and frame it takes. Its name, the
 * base by id, the hero level it needs to be worn, and its fixed lines in place of an implicit
 * roll and affixes. A boss pack names it; the boss loot table holds the chance.
 */
export type LegendaryDef = Readonly<{
  id: string;
  name: string;
  baseId: string;
  requirement: number;
  lines: readonly FixedLineDef[];
}>;
