import type { DeepReadonly } from "@shared/public";
import { assert, assertNever, bearing } from "@shared/public";
import type { CastTarget } from "../commands/command";
import { SLOT_COUNT } from "../commands/command";
import type { TargetingKind } from "../definitions/ability-def";
import type { SpellRecord } from "../definitions/spell-state";
import { entryAtLevel } from "../definitions/spell-state";
import { activeFormOf } from "../entities/hero";
import type { Resources, Unit } from "../entities/unit";
import type { RunScope, World } from "../entities/world-state";
import { bankItemAtPlace } from "../items/bank";
import { activeItemOf } from "../items/item-defs";
import { NO_PLACE } from "../items/item-place";
import { resolveKit } from "../kits/kit-registry";
import { castRefusal } from "../orders/disable-matrix";
import { issueCast } from "../orders/state-machine";
import type { RefusalReason } from "../orders/validator";
import type { Tick } from "../tick";
import { isCooldownReady } from "./cooldowns";
import { hasMana } from "./mana";
import { spawnsFit } from "./primitives/spawn-unit";
import { spellLevelOf } from "./spell-level";

/** The orb levels of a unit that levels none. */
const NO_ORB_LEVELS: readonly number[] = [];

/** The pool a cast of `unit`'s draws on: the hero's is its active form's, every other unit's is its own. */
export const resourcesOf = (world: World, unit: Unit): Resources => {
  const form = activeFormOf(world, unit);

  return form === null ? unit.resources : form.resources;
};

/** The orb levels `unit` casts at: its active form's, or none for a caster that levels no orbs. */
export const orbLevelsOf = (
  world: World,
  unit: Readonly<Unit>,
): readonly number[] => {
  const form = activeFormOf(world, unit);

  return form === null ? NO_ORB_LEVELS : form.kit.orbLevels;
};

/** The level `unit` casts `record` at: from its active form's orb levels, or the first level for a unit with no form. */
export const castLevelOf = (
  world: World,
  unit: Readonly<Unit>,
  record: SpellRecord,
): number => spellLevelOf(orbLevelsOf(world, unit), record.def.recipe);

/**
 * Whether `abilityId` is `unit`'s to cast: a slot key of its active form's kit throws it, or,
 * for a unit with no form, the definition it wears lists it at the unit's tier. A unit with
 * neither holds nothing.
 */
