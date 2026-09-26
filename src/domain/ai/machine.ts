import type { EntityId, Vec2 } from "@shared/public";
import { assert, distanceSquared } from "@shared/public";
import { isReachable } from "../abilities/primitives/targets";
import {
  attackOf,
  isInAttackRange,
  isMelee,
  isReadyToSwing,
} from "../attack/attack";
import type { AttackRecord } from "../definitions/attack-state";
import { readTunable } from "../definitions/tuning-state";
import type { UnitRecord } from "../definitions/unit-state";
import type { Unit } from "../entities/unit";
import { UNIT_CAPACITY } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createCandidateBuffer } from "../movement/spatial-hash";
import {
  clearOrder,
  issueAttackTarget,
  issueMove,
} from "../orders/state-machine";
import { resolveDestinationFor } from "../pathing/destination";
import {
  DRAW_PURPOSE,
  KEYED_DRAW_RANGE,
  keyedDraw,
} from "../random/keyed-draw";
import { regenerate } from "../stats/regeneration";
import { isCasting, selectAbility } from "./ability-selection";
import type { MachineBehaviour } from "./behaviour";
import { resolveBehaviour } from "./behaviours/index";

/**
 * The turn between one wander and the next around the spawn point, and between neighbouring
 * units' first wanders: the golden angle, which never repeats a bearing and spreads any run
 * of them evenly round the circle. A property of the circle, not a number design tunes.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** The shortest halt as a share of the halt seconds: a halt lasts between half and all of them. */
const SHORTEST_HALT_SHARE = 0.5;

/** What the machine reads from the tuning table, filled once per tick. */
type MachineTuning = {
  wanderRadius: number;
  wanderTicks: number;
  repathTicks: number;
  haltChance: number;
  haltTicks: number;
  holdMargin: number;
  epsilon: number;
};

/** The machine's tunables, read once per tick. */
const tuning: MachineTuning = {
  wanderRadius: 0,
  wanderTicks: 0,
  repathTicks: 0,
  haltChance: 0,
  haltTicks: 0,
  holdMargin: 0,
  epsilon: 0,
};

/** Scratch for the point a behaviour wants to stand at, reused for every unit. */
const standing: Vec2 = { x: 0, y: 0 };

/** Scratch for the legal point an order walks to, reused for every unit. */
const destination: Vec2 = { x: 0, y: 0 };

/** The ids the hash proposes around a spawn point. One unit asks at a time, so one buffer serves every tick. */
const candidates: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

/** Reads the machine's tunables for this tick. The AI pass calls it once, before the first unit. */
export const readMachineTuning = (world: World): void => {
  const table = world.run.tuning;

  tuning.wanderRadius = readTunable(table, "wander_radius");
  tuning.wanderTicks = readTunable(table, "wander_interval");
  tuning.repathTicks = readTunable(table, "chase_repath_interval");
  tuning.haltChance = readTunable(table, "chase_halt_chance");
  tuning.haltTicks = readTunable(table, "chase_halt_seconds");
  tuning.holdMargin = readTunable(table, "ranged_hold_margin");
  tuning.epsilon = readTunable(table, "arrival_epsilon");
};

/** The machine behaviour `unit`'s definition names, or `null` for a unit with no definition or a driver of its own. */
const machineOf = (
  world: World,
  unit: Readonly<Unit>,
): MachineBehaviour | null => {
  const definitionId = unit.definitionId;
  const record =
    definitionId === null ? undefined : world.run.units.get(definitionId);
  const behaviour =
    record === undefined ? null : resolveBehaviour(record.def.behaviour);

  return behaviour !== null && behaviour.kind === "machine" ? behaviour : null;
};

/** Whether the hero is there to be noticed: alive, something may land on it, and nothing hides it from enemy sight. */
const canSee = (hero: Readonly<Unit> | null): hero is Unit =>
  hero !== null && isReachable(hero) && !hero.disables.aggroHidden;

/**
 * Whether the hero is lost to a unit already fighting it: gone, dead, or untargetable. A dead
 * hero is lost like any other, so what was chasing it walks home rather than across the map to
 * where it will stand up again, and notices it there as it would anyone.
 */
const isLost = (hero: Readonly<Unit> | null): hero is null =>
  hero === null || hero.state === "dead" || hero.disables.untargetable;

/** Whether the unit stands further from its leash anchor than its leash reaches. */
const isPastLeash = (unit: Readonly<Unit>, record: UnitRecord): boolean => {
  const leash = record.def.leashRadius;

  return distanceSquared(unit.curr, unit.ai.leashAnchor) > leash * leash;
};

/** The leash measured from the spawn point again. */
const anchorAtHome = (unit: Unit): void => {
  unit.ai.leashAnchor.x = unit.spawnPoint.x;
  unit.ai.leashAnchor.y = unit.spawnPoint.y;
};

