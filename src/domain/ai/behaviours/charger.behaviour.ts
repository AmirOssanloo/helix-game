import type { Vec2 } from "@shared/public";
import { isCooldownReady } from "../../abilities/cooldowns";
import type { AttackRecord } from "../../definitions/attack-state";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { MachineBehaviour } from "../behaviour";
import { reachLessMargin, writeReachPoint } from "../standing";

/**
 * How far from the target's centre the unit waits for its charge: the first ability its list
 * names at its tier, while that ability is on its clock, at its cast range less the margin.
 * `null` when there is nothing to wait for: no such ability, one off its clock, or one aimed
 * at no unit and so with no range at the target to wait at.
 */
const waitingReach = (
  world: Readonly<World>,
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  margin: number,
): number | null => {
  const definitionId = unit.definitionId;
  const record =
    definitionId === null ? undefined : world.run.units.get(definitionId);
  const entry =
    record === undefined ? undefined : record.abilitiesByTier[unit.tier][0];
  const ability =
    entry === undefined ? undefined : world.run.spells.get(entry.id);

  if (
    entry === undefined ||
    ability === undefined ||
    ability.def.targeting !== "unit" ||
    isCooldownReady(unit.cooldowns, entry.id, world.tick, world.run.debug)
  ) {
    return null;
  }

  return reachLessMargin(unit, target, ability.def.range, margin);
};

/**
 * While its charge is on its clock, the point at the charge's range less the margin from the
 * target, standing where it is when already closer; once the charge is ready, the target
 * itself, as the chaser walks, so it comes into the charge's range and the selection rule
 * throws it.
 */
const waitThenClose = (
  world: Readonly<World>,
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  _record: AttackRecord,
  margin: number,
  out: Vec2,
): void => {
  const reach = waitingReach(world, unit, target, margin);

  if (reach !== null) {
    writeReachPoint(unit, target, reach, false, out);

    return;
  }

  out.x = target.curr.x;
  out.y = target.curr.y;
};

/**
 * The charging archetypes' driver: it wanders at home, and once it has noticed the hero it
 * waits at the range of its charge for the charge's clock, then closes, the charge carrying
 * it the last of the way, and swings at contact.
 */
export const chargerBehaviour: MachineBehaviour = {
  kind: "machine",
  engages: true,
  wanders: true,
  kites: false,
  standAt: waitThenClose,
};
