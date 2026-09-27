import type { ItemBaseDef } from "@domain/public";
import { bandDef } from "./band.def";
import { capDef } from "./cap.def";

/** Every item base, in the armory's order. A base not listed here does not exist. */
export const itemBases = [
  capDef,
  bandDef,
] as const satisfies readonly ItemBaseDef[];