/**
 * The leash measured from where the unit stands as a hit wakes it on its way home, brought
 * onto the circle of its leash radius round the spawn point if it stands beyond it, so however
 * often a returning unit is pulled again it follows no further than twice its leash from home.
 */
const anchorWhereWoken = (unit: Unit, record: UnitRecord): void => {
  const leash = record.def.leashRadius;
  const home = unit.spawnPoint;
  const anchor = unit.ai.leashAnchor;
  const away = distanceSquared(unit.curr, home);

  anchor.x = unit.curr.x;
  anchor.y = unit.curr.y;

  if (away <= leash * leash) {
    return;
  }

  const share = leash / Math.sqrt(away);

  anchor.x = home.x + (unit.curr.x - home.x) * share;
  anchor.y = home.y + (unit.curr.y - home.y) * share;
};

/**
 * Walks to (`x`, `y`) resolved to somewhere the unit may stand. A unit already walking a move
 * there keeps its order and its turn and asks for its path again from where it stands, which
 * is how one a pack has pushed off its waypoints in a corridor finds its way on.
 */
const walkTo = (world: World, unit: Unit, x: number, y: number): void => {
  resolveDestinationFor(world, unit, x, y, destination);

  const isSameWalk =
    unit.order.kind === "move" &&
    distanceSquared(destination, unit.order.destination) <=
      tuning.epsilon * tuning.epsilon;

  if (isSameWalk) {
    unit.needsPath = true;

    return;
  }

  const result = issueMove(unit, destination.x, destination.y);

  assert(result === "ok", "A living unit takes the walk its machine asks for");
};

/** Lets go of whatever order the unit holds, so it stands where it is. */
const stand = (unit: Unit): void => {
  if (unit.order.kind !== "none") {
    const result = clearOrder(unit);

    assert(result === "ok", "A living unit stops where it stands");
  }
};

/**
 * Whether a chasing unit that would walk halts instead, and if it does, the halt begun: with
 * the halt chance, drawn on the unit's own id at this tick, it lets go of its order and stands
 * for between half and all of the halt ticks, the length a second draw. A unit whose slot
 * holds no id, or a halt chance or length of zero, never halts, and a draw writes nothing, so
 * with either at zero the chase is exactly what it is without the halt.
 */
const startsHalt = (world: World, unit: Unit, index: number): boolean => {
  const unitId = world.map.units.idAt(index);

  if (
    unitId === null ||
    tuning.haltTicks <= 0 ||
    keyedDraw(world, unitId, DRAW_PURPOSE.chaseHalt) >=
      tuning.haltChance * KEYED_DRAW_RANGE
  ) {
    return false;
  }

  const shortest = Math.ceil(tuning.haltTicks * SHORTEST_HALT_SHARE);
  const lengths = tuning.haltTicks - shortest + 1;
  const drawn = keyedDraw(world, unitId, DRAW_PURPOSE.chaseHaltLength);

  unit.ai.haltUntilTick =
    world.tick + shortest + Math.floor((drawn * lengths) / KEYED_DRAW_RANGE);
  stand(unit);

  return true;
};

/**
 * Walks to where the behaviour wants to stand, the scratch point, resolved to somewhere the
 * unit may stand; a unit already there stops instead, letting go of whatever order it held, so
 * one that waits where it is neither asks for a path to its own feet nor walks at the hero
 * under an attack order. A chasing unit, `index` being its slot, may halt instead of walking;
 * a unit backing away passes `null` and never does.
 */
const standOrWalk = (world: World, unit: Unit, index: number | null): void => {
  resolveDestinationFor(world, unit, standing.x, standing.y, destination);

  if (
    distanceSquared(destination, unit.curr) >
    tuning.epsilon * tuning.epsilon
  ) {
    if (index !== null && startsHalt(world, unit, index)) {
      return;
    }

    walkTo(world, unit, destination.x, destination.y);

    return;
  }

  stand(unit);
};

/** Into Return: the fight is dropped, whatever point was under way is cancelled, and the unit walks home. A projectile already fired flies on. */
const enterReturn = (world: World, unit: Unit): void => {
  unit.ai.state = "return";
  unit.ai.provoked = false;
  unit.ai.repathAtTick = world.tick + tuning.repathTicks;
  walkTo(world, unit, unit.spawnPoint.x, unit.spawnPoint.y);
};

/** Into Idle at home: the wander is scheduled afresh from here, the leash is measured from the spawn point again, and anything that hit it as it arrived is forgotten. */
const enterIdle = (unit: Unit): void => {
  unit.ai.state = "idle";
  unit.ai.provoked = false;
  unit.ai.wanderAtTick = null;
  anchorAtHome(unit);
};

/** Into Attack: the unit takes the hero as its attack target, and the attack rule faces, swings, and fires exactly as it does for the hero's own attack. */
const enterAttack = (unit: Unit, heroId: EntityId): void => {
  unit.ai.state = "attack";

  if (unit.order.kind === "attack_target" && unit.order.targetId === heroId) {
    return;
  }

  const result = issueAttackTarget(unit, heroId);

  assert(result === "ok", "A living unit takes the hero as its target");
};

