import type { DamageType } from "../combat/damage";
import type { Stat } from "../entities/unit";
import type { LevelTable, Scalar } from "./level-table";

/**
 * An area placed at the cast context's anchor and turned to its facing: a circle by radius, a
 * rectangle by its length along the facing and width across it, centred on the anchor, or a
 * cone by its full angle in degrees and length, apex at the anchor.
 */
export type ShapeDef =
  | Readonly<{ kind: "circle"; radius: number }>
  | Readonly<{ kind: "rectangle"; length: number; width: number }>
  | Readonly<{ kind: "cone"; angleDegrees: number; length: number }>;

/**
 * Whom an effect touches: the context's target unit, every unit inside the zone that runs
 * it, or every unit inside a shape at the anchor. A shape or a zone collects units hostile
 * to the caster only.
 */
export type EffectTargetDef =
  Readonly<{ kind: "target" }> | Readonly<{ kind: "zone" }> | ShapeDef;

/** Whether a damage amount lands once or is a per-second rate, which is legal only in a zone's each-tick list. */
export type DamageRate = "once" | "per_second";

/** Every damage rate, for content validation to check an entry against. */
export const DAMAGE_RATES: readonly DamageRate[] = ["once", "per_second"];

/** Where a zone is placed: at the context's anchor, or on the caster so it moves with the caster. */
export type ZoneAnchor = "anchor" | "caster";

/** Every zone anchor, for content validation to check an entry against. */
export const ZONE_ANCHORS: readonly ZoneAnchor[] = ["anchor", "caster"];

/**
 * Where a projectile leaves from: the context's anchor, or the caster, turned toward the
 * anchor. A unit cast anchors on its target, so a shot the caster throws at a unit leaves from
 * the caster.
 */
export type ProjectileOrigin = "anchor" | "caster";

/** Every projectile origin, for content validation to check an entry against. */
export const PROJECTILE_ORIGINS: readonly ProjectileOrigin[] = [
  "anchor",
  "caster",
];

/** How long a zone stays active: a duration, or exactly as long as its motion takes. */
export type ZoneLifetimeDef =
  Readonly<{ kind: "seconds"; seconds: Scalar }> | Readonly<{ kind: "motion" }>;

/** Whether a zone stands still or travels a line along its facing at a speed for a distance. */
export type ZoneMotionDef =
  | Readonly<{ kind: "still" }>
  | Readonly<{ kind: "line"; speed: number; distance: LevelTable }>;

/** One stat bonus written on a summon at spawn as a flat modifier row for its life. */
export type SummonBonusDef = Readonly<{
  stat: Stat;
  flat: LevelTable;
}>;

/** Which way a push sends the unit: away from the caster, or along the cast facing. */
export type PushDirection = "away" | "facing";

/** Every push direction, for content validation to check an entry against. */
export const PUSH_DIRECTIONS: readonly PushDirection[] = ["away", "facing"];

/** Damage of a type to every unit the target collects, the amount split evenly among them or applied to each in full. */
export type DamageAreaEffectDef = Readonly<{
  kind: "damage_area";
  target: EffectTargetDef;
  damageType: DamageType;
  amount: LevelTable;
  rate: DamageRate;
  split: boolean;
}>;

/** A status on every unit the target collects, for a duration the applier gives. */
export type ApplyStatusEffectDef = Readonly<{
  kind: "apply_status";
  target: EffectTargetDef;
  statusId: string;
  seconds: Scalar;
}>;

/** A projectile from the anchor or the caster, homing on the target unit or flying its bearing, running its list on what it hits. */
export type SpawnProjectileEffectDef = Readonly<{
  kind: "spawn_projectile";
  origin: ProjectileOrigin;
  speed: number;
  radius: number;
  homing: boolean;
  maxRange: number;
  onHit: readonly EffectDef[];
  atlasFrame: string;
  tint: number;
}>;

/**
 * A zone with a shape, placed at the anchor or on the caster, active after a delay for its
 * lifetime, still or travelling. Its activation list runs once when the delay ends and its
 * each-tick list every tick it is active, both with the zone as the cast context.
 */
export type SpawnZoneEffectDef = Readonly<{
  kind: "spawn_zone";
  shape: ShapeDef;
  anchor: ZoneAnchor;
  delaySeconds: number;
  lifetime: ZoneLifetimeDef;
  motion: ZoneMotionDef;
  onActivate: readonly EffectDef[];
  eachTick: readonly EffectDef[];
  atlasFrame: string;
  tint: number;
}>;

/** Summons owned by the caster, placed forward and to the right of its facing, living for a while, with bonuses written on each. */
export type SpawnUnitEffectDef = Readonly<{
  kind: "spawn_unit";
  unitId: string;
  count: number;
  offset: Readonly<{ forward: number; right: number }>;
  lifetimeSeconds: LevelTable;
  bonuses: readonly SummonBonusDef[];
}>;

/**
 * A push moves every unit the target collects a distance at a speed, in world units a second,
 * through the movement step, so it stops at an obstacle edge; how long it lasts follows from
 * the distance at the level cast. A lift puts its status on each, suspending the
 * order until the status ends. Both name the status they apply for their duration, since a
 * displacement is a status on the unit and a movement of it together: the status carries the
 * flag that stops the unit moving itself and the icon that says why.
 */
export type DisplaceEffectDef =
  | Readonly<{
      kind: "displace";
      mode: "push";
      target: EffectTargetDef;
      statusId: string;
      direction: PushDirection;
      distance: LevelTable;
      speed: number;
    }>
  | Readonly<{
      kind: "displace";
      mode: "lift";
      target: EffectTargetDef;
      statusId: string;
      seconds: LevelTable;
    }>;

/**
 * A function the named-effect registry holds, by key, with the fields the function declares
 * beside itself. The registry validates the fields against the function's own schema, so
 * the shape is the function's to know and content's to write.
 */
export type NamedEffectDef = Readonly<{
  kind: "named";
  key: string;
  fields: Readonly<Record<string, unknown>>;
}>;

/**
 * One entry of an effect list: a primitive the effect runner knows, or a named effect the
 * domain registry holds. A zone's two lists, a projectile's hit list, and a status's hook
 * and expiry lists hold the same entries.
 */
export type EffectDef =
  | DamageAreaEffectDef
  | ApplyStatusEffectDef
  | SpawnProjectileEffectDef
  | SpawnZoneEffectDef
  | SpawnUnitEffectDef
  | DisplaceEffectDef
  | NamedEffectDef;
