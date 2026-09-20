import type {
  AnyCommand,
  MapDef,
  Registry,
  TickCompletedEvent,
  TuningState,
  WalkabilityGrid,
  World,
} from "@domain/public";
import {
  cellCount,
  clearOrder,
  createEffectPool,
  createPathSearch,
  createProjectilePool,
  createSpatialHash,
  createTuningState,
  createUnitPool,
  createZonePool,
  deriveWalkabilityGrid,
  fitPathSearch,
  readRadiusClasses,
  readTunable,
  releaseUnit,
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
 * Owns a world and steps it. Commands enter through `submit`, `tick` consumes them, and
 * everything past the simulation's door reads the result through `view`. There is no method
 * here that changes world state outside a tick.
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

  private readonly buffer: CommandBuffer;

  /** The one `tick_completed` value, written into the ring each tick so nothing is built per tick. */
  private readonly tickCompleted: TickCompletedEvent;

  private isDisposed = false;

  constructor(options: CreateWorldOptions) {
    const tuning = createTuningState(options.registry.tuning);

    const walkability = deriveGrid(options.map, tuning);

    this.buffer = new CommandBuffer();
    this.state = {
      tick: 0,
      run: {
        heroId: null,
        forms: [],
        tuning,
        random: createRandomState(options.seed),
      },
      map: {
        mapId: options.map.id,
        units: createUnitPool(),
        projectiles: createProjectilePool(),
        effects: createEffectPool(),
        zones: createZonePool(),
        walkability,
        bounds: options.map.bounds,
        obstacles: options.map.obstacles,
        spatialHash: createSpatialHash(readTunable(tuning, "hash_cell_size")),
        pathSearch: createPathSearch(cellCount(walkability)),
      },
      commands: this.buffer,
    };
    this.events = new EventRing();
    this.log = new InputLog();
    this.tickCompleted = { kind: "tick_completed", tick: 0 };
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
   * Takes `map` as the loaded one: releases every map-scoped entity but the hero, derives the
   * walkability grid for the map's bounds and obstacles with the path search fitted to it,
   * carries the hero to the spawn point with its order cleared, and rebuilds the spatial hash
   * at the tuned cell size over what is left. Run scope is untouched; the hero is never
   * recreated. Anything standing on the spawn point is pushed off by collision on the first
   * tick.
   */
  loadMap(map: MapDef): void {
    const world = this.state;
    const scope = world.map;
    const tuning = world.run.tuning;
    const heroId = world.run.heroId;
    const hero = heroId === null ? null : scope.units.resolve(heroId);

    for (let index = 0; index < scope.units.end; index += 1) {
      const id = scope.units.idAt(index);

      if (id !== null && id !== heroId) {
        releaseUnit(world, id);
      }
    }

    scope.projectiles.releaseAll();
    scope.effects.releaseAll();
    scope.zones.releaseAll();
    scope.mapId = map.id;
    scope.bounds = map.bounds;
    scope.obstacles = map.obstacles;
    scope.walkability = deriveGrid(map, tuning);

    assert(
      walkabilityCovers(scope.walkability, map.bounds),
      "The walkability grid covers the loaded map's bounds",
    );
    fitPathSearch(scope.pathSearch, cellCount(scope.walkability));

    if (hero !== null) {
      clearOrder(hero);
      hero.curr.x = map.spawnPoint.x;
      hero.curr.y = map.spawnPoint.y;
      hero.prev.x = map.spawnPoint.x;
      hero.prev.y = map.spawnPoint.y;
      hero.spawnPoint.x = map.spawnPoint.x;
      hero.spawnPoint.y = map.spawnPoint.y;
    }

    scope.spatialHash.rebuild(
      readTunable(tuning, "hash_cell_size"),
      scope.units,
    );
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

/** A world at tick zero on `map`, with the registry's tuning converted into run scope and the random source at the start of `seed`'s sequence. */
export const createWorld = (options: CreateWorldOptions): Simulation =>
  new Simulation(options);
