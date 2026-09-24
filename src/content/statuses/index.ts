import type { StatusDef } from "@domain/public";
import { burnDef } from "./burn.def";
import { disarmDef } from "./disarm.def";
import { glacierChillDef } from "./glacier-chill.def";
import { hoarfrostDef } from "./hoarfrost.def";
import { knockbackDef } from "./knockback.def";
import { liftDef } from "./lift.def";
import { quickenDef } from "./quicken.def";
import { rootDef } from "./root.def";
import { silenceDef } from "./silence.def";
import { slowDef } from "./slow.def";
import { stunDef } from "./stun.def";
import { updraftLiftDef } from "./updraft-lift.def";
import { waneChillDef } from "./wane-chill.def";
import { waneDef } from "./wane.def";

/** Every status, in the order the content tier validates them. A status not listed here does not exist. */
export const statuses = [
  hoarfrostDef,
  stunDef,
  waneDef,
  waneChillDef,
  glacierChillDef,
  updraftLiftDef,
  quickenDef,
  burnDef,
  disarmDef,
  knockbackDef,
  silenceDef,
  rootDef,
  slowDef,
  liftDef,
] as const satisfies readonly StatusDef[];
