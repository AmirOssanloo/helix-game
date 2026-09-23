import type { SummonDef } from "@domain/public";
import { emberlingDef } from "./emberling.def";

/** Every summon, in the order the content tier validates them. A summon not listed here does not exist. */
export const summons: readonly SummonDef[] = [emberlingDef];
