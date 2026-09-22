import type {
  AnyCommand,
  EventSlot,
  MapDef,
  MapScope,
  Registry,
  RunScope,
  TuningState,
  WalkabilityGrid,
  World,
} from "@domain/public";
import {
  cellCount,
  createDomainEvent,
  createEffectPool,
  createFormRecords,
  createPathSearch,
  createProjectilePool,
  createSpatialHash,
  createSpellTable,
  createStatusTable,
  createTuningState,
  createUnitPool,
  createZonePool,
  deriveWalkabilityGrid,
  fitPathSearch,
  readRadiusClasses,
  readTunable,
  resetMapScope,
  resolveHero,
  walkabilityCovers,
} from "@domain/public";
import { assert } from "@shared/public";
import { CommandBuffer } from "./command-buffer";
import { EventRing } from "./event-ring";
import { InputLog } from "./input-log";
import { createRandomState } from "./random";
import { systems } from "./systems";
import type { WorldView } from "./world-view";

/** What a world is created from: a seed, the validated content, and the first map. */
export type CreateWorldOptions = Readonly<{
  seed: number;
  registry: Registry;
  map: MapDef;
}>;

/** The grid `map` derives under the tuning state's cell size and radius classes. */
const deriveGrid = (map: MapDef, tuning: TuningState): WalkabilityGrid =>
  deriveWalkabilityGrid(
    map.bounds,
    map.obstacles,
    readTunable(tuning, "walkability_cell_size"),
    readRadiusClasses(tuning),
  );

/**
 * Run scope from `registry` under `seed`: the tuning table converted into simulation units,
 * the hero's form records and the spell and status tables built over it, both switches off,
 * no hero yet,
 * and the random source at the start of the seed's sequence.
 */
const createRunScope = (registry: Registry, seed: number): RunScope => {
  const tuning = createTuningState(registry.tuning);

  return {
    heroId: null,
    hero: registry.hero,
    forms: createFormRecords(registry.hero, registry.forms, tuning),
    spells: createSpellTable(registry.spells, tuning),
    statuses: createStatusTable(registry.statuses, tuning),
    tuning,
    debug: { noCooldowns: false, infiniteMana: false },
    random: createRandomState(seed),
  };
};

/** Map scope for `map` under `tuning`: empty pools, the grid derived, the hash at the tuned cell size, and the path search fitted to the grid. */
const createMapScope = (map: MapDef, tuning: TuningState): MapScope => {
  const walkability = deriveGrid(map, tuning);

  return {
    mapId: map.id,
    units: createUnitPool(),
    projectiles: createProjectilePool(),
    effects: createEffectPool(),
    zones: createZonePool(),
    walkability,
    bounds: map.bounds,
    obstacles: map.obstacles,
    spatialHash: createSpatialHash(readTunable(tuning, "hash_cell_size")),
    pathSearch: createPathSearch(cellCount(walkability)),
  };
};

/**
 * What the fixed-step driver steps: a world, or a replay feeding one. The driver reads the
 * view and the ring for the samples it writes, hands commands in, and calls `tick`, and
 * needs nothing else of what it steps.
 */
export type Steppable = Readonly<{
  view: WorldView;
  events: EventRing;
  submit: (command: AnyCommand) => boolean;
  tick: () => void;
}>;

/** Step one of a tick: every position the presentation interpolates keeps the value it had before this tick moves it. */
const copyPreviousPositions = (world: World): void => {
  for (let index = 0; index < world.map.units.end; index += 1) {
    const unit = world.map.units.at(index);

    if (unit === null) {
      continue;
    }

    unit.prev.x = unit.curr.x;
    unit.prev.y = unit.curr.y;
  }

  for (let index = 0; index < world.map.projectiles.end; index += 1) {
    const projectile = world.map.projectiles.at(index);

    if (projectile === null) {
      continue;
    }

    projectile.prev.x = projectile.curr.x;
    projectile.prev.y = projectile.curr.y;
  }
};

/**
 * Owns a world and steps it. Commands enter through `submit`, `tick` consumes them, the
 * systems announce into `events`, and everything past the simulation's door reads the result
 * through `view`. There is no method here that changes world state outside a tick.
 *
 * `state` is the live world a system is handed and a test helper arranges. The presentation
 * and the developer panel are given `view`, never `state`.
 */
export class Simulation {
  readonly state: World;

  /** Events the ticks announced. Each reader keeps its own cursor. */
  readonly events: EventRing;

  /** Every consumed command with its tick. */
  readonly log: InputLog;

  /** The map the world was created on, which a restart returns it to. A map load changes the loaded map, never this. */
  readonly mapDef: MapDef;

  private readonly registry: Registry;

  private readonly buffer: CommandBuffer;

