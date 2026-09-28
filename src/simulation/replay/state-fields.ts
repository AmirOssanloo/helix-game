import type {
  Armory,
  DebugFlags,
  Effect,
  EffectDef,
  FormRecord,
  GroundItem,
  Inventory,
  Item,
  ItemLine,
  KitState,
  MapScope,
  PackRecord,
  PlacedItem,
  Projectile,
  RandomState,
  RunScope,
  ShapeDef,
  World,
  Zone,
} from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import {
  bytes,
  numbers,
  pool,
  records,
  table,
  texts,
} from "./field-collections";
import {
  excluded,
  fieldsOf,
  flag,
  itemAt,
  nullableId,
  nullableNumber,
  number,
  record,
  text,
} from "./field-list";
import {
  orbLevels,
  RESOURCES_FIELDS,
  UNIT_FIELDS,
  VEC2_FIELDS,
} from "./unit-fields";

/**
 * Why a record built from content is left out: the registry it is read from is fixed by the
 * log's stamp, and every number a command can change in it is a key of the tuning state,
 * which is hashed.
 */
const FROM_CONTENT =
  "built from the registry, which the stamp fixes, and the tuning state, which is hashed";

/** Why the copied art is left out: the stamp leaves out the definition fields it is copied from, so an art edit would move a checksum under an unchanged stamp. */
const COPIED_ART =
  "copied from a definition's presentation-only field, which the stamp leaves out; no rule reads it";

/** Why a map's own geometry is left out: it is the loaded map definition's, which `mapId` names and the stamp fixes. */
const FROM_MAP = "the loaded map definition's, named by mapId";

/** An effect list, hashed as each entry's kind in order: the list is content the stamp fixes, and its kinds say which of the ability's lists it is. */
const effectKinds = <T>(
  name: string,
  read: (owner: T) => readonly DeepReadonly<EffectDef>[],
): ReturnType<typeof texts<T>> =>
  texts<T>(
    name,
    (owner) => read(owner).length,
    (owner, index) => read(owner)[index]?.kind ?? null,
  );

/** A zone's area: its kind and each dimension, an absence for a dimension its kind has not got. */
const SHAPE_FIELDS = fieldsOf<DeepReadonly<ShapeDef>>({
  kind: text("kind", (shape) => shape.kind),
  radius: nullableNumber("radius", (shape, into, at) => {
    if (shape.kind !== "circle") {
      return false;
    }

    into[at] = shape.radius;

    return true;
  }),
  length: nullableNumber("length", (shape, into, at) => {
    if (shape.kind === "circle") {
      return false;
    }

    into[at] = shape.length;

    return true;
  }),
  width: nullableNumber("width", (shape, into, at) => {
    if (shape.kind !== "rectangle") {
      return false;
    }

    into[at] = shape.width;

    return true;
  }),
  angleDegrees: nullableNumber("angleDegrees", (shape, into, at) => {
    if (shape.kind !== "cone") {
      return false;
    }

    into[at] = shape.angleDegrees;

    return true;
  }),
});

const PROJECTILE_FIELDS = fieldsOf<DeepReadonly<Projectile>>({
  ability: text("ability.id", (projectile) =>
    projectile.ability === null ? null : projectile.ability.id,
  ),
  casterId: nullableId("casterId", (projectile) => projectile.casterId),
  orbLevels: orbLevels("orbLevels"),
  targetId: nullableId("targetId", (projectile) => projectile.targetId),
  prev: record("prev", (projectile) => projectile.prev, VEC2_FIELDS),
  curr: record("curr", (projectile) => projectile.curr, VEC2_FIELDS),
  facing: number("facing", (projectile, into, at) => {
    into[at] = projectile.facing;
  }),
  speed: number("speed", (projectile, into, at) => {
    into[at] = projectile.speed;
  }),
  radius: number("radius", (projectile, into, at) => {
    into[at] = projectile.radius;
  }),
  onHit: effectKinds("onHit", (projectile) => projectile.onHit),
  attackDamage: number("attackDamage", (projectile, into, at) => {
    into[at] = projectile.attackDamage;
  }),
  travelled: number("travelled", (projectile, into, at) => {
    into[at] = projectile.travelled;
  }),
  maxRange: number("maxRange", (projectile, into, at) => {
    into[at] = projectile.maxRange;
  }),
  frame: excluded(COPIED_ART),
  tint: excluded(COPIED_ART),
});

const ZONE_FIELDS = fieldsOf<DeepReadonly<Zone>>({
  ability: text("ability.id", (zone) =>
    zone.ability === null ? null : zone.ability.id,
  ),
  casterId: nullableId("casterId", (zone) => zone.casterId),
  orbLevels: orbLevels("orbLevels"),
  onActivate: effectKinds("onActivate", (zone) => zone.onActivate),
  eachTick: effectKinds("eachTick", (zone) => zone.eachTick),
  shape: record("shape", (zone) => zone.shape, SHAPE_FIELDS),
  circle: excluded(
    "the slot's own circle, hashed through shape whenever shape points at it",
  ),
  prev: record("prev", (zone) => zone.prev, VEC2_FIELDS),
  curr: record("curr", (zone) => zone.curr, VEC2_FIELDS),
  facing: number("facing", (zone, into, at) => {
    into[at] = zone.facing;
  }),
  travel: record("travel", (zone) => zone.travel, VEC2_FIELDS),
  followsCaster: flag("followsCaster", (zone) => zone.followsCaster),
  startedAtTick: number("startedAtTick", (zone, into, at) => {
    into[at] = zone.startedAtTick;
  }),
  activeAtTick: number("activeAtTick", (zone, into, at) => {
    into[at] = zone.activeAtTick;
  }),
  expiresAtTick: number("expiresAtTick", (zone, into, at) => {
    into[at] = zone.expiresAtTick;
  }),
  hitCount: number("hitCount", (zone, into, at) => {
    into[at] = zone.hitCount;
  }),
  hits: numbers(
    "hits",
    (zone) => zone.hitCount,
    (zone, index, into, slot) => {
      into[slot] = zone.hits[index] ?? 0;
    },
  ),
  frame: excluded(COPIED_ART),
  tint: excluded(COPIED_ART),
});

