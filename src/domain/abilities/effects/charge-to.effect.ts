import { wrapAngle } from "@shared/public";
import { ticksOfTravel } from "../../definitions/duration";
import type { LevelTable } from "../../definitions/level-table";
import { tableAtOrbLevels } from "../../definitions/level-table";
import { ORB_IDS } from "../../definitions/orb-id";
import type { Schema } from "../../definitions/schema";
import {
  arrayOf,
  idSchema,
  numberSchema,
  objectOf,
  nonNegativeSchema,
  oneOf,
} from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import { applyStatus } from "../../statuses/status.system";
import type { Cast } from "../cast-context";
import { push } from "../primitives/displace";
import type { NamedEffect } from "./index";

/** The fields the entry naming this effect carries: how far the caster goes at most, how fast, and the status that holds it while it does. */
export type ChargeToFields = Readonly<{
  distance: LevelTable;
  speed: number;
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
export const chargeToFields: Schema<ChargeToFields> = objectOf<ChargeToFields>({
  distance: levelTableSchema,
  speed: nonNegativeSchema,
  statusId: idSchema,
});

/**
 * The fields as the shape beside them, which the registry proved before a world existed. A
 * check here would allocate a fault list on the hot path to learn what content already knows.
 */
const fieldsOf = (fields: Readonly<Record<string, unknown>>): ChargeToFields =>
  fields as ChargeToFields;

/**
 * A charge: the caster itself is carried toward what the cast is aimed at, at the entry's
 * speed, for the entry's distance at the levels the cast committed with or the gap to its
 * target, whichever is shorter, so it stops against the target's edge rather than running
 * through it. The gap to a unit is centre to centre less both bound radii; to a point, centre
 * to the point. The status the entry names goes on the caster, from the caster, for the ticks
 * the travel takes, raising the displaced flag so it keeps its order without walking it, and
 * the same push a displacement gives any unit carries it through the movement step, so a wall
 * stops it at the wall's edge. A caster a push already has hold of, a target that is gone, and
 * a gap already closed move nobody.
 *
 * What comes after is not the effect's: the caster goes on with its backswing, and whatever
 * drives it, a behaviour or a command, attacks from where the charge left it.
 */
export const chargeToEffect: NamedEffect = (
  world: World,
  cast: Cast,
  fields: Readonly<Record<string, unknown>>,
): void => {
  const { distance, speed, statusId } = fieldsOf(fields);
  const casterId = cast.casterId;
  const caster = world.map.units.resolve(casterId);
  const targetId = cast.targetId;
  const aimsAtUnit = targetId !== null && targetId !== casterId;
  const target = aimsAtUnit ? world.map.units.resolve(targetId) : null;

  if (caster === null || (aimsAtUnit && target === null)) {
    return;
  }

  const aimX = target === null ? cast.anchor.x : target.curr.x;
  const aimY = target === null ? cast.anchor.y : target.curr.y;
  const dx = aimX - caster.curr.x;
  const dy = aimY - caster.curr.y;
  const edges = target === null ? 0 : caster.boundRadius + target.boundRadius;
  const gap = Math.sqrt(dx * dx + dy * dy) - edges;
  const travel = Math.min(tableAtOrbLevels(distance, cast.orbLevels), gap);
  const ticks = ticksOfTravel(world.run.tuning, travel, speed);

  if (ticks === 0 || caster.push.ticksLeft > 0) {
    return;
  }

  const applied = applyStatus(
    world,
    casterId,
    statusId,
    ticks,
    casterId,
    cast.orbLevels,
  );

  if (applied === "ok") {
    push(caster, wrapAngle(Math.atan2(dy, dx)), travel, ticks);
  }
};