  /** The one `tick_completed` value, written into the ring each tick so nothing is built per tick. */
  private readonly tickCompleted: EventSlot;

  private isDisposed = false;

  constructor(options: CreateWorldOptions) {
    const run = createRunScope(options.registry, options.seed);

    this.registry = options.registry;
    this.mapDef = options.map;
    this.buffer = new CommandBuffer();
    this.events = new EventRing();
    this.state = {
      tick: 0,
      run,
      map: createMapScope(options.map, run.tuning),
      commands: this.buffer,
      events: this.events,
    };
    this.log = new InputLog();
    this.tickCompleted = createDomainEvent();
  }

  /** The live state under its read-only type. The same object; no copy. */
  get view(): WorldView {
    return this.state;
  }

  /** Commands waiting for the next tick. */
  get pendingCommands(): number {
    return this.buffer.count;
  }

  /** Whether `dispose` has run. A disposed world refuses every submit. */
  get disposed(): boolean {
    return this.isDisposed;
  }

  /** Queues `command` for the next tick. Refused with `false` when the buffer is full or the world is disposed. */
  submit(command: AnyCommand): boolean {
    if (this.isDisposed) {
      return false;
    }

    return this.buffer.submit(command);
  }

  /**
   * One step, with no clock and no argument: the step is a constant and the commands are in
   * the buffer. In order: previous positions are copied, the buffer is sorted and consumed into
   * the log, the systems run with the consumed commands readable on the world, the buffer is
   * cleared, `tick_completed` is written, and the tick count advances.
   */
  tick(): void {
    assert(!this.isDisposed, "A disposed world does not tick");

    const world = this.state;

    copyPreviousPositions(world);

    this.buffer.sort();

    for (let index = 0; index < this.buffer.count; index += 1) {
      const command = this.buffer.at(index);

      if (command === null) {
        continue;
      }

      this.log.record(world.tick, command);
    }

    for (let index = 0; index < systems.length; index += 1) {
      const system = systems[index];

      if (system !== undefined) {
        system(world);
      }
    }

    this.buffer.clear();

    this.tickCompleted.tick = world.tick;
    this.events.write(this.tickCompleted);

    world.tick += 1;
  }

  /**
   * Takes `map` as the loaded one: derives the walkability grid for the map's bounds and
   * obstacles with the path search fitted to it, gives the hero the map's spawn point, and
   * resets map scope around it: every map-scoped entity but the hero released, the hero
   * carried to the spawn point with its order cleared, and the spatial hash rebuilt over
   * what is left. Run scope is untouched; the hero is never recreated. Anything standing on
   * the spawn point is pushed off by collision on the first tick.
   */
  loadMap(map: MapDef): void {
    const world = this.state;
    const scope = world.map;
    const hero = resolveHero(world);

    scope.mapId = map.id;
    scope.bounds = map.bounds;
    scope.obstacles = map.obstacles;
    scope.walkability = deriveGrid(map, world.run.tuning);

    assert(
      walkabilityCovers(scope.walkability, map.bounds),
      "The walkability grid covers the loaded map's bounds",
    );
    fitPathSearch(scope.pathSearch, cellCount(scope.walkability));

    if (hero !== null) {
      hero.spawnPoint.x = map.spawnPoint.x;
      hero.spawnPoint.y = map.spawnPoint.y;
    }

    resetMapScope(world);
  }

  /**
   * Puts the world back to what creation made under `seed`: run scope and map scope rebuilt
   * from the same registry on the map it was created on, every waiting command, event, and
   * log record forgotten, and the tick count at zero. The world object, its ring, and its log
   * keep their identity, so everything holding a reference to one reads the new session. The
   * door a driver operation recreates a session through; never a command, since it makes a
   * session rather than changing one, and a replay begins on a world that has never ticked.
   */
  restart(seed: number): void {
    assert(!this.isDisposed, "A disposed world does not restart");

    const world = this.state;

    world.tick = 0;
    world.run = createRunScope(this.registry, seed);
    world.map = createMapScope(this.mapDef, world.run.tuning);
    this.buffer.clear();
    this.events.clear();
    this.log.clear();
  }

  /** Releases every pool and forgets every waiting command, event, and log record. The world refuses submits afterwards. */
  dispose(): void {
    const scope = this.state.map;

    scope.units.releaseAll();
    scope.projectiles.releaseAll();
    scope.effects.releaseAll();
    scope.zones.releaseAll();
    this.buffer.clear();
    this.events.clear();
    this.log.clear();
    this.isDisposed = true;
  }
}

/** A world at tick zero on `map`, with the registry's tuning and forms converted into run scope and the random source at the start of `seed`'s sequence. */
export const createWorld = (options: CreateWorldOptions): Simulation =>
  new Simulation(options);
