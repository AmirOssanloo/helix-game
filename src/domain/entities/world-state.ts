import type { EntityId, Rect } from "@shared/public";
import type { ConsumedCommands } from "../commands/consumed-commands";
import type { SpatialHash } from "../movement/spatial-hash";
import type { Tick } from "../tick";
import type { Effect } from "./effect";
import type { Pool } from "./pool";
import type { Projectile } from "./projectile";
import type { Unit } from "./unit";
import type { Zone } from "./zone";

/** The seeded random source's state. It lives on the world so a replay from the same seed reproduces every draw. */
export type RandomState = {
  seed: number;
  state: number;
};

/** One form the hero can take. The unit holds the active index; a swap changes that index and nothing else. */
export type FormRecord = {
  definitionId: string;
  hp: number;
  mana: number;
};

/** Tuning key to current value: the tuning table copied at world creation, changed by command. */
export type TuningState = Map<string, number>;

/** The grid the map module derives from a map's obstacles. The module owns the cells; this names the slot. */
export type WalkabilityGrid = {
  cellSize: number;
  columns: number;
  rows: number;
};

/** State that lives for the whole session. Never reset by a map load. */
export type RunScope = {
  heroId: EntityId | null;
  forms: FormRecord[];
  tuning: TuningState;
  random: RandomState;
};

/** State that lives for one map. A map load releases every pool and rebuilds the grid and the hash. */
export type MapScope = {
  /** The id of the loaded map definition; `null` until the first load. */
  mapId: string | null;
  units: Pool<Unit>;
  projectiles: Pool<Projectile>;
  effects: Pool<Effect>;
  zones: Pool<Zone>;
  walkability: WalkabilityGrid | null;
  /** The loaded map's obstacle rectangles, which the collision system keeps every unit out of. */
  obstacles: readonly Rect[];
  /** The index of what is near, created with the world and rebuilt by every map load. */
  spatialHash: SpatialHash;
};

/**
 * The whole of world state: plain data a system reads and writes through the world it is
 * handed, and the commands the current tick consumed for the systems to act on.
 */
export type World = {
  tick: Tick;
  run: RunScope;
  map: MapScope;
  commands: ConsumedCommands;
};
