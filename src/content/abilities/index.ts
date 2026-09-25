import type { AbilityDef } from "@domain/public";
import { rootNetDef } from "./root-net.def";
import { silenceCurseDef } from "./silence-curse.def";

/** Every enemy ability, in the order the content tier validates them. An ability not listed here does not exist. */
export const abilities = [
  silenceCurseDef,
  rootNetDef,
] as const satisfies readonly AbilityDef[];
