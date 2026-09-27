import type { LegendaryDef } from "@domain/public";
import { rimecoilDef } from "./rimecoil.def";

/** Every Legendary piece. A piece not listed here does not exist, and a pack names one by id. */
export const legendaries = [
  rimecoilDef,
] as const satisfies readonly LegendaryDef[];
