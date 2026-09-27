import type { EntityId, Vec2 } from "@shared/public";
import { assert, distanceSquared } from "@shared/public";
import { isReachable } from "../../abilities/primitives/targets";
import type { UnitRecord } from "../../definitions/unit-state";
import type { Unit } from "../../entities/unit";
import { UNIT_CAPACITY } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { createCandidateBuffer } from "../../movement/spatial-hash";
import {
  clearOrder,
  issueAttackTarget,
  issueMove,
} from "../../orders/state-machine";
import { resolveDestinationFor } from "../../pathing/destination";
import {
  DRAW_PURPOSE,
  KEYED_DRAW_RANGE,
  keyedDraw,
} from "../../random/keyed-draw";
import type { MachineBehaviour } from "../behaviour";
import { resolveBehaviour } from "../behaviours/index";

/**
 * What every state of the machine shares: its scratch, the tests that send a unit home or
 * wake it, the walks and stops it orders, and the transitions more than one state takes.
 */

/** The shortest halt as a share of the halt seconds: a halt lasts between half and all of them. */
const SHORTEST_HALT_SHARE = 0.5;

/** What the machine reads from the tuning table, filled at the start of every AI pass. */
export type MachineTuning = {
  wanderRadius: number;
  wanderTicks: number;
  repathTicks: number;
  haltChance: number;
  haltTicks: number;
  holdMargin: number;
  epsilon: number;
};

/**
 * The machine's working memory, world-owned scratch: its tunables, read at the start of
 * every AI pass; the point a behaviour wants to stand at and the legal point an order walks
 * to, each written for every unit before it is read; and the ids the hash proposes around a
 * spawn point, since one unit asks at a time.
 */
export type MachineScratch = {
  tuning: MachineTuning;
  standing: Vec2;
  destination: Vec2;
  candidates: EntityId[];
};

/** The machine's scratch. Made once, with the world. */
export const createMachineScratch = (): MachineScratch => ({
  tuning: {
    wanderRadius: 0,
    wanderTicks: 0,
    repathTicks: 0,
    haltChance: 0,
    haltTicks: 0,
    holdMargin: 0,
    epsilon: 0,
  },
  standing: { x: 0, y: 0 },
  destination: { x: 0, y: 0 },
  candidates: createCandidateBuffer(UNIT_CAPACITY),
});

/** The machine behaviour `unit`'s definition names, or `null` for a unit with no definition or a driver of its own. */
export const machineOf = (
  world: World,
  unit: Readonly<Unit>,
): MachineBehaviour | null => {
  const definitionId = unit.definitionId;
  const record =
    definitionId === null ? undefined : world.run.units.get(definitionId);
  const behaviour =
    record === undefined ? null : resolveBehaviour(record.def.behaviour);

  return behaviour !== null && behaviour.kind === "machine" ? behaviour : null;
};

/** Whether the hero is there to be noticed: alive, something may land on it, and nothing hides it from enemy sight. */
export const canSee = (hero: Readonly<Unit> | null): hero is Unit =>
  hero !== null && isReachable(hero) && !hero.disables.aggroHidden;

/**
 * Whether the hero is lost to a unit already fighting it: gone, dead, or untargetable. A dead
 * hero is lost like any other, so what was chasing it walks home rather than across the map to
 * where it will stand up again, and notices it there as it would anyone.
 */
export const isLost = (hero: Readonly<Unit> | null): hero is null =>
  hero === null || hero.state === "dead" || hero.disables.untargetable;

/** Whether the unit stands further from its leash anchor than its leash reaches. */
export const isPastLeash = (
  unit: Readonly<Unit>,
  record: UnitRecord,
): boolean => {
  const leash = record.def.leashRadius;

  return distanceSquared(unit.curr, unit.ai.leashAnchor) > leash * leash;
};

/** The leash measured from the spawn point again. */
export const anchorAtHome = (unit: Unit): void => {
  unit.ai.leashAnchor.x = unit.spawnPoint.x;
  unit.ai.leashAnchor.y = unit.spawnPoint.y;
};

/**
 * The leash measured from where the unit stands as a hit wakes it on its way home, brought
 * onto the circle of its leash radius round the spawn point if it stands beyond it, so however
 * often a returning unit is pulled again it follows no further than twice its leash from home.
 */
export const anchorWhereWoken = (unit: Unit, record: UnitRecord): void => {
  const leash = record.def.leashRadius;
  const home = unit.spawnPoint;
  const anchor = unit.ai.leashAnchor;
  const away = distanceSquared(unit.curr, home);

  anchor.x = unit.curr.x;
  anchor.y = unit.curr.y;

  if (away <= leash * leash) {
    return;
  }

  const share = leash / Math.sqrt(away);

  anchor.x = home.x + (unit.curr.x - home.x) * share;
  anchor.y = home.y + (unit.curr.y - home.y) * share;
};

