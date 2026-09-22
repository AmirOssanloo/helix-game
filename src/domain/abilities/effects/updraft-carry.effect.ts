import type { EntityId } from "@shared/public";
import { ticksOfSeconds } from "../../definitions/duration";
import type { EffectTargetDef } from "../../definitions/effect-def";
import type { LevelTable } from "../../definitions/level-table";
import { ORB_IDS } from "../../definitions/orb-id";
import type { Schema } from "../../definitions/schema";
import {
  arrayOf,
  idSchema,
  numberSchema,
  objectOf,
  oneOf,
} from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import type { Zone } from "../../entities/zone";
import { hasTakenHit, takeHit } from "../../entities/zone";
import { holdsStatus } from "../../statuses/status-table";
import type { Cast } from "../cast-context";
import { lift } from "../primitives/displace";
import {
  collectTargets,
  releaseTargets,
  takeTargets,
  targetAt,
} from "../primitives/targets";
import type { NamedEffect } from "./index";

/** Whom the zone running the effect picks up: every unit inside it, which a zone collects hostile to the caster. */
const INSIDE: EffectTargetDef = { kind: "zone" };

/** The fields the entry naming this effect carries: how long a unit stays in the air, and the status that holds it there. */
export type UpdraftCarryFields = Readonly<{
  liftSeconds: LevelTable;
  statusId: string;
}>;

/**
 * A level table as a named effect's field: the orb that indexes it and one entry per orb
 * level. The count is the registry's to check against the hero's level cap, which no
 * function beside an effect knows, so the shape is all this asks for.
 */
const levelTableSchema: Schema<LevelTable> = objectOf<LevelTable>({
  orb: oneOf(ORB_IDS),
  byLevel: arrayOf(numberSchema),
});

/** The schema the registry validates an entry's fields against when content is loaded. */
export const updraftCarryFields: Schema<UpdraftCarryFields> =
  objectOf<UpdraftCarryFields>({
    liftSeconds: levelTableSchema,
    statusId: idSchema,
  });

/**
 * The fields as the shape beside them, which the registry proved before a world existed. A
 * check here would allocate a fault list on the hot path to learn what content already knows.
 */
const fieldsOf = (
  fields: Readonly<Record<string, unknown>>,
): UpdraftCarryFields => fields as UpdraftCarryFields;

/**
 * Lifts every unit inside the zone that the zone has not taken and that is not already in
 * the air, and records each one on the zone's hit list, so one updraft lifts a unit once and
 * a second updraft passing over a unit already lifted leaves it where the first put it.
 */
const pickUp = (
  world: World,
  cast: Cast,
  zone: Zone,
  statusId: string,
  ticks: number,
): void => {
  const level = takeTargets();
  const count = collectTargets(world, cast, INSIDE, level);

  for (let slot = 0; slot < count; slot += 1) {
    const id: EntityId = targetAt(level, slot);
    const unit = world.map.units.resolve(id);

    if (
      unit === null ||
      hasTakenHit(zone, id) ||
      holdsStatus(unit.statuses, statusId, world.tick)
    ) {
      continue;
    }

    if (lift(world, cast, id, statusId, ticks) === "ok") {
      takeHit(zone, id);
    }
  }

  releaseTargets(level);
};

/**
 * Moves every unit the zone has taken and is still holding in the air by the step the zone
 * travelled this tick, and tells the spatial hash where that left it, since the pass that
 * keeps the hash true ran earlier in the tick. A unit whose lift has ended, or that has
 * died, is left where it stands.
 */
const carry = (world: World, zone: Readonly<Zone>, statusId: string): void => {
  for (let slot = 0; slot < zone.hitCount; slot += 1) {
    const id = zone.hits[slot];
    const unit = id === undefined ? null : world.map.units.resolve(id);

    if (
      id === undefined ||
      unit === null ||
      unit.state === "dead" ||
      !holdsStatus(unit.statuses, statusId, world.tick)
    ) {
      continue;
    }

    unit.curr.x += zone.travel.x;
    unit.curr.y += zone.travel.y;
    world.map.spatialHash.move(id, unit.curr.x, unit.curr.y);
  }
};

/**
 * Updraft's carry, run every tick by the zone that travels: it picks up whoever it has
 * reached and takes everyone it is holding along with it.
 *
 * What comes after is the lift status's, not this function's. The zone expires when its
 * motion is spent and the units it was carrying stay in the air where it left them; each one
 * comes down on its own tick, and the drop and its damage are the status's expiry list, so
 * they happen on time whether or not the zone still exists.
 */
export const updraftCarryEffect: NamedEffect = (
  world: World,
  cast: Cast,
  fields: Readonly<Record<string, unknown>>,
): void => {
  const { liftSeconds, statusId } = fieldsOf(fields);
  const zoneId = cast.zoneId;
  const zone = zoneId === null ? null : world.map.zones.resolve(zoneId);

  if (zone === null) {
    return;
  }

  pickUp(
    world,
    cast,
    zone,
    statusId,
    ticksOfSeconds(world.run.tuning, liftSeconds, cast.orbLevels),
  );
  carry(world, zone, statusId);
};
