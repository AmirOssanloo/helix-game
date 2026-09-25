import type { EntityId } from "@shared/public";
import type { SpawnProjectileEffectDef } from "../../definitions/effect-def";
import { readTunable } from "../../definitions/tuning-state";
import { acquireProjectile } from "../../entities/projectile";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";

/**
 * One projectile from the entry that named it, fired from the cast's anchor along its facing,
 * or, when the entry leaves from the caster, from where the caster stands toward the anchor,
 * so a shot at a unit crosses the gap rather than starting on its target. A caster standing on
 * the anchor fires along the facing. A homing entry gives it the cast's target, so it turns
 * onto that unit every tick and lands on it alone; a linear one holds the bearing and sweeps
 * whatever hostile crosses it.
 *
 * A homing entry the cast aimed at no unit fires nothing: it has nothing to follow, and a
 * projectile that quietly flew the facing instead would be a different shot from the one the
 * definition wrote. Nor does one that leaves from a caster that is gone.
 *
 * The speed the entry writes is world units per second, as every speed content writes is; it
 * becomes units per tick here, where the step rate is read, since a projectile has no record
 * of its own to convert it in.
 *
 * A pool with no room leaves the rest of the list to run; a projectile that did not spawn is
 * a miss the instrumentation counts, not a refusal the caster hears about.
 */
export const spawnProjectile: Primitive<SpawnProjectileEffectDef> = (
  world: World,
  cast: Cast,
  entry: SpawnProjectileEffectDef,
): void => {
  if (entry.homing && cast.targetId === null) {
    return;
  }

  const caster =
    entry.origin === "caster" ? world.map.units.resolve(cast.casterId) : null;

  if (entry.origin === "caster" && caster === null) {
    return;
  }

  const x = caster === null ? cast.anchor.x : caster.curr.x;
  const y = caster === null ? cast.anchor.y : caster.curr.y;
  const dx = cast.anchor.x - x;
  const dy = cast.anchor.y - y;
  const facing = dx === 0 && dy === 0 ? cast.facing : Math.atan2(dy, dx);
  const id: EntityId | null = acquireProjectile(world, x, y, facing);
  const projectile = id === null ? null : world.map.projectiles.resolve(id);

  if (projectile === null) {
    return;
  }

  projectile.ability = cast.ability;
  projectile.casterId = cast.casterId;

  for (let orb = 0; orb < projectile.orbLevels.length; orb += 1) {
    projectile.orbLevels[orb] = cast.orbLevels[orb] ?? 0;
  }

  projectile.targetId = entry.homing ? cast.targetId : null;
  projectile.speed = entry.speed / readTunable(world.run.tuning, "sim_hz");
  projectile.radius = entry.radius;
  projectile.onHit = entry.onHit;
  projectile.maxRange = entry.maxRange;
  projectile.frame = entry.atlasFrame;
  projectile.tint = entry.tint;
};
