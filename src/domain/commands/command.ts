import type { Tick } from "../tick";

/**
 * A player intent entering the simulation: one variant per intent, produced by the input
 * mapper. Every variant carries `tick`, the tick it applies to, and `timestamp`, the arrival
 * stamp the driver writes at submit time. The ordering rule sorts by `timestamp`; it is an
 * ordering key, never a duration, and nothing inside the simulation does arithmetic on it.
 */
export type Command = NoopCommand;

/** Proves the plumbing: ordered, consumed, and logged like any command, and changes nothing. */
export type NoopCommand = Readonly<{
  kind: "noop";
  tick: Tick;
  timestamp: number;
}>;

/**
 * A developer-panel intent. It lands in the same buffer and the same input log as a player
 * command, so a session with the panel open replays exactly.
 */
export type DebugCommand = DebugNoopCommand;

/** The debug twin of `noop`: proves the panel's path through the buffer and the log. */
export type DebugNoopCommand = Readonly<{
  kind: "debug_noop";
  tick: Tick;
  timestamp: number;
}>;

/** Anything the buffer accepts: a player command or a debug command. */
export type AnyCommand = Command | DebugCommand;
