import type { Rect, Vec2 } from "@shared/public";
import { DAMAGE_TYPES } from "../combat/damage";
import { STATS } from "../entities/unit";
import type { AbilityDef, PreviewDef } from "./ability-def";
import { TARGETING_KINDS } from "./ability-def";
import type { AtlasFrameDef, AtlasShape } from "./atlas-frame-def";
import type { AttackDef } from "./attack-def";
import type {
  DamageAreaEffectDef,
  DisplaceEffectDef,
  EffectDef,
  EffectTargetDef,
  NamedEffectDef,
  ShapeDef,
  SpawnProjectileEffectDef,
  SpawnUnitEffectDef,
  SpawnZoneEffectDef,
  SummonBonusDef,
  ZoneLifetimeDef,
  ZoneMotionDef,
} from "./effect-def";
import { DAMAGE_RATES, PUSH_DIRECTIONS, ZONE_ANCHORS } from "./effect-def";
import type { EnemyDef, SummonDef } from "./enemy-def";
import { ENEMY_TIERS } from "./enemy-def";
import type {
  AttributeConversions,
  Attributes,
  BodyDef,
  FormDef,
  Stats,
} from "./form-def";
import type { HeroDef } from "./hero-def";
import type { LevelTable, Scalar } from "./level-table";
import type { MapDef, PackDef } from "./map-def";
import { ORB_IDS } from "./orb-id";
import type { FieldSchemas, Schema } from "./schema";
import {
  arrayOf,
  arrayOfLength,
  booleanSchema,
  countSchema,
  either,
  idSchema,
  lazy,
  nonNegativeSchema,
  nullable,
  numberSchema,
  objectOf,
  oneOf,
  recordSchema,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "./schema";
import type { SpellDef } from "./spell-def";
import type {
  DamageOverTimeDef,
  StatusDef,
  StatusHookDef,
  StatusModifierDef,
} from "./status-def";
import { STACK_RULES, STATUS_FLAGS, STATUS_MODIFIER_KINDS } from "./status-def";
import type { TuningDef, TuningKey } from "./tuning-def";
import { TUNING_KEYS } from "./tuning-def";

/** A recipe is this many orbs. */
const RECIPE_LENGTH = 3;

const vec2Schema: Schema<Readonly<Vec2>> = objectOf<Readonly<Vec2>>({
  x: numberSchema,
  y: numberSchema,
});

const rectSchema: Schema<Readonly<Rect>> = objectOf<Readonly<Rect>>({
  minX: numberSchema,
  minY: numberSchema,
  maxX: numberSchema,
  maxY: numberSchema,
});

const shapeSchema: Schema<ShapeDef> = taggedUnion<"kind", ShapeDef>("kind", {
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

const effectTargetSchema: Schema<EffectTargetDef> = taggedUnion<
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

const bodySchema: Schema<BodyDef> = objectOf<BodyDef>({
  collisionRadius: nonNegativeSchema,
  boundRadius: nonNegativeSchema,
  selectionRadius: nonNegativeSchema,
});

const attackSchema: Schema<AttackDef> = objectOf<AttackDef>({
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

const attributesSchema: Schema<Readonly<Attributes>> = objectOf<
  Readonly<Attributes>
>({
  strength: numberSchema,
  agility: numberSchema,
  intelligence: numberSchema,
});

const conversionsSchema: Schema<AttributeConversions> =
  objectOf<AttributeConversions>({
    healthPerStrength: numberSchema,
    healthRegenPerStrength: numberSchema,
    manaPerIntelligence: numberSchema,
    manaRegenPerIntelligence: numberSchema,
    armourPerAgility: numberSchema,
    attackSpeedPerAgility: numberSchema,
  });

const statsSchema: Schema<Readonly<Stats>> = objectOf<Readonly<Stats>>({
  maxHealth: numberSchema,
  healthRegen: numberSchema,
  maxMana: numberSchema,
  manaRegen: numberSchema,
  armour: numberSchema,
  attackSpeed: numberSchema,
  magicResistance: numberSchema,
});

const atlasShapeSchema: Schema<AtlasShape> = taggedUnion<"kind", AtlasShape>(
  "kind",
  {
    disc: objectOf({ kind: oneOf(["disc"]) }),
    ring: objectOf({ kind: oneOf(["ring"]), thickness: nonNegativeSchema }),
    square: objectOf({ kind: oneOf(["square"]) }),
    square_outline: objectOf({
      kind: oneOf(["square_outline"]),
      thickness: nonNegativeSchema,
    }),
    square_dot: objectOf({
      kind: oneOf(["square_dot"]),
      holeFraction: nonNegativeSchema,
    }),
    triangle: objectOf({ kind: oneOf(["triangle"]) }),
    cone: objectOf({
      kind: oneOf(["cone"]),
      angleDegrees: nonNegativeSchema,
    }),
    pixel: objectOf({ kind: oneOf(["pixel"]) }),
    wedge: objectOf({
      kind: oneOf(["wedge"]),
      step: countSchema,
      steps: countSchema,
    }),
    stripes: objectOf({
      kind: oneOf(["stripes"]),
      thickness: nonNegativeSchema,
    }),
    icon: objectOf({ kind: oneOf(["icon"]), glyph: stringSchema }),
    diamond_grid: objectOf({
      kind: oneOf(["diamond_grid"]),
      diamondWidth: countSchema,
    }),
    glyph: objectOf({ kind: oneOf(["glyph"]), character: stringSchema }),
  },
);

/** One frame of the atlas: a name, a size in pixels, and a shape the bake knows. */
export const atlasFrameSchema: Schema<AtlasFrameDef> = objectOf<AtlasFrameDef>({
  name: stringSchema,
  width: countSchema,
  height: countSchema,
  shape: atlasShapeSchema,
});

/** The hero: its forms by id and how it levels. The threshold table's length against the level cap is a cross-field check the registry makes. */
export const heroSchema: Schema<HeroDef> = objectOf<HeroDef>({
  forms: arrayOf(idSchema),
  attack: attackSchema,
  maxLevel: countSchema,
  experienceThresholds: arrayOf(nonNegativeSchema),
  startingSkillPoints: countSchema,
  skillPointsPerLevel: countSchema,
  maxOrbLevel: countSchema,
});

/** The tuning table: every key the tuning definition names, each a finite number, and nothing else. */
export const tuningSchema: Schema<TuningDef> = objectOf<TuningDef>(
  Object.fromEntries(
    TUNING_KEYS.map((key): [TuningKey, Schema<number>] => [key, numberSchema]),
  ) as FieldSchemas<TuningDef>,
);

/** One map: its id, bounds, obstacles, spawn point, and packs. How many a pack may hold is a check the registry makes against the live cap. */
export const mapSchema: Schema<MapDef> = objectOf<MapDef>({
  id: idSchema,
  bounds: rectSchema,
  obstacles: arrayOf(rectSchema),
  spawnPoint: vec2Schema,
  packs: arrayOf(
    objectOf<PackDef>({
      archetypeId: idSchema,
      tier: oneOf(ENEMY_TIERS),
      count: countSchema,
      position: vec2Schema,
      dormant: booleanSchema,
    }),
  ),
});

/**
 * The schema of every definition kind whose tables are indexed by orb level, and the effect
 * entry's own, which the registry needs by itself: a named effect declares the entries its
 * fields carry and they are checked with this, since the orb level cap is the registry's to
 * know and no function beside an effect knows it.
 */
export type LevelledSchemas = Readonly<{
  form: Schema<FormDef>;
  spell: Schema<SpellDef>;
  ability: Schema<AbilityDef>;
  status: Schema<StatusDef>;
  enemy: Schema<EnemyDef>;
  summon: Schema<SummonDef>;
  effect: Schema<EffectDef>;
}>;

/**
 * The schemas of every kind that carries a level table, built for a cap of `levels` orb
 * levels so every table is checked for exactly one entry per level. The hero definition
 * holds the cap; the registry reads it first and builds these from it.
 */
export const createLevelledSchemas = (levels: number): LevelledSchemas => {
  const levelTableSchema: Schema<LevelTable> = objectOf<LevelTable>({
    orb: oneOf(ORB_IDS),
    byLevel: arrayOfLength(numberSchema, levels),
  });

  const scalarSchema: Schema<Scalar> = either(
    numberSchema,
    levelTableSchema,
    "a number or a level table with its orb",
  );

  const effectListSchema: Schema<readonly EffectDef[]> = lazy(() =>
    arrayOf(effectSchema),
  );

  const zoneLifetimeSchema: Schema<ZoneLifetimeDef> = taggedUnion<
    "kind",
    ZoneLifetimeDef
  >("kind", {
    seconds: objectOf({ kind: oneOf(["seconds"]), seconds: scalarSchema }),
    motion: objectOf({ kind: oneOf(["motion"]) }),
  });

  const zoneMotionSchema: Schema<ZoneMotionDef> = taggedUnion<
    "kind",
    ZoneMotionDef
  >("kind", {
    still: objectOf({ kind: oneOf(["still"]) }),
    line: objectOf({
      kind: oneOf(["line"]),
      speed: nonNegativeSchema,
      distance: levelTableSchema,
    }),
  });

  const displaceSchema: Schema<DisplaceEffectDef> = taggedUnion<
    "mode",
    DisplaceEffectDef
  >("mode", {
    push: objectOf({
      kind: oneOf(["displace"]),
      mode: oneOf(["push"]),
      target: effectTargetSchema,
      statusId: idSchema,
      direction: oneOf(PUSH_DIRECTIONS),
      distance: levelTableSchema,
      speed: nonNegativeSchema,
    }),
    lift: objectOf({
      kind: oneOf(["displace"]),
      mode: oneOf(["lift"]),
      target: effectTargetSchema,
      statusId: idSchema,
      seconds: levelTableSchema,
    }),
  });

  const effectSchema: Schema<EffectDef> = taggedUnion<"kind", EffectDef>(
    "kind",
    {
      damage_area: objectOf<DamageAreaEffectDef>({
        kind: oneOf(["damage_area"]),
        target: effectTargetSchema,
        damageType: oneOf(DAMAGE_TYPES),
        amount: levelTableSchema,
        rate: oneOf(DAMAGE_RATES),
        split: booleanSchema,
      }),
      apply_status: objectOf({
        kind: oneOf(["apply_status"]),
        target: effectTargetSchema,
        statusId: idSchema,
        seconds: scalarSchema,
      }),
      spawn_projectile: objectOf<SpawnProjectileEffectDef>({
        kind: oneOf(["spawn_projectile"]),
        speed: nonNegativeSchema,
        radius: nonNegativeSchema,
        homing: booleanSchema,
        maxRange: nonNegativeSchema,
        onHit: effectListSchema,
        atlasFrame: stringSchema,
        tint: tintSchema,
      }),
      spawn_zone: objectOf<SpawnZoneEffectDef>({
        kind: oneOf(["spawn_zone"]),
        shape: shapeSchema,
        anchor: oneOf(ZONE_ANCHORS),
        delaySeconds: nonNegativeSchema,
        lifetime: zoneLifetimeSchema,
        motion: zoneMotionSchema,
        onActivate: effectListSchema,
        eachTick: effectListSchema,
        atlasFrame: stringSchema,
        tint: tintSchema,
      }),
      spawn_unit: objectOf<SpawnUnitEffectDef>({
        kind: oneOf(["spawn_unit"]),
        summonId: idSchema,
        count: countSchema,
        offset: objectOf({ forward: numberSchema, right: numberSchema }),
        lifetimeSeconds: levelTableSchema,
        bonuses: arrayOf(
          objectOf<SummonBonusDef>({
            stat: oneOf(STATS),
            flat: levelTableSchema,
          }),
        ),
      }),
      displace: displaceSchema,
      named: objectOf<NamedEffectDef>({
        kind: oneOf(["named"]),
        key: idSchema,
        fields: recordSchema,
      }),
    },
  );

  const previewSchema: Schema<PreviewDef> = taggedUnion<"kind", PreviewDef>(
    "kind",
    {
      none: objectOf({ kind: oneOf(["none"]) }),
      unit: objectOf({ kind: oneOf(["unit"]), atlasFrame: stringSchema }),
      circle: objectOf({
        kind: oneOf(["circle"]),
        radius: nonNegativeSchema,
        atlasFrame: stringSchema,
      }),
      rectangle: objectOf({
        kind: oneOf(["rectangle"]),
        length: scalarSchema,
        width: nonNegativeSchema,
        offset: scalarSchema,
        atlasFrame: stringSchema,
      }),
      line: objectOf({ kind: oneOf(["line"]) }),
      cone: objectOf({
        kind: oneOf(["cone"]),
        angleDegrees: nonNegativeSchema,
        length: nonNegativeSchema,
        atlasFrame: stringSchema,
      }),
    },
  );

  const abilityFields: FieldSchemas<AbilityDef> = {
    id: idSchema,
    targeting: oneOf(TARGETING_KINDS),
    castPointSeconds: nonNegativeSchema,
    backswingSeconds: nonNegativeSchema,
    cooldownSeconds: arrayOfLength(nonNegativeSchema, levels),
    manaCost: arrayOfLength(nonNegativeSchema, levels),
    range: nonNegativeSchema,
    effects: effectListSchema,
    preview: previewSchema,
    atlasFrame: stringSchema,
    tint: tintSchema,
  };

  const hookSchema: Schema<StatusHookDef> = objectOf<StatusHookDef>({
    cooldownSeconds: levelTableSchema,
    effects: effectListSchema,
  });

  const enemyFields: FieldSchemas<EnemyDef> = {
    id: idSchema,
    health: nonNegativeSchema,
    healthRegen: numberSchema,
    mana: nonNegativeSchema,
    manaRegen: numberSchema,
    armour: numberSchema,
    magicResistance: numberSchema,
    movementSpeed: nonNegativeSchema,
    turnRate: nonNegativeSchema,
    body: bodySchema,
    attack: attackSchema,
    aggroRadius: nonNegativeSchema,
    leashRadius: nonNegativeSchema,
    experience: nonNegativeSchema,
    indestructible: booleanSchema,
    tier: oneOf(ENEMY_TIERS),
    abilities: arrayOf(idSchema),
    behaviour: idSchema,
    atlasFrame: stringSchema,
    tint: tintSchema,
  };

  return {
    form: objectOf<FormDef>({
      id: idSchema,
      body: bodySchema,
      attributes: attributesSchema,
      attributeGains: attributesSchema,
      conversions: conversionsSchema,
      baseStats: statsSchema,
      abilities: arrayOf(idSchema),
      kit: idSchema,
      atlasFrame: stringSchema,
    }),
    spell: objectOf<SpellDef>({
      ...abilityFields,
      recipe: arrayOfLength(oneOf(ORB_IDS), RECIPE_LENGTH),
    }),
    ability: objectOf<AbilityDef>(abilityFields),
    status: objectOf<StatusDef>({
      id: idSchema,
      flags: arrayOf(oneOf(STATUS_FLAGS)),
      modifiers: arrayOf(
        objectOf<StatusModifierDef>({
          stat: oneOf(STATS),
          kind: oneOf(STATUS_MODIFIER_KINDS),
          amount: levelTableSchema,
        }),
      ),
      damageOverTime: nullable(
        objectOf<DamageOverTimeDef>({
          damageType: oneOf(DAMAGE_TYPES),
          perSecond: levelTableSchema,
        }),
      ),
      onDamageTaken: nullable(hookSchema),
      onDamageDealt: nullable(hookSchema),
      onExpiry: effectListSchema,
      stack: oneOf(STACK_RULES),
      atlasFrame: stringSchema,
    }),
    enemy: objectOf<EnemyDef>(enemyFields),
    summon: objectOf<SummonDef>({
      ...enemyFields,
      followDistance: nonNegativeSchema,
    }),
    effect: effectSchema,
  };
};
