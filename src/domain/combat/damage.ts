import type { EntityId } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
import { provoke } from "../ai/ai-state";
import type { Stats } from "../definitions/form-def";
import { readTunable } from "../definitions/tuning-state";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";
import { runDamageHooks } from "./damage-hooks";

/**
 * What reduces a hit: physical damage by armour, magical by magic resistance, pure by
 * nothing. Every instance carries its type, so the type decides the mitigation and a view
 * can colour the number by it.
 */
export type DamageType = "physical" | "magical" | "pure";

/** Every damage type, in the order the panel lists them, for a boundary check on a payload. */
export const DAMAGE_TYPES: readonly DamageType[] = [
  "physical",
  "magical",
  "pure",
];

/** Whether `value` names a damage type, for a payload no panel should produce and a replay file might. */
export const isDamageType = (value: string): value is DamageType =>
  DAMAGE_TYPES.includes(value as DamageType);

/** Scratch for the event a damage instance announces, reused for every one. */
const event = createDomainEvent();

/**
 * The fraction of a physical hit `armour` takes off under `constant`, the curve the armour
 * tunable parameterises: each point is worth less than the one before it, so armour never
 * reaches immunity, and negative armour adds the same fraction instead of taking it.
 */
const armourReduction = (armour: number, constant: number): number =>
  (constant * armour) / (1 + constant * Math.abs(armour));

/**
 * A hit's numbers held in an object, for a caller that deals damage per unit per tick: the
 * amount to deal, and what landed once the door has dealt it. A fractional number handed to a
 * call the engine does not inline is boxed into a heap object every call, and one read from a
 * field it lives in is not.
 */
export type DamageRecord = { amount: number; landed: number };

/**
 * Writes into `record.landed` what lands of `record.amount` on a unit wearing `stats`: a
 * physical hit reduced by the armour curve under `armourConstant`, a magical hit by the magic
 * resistance the stats carry as a fraction of one, a pure hit by nothing. Never below zero, so
 * mitigation past the whole amount heals nobody. The damage door runs it on its record, so no
 * fractional amount crosses a call on the way in or out.
 */
const mitigateRecord = (
  record: DamageRecord,
  type: DamageType,
  stats: Readonly<Stats>,
  armourConstant: number,
): void => {
  switch (type) {
    case "physical":
      record.landed = Math.max(
        0,
        record.amount * (1 - armourReduction(stats.armour, armourConstant)),
      );

      return;

    case "magical":
      record.landed = Math.max(0, record.amount * (1 - stats.magicResistance));

      return;

    case "pure":
      record.landed = Math.max(0, record.amount);
  }
};

/** Scratch for the record `mitigate` asks through, reused for every question. */
const asked: DamageRecord = { amount: 0, landed: 0 };

/**
 * What lands of `amount` on a unit wearing `stats` under `armourConstant`, by the same rule
 * the damage door runs, as a plain number. A pure function over plain numbers, for anything
 * asking what a hit would be worth.
 */
export const mitigate = (
  amount: number,
  type: DamageType,
  stats: Readonly<Stats>,
  armourConstant: number,
): number => {
  asked.amount = amount;
  mitigateRecord(asked, type, stats, armourConstant);

  return asked.landed;
};

const announceDamaged = (
  world: World,
  targetId: EntityId,
  sourceId: EntityId | null,
  amount: number,
  type: DamageType,
): void => {
  resetDomainEvent(event);
  event.kind = "unit_damaged";
  event.tick = world.tick;
  event.unitId = targetId;
  event.sourceId = sourceId;
  event.amount = amount;
  event.damageType = type;
  world.events.write(event);
};

/** Scratch for the record the plain-number door fills, reused for every hit through it. */
const scratch: DamageRecord = { amount: 0, landed: 0 };

/**
 * The one door damage enters by: `record.amount` of `type` from `sourceId`, or from nobody,
 * onto the unit `targetId` names, with what landed written back to `record.landed`. The amount
 * is mitigated by the target's stats, taken from the pool the target draws on, and announced
 * with the amount that landed, which is what a damage number shows. Health stops at zero, and
 * at one on a unit its definition calls indestructible, so the number announced is the whole
 * hit even where the health it removed was less. Zero lands on a stale id and on a unit
 * already dead: a corpse takes nothing, and two lethal hits in one tick both land, because
 * death is resolved at the end of the tick and not here.
 *
 * A hit from someone provokes the target, which is how an enemy at rest learns it was hit.
 *
 * Every instance that lands runs the damage hooks of both units' statuses, after the
 * mitigation and once, so a hook reads the amount the target actually took. What landed is
 * written after the hooks, so a hook that deals damage through the same record leaves this
 * hit's figure in it.
 */
export const dealDamage = (
  world: World,
  targetId: EntityId,
  record: DamageRecord,
  type: DamageType,
  sourceId: EntityId | null,
): void => {
  const target = world.map.units.resolve(targetId);

  if (target === null || target.state === "dead") {
    record.landed = 0;

    return;
  }

  mitigateRecord(
    record,
    type,
    target.stats,
    readTunable(world.run.tuning, "armour_constant"),
  );

  const landed = record.landed;
  const resources = resourcesOf(world, target);
  const floor = target.indestructible ? Math.min(resources.health, 1) : 0;

  resources.health = Math.max(floor, resources.health - landed);
  provoke(target.ai, sourceId);
  announceDamaged(world, targetId, sourceId, landed, type);
  runDamageHooks(world, targetId, sourceId);
  record.landed = landed;
};

/**
 * The same door for a caller holding the amount as a plain number: `amount` of `type` from
 * `sourceId` onto `targetId`, returning what landed. A caller that deals damage per unit per
 * tick holds a record and calls `dealDamage` instead.
 */
export const applyDamage = (
  world: World,
  targetId: EntityId,
  amount: number,
  type: DamageType,
  sourceId: EntityId | null,
): number => {
  scratch.amount = amount;
  dealDamage(world, targetId, scratch, type, sourceId);

  return scratch.landed;
};
