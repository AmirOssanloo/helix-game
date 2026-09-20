import type {
  AnyCommand,
  MapDef,
  Registry,
  TickCompletedEvent,
  World,
} from "@domain/public";
import {
  createEffectPool,
  createProjectilePool,
  createUnitPool,
  createZonePool,
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
    this.buffer = new CommandBuffer();
    this.state = {
      tick: 0,
      run: {
        heroId: null,
        forms: [],
        tuning: new Map(options.registry.tuning),
        random: createRandomState(options.seed),
      },
      map: {
        mapId: null,
        units: createUnitPool(),
        projectiles: createProjectilePool(),
        effects: createEffectPool(),
        zones: createZonePool(),
        walkability: null,
        spatialHash: null,
      },
      commands: this.buffer,
    };
    this.events = new EventRing();
    this.log = new InputLog();
    this.tickCompleted = { kind: "tick_completed", tick: 0 };

    this.loadMap(options.map);
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

  /** Releases every map-scoped pool and takes `map` as the loaded one. Run scope is untouched. */
  loadMap(map: MapDef): void {
    const scope = this.state.map;

    scope.units.releaseAll();
    scope.projectiles.releaseAll();
    scope.effects.releaseAll();
    scope.zones.releaseAll();
    scope.walkability = null;
    scope.spatialHash = null;
    scope.mapId = map.id;
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

/** A world at tick zero on `map`, with the registry's tuning copied into run scope and the random source at the start of `seed`'s sequence. */
export const createWorld = (options: CreateWorldOptions): Simulation =>
  new Simulation(options);