/**
 * One tick of Chase: a lost hero, a hidden one, or a leash passed sends the unit home; a cast
 * of its own under way is left to run; an ability the selection rule takes is cast; a hero in
 * reach turns it to Attack; a halted unit stands until its halt ends; otherwise, at most once
 * a re-path interval, it walks to where its behaviour wants to stand, or to the hero's spawn
 * point for a unit with no attack, or halts instead of walking. `index` is its slot.
 */
const chase = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
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
const enterChase = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  unit.ai.state = "chase";
  unit.ai.repathAtTick = world.tick;
  unit.ai.haltUntilTick = world.tick;
  chase(world, unit, index, record, behaviour, hero, heroId);
};

/**
 * Whether the hero has closed on a unit that kites: nearer its centre than the unit's reach
 * less twice the hold margin, a margin inside where it holds, so a hero that steps in a little
 * is fired on and one that walks in is backed away from.
 */
const isCrowded = (
  unit: Readonly<Unit>,
  hero: Readonly<Unit>,
  record: AttackRecord,
): boolean => {
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
const fight = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
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
    isCrowded(unit, hero, swing) &&
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

/**
 * Every idle or returning member of the unit's pack that fights goes through Aggro into Chase
 * on this tick, whichever slot each holds, so a pack partly inside the aggro radius, or partly
 * on its way home, comes whole. An idle member's leash is measured from its spawn point, and a
 * returning one's from where it stands, as a hit would have woken it.
 */
const alertPack = (
  world: World,
  unit: Readonly<Unit>,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  const packId = unit.packId;
  const units = world.map.units;

  if (packId === null) {
    return;
  }

  for (let index = 0; index < units.end; index += 1) {
    const member = units.at(index);

    if (
      member === null ||
      member === unit ||
      member.packId !== packId ||
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

/**
 * The next wander: the first after an arrival home is only scheduled, a slot's index later
 * than the interval so a pack does not step off together; each after it walks the wander
 * radius from the spawn point at a bearing a golden angle on from the last.
 */
const wander = (world: World, unit: Unit, index: number): void => {
  const ai = unit.ai;

  if (ai.wanderAtTick === null) {
    const stagger = tuning.wanderTicks > 0 ? index % tuning.wanderTicks : 0;

    ai.wanderAtTick = world.tick + tuning.wanderTicks + stagger;

    return;
  }

  if (world.tick < ai.wanderAtTick) {
    return;
  }

  ai.wanderAtTick = world.tick + tuning.wanderTicks;

  if (tuning.wanderRadius <= 0 || unit.disables.rooted) {
    return;
  }

  const bearing = (index + ai.wanders) * GOLDEN_ANGLE;

  ai.wanders += 1;
  walkTo(
    world,
    unit,
    unit.spawnPoint.x + Math.cos(bearing) * tuning.wanderRadius,
    unit.spawnPoint.y + Math.sin(bearing) * tuning.wanderRadius,
  );
};

/**
 * One tick of Idle: a hero the unit can see, inside its aggro radius or having hit it, sends
 * it and its pack through Aggro into Chase; otherwise it regenerates at its definition's
 * rates, as Return does, and wanders, so a unit home before it was whole keeps healing and
 * its pack can sleep again. A behaviour that never engages stands, and forgets what hit it.
 */
const rest = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  const provoked = unit.ai.provoked;

  unit.ai.provoked = false;

  if (!behaviour.engages) {
    return;
  }

  const aggro = record.def.aggroRadius;
  const notices =
    canSee(hero) &&
    (provoked || distanceSquared(unit.curr, hero.curr) <= aggro * aggro);

  if (!notices) {
    regenerate(unit.resources, unit.stats);

    if (behaviour.wanders) {
      wander(world, unit, index);
    }

    return;
  }

  anchorAtHome(unit);
  unit.ai.state = "aggro";
  alertPack(world, unit, hero, heroId);
  enterChase(world, unit, index, record, behaviour, hero, heroId);
};

/**
 * Whether the unit has come as close to its spawn point as another unit standing on it lets
 * it: some other unit's disc covers the point, and the returning unit is touching that unit.
 */
const isBlockedAtHome = (world: World, unit: Readonly<Unit>): boolean => {
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
const goHome = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
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

/**
 * One tick of the shared state machine for one unit its behaviour drives, `index` being its
 * slot. Aggro is passed through on the tick it is entered, and Dead is the death system's to
 * enter, so a tick finds the unit in one of the other four. The orders it issues are carried
 * out by the systems after it exactly as the player's are.
 */
export const runMachine = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  switch (unit.ai.state) {
    case "idle":
      rest(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "aggro":
    case "chase":
      unit.ai.provoked = false;
      chase(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "attack":
      unit.ai.provoked = false;
      fight(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "return":
      goHome(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "dead":
      return;
  }
};
