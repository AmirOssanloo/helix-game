import { assert, distanceSquared } from "@shared/public";
import type { UnitRecord } from "../../definitions/unit-state";
import type { UnitId } from "../../entities/unit";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { clearOrder } from "../../orders/state-machine";
import { regenerate } from "../../stats/regeneration";
import type { MachineBehaviour } from "../behaviour";
import { alertPack, enterChase } from "./chase";
import { anchorWhereWoken, canSee, enterIdle, walkTo } from "./moves";

/**
 * Whether the unit has come as close to its spawn point as another unit standing on it lets
 * it: some other unit's disc covers the point, and the returning unit is touching that unit.
 */
const isBlockedAtHome = (world: World, unit: Readonly<Unit>): boolean => {
  const tuning = world.scratch.machine.tuning;
  const candidates = world.scratch.machine.candidates;
  const radii = world.map.walkability.classRadii;
  const largest = radii[radii.length - 1] ?? unit.collisionRadius;
  const reach = unit.collisionRadius + largest + tuning.epsilon;

  const near = reach + reach;

  if (distanceSquared(unit.curr, unit.spawnPoint) > near * near) {
    return false;
  }

  const found = world.map.spatialHash.queryCircle(
    unit.spawnPoint,
    reach,
    candidates,
  );

  for (let slot = 0; slot < found; slot += 1) {
    const id = candidates[slot];
    const other = id === undefined ? null : world.map.units.resolve(id);

    if (other === null || other === unit || other.state === "dead") {
      continue;
    }

    const covering = other.collisionRadius + unit.collisionRadius;
    const touching = covering + tuning.epsilon;

    if (
      distanceSquared(other.curr, unit.spawnPoint) < covering * covering &&
      distanceSquared(other.curr, unit.curr) <= touching * touching
    ) {
      return true;
    }
  }

  return false;
};

/**
 * One tick of Return: the unit walks home ignoring the hero, unless the hero hit it and it
 * can see the hero, when it wakes: its leash is measured from where it stands, and it and its
 * pack go through Aggro into Chase on this tick. Otherwise it regenerates at its definition's
 * rates. It idles on arriving, or where it stands when another unit holds its spawn point and
 * it has reached that unit. Every re-path interval it asks for its path home again from where
 * it stands, as a chase does, so a pack pushed off its waypoints at a corridor's mouth finds
 * its way in, and a walk a stun or a root took away is given back.
 */
export const goHome = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: UnitId | null,
): void => {
  const tuning = world.scratch.machine.tuning;
  const provoked = unit.ai.provoked;

  unit.ai.provoked = false;

  if (provoked && behaviour.engages && canSee(hero)) {
    anchorWhereWoken(unit, record);
    unit.ai.state = "aggro";
    alertPack(world, unit, hero, heroId);
    enterChase(world, unit, index, record, behaviour, hero, heroId);

    return;
  }

  regenerate(unit.resources, unit.stats);

  if (unit.order.kind === "move" && isBlockedAtHome(world, unit)) {
    const result = clearOrder(unit);

    assert(result === "ok", "A living unit stops beside its spawn point");
    enterIdle(unit);

    return;
  }

  const home = unit.collisionRadius;

  if (
    unit.order.kind !== "move" &&
    distanceSquared(unit.curr, unit.spawnPoint) <= home * home
  ) {
    enterIdle(unit);

    return;
  }

  if (world.tick >= unit.ai.repathAtTick) {
    unit.ai.repathAtTick = world.tick + tuning.repathTicks;
    walkTo(world, unit, unit.spawnPoint.x, unit.spawnPoint.y);
  }
};
