import type { AnyCommand } from "@domain/public";
import type { InputDriver } from "@presentation/public";
import type { Simulation } from "@simulation/testing";

/**
 * A driver for an input test: stamps commands with the world's tick and a clock that counts
 * one per call, hands each to the world, and keeps a copy so a spec asserts on exactly what
 * the mapper built. No wall clock anywhere. The frame is drawn at `alpha` between ticks, 0
 * unless a spec moves it.
 */
export class CommandRecorder implements InputDriver {
  readonly commands: AnyCommand[] = [];

  alpha = 0;

  private readonly world: Simulation;

  private clock = 0;

  constructor(world: Simulation) {
    this.world = world;
  }

  get nextTick(): number {
    return this.world.view.tick;
  }

  now(): number {
    this.clock += 1;

    return this.clock;
  }

  submit(command: AnyCommand): boolean {
    this.commands.push(command);

    return this.world.submit(command);
  }
}
