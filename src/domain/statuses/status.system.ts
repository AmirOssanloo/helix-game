import type { EntityId } from "@shared/public";
import { createCastRecord, fillHookCast } from "../abilities/cast-context";
import { runEffects } from "../abilities/effect-runner";
import { applyDamage } from "../combat/damage";
import { ORB_IDS } from "../definitions/orb-id";
import type { StatusRecord } from "../definitions/status-state";
import { amountAtOrbLevel } from "../definitions/status-state";
import type { StatusEntry, Unit } from "../entities/unit";
import { clearStatusEntry, STATUS_TABLE_SIZE } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { clearDisableFlags, raiseDisable } from "../orders/disable-flags";
import { clearOrder, resumeOrder, suspendOrder } from "../orders/state-machine";
import { addModifier, removeModifiers } from "../stats/modifiers";
import { writeStatus } from "./status-table";

/** Why a status did not land: no status has the id, the unit is gone, dead, or out of reach, or every row of its table is taken. */
export type StatusRefusal =
  | "unknown_status"
  | "target_not_found"
  | "dead"
  | "target_untargetable"
  | "status_table_full";

/** What applying a status returns: it is on the table, or the reason it is not. */
export type StatusResult = "ok" | StatusRefusal;

/** Scratch for the event an application or an expiry announces, reused for every one. */
const event = createDomainEvent();

/** Scratch for the context an expiry list runs with, reused for every one of every tick. */
const context = createCastRecord();

/**
 * The rows one unit's pass found ended, kept as the three things an expiry list needs after
 * the row itself is empty: which status ended, who applied it, and the levels its tables are
 * read at. The pass fills these and runs the lists after it, so a list that puts a status on
 * the same unit does not lengthen the pass that ran it.
 */
const endedIds: (string | null)[] = [];

const endedSources: (EntityId | null)[] = [];

const endedLevels: number[][] = [];

for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
  endedIds.push(null);
  endedSources.push(null);
  endedLevels.push(ORB_IDS.map(() => 0));
}

const announce = (
  world: World,
  kind: "status_applied" | "status_expired",
  unitId: EntityId,
  sourceId: EntityId | null,
  statusId: string,
): void => {
  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.unitId = unitId;
  event.sourceId = sourceId;
  event.statusId = statusId;
  world.events.write(event);
};

/**
 * The one door a status enters by: `statusId` on the unit `targetId` names for `ticks`, from
 * `sourceId` or from nobody, with `orbLevels` the applier's three levels in orb order, which
 * every table on the definition is read at for as long as the row lasts.
 *
 * A unit that already holds the status is answered by the definition's stack rule: refresh
 * keeps one row, stack adds a stack to it, and ignore drops the application and changes
 * nothing. Refresh and stack both take the later of the two end ticks, so the longer remaining
 * duration wins, and both take the new applier's source and levels. Nothing lands on a unit
 * that is gone, dead, or untargetable, and nothing lands when every row of the table is taken;
 * the caller decides what a status that does not apply means.
 */
export const applyStatus = (
  world: World,
  targetId: EntityId,
  statusId: string,
  ticks: number,
  sourceId: EntityId | null,
  orbLevels: readonly number[],
): StatusResult => {
  const record = world.run.statuses.get(statusId);

  if (record === undefined) {
    return "unknown_status";
  }

  const target = world.map.units.resolve(targetId);

  if (target === null) {
    return "target_not_found";
  }

  if (target.state === "dead") {
    return "dead";
  }

  if (target.disables.untargetable) {
    return "target_untargetable";
  }

  const write = writeStatus(
    target.statuses,
    statusId,
    record.def.stack,
    world.tick + ticks,
    sourceId,
    orbLevels,
  );

  if (write === "status_table_full") {
    return "status_table_full";
  }

  if (write !== "ignored") {
    announce(world, "status_applied", targetId, sourceId, statusId);
  }

  return "ok";
};

/** Writes every stat the status changes into the unit's modifier table, each amount multiplied by the row's stacks. */
const installModifiers = (
  unit: Unit,
  record: StatusRecord,
  entry: Readonly<StatusEntry>,
): void => {
  for (let index = 0; index < record.modifiers.length; index += 1) {
    const modifier = record.modifiers[index];

    if (modifier === undefined) {
      continue;
    }

    const amount = amountAtOrbLevel(modifier, entry.orbLevels) * entry.stacks;
    const flat = modifier.kind === "flat" ? amount : 0;
    const percent = modifier.kind === "percent" ? amount : 0;

    addModifier(unit.modifiers, "status", modifier.stat, flat, percent);
  }
};

/** Takes this tick's share of the status's damage out of the unit, credited to whoever applied it. */
const takeDamageOverTime = (
  world: World,
  unitId: EntityId,
  record: StatusRecord,
  entry: Readonly<StatusEntry>,
): void => {
  const damage = record.damageOverTime;

  if (damage === null) {
    return;
  }

  applyDamage(
    world,
    unitId,
    amountAtOrbLevel(damage, entry.orbLevels) * entry.stacks,
    damage.damageType,
    entry.sourceId,
  );
};

