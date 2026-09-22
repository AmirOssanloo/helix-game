import type { EntityId } from "@shared/public";
import { isReachable } from "../abilities/primitives/targets";
import { isHostile } from "../combat/sides";
import type { Unit } from "../entities/unit";
import { UNIT_CAPACITY } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createCandidateBuffer } from "../movement/spatial-hash";

/** The ids the hash proposes for one search. One unit acquires at a time, so one buffer serves every tick. */
const candidates: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

/**
 * The nearest unit within `radius` of `unit` that is hostile to it and that anything may
 * land on, or `null` when there is none. The hash proposes candidates in cell then slot
 * order and the nearest of them wins, a tie going to the one proposed first, so an
 * attack-move and a behaviour acquire the same unit on every run of the same session.
 */
export const nearestEnemy = (
  world: World,
  unit: Readonly<Unit>,
  radius: number,
): EntityId | null => {
  const found = world.map.spatialHash.queryCircle(
    unit.curr.x,
    unit.curr.y,
    radius,
    candidates,
  );
  const reach = radius * radius;
  let nearestId: EntityId | null = null;
  let nearest = 0;

  for (let slot = 0; slot < found; slot += 1) {
    const id = candidates[slot];
    const other = id === undefined ? null : world.map.units.resolve(id);

    if (id === undefined || other === null || !isReachable(other)) {
      continue;
    }

    if (!isHostile(unit.kind, other.kind)) {
      continue;
    }

    const dx = other.curr.x - unit.curr.x;
    const dy = other.curr.y - unit.curr.y;
    const gap = dx * dx + dy * dy;

    if (gap > reach) {
      continue;
    }

    if (nearestId === null || gap < nearest) {
      nearestId = id;
      nearest = gap;
    }
  }

  return nearestId;
};
