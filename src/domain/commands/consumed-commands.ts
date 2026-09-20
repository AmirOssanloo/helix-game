import type { AnyCommand } from "./command";

/**
 * The commands the current tick consumed, in the order the ordering rule gave them. The tick
 * fills it from the buffer before the systems run and forgets it after them, so a system that
 * reads it sees this tick's commands and nothing older. It is a window onto the buffer, not a
 * copy: nothing is built per tick to expose it.
 */
export type ConsumedCommands = Readonly<{
  count: number;
  /** The consumed command at `index`, in order, or `null` outside [0, `count`). */
  at: (index: number) => AnyCommand | null;
}>;
