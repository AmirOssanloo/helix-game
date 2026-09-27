/**
 * The schemas more than one definition kind is built from and that do not depend on the orb
 * level cap: points, rectangles, shapes and effect targets, an enemy's ability entry, a body,
 * an attack, attributes, and stats.
 */
import type { Rect, Vec2 } from "@shared/public";
import type { AttackDef } from "./attack-def";
import type { EffectTargetDef, ShapeDef } from "./effect-def";
import type { AbilityConditionDef, EnemyAbilityEntryDef } from "./enemy-def";
import type {
  AttributeConversions,
  Attributes,
  BodyDef,
  Stats,
} from "./form-def";
import type { Schema } from "./schema";
import {
  nonNegativeSchema,
  numberSchema,
  objectOf,
  oneOf,
  idSchema,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "./schema";

export const vec2Schema: Schema<Readonly<Vec2>> = objectOf<Readonly<Vec2>>({
  x: numberSchema,
  y: numberSchema,
});

export const rectSchema: Schema<Readonly<Rect>> = objectOf<Readonly<Rect>>({
  minX: numberSchema,
  minY: numberSchema,
  maxX: numberSchema,
  maxY: numberSchema,
});

export const shapeSchema: Schema<ShapeDef> = taggedUnion<"kind", ShapeDef>(
  "kind",
  {
    circle: objectOf({ kind: oneOf(["circle"]), radius: nonNegativeSchema }),
    rectangle: objectOf({
      kind: oneOf(["rectangle"]),
      length: nonNegativeSchema,
      width: nonNegativeSchema,
    }),
    cone: objectOf({
      kind: oneOf(["cone"]),
      angleDegrees: nonNegativeSchema,
      length: nonNegativeSchema,
    }),
  },
);

export const effectTargetSchema: Schema<EffectTargetDef> = taggedUnion<
  "kind",
  EffectTargetDef
>("kind", {
  target: objectOf({ kind: oneOf(["target"]) }),
  zone: objectOf({ kind: oneOf(["zone"]) }),
  circle: objectOf({ kind: oneOf(["circle"]), radius: nonNegativeSchema }),
  rectangle: objectOf({
    kind: oneOf(["rectangle"]),
    length: nonNegativeSchema,
    width: nonNegativeSchema,
  }),
  cone: objectOf({
    kind: oneOf(["cone"]),
    angleDegrees: nonNegativeSchema,
    length: nonNegativeSchema,
  }),
});

export const abilityConditionSchema: Schema<AbilityConditionDef> = taggedUnion<
  "kind",
  AbilityConditionDef
>("kind", {
  always: objectOf({ kind: oneOf(["always"]) }),
  health_below: objectOf({
    kind: oneOf(["health_below"]),
    fraction: numberSchema,
  }),
  target_within: objectOf({
    kind: oneOf(["target_within"]),
    distance: numberSchema,
  }),
});

export const enemyAbilityEntrySchema: Schema<EnemyAbilityEntryDef> =
  objectOf<EnemyAbilityEntryDef>({
    id: idSchema,
    condition: abilityConditionSchema,
  });

export const bodySchema: Schema<BodyDef> = objectOf<BodyDef>({
  collisionRadius: nonNegativeSchema,
  boundRadius: nonNegativeSchema,
  selectionRadius: nonNegativeSchema,
});

export const attackSchema: Schema<AttackDef> = objectOf<AttackDef>({
  damage: nonNegativeSchema,
  range: nonNegativeSchema,
  acquireRadius: nonNegativeSchema,
  pointSeconds: nonNegativeSchema,
  backswingSeconds: nonNegativeSchema,
  baseAttackTimeSeconds: nonNegativeSchema,
  projectileSpeed: nonNegativeSchema,
  projectileRadius: nonNegativeSchema,
  atlasFrame: stringSchema,
  tint: tintSchema,
});

export const attributesSchema: Schema<Readonly<Attributes>> = objectOf<
  Readonly<Attributes>
>({
  strength: numberSchema,
  agility: numberSchema,
  intelligence: numberSchema,
});

export const conversionsSchema: Schema<AttributeConversions> =
  objectOf<AttributeConversions>({
    healthPerStrength: numberSchema,
    healthRegenPerStrength: numberSchema,
    manaPerIntelligence: numberSchema,
    manaRegenPerIntelligence: numberSchema,
    armourPerAgility: numberSchema,
    attackSpeedPerAgility: numberSchema,
  });

export const statsSchema: Schema<Readonly<Stats>> = objectOf<Readonly<Stats>>({
  maxHealth: numberSchema,
  healthRegen: numberSchema,
  maxMana: numberSchema,
  manaRegen: numberSchema,
  armour: numberSchema,
  attackSpeed: numberSchema,
  magicResistance: numberSchema,
});
