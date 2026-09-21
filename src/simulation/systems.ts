import type { World } from "@domain/public";
import {
  collisionSystem,
  commandSystem,
  movementSystem,
  pathingSystem,
  statsSystem,
} from "@domain/public";

/** A per-tick pass over world state. It reads the world, the tick count, and the random source, and nothing else. */
export type System = (world: World) => void;

/**
 * The one ordered list. The order in this file is the order every tick runs the systems in.
 *
 * Command application runs first, so every system after it sees the orders this tick's
 * commands produced. Stats run next, so the hero wears its active form's body and carries
 * this tick's derived values, with any modifier a command just added, before anything reads
 * them. Pathing follows, so an order consumed this tick has its path before movement reads
 * it. Movement follows, so an order consumed this tick turns or translates this tick.
 * Collision runs after movement, so every unit is pushed out of every other unit and every
 * obstacle where this tick's moves left it.
 */
export const systems: readonly System[] = [
  commandSystem,
  statsSystem,
  pathingSystem,
  movementSystem,
  collisionSystem,
];
