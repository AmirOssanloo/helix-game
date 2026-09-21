import type { EntityId, Rect } from "@shared/public";
import type { ConsumedCommands } from "../commands/consumed-commands";
import type { FormDef } from "../definitions/form-def";
import type { HeroDef } from "../definitions/hero-def";
import { ORB_IDS } from "../definitions/orb-id";
import type { SpellRecord } from "../definitions/spell-state";
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

/** Tuning key to current value: the tuning table copied at world creation, changed by command. */
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
  /** The hero definition as content wrote it: which forms it has and how it levels. */
  hero: HeroDef;
  /** One record per form the hero definition lists, in that order. */
  forms: FormRecord[];
  /** Every spell by id, with its durations in ticks, for the composer and the cast pipeline to read. */
  spells: ReadonlyMap<string, SpellRecord>;
  tuning: TuningState;
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
