import type { MapScope, PackRecord, StoreRecord } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { bytes, pool, records } from "./field-collections";
import {
  excluded,
  fieldsOf,
  flag,
  itemAt,
  nullableId,
  number,
  text,
} from "./field-list";
import { ITEM_FIELDS } from "./item-fields";
import {
  EFFECT_FIELDS,
  GROUND_ITEM_FIELDS,
  PROJECTILE_FIELDS,
  ZONE_FIELDS,
} from "./pool-fields";
import { UNIT_FIELDS } from "./unit-fields";

/** Why a map's own geometry is left out: it is the loaded map definition's, which `mapId` names and the stamp fixes. */
const FROM_MAP = "the loaded map definition's, named by mapId";

const STORE_FIELDS = fieldsOf<DeepReadonly<StoreRecord>>({
  stocked: flag("stocked", (store) => store.stocked),
  stock: records(
    "stock",
    (store) => store.stock.length,
    (store, index) => itemAt(store.stock, index),
    ITEM_FIELDS,
  ),
});

const PACK_FIELDS = fieldsOf<DeepReadonly<PackRecord>>({
  def: excluded(FROM_MAP),
  state: text("state", (pack) => pack.state),
  packId: nullableId("packId", (pack) => pack.packId),
  survivors: number("survivors", (pack, into, at) => {
    into[at] = pack.survivors;
  }),
});

export const MAP_FIELDS = fieldsOf<DeepReadonly<MapScope>>({
  mapId: text("mapId", (map) => map.mapId),
  level: number("level", (map, into, at) => {
    into[at] = map.level;
  }),
  units: pool("units", (map) => map.units, UNIT_FIELDS),
  projectiles: pool("projectiles", (map) => map.projectiles, PROJECTILE_FIELDS),
  effects: pool("effects", (map) => map.effects, EFFECT_FIELDS),
  zones: pool("zones", (map) => map.zones, ZONE_FIELDS),
  groundItems: pool(
    "groundItems",
    (map) => map.groundItems,
    GROUND_ITEM_FIELDS,
  ),
  groundItemCells: bytes("groundItemCells", (map) => map.groundItemCells),
  dropsNotMade: number("dropsNotMade", (map, into, at) => {
    into[at] = map.dropsNotMade;
  }),
  walkability: excluded(
    "a cache derived from the loaded map and the tuning state, both hashed",
  ),
  bounds: excluded(FROM_MAP),
  obstacles: excluded(FROM_MAP),
  spatialHash: excluded(
    "an index derived from where the units stand, which is hashed; rebuilt from them",
  ),
  pathSearch: excluded(
    "A*'s working memory, written and read within one search",
  ),
  packs: records(
    "packs",
    (map) => map.packs.length,
    (map, index) => itemAt(map.packs, index),
    PACK_FIELDS,
  ),
  nextPackId: number("nextPackId", (map, into, at) => {
    into[at] = map.nextPackId;
  }),
  spawnPoint: excluded(FROM_MAP),
  checkpoints: excluded(FROM_MAP),
  furthestCheckpoint: number("furthestCheckpoint", (map, into, at) => {
    into[at] = map.furthestCheckpoint;
  }),
  stores: records(
    "stores",
    (map) => map.stores.length,
    (map, index) => itemAt(map.stores, index),
    STORE_FIELDS,
  ),
  openStore: number("openStore", (map, into, at) => {
    into[at] = map.openStore;
  }),
});
