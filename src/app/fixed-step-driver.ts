import type { AnyCommand, Tick } from "@domain/public";
import { readTunable } from "@domain/public";
import type { InstrumentationRings } from "@instrumentation/public";
import type { Steppable } from "@simulation/public";

const MS_PER_SECOND = 1000;

/**
 * The constant step, in wall milliseconds, of a world ticking `simHz` times a second. Never a
 * frame delta. The driver reads the rate from the world it steps, so the driver and every
 * duration the world converted agree, and no command can change it.
 */
export const stepMsOf = (simHz: number): number => MS_PER_SECOND / simHz;

/** The catch-up cap a driver starts with: ticks one render frame may run before the remaining time is dropped rather than queued. */
export const MAX_TICKS_PER_FRAME = 3;

/** A source of wall milliseconds. The driver takes one so a test can run it in Node with a clock it controls. */
export type Clock = Readonly<{
  now: () => number;
}>;

/** The wall clock. This is the only place in the repository that reads one. */
export const wallClock: Clock = {
  now: (): number => performance.now(),
};

export type FixedStepDriverOptions = Readonly<{
  world: Steppable;
  rings: InstrumentationRings;
  clock: Clock;
}>;

/**
 * Turns frames into whole ticks. Each frame it adds the delta to an accumulator, runs one tick
 * per whole step held, at most the catch-up cap, and drops the rest; measures each tick into
 * the rings; and keeps the interpolation fraction the presentation reads. While the document
 * is hidden it runs nothing and refuses every submit, so a tab that was away for a minute
 * neither replays a minute nor keeps the input that arrived meanwhile.
 *
 * Pause, single-step, and the cap are the developer panel's: they decide whether a frame
 * calls `tick`, never what a tick does, so they are not commands and are not in the log. A
 * paused driver still takes commands; they wait in the buffer for the next tick, as a click
 * during a pause does.
 *
 * Commands enter the world through `submit` here, so the arrival stamp comes from this clock
 * and the hidden check happens before the buffer sees anything.
 */
export class FixedStepDriver {
  private readonly world: Steppable;

  private readonly rings: InstrumentationRings;

  private readonly clock: Clock;

  private readonly stepMs: number;

  private accumulatorMs = 0;

  private fraction = 0;

  private isHidden = false;

  private isPaused = false;

  private cap = MAX_TICKS_PER_FRAME;

  private discardCount = 0;

  constructor(options: FixedStepDriverOptions) {
    this.world = options.world;
    this.rings = options.rings;
    this.clock = options.clock;
    this.stepMs = stepMsOf(
      readTunable(options.world.view.run.tuning, "sim_hz"),
    );
  }

  /** How far the accumulator is into the next step, in [0, 1). The presentation interpolates by it. */
  get alpha(): number {
    return this.fraction;
  }

  /** Whether the driver is paused because the document is hidden. */
  get hidden(): boolean {
    return this.isHidden;
  }

  /** Whether the developer panel has paused the clock. */
  get paused(): boolean {
    return this.isPaused;
  }

  /** Ticks one frame may run before the remaining time is dropped. */
  get catchUpCap(): number {
    return this.cap;
  }

  /** Commands refused because they arrived while hidden, since creation. */
  get discarded(): number {
    return this.discardCount;
  }

  /** The tick the next submitted command applies to. */
  get nextTick(): Tick {
    return this.world.view.tick;
  }

  /** The arrival stamp for a command being built now. */
  now(): number {
    return this.clock.now();
  }

  /** Hands `command` to the world, or discards it with `false` while hidden. */
  submit(command: AnyCommand): boolean {
    if (this.isHidden) {
      this.discardCount += 1;

      return false;
    }

    return this.world.submit(command);
  }

  /** Pauses or resumes. Either way the accumulated time is dropped, so resuming never catches up. */
  setHidden(hidden: boolean): void {
    this.isHidden = hidden;
    this.accumulatorMs = 0;
  }

  /** Stops or restarts the clock. The accumulated time is dropped either way, so resuming never catches up. */
  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.accumulatorMs = 0;
  }

  /** Runs exactly one tick while paused, or none with `false` while running or hidden: a step is a thing the panel does to a stopped clock. */
  step(): boolean {
    if (!this.isPaused || this.isHidden) {
      return false;
    }

    this.runTick();

    return true;
  }

  /** Sets the catch-up cap. A cap below one, or not a whole number, is refused with `false`. */
  setCatchUpCap(cap: number): boolean {
    if (!Number.isInteger(cap) || cap < 1) {
      return false;
    }

    this.cap = cap;

    return true;
  }

  /** One render frame of `frameDeltaMs` wall milliseconds. */
  onFrame(frameDeltaMs: number): void {
    if (this.isHidden) {
      return;
    }

    if (frameDeltaMs > 0) {
      this.rings.frameRate.write(MS_PER_SECOND / frameDeltaMs);
    }

    if (this.isPaused) {
      return;
    }

    this.accumulatorMs += frameDeltaMs;

    let steps = 0;

    while (this.accumulatorMs >= this.stepMs && steps < this.cap) {
      this.runTick();
      this.accumulatorMs -= this.stepMs;
      steps += 1;
    }

    if (steps === this.cap) {
      this.accumulatorMs = 0;
    }

    this.fraction = this.accumulatorMs / this.stepMs;
  }

  private runTick(): void {
    const start = this.clock.now();

    this.world.tick();

    this.rings.tickTime.write(this.clock.now() - start);

    const map = this.world.view.map;

    this.rings.liveUnits.write(map.units.count);
    this.rings.liveProjectiles.write(map.projectiles.count);
    this.rings.liveEffects.write(map.effects.count);
    this.rings.liveZones.write(map.zones.count);
    this.rings.poolMisses.write(
      map.units.misses +
        map.projectiles.misses +
        map.effects.misses +
        map.zones.misses,
    );
    this.rings.eventOverwrites.write(this.world.events.overwrites);
  }
}
