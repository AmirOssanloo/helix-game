import type { EntityId } from "@shared/public";
import { bearing } from "@shared/public";
import { ticksOfSeconds } from "../../definitions/duration";
import type { DisplaceEffectDef } from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { StatusResult } from "../../statuses/status.system";
import { applyStatus } from "../../statuses/status.system";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";
import {
  collectTargets,
  releaseTargets,
  takeTargets,
  targetAt,
} from "./targets";

/** The bearing a push sends the unit along: away from the cast's anchor, or along its facing. */
const directionOf = (
  entry: Readonly<{ direction: "away" | "facing" }>,
  cast: Cast,
  unit: Readonly<Unit>,
): number =>
  entry.direction === "facing" ? cast.facing : bearing(cast.anchor, unit.curr);

/**
 * Puts a lift's status on one unit for `ticks`, from the cast that lifted it. Everything a
 * lift does is the status's: its flags take the unit's order off it until the lift ends, and
 * its expiry list is what lands when the unit comes down. This is the one way a lift goes on,
 * so the primitive and a named effect that lifts a unit of its own agree on what lifting is.
 */
export const lift = (
  world: World,
  cast: Cast,
  targetId: EntityId,
  statusId: string,
  ticks: number,
): StatusResult =>
  applyStatus(world, targetId, statusId, ticks, cast.casterId, cast.orbLevels);

/**
 * Takes hold of the unit for `ticks` and moves it `distance` over them, in even steps along
 * `direction`. The movement step translates by the step each tick and collision decides where
 * that leaves it, so a push into a wall stops at the wall's edge with the rest of the push
 * spent against it. A unit a push already has hold of ignores a second one, as the status
 * beside it does.
 */
const push = (
  unit: Unit,
  direction: number,
  distance: number,
  ticks: number,
): void => {
  if (unit.push.ticksLeft > 0) {
    return;
  }

  unit.push.step.x = (Math.cos(direction) * distance) / ticks;
  unit.push.step.y = (Math.sin(direction) * distance) / ticks;
  unit.push.ticksLeft = ticks;
};

/**
 * Moves every unit the entry's target collects, or puts it in the air.
 *
 * A push sends each unit its distance, read at the levels the cast snapshotted, over the
 * entry's seconds: the status the entry names goes on for the same ticks, raising the
 * displaced flag so the unit keeps its order without walking it, and the movement step
 * carries the unit the rest of the way. A push of no ticks moves nobody.
 *
 * A lift puts the entry's status on each unit for the ticks its table gives. Everything else
 * a lift does is the status's: the flags it sets take the unit's order off it until the lift
 * ends and put the order back when it does.
 */
export const displace: Primitive<DisplaceEffectDef> = (
  world: World,
  cast: Cast,
  entry: DisplaceEffectDef,
): void => {
  const level = takeTargets();
  const count = collectTargets(world, cast, entry.target, level);
  const ticks = ticksOfSeconds(world.run.tuning, entry.seconds, cast.orbLevels);

  if (ticks === 0) {
    releaseTargets(level);

    return;
  }

  const distance =
    entry.mode === "push"
      ? tableAtOrbLevels(entry.distance, cast.orbLevels)
      : 0;

  for (let slot = 0; slot < count; slot += 1) {
    const id: EntityId = targetAt(level, slot);
    const unit = world.map.units.resolve(id);

    if (unit === null) {
      continue;
    }

    if (entry.mode === "lift") {
      lift(world, cast, id, entry.statusId, ticks);

      continue;
    }

    const applied = applyStatus(
      world,
      id,
      entry.statusId,
      ticks,
      cast.casterId,
      cast.orbLevels,
    );

    if (applied === "ok") {
      push(unit, directionOf(entry, cast, unit), distance, ticks);
    }
  }

  releaseTargets(level);
};
