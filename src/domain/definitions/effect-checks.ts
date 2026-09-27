import { assertNever } from "@shared/public";
import { resolveNamedEffect } from "../abilities/effects/index";
import type { AbilityDef } from "./ability-def";
import type { EffectDef } from "./effect-def";
import type { ValidationContext } from "./registry-checks";
import { checkFrame, checkReference, report } from "./registry-checks";
import type { SchemaFault } from "./schema";

/**
 * Where an effect list sits: a cast's own list, run once at commit; a zone's each-tick list;
 * any other list nested inside something, which runs later and more than once; or anywhere
 * under a named effect's fields. A per-second rate is legal only in the second, and a spawn
 * of an archetype only in the first, since that is the one list the cast pipeline counts
 * against the live enemy cap before it commits.
 */
export type EffectPlace = "cast" | "each_tick" | "nested" | "named";

/**
 * The place of a list inside a list at `place`: under a named effect's fields it stays there
 * at any depth, since world creation converts no rate per second inside a named effect's
 * fields, so none is legal there, even in a zone's each-tick list.
 */
const within = (place: EffectPlace, next: EffectPlace): EffectPlace =>
  place === "named" ? "named" : next;

/**
 * Checks one effect and everything inside it: a named key resolves, its fields pass the
 * effect's own schema, and every effect entry those fields carry is checked as an entry of
 * its own; every status id exists, and every unit id a spawn names, which is a summon or,
 * in a cast's own list alone, an archetype; every frame is in the list; and a per-second
 * damage rate appears only in a zone's each-tick list.
 */
const checkEffect = (
  context: ValidationContext,
  file: string,
  at: string,
  effect: EffectDef,
  place: EffectPlace,
): void => {
  const faults = context.faults;

  switch (effect.kind) {
    case "damage_area":
      if (effect.rate === "per_second" && place !== "each_tick") {
        faults.push({
          file,
          path: `${at}.rate`,
          message:
            "a per-second rate is legal only in a zone's each-tick list, and never under a named effect's fields",
        });
      }

      break;

    case "apply_status":
      checkReference(
        context,
        file,
        `${at}.statusId`,
        effect.statusId,
        context.space("status", ["statuses"]),
      );

      break;

    case "spawn_projectile":
      checkFrame(context, file, `${at}.atlasFrame`, effect.atlasFrame);
      checkEffects(
        context,
        file,
        `${at}.onHit`,
        effect.onHit,
        within(place, "nested"),
      );

      break;

    case "spawn_zone":
      checkFrame(context, file, `${at}.atlasFrame`, effect.atlasFrame);
      checkEffects(
        context,
        file,
        `${at}.onActivate`,
        effect.onActivate,
        within(place, "nested"),
      );
      checkEffects(
        context,
        file,
        `${at}.eachTick`,
        effect.eachTick,
        within(place, "each_tick"),
      );

      break;

    case "spawn_unit":
      if (
        place !== "cast" &&
        context.space("enemy", ["enemies"]).ids.has(effect.unitId)
      ) {
        faults.push({
          file,
          path: `${at}.unitId`,
          message: `"${effect.unitId}" is an enemy, spawned only from a cast's own effect list, where the live cap is checked`,
        });

        break;
      }

      checkReference(
        context,
        file,
        `${at}.unitId`,
        effect.unitId,
        place === "cast"
          ? context.space("summon or enemy", ["summons", "enemies"])
          : context.space("summon", ["summons"]),
      );

      break;

    case "displace":
      checkReference(
        context,
        file,
        `${at}.statusId`,
        effect.statusId,
        context.space("status", ["statuses"]),
      );

      break;

    case "named": {
      const entry = resolveNamedEffect(effect.key);

      if (entry === null) {
        faults.push({
          file,
          path: `${at}.key`,
          message: `"${effect.key}" resolves to no named effect`,
        });

        break;
      }

      const found: SchemaFault[] = [];

      if (!entry.fields(effect.fields, `${at}.fields`, found)) {
        report(faults, file, found);

        break;
      }

      for (const nested of entry.nested(effect.fields)) {
        const inner: SchemaFault[] = [];
        const where = `${at}.fields.${nested.path}`;

        if (context.levels.effect(nested.entry, where, inner)) {
          checkEffect(context, file, where, nested.entry, "named");
        } else {
          report(faults, file, inner);
        }
      }

      break;
    }

    default:
      return assertNever(effect);
  }
};

/** Every effect of a list, each under its own index in `path`. */
export const checkEffects = (
  context: ValidationContext,
  file: string,
  path: string,
  effects: readonly EffectDef[],
  place: EffectPlace,
): void => {
  for (let index = 0; index < effects.length; index += 1) {
    const effect = effects[index];

    if (effect !== undefined) {
      checkEffect(context, file, `${path}[${String(index)}]`, effect, place);
    }
  }
};

/** A spell's or an enemy ability's frames, its preview's included, and its own effect list, a cast's. */
export const checkAbility = (
  context: ValidationContext,
  file: string,
  def: AbilityDef,
): void => {
  checkFrame(context, file, "atlasFrame", def.atlasFrame);

  if (def.preview.kind !== "none" && def.preview.kind !== "line") {
    checkFrame(context, file, "preview.atlasFrame", def.preview.atlasFrame);
  }

  checkEffects(context, file, "effects", def.effects, "cast");
};
