/**
 * The simulation's door for tests: what is behind ./public.ts, for a spec to arrange a world,
 * step its systems, and replay a log. Lint and the architecture test let only tests/ import it.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */
export { COMMAND_BUFFER_CAPACITY, CommandBuffer } from "./command-buffer";
export { EVENT_RING_CAPACITY, EventRing } from "./event-ring";
export { InputLog } from "./input-log";
export { createRandomState, nextFloat, nextInt, seedRandom } from "./random";
export {
  contentVersionOf,
  PRESENTATION_FIELDS,
  strictContentVersionOf,
} from "./replay/content-version";
export { serializeInputLog } from "./replay/input-log-file";
export type { ExcludedPath, Leaf, LeafKind } from "./replay/field-list";
export { createHasher, type Hasher } from "./replay/hash-words";
export {
  checksumMismatch,
  CHECKSUM_INTERVAL,
  recordChecksums,
  type StateChecksum,
  STATE_EXCLUDED,
  STATE_LEAVES,
  stateChecksum,
  stateDifference,
} from "./replay/state-checksum";
export {
  beginReplay,
  checkReplayable,
  mapOfLog,
  Replay,
  type ReplayOptions,
} from "./replay/replay";
export { Session } from "./session";
export { createSessionWorld, restartSessionWorld } from "./session-world";
export { type System, systems } from "./systems";
export { type CreateWorldOptions, createWorld, Simulation } from "./world";
