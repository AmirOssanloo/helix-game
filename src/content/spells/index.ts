import type { SpellDef } from "@domain/public";
import { bolideDef } from "./bolide.def";
import { clarionDef } from "./clarion.def";
import { emberlingDef } from "./emberling.def";
import { glacierDef } from "./glacier.def";
import { hoarfrostDef } from "./hoarfrost.def";
import { quickenDef } from "./quicken.def";
import { siphonDef } from "./siphon.def";
import { updraftDef } from "./updraft.def";
import { waneDef } from "./wane.def";
import { zenithDef } from "./zenith.def";

/** Every spell, in the order the content tier validates them. A spell not listed here does not exist. */
export const spells: readonly SpellDef[] = [
  hoarfrostDef,
  waneDef,
  glacierDef,
  siphonDef,
  updraftDef,
  quickenDef,
  zenithDef,
  emberlingDef,
  bolideDef,
  clarionDef,
];
