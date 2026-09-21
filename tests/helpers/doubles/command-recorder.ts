import type { AnyCommand } from "@domain/public";
import type { CommandDriver } from "@presentation/public";
import type { Simulation } from "@simulation/public";

/**
 * A driver for an input test: stamps commands with the world's tick and a clock that counts
 * one per call, hands each to the world, and keeps a copy so a spec asserts on exactly what
 * the mapper built. No wall clock anywhere.
 */
export class CommandRecorder implements CommandDriver {
  readonly commands: AnyCommand[] = [];

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