/**
 * Walks to (`x`, `y`) resolved to somewhere the unit may stand. A unit already walking a move
 * there keeps its order and its turn and asks for its path again from where it stands, which
 * is how one a pack has pushed off its waypoints in a corridor finds its way on.
 */
export const walkTo = (
  world: World,
  unit: Unit,
  x: number,
  y: number,
): void => {
  const tuning = world.scratch.machine.tuning;
  const destination = world.scratch.machine.destination;

  resolveDestinationFor(world, unit, x, y, destination);

  const isSameWalk =
    unit.order.kind === "move" &&
    distanceSquared(destination, unit.order.destination) <=
      tuning.epsilon * tuning.epsilon;

  if (isSameWalk) {
    unit.needsPath = true;

    return;
  }

  const result = issueMove(unit, destination.x, destination.y);

  assert(result === "ok", "A living unit takes the walk its machine asks for");
};

/** Lets go of whatever order the unit holds, so it stands where it is. */
export const stand = (unit: Unit): void => {
  if (unit.order.kind !== "none") {
    const result = clearOrder(unit);

    assert(result === "ok", "A living unit stops where it stands");
  }
};

/**
 * Whether a chasing unit that would walk halts instead, and if it does, the halt begun: with
 * the halt chance, drawn on the unit's own id at this tick, it lets go of its order and stands
 * for between half and all of the halt ticks, the length a second draw. A unit whose slot
 * holds no id, or a halt chance or length of zero, never halts, and a draw writes nothing, so
 * with either at zero the chase is exactly what it is without the halt.
 */
export const startsHalt = (
  world: World,
  unit: Unit,
  index: number,
): boolean => {
  const tuning = world.scratch.machine.tuning;
  const unitId = world.map.units.idAt(index);

  if (
    unitId === null ||
    tuning.haltTicks <= 0 ||
    keyedDraw(world, unitId, DRAW_PURPOSE.chaseHalt) >=
      tuning.haltChance * KEYED_DRAW_RANGE
  ) {
    return false;
  }

  const shortest = Math.ceil(tuning.haltTicks * SHORTEST_HALT_SHARE);
  const lengths = tuning.haltTicks - shortest + 1;
  const drawn = keyedDraw(world, unitId, DRAW_PURPOSE.chaseHaltLength);

  unit.ai.haltUntilTick =
    world.tick + shortest + Math.floor((drawn * lengths) / KEYED_DRAW_RANGE);
  stand(unit);

  return true;
};

/**
 * Walks to where the behaviour wants to stand, the scratch point, resolved to somewhere the
 * unit may stand; a unit already there stops instead, letting go of whatever order it held, so
 * one that waits where it is neither asks for a path to its own feet nor walks at the hero
 * under an attack order. A chasing unit, `index` being its slot, may halt instead of walking;
 * a unit backing away passes `null` and never does.
 */
export const standOrWalk = (
  world: World,
  unit: Unit,
  index: number | null,
): void => {
  const tuning = world.scratch.machine.tuning;
  const standing = world.scratch.machine.standing;
  const destination = world.scratch.machine.destination;

  resolveDestinationFor(world, unit, standing.x, standing.y, destination);

  if (
    distanceSquared(destination, unit.curr) >
    tuning.epsilon * tuning.epsilon
  ) {
    if (index !== null && startsHalt(world, unit, index)) {
      return;
    }

    walkTo(world, unit, destination.x, destination.y);

    return;
  }

  stand(unit);
};

/** Into Return: the fight is dropped, whatever point was under way is cancelled, and the unit walks home. A projectile already fired flies on. */
export const enterReturn = (world: World, unit: Unit): void => {
  const tuning = world.scratch.machine.tuning;

  unit.ai.state = "return";
  unit.ai.provoked = false;
  unit.ai.repathAtTick = world.tick + tuning.repathTicks;
  walkTo(world, unit, unit.spawnPoint.x, unit.spawnPoint.y);
};

/** Into Idle at home: the wander is scheduled afresh from here, the leash is measured from the spawn point again, and anything that hit it as it arrived is forgotten. */
export const enterIdle = (unit: Unit): void => {
  unit.ai.state = "idle";
  unit.ai.provoked = false;
  unit.ai.wanderAtTick = null;
  anchorAtHome(unit);
};

/** Into Attack: the unit takes the hero as its attack target, and the attack rule faces, swings, and fires exactly as it does for the hero's own attack. */
export const enterAttack = (unit: Unit, heroId: EntityId): void => {
  unit.ai.state = "attack";

  if (unit.order.kind === "attack_target" && unit.order.targetId === heroId) {
    return;
  }

  const result = issueAttackTarget(unit, heroId);

  assert(result === "ok", "A living unit takes the hero as its target");
};
