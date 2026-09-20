import type { World } from "@domain/public";
import { commandSystem, movementSystem } from "@domain/public";

/** A per-tick pass over world state. It reads the world, the tick count, and the random source, and nothing else. */
export type System = (world: World) => void;

/**
 * The one ordered list. The order in this file is the order every tick runs the systems in.
 *
 * Command application runs first, so every system after it sees the orders this tick's
 * commands produced. Movement runs next, so an order consumed this tick turns or translates
 * this tick.
 */
export const systems: readonly System[] = [commandSystem, movementSystem];
