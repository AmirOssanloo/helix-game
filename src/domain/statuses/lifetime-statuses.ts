import type { EntityId } from "@shared/public";
import type { UnitRecord } from "../definitions/unit-state";
import type { World } from "../entities/world-state";
import { STATUS_NEVER_ENDS } from "./status-table";
import { applyStatus } from "./status.system";

/** What a status an archetype carries is read at: no orb has a level, so every table reads its first entry. */
const NO_ORB_LEVELS: readonly number[] = [];

/**
 * Puts every status the unit's definition carries on the unit `unitId` names, from the unit
 * itself and lasting until it dies. A spawn runs it once the unit wears its definition, so a
 * bash is on the grunt from its first swing. A status that does not land is dropped: the
 * validator keeps the list short enough that a new unit's table always has the rows.
 */
export const applyLifetimeStatuses = (
  world: World,
  unitId: EntityId,
  record: UnitRecord,
): void => {
  const statuses = record.def.statuses;

  for (let index = 0; index < statuses.length; index += 1) {
    const id = statuses[index];

    if (id !== undefined) {
      applyStatus(world, unitId, id, STATUS_NEVER_ENDS, unitId, NO_ORB_LEVELS);
    }
  }
};
