import { assert } from "@shared/public";
import type {
  ApplyStatusEffectDef,
  DamageAreaEffectDef,
  DisplaceEffectDef,
  EffectDef,
  NamedEffectDef,
  SpawnProjectileEffectDef,
  SpawnUnitEffectDef,
  SpawnZoneEffectDef,
} from "../../definitions/effect-def";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";
import { applyStatusEffect } from "./apply-status";
import { damageArea } from "./damage-area";
import { displace } from "./displace";

/** Every effect entry the runner dispatches to a primitive: the union less the named effect. */
export type PrimitiveEffectDef = Exclude<EffectDef, NamedEffectDef>;

/** The kind word an entry names its primitive by. */
export type PrimitiveKind = PrimitiveEffectDef["kind"];

/**
 * One primitive: the effect runner hands it the world, the cast context, and the entry that
 * named it. It reads the entry's parameters and nothing else about the definition, so the
 * same primitive runs from a cast, a zone's list, a projectile's hit list, and a damage hook.
 */
export type Primitive<E extends PrimitiveEffectDef> = (
  world: World,
  cast: Cast,
  entry: E,
) => void;

/**
 * Every primitive the runner runs, by the kind that names it. A kind holding `null` is one
 * no effect list may name: the content tier resolves each kind here as it resolves a named
 * effect's key, so a definition is refused at load rather than doing nothing at commit.
 */
type PrimitiveTable = Readonly<{
  damage_area: Primitive<DamageAreaEffectDef> | null;
  apply_status: Primitive<ApplyStatusEffectDef> | null;
  spawn_projectile: Primitive<SpawnProjectileEffectDef> | null;
  spawn_zone: Primitive<SpawnZoneEffectDef> | null;
  spawn_unit: Primitive<SpawnUnitEffectDef> | null;
  displace: Primitive<DisplaceEffectDef> | null;
}>;

const primitives: PrimitiveTable = {
  damage_area: damageArea,
  apply_status: applyStatusEffect,
  spawn_projectile: null,
  spawn_zone: null,
  spawn_unit: null,
  displace,
};

const call = <E extends PrimitiveEffectDef>(
  primitive: Primitive<E> | null,
  world: World,
  cast: Cast,
  entry: E,
): void => {
  assert(primitive !== null, "The content tier resolves every primitive kind");
  primitive(world, cast, entry);
};

/** Runs the primitive `entry` names, with `cast` as the context every effect reads. */
export const runPrimitive = (
  world: World,
  cast: Cast,
  entry: PrimitiveEffectDef,
): void => {
  switch (entry.kind) {
    case "damage_area":
      call(primitives.damage_area, world, cast, entry);

      break;

    case "apply_status":
      call(primitives.apply_status, world, cast, entry);

      break;

    case "spawn_projectile":
      call(primitives.spawn_projectile, world, cast, entry);

      break;

    case "spawn_zone":
      call(primitives.spawn_zone, world, cast, entry);

      break;

    case "spawn_unit":
      call(primitives.spawn_unit, world, cast, entry);

      break;

    case "displace":
      call(primitives.displace, world, cast, entry);

      break;
  }
};
