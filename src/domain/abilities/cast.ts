import { assert } from "@shared/public";
import type { CastTarget } from "../commands/command";
import { SLOT_COUNT } from "../commands/command";
import type { TargetingKind } from "../definitions/spell-def";
import type { SpellRecord } from "../definitions/spell-state";
import { entryAtLevel } from "../definitions/spell-state";
import { activeFormOf } from "../entities/hero";
import type { Resources, Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createAbilityRequest } from "../kits/kit";
import { resolveKit } from "../kits/kit-registry";
import { issueCast } from "../orders/state-machine";
import type { RefusalReason } from "../orders/validator";
import { isCooldownReady } from "./cooldowns";
import { hasMana } from "./mana";
import { spellLevelOf } from "./spell-level";

/** The orb levels of a unit that levels none. */
const NO_ORB_LEVELS: readonly number[] = [];

/** Scratch for what a kit makes of each slot key, reused for every look-up. */
const request = createAbilityRequest();

/** The pool a cast of `unit`'s draws on: the hero's is its active form's, every other unit's is its own. */
export const resourcesOf = (world: World, unit: Unit): Resources => {
  const form = unit.kind === "hero" ? activeFormOf(world, unit) : null;

  return form === null ? unit.resources : form.resources;
};

/** The level `unit` casts `record` at: from its active form's orb levels, or the first level for a unit with no form. */
export const castLevelOf = (
  world: World,
  unit: Readonly<Unit>,
  record: SpellRecord,
): number => {
  const form = activeFormOf(world, unit);

  return spellLevelOf(
    form === null ? NO_ORB_LEVELS : form.kit.orbLevels,
    record.def.recipe,
  );
};

/**
 * Whether a slot key of `unit`'s active form's kit throws `abilityId`, which is what makes an
 * ability the unit's to cast. A unit with no form holds nothing; an enemy's ability list is
 * the behaviour's to read when enemies cast.
 */
export const holdsAbility = (
  world: World,
  unit: Readonly<Unit>,
  abilityId: string,
): boolean => {
  const form = activeFormOf(world, unit);

  if (form === null) {
    return false;
  }

  const kit = resolveKit(form.def.kit);

  assert(kit !== null, "The content tier resolves every form's kit key");

  for (let slot = 1; slot <= SLOT_COUNT; slot += 1) {
    kit.resolveSlot(slot, form.kit, request);

    if (request.kind === "cast" && request.abilityId === abilityId) {
      return true;
    }
  }

  return false;
};

/**
 * Whether `unit` may cast `record` from where it stands at an aim of `kind` at (`x`, `y`):
 * a point within the definition's range, centre to point; a unit within the range plus the
 * caster's bound radius and the target's, `targetBound`; a direction or nothing, always.
 */
export const isInCastRange = (
  unit: Readonly<Unit>,
  record: SpellRecord,
  kind: TargetingKind,
  x: number,
  y: number,
  targetBound: number,
): boolean => {
  let reach = 0;

  switch (kind) {
    case "none":
    case "direction":
      return true;

    case "point":
      reach = record.def.range;

      break;

    case "unit":
      reach = record.def.range + unit.boundRadius + targetBound;

      break;
  }

  const dx = x - unit.curr.x;
  const dy = y - unit.curr.y;

  return dx * dx + dy * dy <= reach * reach;
};

/**
 * The request stage over `unit`: a cast of `abilityId` at `target` is checked and, when it
 * passes, replaces the unit's order. Refused, with the reason for the caller to announce and
 * nothing changed, when no spell has the id, no slot of the unit's kit holds it, the target
 * is not the kind the spell takes or names a unit that is gone, the clock is running, the
 * mana is short, or the unit is rooted with the target out of range. The clock and the mana
 * read the panel's flags, as the composer does. A target in range is cast where the unit
 * stands; one out of range is walked toward first.
 */
export const requestCast = (
  world: World,
  unit: Unit,
  abilityId: string,
  target: CastTarget,
): RefusalReason | null => {
  const record = world.run.spells.get(abilityId);

  if (record === undefined) {
    return "unknown_ability";
  }

  if (!holdsAbility(world, unit, abilityId)) {
    return "ability_not_held";
  }

  if (target.kind !== record.def.targeting) {
    return "invalid_target";
  }

  let x = unit.curr.x;
  let y = unit.curr.y;
  let targetId = null;
  let targetBound = 0;

  switch (target.kind) {
    case "point":
    case "direction":
      x = target.position.x;
      y = target.position.y;

      break;

    case "unit": {
      const aimed = world.map.units.resolve(target.unitId);

      if (aimed === null) {
        return "target_not_found";
      }

      x = aimed.curr.x;
      y = aimed.curr.y;
      targetId = target.unitId;
      targetBound = aimed.boundRadius;

      break;
    }

    case "none":
      break;
  }

  if (
    !isCooldownReady(unit.cooldowns, abilityId, world.tick, world.run.debug)
  ) {
    return "on_cooldown";
  }

  const cost = entryAtLevel(
    record.def.manaCost,
    castLevelOf(world, unit, record),
  );

  if (!hasMana(resourcesOf(world, unit), cost, world.run.debug)) {
    return "not_enough_mana";
  }

  if (
    unit.disables.rooted &&
    !isInCastRange(unit, record, target.kind, x, y, targetBound)
  ) {
    return "out_of_range";
  }

  const result = issueCast(unit, abilityId, target.kind, x, y, targetId);

  assert(result === "ok", "A validated cast replaces the current order");

  return null;
};
