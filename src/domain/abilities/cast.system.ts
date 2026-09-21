import type { Vec2 } from "@shared/public";
import { assert, bearing, distanceSquared } from "@shared/public";
import type { SpellRecord } from "../definitions/spell-state";
import { entryAtLevel } from "../definitions/spell-state";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { isPathComplete } from "../movement/path";
import { isInsideCone, turnToward } from "../movement/turn";
import {
  beginCastBackswing,
  beginCastPoint,
  beginFacing,
  clearOrder,
  finishBackswing,
} from "../orders/state-machine";
import { resolveDestinationFor } from "../pathing/destination";
import { castLevelOf, isInCastRange, resourcesOf } from "./cast";
import type { CooldownSnapshot } from "./cooldowns";
import {
  createCooldownSnapshot,
  finalCooldownTicks,
  snapshotCooldownSources,
  startCooldown,
} from "./cooldowns";
import { hasMana, spendMana } from "./mana";

/** What the turn-and-face stage reads from the tuning table, filled once per tick. */
type FacingTuning = {
  turnStep: number;
  rampTicks: number;
  cone: number;
};

/** Scratch for where a unit's cast is aimed this tick, reused for every unit. */
const aim: Vec2 = { x: 0, y: 0 };

/** Scratch for the legal point an approach walks to, reused for every unit. */
const approach: Vec2 = { x: 0, y: 0 };

/** Scratch for what the modifier table takes off a clock at commit, reused for every commit. */
const snapshot: CooldownSnapshot = createCooldownSnapshot();

/** Scratch for the event a commit announces, reused for every one. */
const event = createDomainEvent();

/** The facing tunables, read once per tick. */
const facing: FacingTuning = { turnStep: 0, rampTicks: 0, cone: 0 };

/** A unit target that no longer exists, where a bound radius would be. */
const TARGET_GONE = -1;

const announceCommitted = (world: World, abilityId: string): void => {
  resetDomainEvent(event);
  event.kind = "cast_committed";
  event.tick = world.tick;
  event.abilityId = abilityId;
  world.events.write(event);
};

/** Whether the unit is turning toward or walking the approach of its cast order. */
const isApproaching = (unit: Readonly<Unit>): boolean =>
  unit.order.kind === "cast" &&
  (unit.state === "turning" || unit.state === "moving");

/**
 * Writes where `unit`'s cast is aimed this tick into `out`: a unit target's current position,
 * else the point the request stored. Returns the target's bound radius, zero for a point, or
 * `TARGET_GONE` when the unit the cast names no longer exists.
 */
const aimOf = (world: World, unit: Readonly<Unit>, out: Vec2): number => {
  if (unit.cast.targetKind === "unit") {
    const target =
      unit.cast.targetId === null
        ? null
        : world.map.units.resolve(unit.cast.targetId);

    if (target === null) {
      return TARGET_GONE;
    }

    out.x = target.curr.x;
    out.y = target.curr.y;

    return target.boundRadius;
  }

  out.x = unit.cast.position.x;
  out.y = unit.cast.position.y;

  return 0;
};

/** The backswing stage: on its tick, the unit is done and idle, or back to the order it still holds. */
const endBackswingWhenDue = (world: World, unit: Unit): void => {
  if (unit.state !== "ability_backswing" || world.tick < unit.stageEndsAtTick) {
    return;
  }

  const result = finishBackswing(unit);

  assert(result === "ok", "A backswing that ran its course finishes");
};

/** Ends the cast with nothing spent and no clock started: the unit is idle where it stands. */
const cancel = (unit: Unit): void => {
  const result = clearOrder(unit);

  assert(result === "ok", "A cast is cancelled from any state");
};

/**
 * The approach stage, out of range: the order's destination is the legal point nearest the
 * aim, refreshed when the aim moves, and a path to it is asked for. A unit standing at the
 * end of its path and still out of range has nowhere closer to go, and the cast is cancelled.
 */
const approachTarget = (world: World, unit: Unit, epsilon: number): void => {
  const aimMoved =
    aim.x !== unit.cast.position.x || aim.y !== unit.cast.position.y;

  if (unit.needsPath || aimMoved) {
    unit.cast.position.x = aim.x;
    unit.cast.position.y = aim.y;
    resolveDestinationFor(world, unit, aim.x, aim.y, approach);
    unit.order.destination.x = approach.x;
    unit.order.destination.y = approach.y;
    unit.needsPath = true;

    return;
  }

  if (
    isPathComplete(unit.path) &&
    distanceSquared(unit.curr, unit.order.destination) <= epsilon * epsilon
  ) {
    cancel(unit);
  }
};

