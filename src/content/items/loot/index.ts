import type { LootTableDef } from "@domain/public";
import { bossLootDef } from "./boss.def";
import { eliteLootDef } from "./elite.def";
import { normalLootDef } from "./normal.def";
import { storeLootDef } from "./store.def";

/** Every loot table: one per enemy tier, and the store's. A tier's drop reads the table of its own id. */
export const lootTables = [
  normalLootDef,
  eliteLootDef,
  bossLootDef,
  storeLootDef,
] as const satisfies readonly LootTableDef[];
