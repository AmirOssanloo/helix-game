import type { EntityId } from "@shared/public";
import { resourcesOf } from "../abilities/cast";
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
 * What lands of `amount` on a unit wearing `stats`: a physical hit reduced by the armour
 * curve under `armourConstant`, a magical hit by the magic resistance the stats carry as a
 * fraction of one, a pure hit by nothing. Never below zero, so mitigation past the whole
 * amount heals nobody. A pure function over plain numbers: the damage door runs it, and so
 * does anything asking what a hit would be worth.
 */
export const mitigate = (
  amount: number,
  type: DamageType,
  stats: Readonly<Stats>,
  armourConstant: number,
): number => {
  switch (type) {
    case "physical":
      return Math.max(
        0,
        amount * (1 - armourReduction(stats.armour, armourConstant)),
      );

    case "magical":
      return Math.max(0, amount * (1 - stats.magicResistance));

    case "pure":
      return Math.max(0, amount);
  }
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

/**
 * The one door damage enters by: `amount` of `type` from `sourceId`, or from nobody, onto
 * the unit `targetId` names. The amount is mitigated by the target's stats, taken from the
 * pool the target draws on, and announced with the amount that landed, which is what a
 * damage number shows. Health stops at zero, and at one on a unit its definition calls
 * indestructible, so the number announced is the whole hit even where the health it removed
 * was less. Returns what landed, zero for a stale id and for a unit already dead: a corpse
 * takes nothing, and two lethal hits in one tick both land, because death is resolved at the
 * end of the tick and not here.
 *
 * Every instance that lands runs the damage hooks of both units' statuses, after the
 * mitigation and once, so a hook reads the amount the target actually took.
 */
export const applyDamage = (
  world: World,
  targetId: EntityId,
  amount: number,
  type: DamageType,
  sourceId: EntityId | null,
): number => {
  const target = world.map.units.resolve(targetId);

  if (target === null || target.state === "dead") {
    return 0;
  }

  const landed = mitigate(
    amount,
    type,
    target.stats,
    readTunable(world.run.tuning, "armour_constant"),
  );
  const resources = resourcesOf(world, target);
  const floor = target.indestructible ? Math.min(resources.health, 1) : 0;

  resources.health = Math.max(floor, resources.health - landed);
  announceDamaged(world, targetId, sourceId, landed, type);
  runDamageHooks(world, targetId, sourceId);

  return landed;
};
