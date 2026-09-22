import type { EntityId } from "@shared/public";
import { applyDamage } from "../combat/damage";
import type { StatusRecord } from "../definitions/status-state";
import { amountAtOrbLevel } from "../definitions/status-state";
import type { StatusEntry, Unit } from "../entities/unit";
import { clearStatusEntry } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { clearDisableFlags, raiseDisable } from "../orders/disable-flags";
import { clearOrder } from "../orders/state-machine";
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

/**
 * Reads one unit's status table: every row whose tick has come is emptied and announced, and
 * every row still live raises the flags its definition sets, writes its modifier rows, and
 * takes its damage. The unit's flags and its status modifier rows are rewritten from nothing
 * each tick, so a status that ended takes everything it set with it on the tick it ended.
 */
const readTable = (world: World, unit: Unit, unitId: EntityId): void => {
  removeModifiers(unit.modifiers, "status");
  clearDisableFlags(unit.disables);

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
 * when the root ends. A dead unit holds no order and keeps its empty table until it respawns.
 */
export const statusSystem = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const unitId = units.idAt(index);

    if (unit === null || unitId === null) {
      continue;
    }

    readTable(world, unit, unitId);

    if (unit.state === "dead") {
      continue;
    }

    const isWalking =
      unit.order.kind === "move" || unit.order.kind === "attack_move";

    if (unit.disables.stunned || (unit.disables.rooted && isWalking)) {
      clearOrder(unit);
    }
  }
};
