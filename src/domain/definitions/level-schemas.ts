import { DAMAGE_TYPES } from "../combat/damage";
import { STATS } from "../entities/unit";
import { effectTargetSchema, shapeSchema } from "./common-schemas";
import type {
  DamageAreaEffectDef,
  DisplaceEffectDef,
  EffectDef,
  NamedEffectDef,
  SpawnProjectileEffectDef,
  SpawnUnitEffectDef,
  SpawnZoneEffectDef,
  SummonBonusDef,
  ZoneLifetimeDef,
  ZoneMotionDef,
} from "./effect-def";
import {
  DAMAGE_RATES,
  PROJECTILE_ORIGINS,
  PUSH_DIRECTIONS,
  ZONE_ANCHORS,
} from "./effect-def";
import type { LevelTable, Scalar } from "./level-table";
import { ORB_IDS } from "./orb-id";
import type { Schema } from "./schema";
import {
  arrayOf,
  arrayOfLength,
  booleanSchema,
  countSchema,
  either,
  idSchema,
  lazy,
  nonNegativeSchema,
  numberSchema,
  objectOf,
  oneOf,
  recordSchema,
  stringSchema,
  taggedUnion,
  tintSchema,
} from "./schema";

/**
 * The schemas whose tables are indexed by orb level, built for the hero's cap: a level table,
 * a number or a level table, and an effect entry and a list of them. A levelled kind builds
 * its schema from these, and the registry checks a named effect's nested entries with the
 * effect schema, since the cap is the registry's to know and no function beside an effect
 * knows it.
 */
export type LevelSchemas = Readonly<{
  levels: number;
  levelTable: Schema<LevelTable>;
  scalar: Schema<Scalar>;
  effect: Schema<EffectDef>;
  effectList: Schema<readonly EffectDef[]>;
}>;

/** The level schemas for a cap of `levels` orb levels, so every table is checked for exactly one entry per level. */
export const createLevelSchemas = (levels: number): LevelSchemas => {
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
        origin: oneOf(PROJECTILE_ORIGINS),
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
        unitId: idSchema,
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

  return {
    levels,
    levelTable: levelTableSchema,
    scalar: scalarSchema,
    effect: effectSchema,
    effectList: effectListSchema,
  };
};
