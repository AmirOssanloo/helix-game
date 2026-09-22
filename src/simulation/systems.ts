import type { World } from "@domain/public";
import {
  castSystem,
  collisionSystem,
  commandSystem,
  deathSystem,
  kitSystem,
  movementSystem,
  pathingSystem,
  projectileSystem,
  statsSystem,
  statusSystem,
  zoneSystem,
} from "@domain/public";

/** A per-tick pass over world state. It reads the world, the tick count, and the random source, and nothing else. */
export type System = (world: World) => void;

/**
 * The one ordered list. The order in this file is the order every tick runs the systems in.
 *
 * Command application runs first, so every system after it sees the orders this tick's
 * commands produced. The status pass runs next, so a status the tick put on is in this tick's
 * disable flags and its modifier rows, a status that ended has taken everything it set with
 * it, and a stun clears the order before anything acts on it. The kit runs after it, so the
 * modifier rows the hero's held orbs grant are true to this tick's presses and levels. Stats run after it, so the hero wears its active
 * form's body and carries this tick's derived values, with every modifier the tick added,
 * before anything reads them. The cast stages run next, so a cast requested this tick spends
 * this tick's mana, faces or commits this tick, and asks for its approach before pathing plans
 * it. Pathing follows, so an order consumed this tick has its path before movement reads
 * it. Movement follows, so an order consumed this tick turns or translates this tick.
 * Collision runs after movement, so every unit is pushed out of every other unit and every
 * obstacle where this tick's moves left it. Projectiles fly after collision, so a sweep reads
 * where the tick's pushes and walks left every unit it could touch. Zones run after them, so
 * a zone's rules read the same settled positions, and a zone that travels moves before it
 * touches anything. Death resolves last, once, so every hit the tick
 * landed is counted, a damage over time that emptied a unit is read on the tick it emptied
 * it, and a hero at zero dies where collision left it; the table it empties is read by the
 * next tick's status pass.
 */
export const systems: readonly System[] = [
  commandSystem,
  statusSystem,
  kitSystem,
  statsSystem,
  castSystem,
  pathingSystem,
  movementSystem,
  collisionSystem,
  projectileSystem,
  zoneSystem,
  deathSystem,
];
