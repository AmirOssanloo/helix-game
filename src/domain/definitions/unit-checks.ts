import { assertNever } from "@shared/public";
import { BEHAVIOUR_KEYS, resolveBehaviour } from "../ai/behaviours/index";
import type { EnemyAbilityEntryDef, EnemyDef } from "./enemy-def";
import type { ValidationContext } from "./registry-checks";
import { checkFrame, checkReference, statusesById } from "./registry-checks";

/**
 * The most statuses an archetype may carry for its life. Each takes a row of the unit's table
 * for as long as it lives, so the rows left for what is thrown at it stay the greater part.
 */
export const MAX_CARRIED_STATUSES = 2;

/**
 * One entry of an enemy's ability list: an id the registry holds, and a condition whose number
 * can be met. A health fraction lies strictly between none and all of the maximum, since at
 * either end the entry would always or never be chosen and should say so; a distance is more
 * than nothing.
 */
const checkAbilityEntry = (
  context: ValidationContext,
  file: string,
  path: string,
  entry: EnemyAbilityEntryDef,
): void => {
  checkReference(
    context,
    file,
    `${path}.id`,
    entry.id,
    context.space("spell or ability", ["spells", "abilities"]),
  );

  const condition = entry.condition;

  switch (condition.kind) {
    case "always":
      return;

    case "health_below":
      if (
        !Number.isFinite(condition.fraction) ||
        condition.fraction <= 0 ||
        condition.fraction >= 1
      ) {
        context.faults.push({
          file,
          path: `${path}.condition.fraction`,
          message: `${String(condition.fraction)} is not a health fraction strictly between 0 and 1`,
        });
      }

      return;

    case "target_within":
      if (!Number.isFinite(condition.distance) || condition.distance <= 0) {
        context.faults.push({
          file,
          path: `${path}.condition.distance`,
          message: `${String(condition.distance)} is not a distance greater than 0`,
        });
      }

      return;

    default:
      return assertNever(condition);
  }
};

/**
 * The statuses an archetype carries for its life: each one exists, none twice, no more than
 * the cap, and none raising a flag, since a disable or a lift held until death would leave a
 * unit that never acts.
 */
const checkCarriedStatuses = (
  context: ValidationContext,
  file: string,
  def: EnemyDef,
): void => {
  const faults = context.faults;
  const statuses = statusesById(context);

  if (def.statuses.length > MAX_CARRIED_STATUSES) {
    faults.push({
      file,
      path: "statuses",
      message: `expected at most ${String(MAX_CARRIED_STATUSES)} statuses, found ${String(def.statuses.length)}`,
    });
  }

  for (let index = 0; index < def.statuses.length; index += 1) {
    const id = def.statuses[index];

    if (id === undefined) {
      continue;
    }

    const path = `statuses[${String(index)}]`;

    checkReference(
      context,
      file,
      path,
      id,
      context.space("status", ["statuses"]),
    );

    if (def.statuses.indexOf(id) !== index) {
      faults.push({ file, path, message: `"${id}" is listed twice` });
    }

    const status = statuses.get(id);

    if (status !== undefined && status.flags.length > 0) {
      faults.push({
        file,
        path,
        message: `"${id}" raises ${status.flags.join(", ")}; a status carried for life raises no flag`,
      });
    }
  }
};

/** Every entry of one of a definition's ability lists at `field`. A single elite ability reports at the field itself rather than at an index. */
const checkAbilityList = (
  context: ValidationContext,
  file: string,
  field: string,
  entries: readonly EnemyAbilityEntryDef[],
): void => {
  const single = field === "eliteAbility";

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];

    if (entry !== undefined) {
      checkAbilityEntry(
        context,
        file,
        single ? field : `${field}[${String(index)}]`,
        entry,
      );
    }
  }
};

/** An enemy's or a summon's frames, behaviour key, ability lists, and the statuses it carries. */
export const checkUnitDef = (
  context: ValidationContext,
  file: string,
  def: EnemyDef,
): void => {
  checkFrame(context, file, "atlasFrame", def.atlasFrame);
  checkFrame(context, file, "attack.atlasFrame", def.attack.atlasFrame);

  if (resolveBehaviour(def.behaviour) === null) {
    context.faults.push({
      file,
      path: "behaviour",
      message: `"${def.behaviour}" resolves to no behaviour; the registry holds ${BEHAVIOUR_KEYS.join(", ")}`,
    });
  }

  checkAbilityList(context, file, "abilities", def.abilities);

  if (def.eliteAbility !== null) {
    checkAbilityList(context, file, "eliteAbility", [def.eliteAbility]);
  }

  checkAbilityList(context, file, "bossAbilities", def.bossAbilities);
  checkCarriedStatuses(context, file, def);
};
