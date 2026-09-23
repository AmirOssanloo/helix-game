import type { Vec2 } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { AttackRecord } from "../../definitions/attack-state";
import type { Unit } from "../../entities/unit";
import type { MachineBehaviour } from "../behaviour";

/**
 * The point on the line from the target to the unit that is the attack's reach less the
 * margin from the target, so a hero stepping back a little leaves it still in reach. A unit
 * already closer than that stands where it is; one on the target's own centre has no line and
 * stands where it is too.
 */
const holdAtRange = (
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  record: AttackRecord,
  margin: number,
  out: Vec2,
): void => {
  const reach = Math.max(
    0,
    record.def.range + unit.boundRadius + target.boundRadius - margin,
  );
  const gap = Math.sqrt(distanceSquared(unit.curr, target.curr));

  if (gap <= reach) {
    out.x = unit.curr.x;
    out.y = unit.curr.y;

    return;
  }

  const along = reach / gap;

  out.x = target.curr.x + (unit.curr.x - target.curr.x) * along;
  out.y = target.curr.y + (unit.curr.y - target.curr.y) * along;
};

/** The ranged archetypes' driver: it wanders at home, and once it has noticed the hero it holds at its attack range less a margin and fires. */
export const rangedHolderBehaviour: MachineBehaviour = {
  kind: "machine",
  engages: true,
  wanders: true,
  standAt: holdAtRange,
};
