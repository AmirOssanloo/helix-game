import type { World } from "@domain/public";

/** A per-tick pass over world state. It reads the world, the tick count, and the random source, and nothing else. */
export type System = (world: World) => void;

/**
 * The one ordered list. The order in this file is the order every tick runs the systems in.
 * Empty until the first system is registered.
 */
export const systems: readonly System[] = [];
