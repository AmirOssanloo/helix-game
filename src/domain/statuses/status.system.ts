import type { StatusEntry, Unit } from "../entities/unit";
import { clearStatusEntry } from "../entities/unit";
import type { World } from "../entities/world-state";
import type { DisableId } from "../orders/disable-flags";
import { clearOrder } from "../orders/state-machine";
import type { Tick } from "../tick";

/** Why a status was not applied: every row of the unit's table is taken. */
export type StatusRefusal = "status_table_full";

/** What applying a status returns: it is on the table, or the reason it is not. */
export type StatusResult = "ok" | StatusRefusal;

/**
 * Puts `definitionId` on `unit` until `endsAtTick`, refreshing the row it already holds or
 * taking the first empty one. A second application refreshes: the later end wins and the
 * effect does not grow, which is what every disable does. Refused when the table is full.
 */
export const applyStatus = (
  unit: Unit,
  definitionId: string,
  endsAtTick: Tick,
): StatusResult => {
  let empty: StatusEntry | null = null;

  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry === undefined) {
      continue;
    }

    if (entry.definitionId === definitionId) {
      entry.endsAtTick = Math.max(entry.endsAtTick, endsAtTick);

      return "ok";
    }

    if (empty === null && entry.definitionId === null) {
      empty = entry;
    }
  }

  if (empty === null) {
    return "status_table_full";
  }

  empty.definitionId = definitionId;
  empty.endsAtTick = endsAtTick;
  empty.stacks = 1;
  empty.sourceId = null;

  return "ok";
};

/** Whether the status `definitionId` names sets the disable `disable`, which is the id itself until definitions carry the mapping. */
const setsDisable = (definitionId: string, disable: DisableId): boolean =>
  definitionId === disable;

/**
 * Expires every row whose tick has come and derives the four disable flags from what is
 * left, for the next tick's validator to read. A stun clears the order, so a stunned unit
 * stands where it was; a root clears a move or an attack-move, so a rooted unit does not
 * resume it when the root ends. Runs at the end of the tick, after death has emptied the
 * table of anything that died, so the flags say what the table says.
 */
export const statusSystem = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null) {
      continue;
    }

    let stunned = false;
    let silenced = false;
    let rooted = false;
    let disarmed = false;

    for (let row = 0; row < unit.statuses.length; row += 1) {
      const entry = unit.statuses[row];

      if (entry === undefined || entry.definitionId === null) {
        continue;
      }

      if (world.tick >= entry.endsAtTick) {
        clearStatusEntry(entry);

        continue;
      }

      stunned = stunned || setsDisable(entry.definitionId, "stun");
      silenced = silenced || setsDisable(entry.definitionId, "silence");
      rooted = rooted || setsDisable(entry.definitionId, "root");
      disarmed = disarmed || setsDisable(entry.definitionId, "disarm");
    }

    unit.disables.stunned = stunned;
    unit.disables.silenced = silenced;
    unit.disables.rooted = rooted;
    unit.disables.disarmed = disarmed;

    if (unit.state === "dead") {
      continue;
    }

    const isWalking =
      unit.order.kind === "move" || unit.order.kind === "attack_move";

    if (stunned || (rooted && isWalking)) {
      clearOrder(unit);
    }
  }
};
