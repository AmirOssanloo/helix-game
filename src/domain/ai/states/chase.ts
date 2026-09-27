import { attackOf, isInAttackRange } from "../../attack/attack";
import type { UnitRecord } from "../../definitions/unit-state";
import type { UnitId } from "../../entities/unit";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { isCasting, selectAbility } from "../ability-selection";
import type { MachineBehaviour } from "../behaviour";
import {
  anchorAtHome,
  anchorWhereWoken,
  enterAttack,
  enterReturn,
  isLost,
  isPastLeash,
  machineOf,
  standOrWalk,
  startsHalt,
  walkTo,
} from "./moves";

/**
 * One tick of Chase: a lost hero, a hidden one, or a leash passed sends the unit home; a cast
 * of its own under way is left to run; an ability the selection rule takes is cast; a hero in
 * reach turns it to Attack; a halted unit stands until its halt ends; otherwise, at most once
 * a re-path interval, it walks to where its behaviour wants to stand, or to the hero's spawn
 * point for a unit with no attack, or halts instead of walking. `index` is its slot.
 */
export const chase = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: UnitId | null,
): void => {
  const tuning = world.scratch.machine.tuning;
  const standing = world.scratch.machine.standing;

  if (isLost(hero) || heroId === null || isPastLeash(unit, record)) {
    enterReturn(world, unit);

    return;
  }

  if (hero.disables.aggroHidden) {
    enterReturn(world, unit);

    return;
  }

  if (isCasting(unit)) {
    return;
  }

  if (selectAbility(world, unit, record, hero, heroId)) {
    return;
  }

  const swing = attackOf(world, unit);

  if (swing !== null && isInAttackRange(unit, hero, swing)) {
    enterAttack(unit, heroId);

    return;
  }

  if (world.tick < unit.ai.haltUntilTick || world.tick < unit.ai.repathAtTick) {
    return;
  }

  unit.ai.repathAtTick = world.tick + tuning.repathTicks;

  if (swing === null) {
    if (!startsHalt(world, unit, index)) {
      walkTo(world, unit, hero.spawnPoint.x, hero.spawnPoint.y);
    }

    return;
  }

  behaviour.standAt(world, unit, hero, swing, tuning.holdMargin, standing);
  standOrWalk(world, unit, index);
};

/** Into Chase, unhalted, with a path asked for on this tick rather than at the next re-path. */
export const enterChase = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: UnitId | null,
): void => {
  unit.ai.state = "chase";
  unit.ai.repathAtTick = world.tick;
  unit.ai.haltUntilTick = world.tick;
  chase(world, unit, index, record, behaviour, hero, heroId);
};

/**
 * Every idle or returning member of the unit's pack that fights goes through Aggro into Chase
 * on this tick, whichever slot each holds, so a pack partly inside the aggro radius, or partly
 * on its way home, comes whole. An idle member's leash is measured from its spawn point, and a
 * returning one's from where it stands, as a hit would have woken it.
 */
export const alertPack = (
  world: World,
  unit: Readonly<Unit>,
  hero: Unit | null,
  heroId: UnitId | null,
): void => {
  const packId = unit.pack.id;
  const units = world.map.units;

  if (packId === null) {
    return;
  }

  for (let index = 0; index < units.end; index += 1) {
    const member = units.at(index);

    if (
      member === null ||
      member === unit ||
      member.pack.id !== packId ||
      (member.ai.state !== "idle" && member.ai.state !== "return") ||
      member.state === "dead"
    ) {
      continue;
    }

    const definitionId = member.definitionId;
    const record =
      definitionId === null ? undefined : world.run.units.get(definitionId);
    const behaviour = machineOf(world, member);

    if (record === undefined || behaviour === null || !behaviour.engages) {
      continue;
    }

    if (member.ai.state === "return") {
      anchorWhereWoken(member, record);
    } else {
      anchorAtHome(member);
    }

    member.ai.state = "aggro";
    member.ai.provoked = false;
    enterChase(world, member, index, record, behaviour, hero, heroId);
  }
};
