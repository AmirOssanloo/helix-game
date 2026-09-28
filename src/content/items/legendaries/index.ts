import type { LegendaryDef } from "@domain/public";
import { hallcrownDef } from "./hallcrown.def";
import { rimecoilDef } from "./rimecoil.def";
import { trollhideDef } from "./trollhide.def";

/** Every Legendary piece. A piece not listed here does not exist, and a pack names one by id. */
export const legendaries = [
  rimecoilDef,
  trollhideDef,
  hallcrownDef,
] as const satisfies readonly LegendaryDef[];