export const holdsAbility = (
  world: World,
  unit: Readonly<Unit>,
  abilityId: string,
): boolean => {
  const request = world.scratch.castLookup;
  const form = activeFormOf(world, unit);

  if (form === null) {
    const definitionId = unit.definitionId;
    const record =
      definitionId === null ? undefined : world.run.units.get(definitionId);

    if (record === undefined) {
      return false;
    }

    const entries = record.abilitiesByTier[unit.tier];

    for (let index = 0; index < entries.length; index += 1) {
      if (entries[index]?.id === abilityId) {
        return true;
      }
    }

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
 * a point, or the point a vector was pressed at, within the definition's range, centre to
 * point; a unit within the range plus the caster's bound radius and the target's,
 * `targetBound`; a direction or nothing, always.
 */
export const isInCastRange = (
  unit: DeepReadonly<Unit>,
  record: DeepReadonly<SpellRecord>,
  kind: TargetingKind,
  x: number,
  y: number,
  targetBound: number,
): boolean => {
  let reach: number;

  switch (kind) {
    case "none":
    case "direction":
      return true;

    case "point":
    case "vector":
      reach = record.def.range;

      break;

    case "unit":
      reach = record.def.range + unit.boundRadius + targetBound;

      break;

    default:
      return assertNever(kind);
  }

  const dx = x - unit.curr.x;
  const dy = y - unit.curr.y;

  return dx * dx + dy * dy <= reach * reach;
};

/**
 * The clock and the cost of `record`, with id `abilityId`, for `unit` at `tick`: the clock
 * still running, or the mana of the pool the cast draws on short of the cost at the level it
 * casts at, or `null`. The hero's pool and orb levels are its active form's. Reads the panel's
 * flags, as the composer does, and writes nothing.
 */
export const clockAndCostRefusal = (
  run: DeepReadonly<RunScope>,
  tick: Tick,
  unit: DeepReadonly<Unit>,
  abilityId: string,
  record: DeepReadonly<SpellRecord>,
): RefusalReason | null => {
  if (!isCooldownReady(unit.cooldowns, abilityId, tick, run.debug)) {
    return "on_cooldown";
  }

  const form =
    unit.kind === "hero" ? run.forms[unit.activeFormIndex] : undefined;
  const cost = entryAtLevel(
    record.def.manaCost,
    spellLevelOf(
      form === undefined ? NO_ORB_LEVELS : form.kit.orbLevels,
      record.def.recipe,
    ),
  );

  return hasMana(
    form === undefined ? unit.resources : form.resources,
    cost,
    run.debug,
  )
    ? null
    : "not_enough_mana";
};

/**
 * Whether `unit` may cast `record`, with id `abilityId`, at `tick`, whatever it aims at: the
 * part of the request stage no target changes. Returns the reason it may not, or `null`:
 * death, a disable the matrix refuses both spell keys under, the clock still running, or the
 * mana short of the cost. Pure and read-only, so the HUD and the cursor ask it of the world
 * view every frame, and the request stage asks it before it writes; the two cannot disagree.
 */
export const castReadiness = (
  run: DeepReadonly<RunScope>,
  tick: Tick,
  unit: DeepReadonly<Unit>,
  abilityId: string,
  record: DeepReadonly<SpellRecord>,
): RefusalReason | null => {
  if (unit.state === "dead") {
    return "dead";
  }

  return (
    castRefusal(run.disableMatrix, unit.disables) ??
    clockAndCostRefusal(run, tick, unit, abilityId, record)
  );
};

/**
 * Whether `unit` may activate an item whose ability is `record`, with id `abilityId`, at
 * `tick`, whatever it aims at: death, the clock still running, or the mana short of the cost.
 * An item is not a spell, so the spell keys' cells of the disable matrix do not refuse it. Pure
 * and read-only, as `castReadiness` is.
 */
export const activationReadiness = (
  run: DeepReadonly<RunScope>,
  tick: Tick,
  unit: DeepReadonly<Unit>,
  abilityId: string,
  record: DeepReadonly<SpellRecord>,
): RefusalReason | null =>
  unit.state === "dead"
    ? "dead"
    : clockAndCostRefusal(run, tick, unit, abilityId, record);

/** Whether the item in the bank's place `source` refuses a rooted caster, by its active block. */
const refusesRoot = (world: World, source: number): boolean =>
  activeItemOf(world.run, bankItemAtPlace(world, source)).active
    .refusedWhileRooted;

/**
 * The request stage over `unit`: a cast of `abilityId` at `target` is checked and, when it
 * passes, replaces the unit's order, recording `source`, a place of the bank for an
 * activation or `NO_PLACE`. An activation's ability is held by its bank place, which the
 * caller has read, rather than by the kit; its readiness is `activationReadiness`; and a
 * rooted caster is refused with `rooted` when its item's active block says so. Refused, with the reason for the caller to announce and
 * nothing changed, when no spell or ability has the id, the unit does not hold it, the target
 * is not the kind the spell takes or names a unit that is gone or untargetable, as a lifted
 * unit is, `castReadiness` refuses it, the enemies it would spawn would take the live cap past
 * its limit, or the unit is rooted with the target out of range. A target in range is cast
 * where the unit stands; one out of range is walked toward first. A vector is aimed at the point pressed,
 * along the bearing from it to the point released, or along nothing when the two are one.
 */
export const requestCastFrom = (
  world: World,
  unit: Unit,
  abilityId: string,
  target: CastTarget,
  source: number,
): RefusalReason | null => {
  const record = world.run.spells.get(abilityId);
  const fromBank = source !== NO_PLACE;

  if (record === undefined) {
    return "unknown_ability";
  }

  if (!fromBank && !holdsAbility(world, unit, abilityId)) {
    return "ability_not_held";
  }

  if (target.kind !== record.def.targeting) {
    return "invalid_target";
  }

  let x = unit.curr.x;
  let y = unit.curr.y;
  let targetId = null;
  let targetBound = 0;
  let direction = null;

  switch (target.kind) {
    case "point":
    case "direction":
      x = target.position.x;
      y = target.position.y;

      break;

    case "vector":
      x = target.position.x;
      y = target.position.y;
      direction =
        target.end.x === x && target.end.y === y
          ? null
          : bearing(target.position, target.end);

      break;

    case "unit": {
      const aimed = world.map.units.resolve(target.unitId);

      if (aimed === null) {
        return "target_not_found";
      }

      if (aimed.disables.untargetable) {
        return "target_untargetable";
      }

      x = aimed.curr.x;
      y = aimed.curr.y;
      targetId = target.unitId;
      targetBound = aimed.boundRadius;

      break;
    }

    case "none":
      break;

    default:
      return assertNever(target);
  }

  const readiness = (fromBank ? activationReadiness : castReadiness)(
    world.run,
    world.tick,
    unit,
    abilityId,
    record,
  );

  if (readiness !== null) {
    return readiness;
  }

  if (fromBank && unit.disables.rooted && refusesRoot(world, source)) {
    return "rooted";
  }

  if (!spawnsFit(world, record.def)) {
    return "enemy_cap_reached";
  }

  if (
    unit.disables.rooted &&
    !isInCastRange(unit, record, target.kind, x, y, targetBound)
  ) {
    return "out_of_range";
  }

  const result = issueCast(
    unit,
    abilityId,
    target.kind,
    x,
    y,
    targetId,
    direction,
  );

  assert(result === "ok", "A validated cast replaces the current order");
  unit.cast.source = source;

  return null;
};

/** The request stage for a cast from a slot, an enemy's choice, or a panel: `requestCastFrom` with no source. */
export const requestCast = (
  world: World,
  unit: Unit,
  abilityId: string,
  target: CastTarget,
): RefusalReason | null =>
  requestCastFrom(world, unit, abilityId, target, NO_PLACE);
