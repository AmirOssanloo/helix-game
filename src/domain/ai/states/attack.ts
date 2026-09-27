import { distanceSquared } from "@shared/public";
import {
  attackOf,
  isInAttackRange,
  isMelee,
  isReadyToSwing,
} from "../../attack/attack";
import type { AttackRecord } from "../../definitions/attack-state";
import type { UnitRecord } from "../../definitions/unit-state";
import type { UnitId } from "../../entities/unit";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { isCasting, selectAbility } from "../ability-selection";
import type { MachineBehaviour } from "../behaviour";
import { enterChase } from "./chase";
import {
  enterAttack,
  enterReturn,
  isLost,
  isPastLeash,
  standOrWalk,
} from "./moves";

/**
 * Whether the hero has closed on a unit that kites: nearer its centre than the unit's reach
 * less twice the hold margin, a margin inside where it holds, so a hero that steps in a little
 * is fired on and one that walks in is backed away from.
 */
const isCrowded = (
  world: World,
  unit: Readonly<Unit>,
  hero: Readonly<Unit>,
  record: AttackRecord,
): boolean => {
  const tuning = world.scratch.machine.tuning;
  const near =
    record.def.range +
    unit.boundRadius +
    hero.boundRadius -
    tuning.holdMargin -
    tuning.holdMargin;

  return near > 0 && distanceSquared(unit.curr, hero.curr) < near * near;
};

/**
 * One tick of backing away, still in Attack: the unit walks to where its behaviour wants to
 * stand, away from the hero, asking for that walk again at most once a re-path interval. A
 * shot just loosed is the exception, since its attack order is what the walk replaces, so the
 * unit leaves in its backswing on the tick it can.
 */
const backAway = (
  world: World,
  unit: Unit,
  behaviour: MachineBehaviour,
  hero: Readonly<Unit>,
  record: AttackRecord,
): void => {
  const tuning = world.scratch.machine.tuning;
  const standing = world.scratch.machine.standing;

  if (
    unit.order.kind !== "attack_target" &&
    world.tick < unit.ai.repathAtTick
  ) {
    return;
  }

  unit.ai.repathAtTick = world.tick + tuning.repathTicks;
  behaviour.standAt(world, unit, hero, record, tuning.holdMargin, standing);
  standOrWalk(world, unit, null);
};

/**
 * Whether the unit is in a melee attack's backswing, which it neither walks nor casts out of,
 * so a melee unit finishes its swing before it follows or casts. A ranged unit's backswing is
 * not held, since leaving it is how a kiter backs away and casting in it is how a caster fights.
 */
const isInMeleeBackswing = (
  unit: Readonly<Unit>,
  swing: AttackRecord | null,
): boolean =>
  unit.state === "attack_backswing" && swing !== null && isMelee(swing);

/**
 * Whether the unit is inside a swing it may not walk out of: any attack point it has begun,
 * and a melee attack's backswing, so a melee unit stands for the whole swing before it follows.
 */
const isMidSwing = (
  unit: Readonly<Unit>,
  swing: AttackRecord | null,
): boolean => unit.state === "attack_windup" || isInMeleeBackswing(unit, swing);

/**
 * One tick of Attack: a lost hero, a dead one included, or a leash passed sends the unit home,
 * cancelling the point under way. A hidden hero sends it home too, unless it is
 * adjacent, a melee attacker in reach, which swings on; an archer firing from range drops the
 * hero with the rest, and an arrow already in the air lands. A cast of its own under way is
 * left to run, and an ability the selection rule takes on a hero it can see is cast, except in
 * a melee backswing, which it casts from on the first tick after instead. In reach
 * it keeps the hero as its attack target, unless it kites, the hero has closed on it, and its
 * attack is on its clock, when it backs away and turns to fire again once the clock allows; an
 * attack point it has begun is never cut short for it. Out of reach it keeps an attack point it
 * has begun, and a melee unit its backswing too, and chases on the tick after; otherwise it
 * chases at once.
 */
export const fight = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: UnitId | null,
): void => {
  if (isLost(hero) || heroId === null || isPastLeash(unit, record)) {
    enterReturn(world, unit);

    return;
  }

  const swing = attackOf(world, unit);
  const isInReach = swing !== null && isInAttackRange(unit, hero, swing);
  const isAdjacent = isInReach && swing !== null && isMelee(swing);

  if (hero.disables.aggroHidden && !isAdjacent) {
    enterReturn(world, unit);

    return;
  }

  if (isCasting(unit)) {
    return;
  }

  if (
    !hero.disables.aggroHidden &&
    !isInMeleeBackswing(unit, swing) &&
    selectAbility(world, unit, record, hero, heroId)
  ) {
    return;
  }

  if (
    isInReach &&
    swing !== null &&
    behaviour.kites &&
    unit.state !== "attack_windup" &&
    isCrowded(world, unit, hero, swing) &&
    !isReadyToSwing(world, unit, swing)
  ) {
    backAway(world, unit, behaviour, hero, swing);

    return;
  }

  if (isInReach) {
    enterAttack(unit, heroId);

    return;
  }

  if (isMidSwing(unit, swing)) {
    return;
  }

  enterChase(world, unit, index, record, behaviour, hero, heroId);
};