/**
 * The face stage, in range: the unit stands where it is and turns toward the aim along the
 * shortest arc at its turn rate, with the same ramp a move uses. Returns whether the bearing
 * is inside the action cone after this tick's turn, which is when the cast point may begin.
 * An aim under the unit's own centre has no bearing and counts as faced.
 */
const faceTarget = (unit: Unit): boolean => {
  if (unit.state === "moving" || unit.needsPath || unit.path.count > 0) {
    const result = beginFacing(unit);

    assert(
      result === "ok",
      "A unit approaching its cast target stops to face it",
    );
  }

  const toTarget =
    aim.x === unit.curr.x && aim.y === unit.curr.y
      ? unit.facing
      : bearing(unit.curr, aim);

  unit.facing = turnToward(
    unit.facing,
    toTarget,
    facing.turnStep,
    facing.rampTicks,
    unit.turnTicks,
  );
  unit.turnTicks = unit.facing === toTarget ? 0 : unit.turnTicks + 1;

  return isInsideCone(unit.facing, toTarget, facing.cone);
};

/**
 * The commit stage, on the tick the cast point ends: the mana is spent, the clock starts for
 * the definition's cooldown at the unit's current level with the percentage the unit holds
 * at this moment baked in, the effects run, the commit is announced, and the backswing
 * begins. Mana that left since the request cancels instead, with nothing spent. The stubs
 * list no effects and no runner exists yet, so a definition that lists one is a broken
 * invariant until the runner arrives.
 */
const commit = (world: World, unit: Unit, record: SpellRecord): void => {
  const flags = world.run.debug;
  const level = castLevelOf(world, unit, record);
  const resources = resourcesOf(world, unit);
  const cost = entryAtLevel(record.def.manaCost, level);

  if (!hasMana(resources, cost, flags)) {
    cancel(unit);

    return;
  }

  spendMana(resources, cost, flags);
  startCooldown(
    unit.cooldowns,
    record.def.id,
    world.tick,
    finalCooldownTicks(
      entryAtLevel(record.cooldownTicks, level),
      snapshotCooldownSources(unit.modifiers, snapshot),
    ),
  );
  assert(
    record.def.effects.length === 0,
    "A definition with effects needs the effect runner",
  );
  announceCommitted(world, record.def.id);

  const result = beginCastBackswing(unit);

  assert(result === "ok", "A cast point that ended begins its backswing");
  unit.stageEndsAtTick = world.tick + record.backswingTicks;
};

/**
 * Runs the stages of every cast under way, one unit at a time: the approach while the aim is
 * out of range, the turn to face once it is in range, the cast point once the bearing is
 * inside the action cone, the commit on the tick the cast point ends, and the backswing
 * until its tick. A stun, a unit target that is gone, or an approach that ends short of
 * range cancels the cast with nothing spent; a stop or a new order does the same through the
 * state machine before this system runs. The cast point and the backswing are counted in
 * ticks from the record; a cast point of zero ticks commits on the tick it begins, and a
 * backswing of zero ticks ends on the tick of the commit.
 *
 * Runs after the stats, so the mana it spends is this tick's, and before pathing, so an
 * approach asked for here is planned this tick and an aim already in range is never walked
 * toward.
 */
export const castSystem = (world: World): void => {
  const tuning = world.run.tuning;
  const epsilon = readTunable(tuning, "arrival_epsilon");
  const units = world.map.units;

  facing.turnStep = readTunable(tuning, "turn_rate_T");
  facing.rampTicks = readTunable(tuning, "turn_ramp_ticks");
  facing.cone = readTunable(tuning, "action_cone_deg");

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null) {
      continue;
    }

    if (unit.state === "ability_backswing") {
      endBackswingWhenDue(world, unit);

      continue;
    }

    const abilityId = unit.cast.abilityId;

    if (abilityId === null) {
      continue;
    }

    const record = world.run.spells.get(abilityId);

    assert(
      record !== undefined,
      "A cast names a spell the request stage found",
    );

    if (unit.disables.stunned) {
      cancel(unit);

      continue;
    }

    const targetBound = aimOf(world, unit, aim);

    if (targetBound === TARGET_GONE) {
      cancel(unit);

      continue;
    }

    if (isApproaching(unit)) {
      const kind = unit.cast.targetKind;

      if (!isInCastRange(unit, record, kind, aim.x, aim.y, targetBound)) {
        approachTarget(world, unit, epsilon);

        continue;
      }

      if (kind !== "none" && !faceTarget(unit)) {
        continue;
      }

      const result = beginCastPoint(unit);

      assert(result === "ok", "A unit facing its target begins its cast point");
      unit.stageEndsAtTick = world.tick + record.castPointTicks;
    }

    if (
      unit.state === "ability_cast_point" &&
      world.tick >= unit.stageEndsAtTick
    ) {
      commit(world, unit, record);
      endBackswingWhenDue(world, unit);
    }
  }
};