/** Keeps what the ended row's list needs, in the scratch slot `found`, before the row is emptied. */
const rememberEnded = (found: number, entry: Readonly<StatusEntry>): void => {
  const levels = endedLevels[found];

  endedIds[found] = entry.definitionId;
  endedSources[found] = entry.sourceId;

  if (levels === undefined) {
    return;
  }

  for (let orb = 0; orb < levels.length; orb += 1) {
    levels[orb] = entry.orbLevels[orb] ?? 0;
  }
};

/**
 * Reads one unit's status table: every row whose tick has come is remembered, emptied, and
 * announced, and every row still live raises the flags its definition sets, writes its
 * modifier rows, and takes its damage. The unit's flags and its status modifier rows are
 * rewritten from nothing each tick, so a status that ended takes everything it set with it on
 * the tick it ended.
 *
 * Returns how many rows ended, which the pass reads back out of the scratch to run their
 * expiry lists once the whole table has been read.
 */
const readTable = (world: World, unit: Unit, unitId: EntityId): number => {
  removeModifiers(unit.modifiers, "status");
  clearDisableFlags(unit.disables);

  let ended = 0;

  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry === undefined || entry.definitionId === null) {
      continue;
    }

    const record = world.run.statuses.get(entry.definitionId);

    if (record === undefined || world.tick >= entry.endsAtTick) {
      announce(
        world,
        "status_expired",
        unitId,
        entry.sourceId,
        entry.definitionId,
      );
      rememberEnded(ended, entry);
      ended += 1;
      clearStatusEntry(entry);

      continue;
    }

    for (let index = 0; index < record.def.flags.length; index += 1) {
      const flag = record.def.flags[index];

      if (flag !== undefined) {
        raiseDisable(unit.disables, flag);
      }
    }

    installModifiers(unit, record, entry);
    takeDamageOverTime(world, unitId, record, entry);
  }

  return ended;
};

/**
 * Runs the expiry list of every status that ended on this unit this tick, anchored where the
 * holder stands and aimed at the holder, cast by whoever applied the status so what the list
 * deals is credited where the status came from, and read at the levels the row snapshotted.
 *
 * It runs after the whole table has been read, so the flags the ended status set are already
 * off the unit: a lift's damage lands on a unit the lift no longer makes untargetable, and it
 * lands where the unit was dropped. A status the list puts on is read by the next tick's pass,
 * as one a damage hook puts on is.
 */
const runExpiries = (
  world: World,
  unit: Readonly<Unit>,
  unitId: EntityId,
  ended: number,
): void => {
  for (let slot = 0; slot < ended; slot += 1) {
    const statusId = endedIds[slot];
    const record =
      statusId === undefined || statusId === null
        ? undefined
        : world.run.statuses.get(statusId);
    const levels = endedLevels[slot];

    if (record === undefined || levels === undefined) {
      continue;
    }

    if (record.def.onExpiry.length === 0) {
      continue;
    }

    const cast = fillHookCast(
      context,
      endedSources[slot] ?? unitId,
      levels,
      unit.curr.x,
      unit.curr.y,
      unit.facing,
      unitId,
    );

    runEffects(world, cast, record.def.onExpiry);
  }
};

/**
 * Keeps every unit's disable flags and status modifier rows true to its status table, early
 * in the tick: right after the commands are applied, so a status the tick put on is in this
 * tick's flags and this tick's derived values, and before the stats are derived, the cast
 * stages run, and death resolves, so a slow reaches this tick's movement and a damage over
 * time that empties a unit is read by the death pass at the end of the same tick. The
 * validator reads the flags this pass wrote, which is the previous tick's for a command
 * arriving now: a status that lands mid-tick blocks from the next tick on.
 *
 * A stun clears the order, so a stunned unit stands where it was and whatever it was casting
 * is cancelled; a root clears a move or an attack-move, so a rooted unit does not resume it
 * when the root ends. A lift is the one condition that gives an order back: it takes the
 * order off the unit for as long as the unit is in the air and puts it on again on the tick
 * the lift ends, from wherever the unit was dropped. A dead unit holds no order and keeps its
 * empty table until it respawns.
 *
 * A status that ended runs its expiry list on the same tick, between the table being read and
 * the order being given back, so what the list does lands on a unit already free of what the
 * status set. Death clears the table without a sweep, so a status a death took never expires
 * and never runs its list.
 */
export const statusSystem = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const unitId = units.idAt(index);

    if (unit === null || unitId === null) {
      continue;
    }

    runExpiries(world, unit, unitId, readTable(world, unit, unitId));

    if (unit.state === "dead") {
      continue;
    }

    if (unit.disables.lifted) {
      suspendOrder(unit);

      continue;
    }

    if (unit.suspended.kind !== "none") {
      resumeOrder(unit);
    }

    const isWalking =
      unit.order.kind === "move" || unit.order.kind === "attack_move";

    if (unit.disables.stunned || (unit.disables.rooted && isWalking)) {
      clearOrder(unit);
    }
  }
};
