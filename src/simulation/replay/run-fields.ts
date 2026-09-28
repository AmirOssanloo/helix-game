import type {
  DebugFlags,
  FormRecord,
  KitState,
  RandomState,
  RunScope,
} from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { numbers, records, table, texts } from "./field-collections";
import {
  excluded,
  fieldsOf,
  flag,
  itemAt,
  nullableId,
  number,
  record,
} from "./field-list";
import {
  ARMORY_FIELDS,
  INVENTORY_FIELDS,
  STAT_TOTALS_FIELDS,
} from "./item-fields";
import { orbLevels, RESOURCES_FIELDS } from "./unit-fields";

/**
 * Why a record built from content is left out: the registry it is read from is fixed by the
 * log's stamp, and every number a command can change in it is a key of the tuning state,
 * which is hashed.
 */
const FROM_CONTENT =
  "built from the registry, which the stamp fixes, and the tuning state, which is hashed";

const KIT_FIELDS = fieldsOf<DeepReadonly<KitState>>({
  orbLevels: orbLevels("orbLevels"),
  orbCount: number("orbCount", (kit, into, at) => {
    into[at] = kit.orbCount;
  }),
  orbs: numbers(
    "orbs",
    (kit) => kit.orbCount,
    (kit, index, into, slot) => {
      into[slot] = kit.orbs[index] ?? 0;
    },
  ),
  prepared: texts(
    "prepared",
    (kit) => kit.prepared.length,
    (kit, index) => kit.prepared[index] ?? null,
  ),
});

const FORM_FIELDS = fieldsOf<DeepReadonly<FormRecord>>({
  def: excluded(FROM_CONTENT),
  resources: record("resources", (form) => form.resources, RESOURCES_FIELDS),
  kit: record("kit", (form) => form.kit, KIT_FIELDS),
  armory: record("armory", (form) => form.armory, ARMORY_FIELDS),
});

const DEBUG_FIELDS = fieldsOf<DeepReadonly<DebugFlags>>({
  noCooldowns: flag("noCooldowns", (debug) => debug.noCooldowns),
  infiniteMana: flag("infiniteMana", (debug) => debug.infiniteMana),
});

const RANDOM_FIELDS = fieldsOf<DeepReadonly<RandomState>>({
  seed: number("seed", (random, into, at) => {
    into[at] = random.seed;
  }),
  state: number("state", (random, into, at) => {
    into[at] = random.state;
  }),
});

export const RUN_FIELDS = fieldsOf<DeepReadonly<RunScope>>({
  heroId: nullableId("heroId", (run) => run.heroId),
  hero: excluded(FROM_CONTENT),
  heroAttack: excluded(FROM_CONTENT),
  forms: records(
    "forms",
    (run) => run.forms.length,
    (run, index) => itemAt(run.forms, index),
    FORM_FIELDS,
  ),
  inventory: record("inventory", (run) => run.inventory, INVENTORY_FIELDS),
  gold: number("gold", (run, into, at) => {
    into[at] = run.gold;
  }),
  heroTotals: record("heroTotals", (run) => run.heroTotals, STAT_TOTALS_FIELDS),
  zeroTotals: excluded("zeros, made with the world and never written"),
  spells: excluded(FROM_CONTENT),
  statuses: excluded(FROM_CONTENT),
  disableMatrix: excluded(FROM_CONTENT),
  units: excluded(FROM_CONTENT),
  maps: excluded(FROM_CONTENT),
  lootTables: excluded(FROM_CONTENT),
  itemBases: excluded(FROM_CONTENT),
  affixes: excluded(FROM_CONTENT),
  rarities: excluded(FROM_CONTENT),
  legendaries: excluded(FROM_CONTENT),
  tuning: table("tuning", (run) => run.tuning),
  definitionSlots: excluded(FROM_CONTENT),
  debug: record("debug", (run) => run.debug, DEBUG_FIELDS),
  random: record("random", (run) => run.random, RANDOM_FIELDS),
});
