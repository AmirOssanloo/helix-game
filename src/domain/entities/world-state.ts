import type { EntityId, Rect, Vec2 } from "@shared/public";
import type { PackRecord } from "../ai/packs";
import type { ConsumedCommands } from "../commands/consumed-commands";
import type { AttackRecord } from "../definitions/attack-state";
import type { DefinitionSlot } from "../definitions/definition-tuning";
import type { DisableMatrixDef } from "../definitions/disable-matrix-def";
import type { FormDef } from "../definitions/form-def";
import type { HeroDef } from "../definitions/hero-def";
import { ORB_IDS } from "../definitions/orb-id";
import type { SpellRecord } from "../definitions/spell-state";
import type { StatusRecord } from "../definitions/status-state";
import type { UnitRecord } from "../definitions/unit-state";
import type { EventSink } from "../events/domain-event";
import type { WalkabilityGrid } from "../map/walkability";
import type { SpatialHash } from "../movement/spatial-hash";
import type { PathSearch } from "../pathing/astar";
import type { Tick } from "../tick";
import type { Effect } from "./effect";
import type { Pool } from "./pool";
import type { Projectile } from "./projectile";
import type { Resources, Unit } from "./unit";
import type { Zone } from "./zone";

/** The seeded random source's state. It lives on the world so a replay from the same seed reproduces every draw. */
export type RandomState = {
  seed: number;
  state: number;
};

/** How many orb skills a kit levels: Q, W, and E. */
export const ORB_COUNT = ORB_IDS.length;

/**
 * What a form's kit remembers between ticks: the level of each orb skill, which skill points
 * raise; the held orb instances, oldest first, each an orb index, with `orbCount` saying how
 * many of the buffer's slots are live; and the prepared spell in each slot, newest first,
 * `null` being an empty socket. Both buffers are sized from the tuning table when the record
 * is created and never grow.
 */
export type KitState = {
  orbLevels: number[];
  orbs: number[];
  orbCount: number;
  prepared: (string | null)[];
};

/**
 * One form the hero can take: its definition in simulation units, the health and mana it
 * has, its kit state, and its armory, which is `null` until items exist. The unit holds the
 * active index; a swap changes that index and nothing else.
 */
export type FormRecord = {
  def: FormDef;
  resources: Resources;
  kit: KitState;
  armory: null;
};

/**
 * Tuning key to current value in simulation units: the tuning table and every definition
 * number, copied at world creation, changed by command. It takes every key at creation and
 * never grows.
 */
export type TuningState = Map<string, number>;

/**
 * The developer panel's switches over the rules: with no cooldowns, every clock reads as
 * ready; with infinite mana, a cast never spends any and never wants for it. Both are off
 * when a world is created and change only by debug command, so a session with one on replays.
 */
export type DebugFlags = {
  noCooldowns: boolean;
  infiniteMana: boolean;
};

/** State that lives for the whole session. Never reset by a map load. */
export type RunScope = {
  heroId: EntityId | null;
  /** The world's copy of the hero definition: which forms it has and how it levels. */
  hero: HeroDef;
  /** The hero's attack with its seconds read for the tick, which the attack rule reads for whichever form is active. */
  heroAttack: AttackRecord;
  /** One record per form the hero definition lists, in that order. */
  forms: FormRecord[];
  /** Every spell and every enemy ability by id, with its durations in ticks, for the composer and the cast pipeline to read. */
  spells: Map<string, SpellRecord>;
  /** Every status by id, with its tables read for the tick, for the status rule and the status system to read. */
  statuses: Map<string, StatusRecord>;
  /** What every status refuses, ends, and closes, as the registry wrote it: the validator, the status and cast passes, the kits, and the mapper read it. */
  disableMatrix: DisableMatrixDef;
  /** Every archetype and every summon by id, with its rates read for the tick, for a spawn to dress a unit from. The live units are map scope's. */
  units: Map<string, UnitRecord>;
  tuning: TuningState;
  /**
   * Every definition number's key, to where it lives in the world's own copy of its
   * definition. Every record above is read from those copies, and a tuning command on a
   * definition key writes the copy and rebuilds the record, so the registry is never written.
   */
  definitionSlots: ReadonlyMap<string, DefinitionSlot>;
  debug: DebugFlags;
  random: RandomState;
};

/** State that lives for one map. A map load releases every pool and rebuilds the grid and the hash. */
export type MapScope = {
  /** The id of the loaded map definition. */
  mapId: string;
  units: Pool<Unit>;
  projectiles: Pool<Projectile>;
  effects: Pool<Effect>;
  zones: Pool<Zone>;
  /** The grid the map module derives from the loaded map, one layer per radius class. */
  walkability: WalkabilityGrid;
  /** The loaded map's playable rectangle, which the collision system keeps every unit inside of. */
  bounds: Readonly<Rect>;
  /** The loaded map's obstacle rectangles, which the collision system keeps every unit out of. */
  obstacles: readonly Rect[];
  /** The index of what is near, created with the world and rebuilt by every map load. */
  spatialHash: SpatialHash;
  /** The working memory of A* over the grid, sized to it at creation and every map load. */
  pathSearch: PathSearch;
  /** One record per pack the loaded map lists, saying which still wait to be placed. */
  packs: PackRecord[];
  /** The id the next pack spawned is given. Counts up from zero on every map load, so no two live packs share one. */
  nextPackId: number;
  /** The loaded map's spawn point, which a map reset gives the hero back. */
  spawnPoint: Readonly<Vec2>;
  /** The loaded map's checkpoints, in order along it. */
  checkpoints: readonly Readonly<Vec2>[];
  /** The index of the furthest checkpoint the hero has reached on this map, or `-1` for none. Only ever rises until a map reset clears it. */
  furthestCheckpoint: number;
};

/**
 * The whole of world state: plain data a system reads and writes through the world it is
 * handed, the commands the current tick consumed for the systems to act on, and the ring a
 * system announces an event into.
 */
export type World = {
  tick: Tick;
  run: RunScope;
  map: MapScope;
  commands: ConsumedCommands;
  events: EventSink;
};
