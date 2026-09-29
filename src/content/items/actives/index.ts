import type { ActiveItemDef } from "@domain/public";
import { scorchglassItemDef } from "./scorchglass.def";

/**
 * Every active item, in the order the store's listing shows them. An active item not listed
 * here does not exist; each is added with the ability it casts.
 */
export const activeItems = [
  scorchglassItemDef,
] as const satisfies readonly ActiveItemDef[];
