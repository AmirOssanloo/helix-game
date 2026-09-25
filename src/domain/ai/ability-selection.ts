import type { EntityId, Vec2 } from "@shared/public";
import { isInCastRange, requestCast } from "../abilities/cast";
import { isCooldownReady } from "../abilities/cooldowns";
import type { CastTarget } from "../commands/command";
import type { TargetingKind } from "../definitions/ability-def";
import type { UnitRecord } from "../definitions/unit-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { abilityDisable } from "../orders/validator";

/** The target a no-target ability is requested with. */
const NO_TARGET: CastTarget = { kind: "none" };

/** Scratch for a unit ability aimed at the machine's target, rewritten for every request. */
const unitTarget: { kind: "unit"; unitId: EntityId } = {
  kind: "unit",
  unitId: 0,
};

/** Scratch for a point ability aimed where the machine's target stands, rewritten for every request. */
const pointTarget: { kind: "point"; position: Vec2 } = {
  kind: "point",
  position: { x: 0, y: 0 },
};

/**
 * The aim a behaviour supplies for an ability of `kind` at `target`: the unit itself, the
 * point it stands on, or nothing, for an ability aimed at its caster. A direction and a
 * vector need a line only a player draws, so the machine supplies neither and returns `null`.
 */
const aimAt = (
  kind: TargetingKind,
  target: Readonly<Unit>,
  targetId: EntityId,
): CastTarget | null => {
  switch (kind) {
    case "none":
      return NO_TARGET;

    case "unit":
      unitTarget.unitId = targetId;

      return unitTarget;

    case "point":
      pointTarget.position.x = target.curr.x;
      pointTarget.position.y = target.curr.y;

      return pointTarget;

    case "direction":
    case "vector":
      return null;
  }
};

/**
 * Whether the unit is holding a cast of its own: turning to, walking to, or in the cast point
 * of one. The machine leaves it to the cast pipeline until the commit or a cancel ends it, so
 * it never interrupts its own cast point; the backswing after the commit is the attack loop's
 * to cut short.
 */
export const isCasting = (unit: Readonly<Unit>): boolean =>
  unit.cast.abilityId !== null;

/**
 * The selection rule, run in Chase and Attack: the first ability the unit's definition lists
 * whose clock has run out, whose targeting kind the machine can aim at `target`, and which
 * reaches it from where the unit stands is requested through the cast pipeline, exactly as
 * the hero's cast is. Returns whether a cast was taken, which replaces the unit's order; when
 * none is, or the pipeline refuses the one chosen, the unit fights on with its attack.
 * Nothing is chosen while a disable blocks abilities, or over an attack point already under
 * way, which a new order would cancel.
 */
export const selectAbility = (
  world: World,
  unit: Unit,
  record: UnitRecord,
  target: Readonly<Unit>,
  targetId: EntityId,
): boolean => {
  if (
    abilityDisable(unit.disables) !== null ||
    unit.state === "attack_windup"
  ) {
    return false;
  }

  const abilities = record.def.abilities;

  for (let index = 0; index < abilities.length; index += 1) {
    const abilityId = abilities[index];
    const ability =
      abilityId === undefined ? undefined : world.run.spells.get(abilityId);

    if (abilityId === undefined || ability === undefined) {
      continue;
    }

    const kind = ability.def.targeting;
    const aim = aimAt(kind, target, targetId);

    if (
      aim === null ||
      !isCooldownReady(
        unit.cooldowns,
        abilityId,
        world.tick,
        world.run.debug,
      ) ||
      !isInCastRange(
        unit,
        ability,
        kind,
        target.curr.x,
        target.curr.y,
        target.boundRadius,
      )
    ) {
      continue;
    }

    return requestCast(world, unit, abilityId, aim) === null;
  }

  return false;
};
