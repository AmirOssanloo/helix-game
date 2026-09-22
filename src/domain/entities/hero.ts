import type { EntityId } from "@shared/public";
import type { FormDef } from "../definitions/form-def";
import type { Unit } from "./unit";
import { acquireUnit } from "./unit";
import type { FormRecord, World } from "./world-state";

/** The hero run scope names, or `null` when there is none or its id is stale. */
export const resolveHero = (world: World): Unit | null => {
  if (world.run.heroId === null) {
    return null;
  }

  return world.map.units.resolve(world.run.heroId);
};

/**
 * The form record `unit` points at, or `null` when it points past the records or the unit
 * is not the hero. Only the hero wears a form: an enemy and a summon carry their own body,
 * resources, and abilities on their definition, and read nothing from run scope.
 */
export const activeFormOf = (
  world: World,
  unit: Readonly<Unit>,
): FormRecord | null => {
  if (unit.kind !== "hero") {
    return null;
  }

  const form = world.run.forms[unit.activeFormIndex];

  return form === undefined ? null : form;
};

/** The hero's active form record, or `null` when there is no hero. */
export const activeForm = (world: World): FormRecord | null => {
  const hero = resolveHero(world);

  return hero === null ? null : activeFormOf(world, hero);
};

/** Puts `def`'s body on `unit`: the three radii the form's definition declares. */
export const wearBody = (unit: Unit, def: FormDef): void => {
  unit.collisionRadius = def.body.collisionRadius;
  unit.boundRadius = def.body.boundRadius;
  unit.selectionRadius = def.body.selectionRadius;
};

/**
 * The one way the hero enters the world: a hero-kind unit through the unit door, wearing the
 * first form's body, holding the skill points the hero definition starts it with, and named
 * by run scope. Returns the id, or `null` when the pool is full. The hero is acquired once
 * per session; a map load carries it, never recreates it.
 */
export const acquireHero = (
  world: World,
  x: number,
  y: number,
): EntityId | null => {
  const id = acquireUnit(world, "hero", x, y);
  const hero = id === null ? null : world.map.units.resolve(id);

  if (id === null || hero === null) {
    return null;
  }

  const form = activeFormOf(world, hero);

  if (form !== null) {
    wearBody(hero, form.def);
  }

  hero.progression.skillPoints = world.run.hero.startingSkillPoints;
  world.run.heroId = id;

  return id;
};
