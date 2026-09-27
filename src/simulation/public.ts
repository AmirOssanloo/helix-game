/**
 * The simulation's door: what the layers past it hold of a running world. A session's handle
 * to make, step, and save one, the world's read-only view, and the event ring's read port.
 * The world itself, its systems, its command buffer, its random source, and the replay are
 * behind the door, and only tests reach them, through ./testing.ts.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export {
  createEventReader,
  type EventReader,
  type EventRingView,
} from "./event-ring";
export {
  type InputLogFile,
  type InputLogRecord,
  isReplayRefusal,
  parseInputLogFile,
  type ReplayRefusal,
} from "./replay/input-log-file";
export {
  type CommandStamps,
  createSession,
  type SessionHandle,
  type SessionOptions,
  type SessionRetune,
} from "./session";
export type { Steppable } from "./world";
export type { WorldView } from "./world-view";