const EFFECT_FIELDS = fieldsOf<DeepReadonly<Effect>>({
  frame: excluded(COPIED_ART),
  abilityId: text("abilityId", (effect) => effect.abilityId),
  casterId: nullableId("casterId", (effect) => effect.casterId),
  position: record("position", (effect) => effect.position, VEC2_FIELDS),
  facing: number("facing", (effect, into, at) => {
    into[at] = effect.facing;
  }),
  radius: number("radius", (effect, into, at) => {
    into[at] = effect.radius;
  }),
  startedAtTick: number("startedAtTick", (effect, into, at) => {
    into[at] = effect.startedAtTick;
  }),
  expiresAtTick: nullableNumber("expiresAtTick", (effect, into, at) => {
    if (effect.expiresAtTick === null) {
      return false;
    }

    into[at] = effect.expiresAtTick;

    return true;
  }),
});

const ITEM_LINE_FIELDS = fieldsOf<DeepReadonly<ItemLine>>({
  sourceId: text("sourceId", (line) => line.sourceId),
  value: number("value", (line, into, at) => {
    into[at] = line.value;
  }),
});

const ITEM_FIELDS = fieldsOf<DeepReadonly<Item>>({
  baseId: text("baseId", (item) => item.baseId),
  rarityId: text("rarityId", (item) => item.rarityId),
  legendaryId: text("legendaryId", (item) => item.legendaryId),
  itemLevel: number("itemLevel", (item, into, at) => {
    into[at] = item.itemLevel;
  }),
  lineCount: number("lineCount", (item, into, at) => {
    into[at] = item.lineCount;
  }),
  lines: records(
    "lines",
    (item) => item.lineCount,
    (item, index) => itemAt(item.lines, index),
    ITEM_LINE_FIELDS,
  ),
});

const PLACED_ITEM_FIELDS = fieldsOf<DeepReadonly<PlacedItem>>({
  item: record("item", (placed) => placed.item, ITEM_FIELDS),
  live: flag("live", (placed) => placed.live),
  corner: number("corner", (placed, into, at) => {
    into[at] = placed.corner;
  }),
  width: number("width", (placed, into, at) => {
    into[at] = placed.width;
  }),
  height: number("height", (placed, into, at) => {
    into[at] = placed.height;
  }),
});

const INVENTORY_FIELDS = fieldsOf<DeepReadonly<Inventory>>({
  cells: bytes("cells", (inventory) => inventory.cells),
  placed: records(
    "placed",
    (inventory) => inventory.placed.length,
    (inventory, index) => itemAt(inventory.placed, index),
    PLACED_ITEM_FIELDS,
  ),
});

const ARMORY_FIELDS = fieldsOf<DeepReadonly<Armory>>({
  slots: records(
    "slots",
    (armory) => armory.slots.length,
    (armory, index) => itemAt(armory.slots, index),
    ITEM_FIELDS,
  ),
});

const GROUND_ITEM_FIELDS = fieldsOf<DeepReadonly<GroundItem>>({
  kind: text("kind", (groundItem) => groundItem.kind),
  position: record(
    "position",
    (groundItem) => groundItem.position,
    VEC2_FIELDS,
  ),
  amount: number("amount", (groundItem, into, at) => {
    into[at] = groundItem.amount;
  }),
  item: record("item", (groundItem) => groundItem.item, ITEM_FIELDS),
  droppedAtTick: number("droppedAtTick", (groundItem, into, at) => {
    into[at] = groundItem.droppedAtTick;
  }),
});

const PACK_FIELDS = fieldsOf<DeepReadonly<PackRecord>>({
  def: excluded(FROM_MAP),
  state: text("state", (pack) => pack.state),
  packId: nullableId("packId", (pack) => pack.packId),
  survivors: number("survivors", (pack, into, at) => {
    into[at] = pack.survivors;
  }),
});

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

const RUN_FIELDS = fieldsOf<DeepReadonly<RunScope>>({
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

const MAP_FIELDS = fieldsOf<DeepReadonly<MapScope>>({
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
});

/**
 * The whole of world state a tick decides, in the canonical sequence the checksum hashes and
 * the comparison walks. A pool's capacity is fixed, its live count and its misses follow from
 * its slots or are the instrumentation's, and the order of its free list is not readable
 * through its view: a difference there shows as a different slot at the next acquire.
 */
export const WORLD_FIELDS = fieldsOf<DeepReadonly<World>>({
  tick: number("tick", (world, into, at) => {
    into[at] = world.tick;
  }),
  run: record("run", (world) => world.run, RUN_FIELDS),
  map: record("map", (world) => world.map, MAP_FIELDS),
  commands: excluded(
    "the tick's input, which the log holds; consumed and forgotten within the tick",
  ),
  events: excluded(
    "announcements the presentation reads; what they announce is hashed where it lives",
  ),
  scratch: excluded(
    "the rules' working memory, dead at the end of every tick: nothing in it is read on a later one",
  ),
});
