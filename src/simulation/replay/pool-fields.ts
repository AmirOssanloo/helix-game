import type {
  Effect,
  EffectDef,
  GroundItem,
  Projectile,
  ShapeDef,
  Zone,
} from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { numbers, texts } from "./field-collections";
import {
  excluded,
  fieldsOf,
  flag,
  nullableId,
  nullableNumber,
  number,
  record,
  text,
} from "./field-list";
import { ITEM_FIELDS } from "./item-fields";
import { orbLevels, VEC2_FIELDS } from "./unit-fields";

/** Why the copied art is left out: the stamp leaves out the definition fields it is copied from, so an art edit would move a checksum under an unchanged stamp. */
const COPIED_ART =
  "copied from a definition's presentation-only field, which the stamp leaves out; no rule reads it";

/** An effect list, hashed as each entry's kind in order: the list is content the stamp fixes, and its kinds say which of the ability's lists it is. */
const effectKinds = <T>(
  name: string,
  read: (owner: T) => readonly DeepReadonly<EffectDef>[],
): ReturnType<typeof texts<T>> =>
  texts<T>(
    name,
    (owner) => read(owner).length,
    (owner, index) => read(owner)[index]?.kind ?? null,
  );

/** A zone's area: its kind and each dimension, an absence for a dimension its kind has not got. */
const SHAPE_FIELDS = fieldsOf<DeepReadonly<ShapeDef>>({
  kind: text("kind", (shape) => shape.kind),
  radius: nullableNumber("radius", (shape, into, at) => {
    if (shape.kind !== "circle") {
      return false;
    }

    into[at] = shape.radius;

    return true;
  }),
  length: nullableNumber("length", (shape, into, at) => {
    if (shape.kind === "circle") {
      return false;
    }

    into[at] = shape.length;

    return true;
  }),
  width: nullableNumber("width", (shape, into, at) => {
    if (shape.kind !== "rectangle") {
      return false;
    }

    into[at] = shape.width;

    return true;
  }),
  angleDegrees: nullableNumber("angleDegrees", (shape, into, at) => {
    if (shape.kind !== "cone") {
      return false;
    }

    into[at] = shape.angleDegrees;

    return true;
  }),
});

export const PROJECTILE_FIELDS = fieldsOf<DeepReadonly<Projectile>>({
  ability: text("ability.id", (projectile) =>
    projectile.ability === null ? null : projectile.ability.id,
  ),
  casterId: nullableId("casterId", (projectile) => projectile.casterId),
  orbLevels: orbLevels("orbLevels"),
  level: number("level", (projectile, into, at) => {
    into[at] = projectile.level;
  }),
  targetId: nullableId("targetId", (projectile) => projectile.targetId),
  prev: record("prev", (projectile) => projectile.prev, VEC2_FIELDS),
  curr: record("curr", (projectile) => projectile.curr, VEC2_FIELDS),
  facing: number("facing", (projectile, into, at) => {
    into[at] = projectile.facing;
  }),
  speed: number("speed", (projectile, into, at) => {
    into[at] = projectile.speed;
  }),
  radius: number("radius", (projectile, into, at) => {
    into[at] = projectile.radius;
  }),
  onHit: effectKinds("onHit", (projectile) => projectile.onHit),
  attackDamage: number("attackDamage", (projectile, into, at) => {
    into[at] = projectile.attackDamage;
  }),
  travelled: number("travelled", (projectile, into, at) => {
    into[at] = projectile.travelled;
  }),
  maxRange: number("maxRange", (projectile, into, at) => {
    into[at] = projectile.maxRange;
  }),
  frame: excluded(COPIED_ART),
  tint: excluded(COPIED_ART),
});

export const ZONE_FIELDS = fieldsOf<DeepReadonly<Zone>>({
  ability: text("ability.id", (zone) =>
    zone.ability === null ? null : zone.ability.id,
  ),
  casterId: nullableId("casterId", (zone) => zone.casterId),
  orbLevels: orbLevels("orbLevels"),
  level: number("level", (zone, into, at) => {
    into[at] = zone.level;
  }),
  onActivate: effectKinds("onActivate", (zone) => zone.onActivate),
  eachTick: effectKinds("eachTick", (zone) => zone.eachTick),
  shape: record("shape", (zone) => zone.shape, SHAPE_FIELDS),
  circle: excluded(
    "the slot's own circle, hashed through shape whenever shape points at it",
  ),
  prev: record("prev", (zone) => zone.prev, VEC2_FIELDS),
  curr: record("curr", (zone) => zone.curr, VEC2_FIELDS),
  facing: number("facing", (zone, into, at) => {
    into[at] = zone.facing;
  }),
  travel: record("travel", (zone) => zone.travel, VEC2_FIELDS),
  followsCaster: flag("followsCaster", (zone) => zone.followsCaster),
  startedAtTick: number("startedAtTick", (zone, into, at) => {
    into[at] = zone.startedAtTick;
  }),
  activeAtTick: number("activeAtTick", (zone, into, at) => {
    into[at] = zone.activeAtTick;
  }),
  expiresAtTick: number("expiresAtTick", (zone, into, at) => {
    into[at] = zone.expiresAtTick;
  }),
  hitCount: number("hitCount", (zone, into, at) => {
    into[at] = zone.hitCount;
  }),
  hits: numbers(
    "hits",
    (zone) => zone.hitCount,
    (zone, index, into, slot) => {
      into[slot] = zone.hits[index] ?? 0;
    },
  ),
  frame: excluded(COPIED_ART),
  tint: excluded(COPIED_ART),
});

export const EFFECT_FIELDS = fieldsOf<DeepReadonly<Effect>>({
  frame: excluded(COPIED_ART),
  abilityId: text("abilityId", (effect) => effect.abilityId),
  casterId: nullableId("casterId", (effect) => effect.casterId),
  position: record("position", (effect) => effect.position, VEC2_FIELDS),
  facing: number("facing", (effect, into, at) => {
    into[at] = effect.facing;
  }),
  radius: number("radius", (effect, into, at) => {
    into[at] = effect.radius;
  }),
  startedAtTick: number("startedAtTick", (effect, into, at) => {
    into[at] = effect.startedAtTick;
  }),
  expiresAtTick: nullableNumber("expiresAtTick", (effect, into, at) => {
    if (effect.expiresAtTick === null) {
      return false;
    }

    into[at] = effect.expiresAtTick;

    return true;
  }),
});

export const GROUND_ITEM_FIELDS = fieldsOf<DeepReadonly<GroundItem>>({
  kind: text("kind", (groundItem) => groundItem.kind),
  position: record(
    "position",
    (groundItem) => groundItem.position,
    VEC2_FIELDS,
  ),
  amount: number("amount", (groundItem, into, at) => {
    into[at] = groundItem.amount;
  }),
  item: record("item", (groundItem) => groundItem.item, ITEM_FIELDS),
  droppedAtTick: number("droppedAtTick", (groundItem, into, at) => {
    into[at] = groundItem.droppedAtTick;
  }),
});
