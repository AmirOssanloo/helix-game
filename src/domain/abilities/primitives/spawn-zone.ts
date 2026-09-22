import type { EntityId } from "@shared/public";
import { ticksOfSeconds } from "../../definitions/duration";
import type {
  SpawnZoneEffectDef,
  ZoneMotionDef,
} from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import { readTunable } from "../../definitions/tuning-state";
import type { World } from "../../entities/world-state";
import type { Zone } from "../../entities/zone";
import { acquireZone } from "../../entities/zone";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";

/** A motion that carries the zone nowhere: what a still zone travels, and what a speed of nothing comes to. */
const NO_SPEED = 0;

/** How many ticks `motion` takes to run its distance at its speed, and nothing for a zone that stands still. */
const motionTicksOf = (
  world: World,
  motion: ZoneMotionDef,
  orbLevels: readonly number[],
): number => {
  if (motion.kind === "still" || motion.speed <= NO_SPEED) {
    return 0;
  }

  return Math.round(
    (tableAtOrbLevels(motion.distance, orbLevels) / motion.speed) *
      readTunable(world.run.tuning, "sim_hz"),
  );
};

/** Writes the step `motion` carries the zone by each tick, along the facing it was placed with. */
const writeTravel = (world: World, zone: Zone, motion: ZoneMotionDef): void => {
  if (motion.kind === "still" || motion.speed <= NO_SPEED) {
    zone.travel.x = 0;
    zone.travel.y = 0;

    return;
  }

  const perTick = motion.speed / readTunable(world.run.tuning, "sim_hz");

  zone.travel.x = Math.cos(zone.facing) * perTick;
  zone.travel.y = Math.sin(zone.facing) * perTick;
};

/**
 * One zone on the ground from the entry that named it: at the cast's anchor, or on the caster
 * when the entry anchors there, in which case it rides the caster for its life. It stands
 * through its delay drawing but touching nothing, runs its activation list on the tick the
 * delay ends, and its each-tick list every tick after that until it expires — a lifetime in
 * seconds counted from activation, or exactly as long as its motion takes.
 *
 * A pool with no room leaves the rest of the list to run; a zone that did not spawn is a miss
 * the instrumentation counts, not a refusal the caster hears about.
 */
export const spawnZone: Primitive<SpawnZoneEffectDef> = (
  world: World,
  cast: Cast,
  entry: SpawnZoneEffectDef,
): void => {
  const onCaster = entry.anchor === "caster";
  const caster = onCaster ? world.map.units.resolve(cast.casterId) : null;
  const x = caster === null ? cast.anchor.x : caster.curr.x;
  const y = caster === null ? cast.anchor.y : caster.curr.y;
  const id: EntityId | null = acquireZone(world, x, y, cast.facing);
  const zone = id === null ? null : world.map.zones.resolve(id);

  if (zone === null) {
    return;
  }

  const delayTicks = ticksOfSeconds(
    world.run.tuning,
    entry.delaySeconds,
    cast.orbLevels,
  );
  const motionTicks = motionTicksOf(world, entry.motion, cast.orbLevels);
  const lifetimeTicks =
    entry.lifetime.kind === "motion"
      ? motionTicks
      : ticksOfSeconds(
          world.run.tuning,
          entry.lifetime.seconds,
          cast.orbLevels,
        );

  zone.ability = cast.ability;
  zone.casterId = cast.casterId;

  for (let orb = 0; orb < zone.orbLevels.length; orb += 1) {
    zone.orbLevels[orb] = cast.orbLevels[orb] ?? 0;
  }

  zone.onActivate = entry.onActivate;
  zone.eachTick = entry.eachTick;
  zone.shape = entry.shape;
  zone.followsCaster = onCaster;
  zone.activeAtTick = world.tick + delayTicks;
  zone.expiresAtTick = zone.activeAtTick + lifetimeTicks;
  zone.frame = entry.atlasFrame;
  zone.tint = entry.tint;
  writeTravel(world, zone, entry.motion);
};
