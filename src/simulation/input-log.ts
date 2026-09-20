import type { AnyCommand, Tick } from "@domain/public";

/**
 * Every command the world consumed, with the tick it was consumed on. The record a replay
 * feeds back and a bug report ships with.
 *
 * Two parallel arrays rather than an entry object per record: the log is the one thing in the
 * simulation that grows with the session, and a push of a number and a reference is the least
 * it can allocate per command. The command is stored by reference and never changed.
 */
export class InputLog {
  private readonly ticks: Tick[] = [];

  private readonly commands: AnyCommand[] = [];

  /** Commands recorded so far. */
  get count(): number {
    return this.commands.length;
  }

  /** Appends `command` as consumed on `tick`. */
  record(tick: Tick, command: AnyCommand): void {
    this.ticks.push(tick);
    this.commands.push(command);
  }

  /** The tick the record at `index` was consumed on, or `null` outside [0, `count`). */
  tickAt(index: number): Tick | null {
    const tick = this.ticks[index];

    return tick === undefined ? null : tick;
  }

  /** The command of the record at `index`, or `null` outside [0, `count`). */
  commandAt(index: number): AnyCommand | null {
    const command = this.commands[index];

    return command === undefined ? null : command;
  }

  /** Forgets every record. */
  clear(): void {
    this.ticks.length = 0;
    this.commands.length = 0;
  }
}
