import type { AbilityDef } from "@domain/public";
import { arrowDef } from "./arrow.def";
import { chargeDef } from "./charge.def";
import { rootNetDef } from "./root-net.def";
import { selfHealDef } from "./self-heal.def";
import { silenceCurseDef } from "./silence-curse.def";
import { slamDef } from "./slam.def";
import { summonAddsDef } from "./summon-adds.def";

/** Every enemy ability, in the order the content tier validates them. An ability not listed here does not exist. */
export const abilities = [
  silenceCurseDef,
  rootNetDef,
  arrowDef,
  slamDef,
  selfHealDef,
  summonAddsDef,
  chargeDef,
] as const satisfies readonly AbilityDef[];
