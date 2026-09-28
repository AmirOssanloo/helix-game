import type { UnitId } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import { STATUS_NEVER_ENDS, writeStatus } from "./status-table";

/** Why a status did not land: no status has the id, the unit is gone, dead, or out of reach, or every row of its table is taken. */
export type StatusRefusal =
  | "unknown_status"
  | "target_not_found"
  | "dead"
  | "target_untargetable"
  | "status_table_full";

/** What applying a status returns: it is on the table, or the reason it is not. */
export type StatusResult = "ok" | StatusRefusal;

/** Announces a status landing on or leaving a unit, through the world's one event record. */
export const announceStatus = (
  world: World,
  kind: "status_applied" | "status_expired",
  unitId: UnitId,
  sourceId: UnitId | null,
  statusId: string,
): void => {
  const event = world.scratch.event;

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
 * the caller decides what a status that does not apply means. An end past `STATUS_NEVER_ENDS`
 * is held at it, so a status given that many ticks lasts as long as its holder.
 */
export const applyStatus = (
  world: World,
  targetId: UnitId,
  statusId: string,
  ticks: number,
  sourceId: UnitId | null,
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
    Math.min(world.tick + ticks, STATUS_NEVER_ENDS),
    sourceId,
    orbLevels,
  );

  if (write === "status_table_full") {
    return "status_table_full";
  }

  if (write !== "ignored") {
    announceStatus(world, "status_applied", targetId, sourceId, statusId);
  }

  return "ok";
};
