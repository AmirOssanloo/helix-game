import type { EntityId } from "@shared/public";
import type { World } from "../../entities/world-state";
import type { Zone } from "../../entities/zone";
import { createDomainEvent, resetDomainEvent } from "../../events/domain-event";
import { createCastRecord, fillZoneCast } from "../cast-context";
import { runEffects } from "../effect-runner";

/** Scratch for the context a zone's lists run with, reused for every zone of every tick. */
const context = createCastRecord();

/** Scratch for the event an expiry announces, reused for every one. */
const event = createDomainEvent();

const announceExpired = (world: World, zoneId: EntityId): void => {
  resetDomainEvent(event);
  event.kind = "zone_expired";
  event.tick = world.tick;
  event.zoneId = zoneId;
  world.events.write(event);
};

/**
 * Where the zone stands this tick: on the caster when it rides one, and a step along its
 * travel once it is active when it moves. A zone that rides a caster that is gone stays
 * where the caster left it.
 */
const carry = (world: World, zone: Zone): void => {
  if (zone.followsCaster) {
    const casterId = zone.casterId;
    const caster = casterId === null ? null : world.map.units.resolve(casterId);

    if (caster !== null) {
      zone.curr.x = caster.curr.x;
      zone.curr.y = caster.curr.y;
    }

    return;
  }

  if (world.tick >= zone.activeAtTick) {
    zone.curr.x += zone.travel.x;
    zone.curr.y += zone.travel.y;
  }
};

/** Runs the lists the tick calls for with the zone as their context, or nothing when no ability stands behind it. */
const runRules = (world: World, zone: Zone, zoneId: EntityId): void => {
  const ability = zone.ability;
  const casterId = zone.casterId;

  if (ability === null || casterId === null || world.tick < zone.activeAtTick) {
    return;
  }

  const cast = fillZoneCast(
    context,
    zoneId,
    casterId,
    ability,
    zone.orbLevels,
    zone.curr.x,
    zone.curr.y,
    zone.facing,
  );

  if (world.tick === zone.activeAtTick) {
    runEffects(world, cast, zone.onActivate);
  }

  runEffects(world, cast, zone.eachTick);
};

/**
 * Keeps every zone on the ground true to its own clock, after the tick's moves: a zone whose
 * expiry tick has come is announced and released without running anything, so a lifetime ends
 * exactly on its tick; every other one is carried to where it stands this tick and runs the
 * lists its clock calls for. A zone still inside its delay is drawn and touches nothing.
 *
 * It runs after collision, so a list reads the positions the tick's pushes and walks left,
 * and before death resolves, so damage a zone dealt is counted on the tick it dealt it.
 */
export const zoneSystem = (world: World): void => {
  const zones = world.map.zones;

  for (let index = 0; index < zones.end; index += 1) {
    const zone = zones.at(index);
    const zoneId = zones.idAt(index);

    if (zone === null || zoneId === null) {
      continue;
    }

    if (world.tick >= zone.expiresAtTick) {
      announceExpired(world, zoneId);
      zones.release(zoneId);

      continue;
    }

    carry(world, zone);
    runRules(world, zone, zoneId);
  }
};
