import type { AttackRecord } from "../definitions/attack-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { modifiedValue } from "../stats/modifiers";

/**
 * The attack `unit` swings: the hero's, which every form shares, or the one its definition
 * carries. `null` for a unit with neither — a body the panel spawned for the stress test —
 * which has nothing to swing and takes no attack order.
 */
export const attackOf = (
  world: World,
  unit: Readonly<Unit>,
): AttackRecord | null => {
  const definitionId = unit.definitionId;

  if (definitionId === null) {
    return unit.kind === "hero" ? world.run.heroAttack : null;
  }

  const record = world.run.units.get(definitionId);

  return record === undefined ? null : record.attack;
};

/**
 * What `unit`'s next shot lands before mitigation: the attack's damage with every modifier
 * row for it, so an Ember instance out now, a Quicken running now, and later an item are all
 * in this shot and none of them in the one already flying.
 */
export const attackDamageOf = (
  unit: Readonly<Unit>,
  record: AttackRecord,
): number => modifiedValue(record.def.damage, unit.modifiers, "attack_damage");

/**
 * Whether `unit` reaches `target` from where it stands: the attack's range plus the
 * attacker's bound radius and the target's, against the gap between their centres. The
 * bounds are why a wide body is hit from further out than a narrow one at the same range.
 */
export const isInAttackRange = (
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  record: AttackRecord,
): boolean => {
  const reach = record.def.range + unit.boundRadius + target.boundRadius;
  const dx = target.curr.x - unit.curr.x;
  const dy = target.curr.y - unit.curr.y;

  return dx * dx + dy * dy <= reach * reach;
};
