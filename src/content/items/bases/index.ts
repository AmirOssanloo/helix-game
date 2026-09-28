import type { ItemBaseDef } from "@domain/public";
import { bandDef } from "./band.def";
import { bucklerDef } from "./buckler.def";
import { capDef } from "./cap.def";
import { chainMailDef } from "./chain-mail.def";
import { circletDef } from "./circlet.def";
import { daggerDef } from "./dagger.def";
import { focusDef } from "./focus.def";
import { gauntletsDef } from "./gauntlets.def";
import { greavesDef } from "./greaves.def";
import { heavyBeltDef } from "./heavy-belt.def";
import { leatherBootsDef } from "./leather-boots.def";
import { leatherGlovesDef } from "./leather-gloves.def";
import { pendantDef } from "./pendant.def";
import { quiltedArmourDef } from "./quilted-armour.def";
import { robeDef } from "./robe.def";
import { sashDef } from "./sash.def";
import { sceptreDef } from "./sceptre.def";
import { staffDef } from "./staff.def";
import { tomeDef } from "./tome.def";
import { wandDef } from "./wand.def";

/** Every item base, in the armory's order. A base not listed here does not exist. */
export const itemBases = [
  capDef,
  circletDef,
  pendantDef,
  quiltedArmourDef,
  robeDef,
  chainMailDef,
  staffDef,
  wandDef,
  daggerDef,
  sceptreDef,
  tomeDef,
  bucklerDef,
  focusDef,
  leatherGlovesDef,
  gauntletsDef,
  sashDef,
  heavyBeltDef,
  leatherBootsDef,
  greavesDef,
  bandDef,
] as const satisfies readonly ItemBaseDef[];
