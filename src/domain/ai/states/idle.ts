import type { EntityId } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { UnitRecord } from "../../definitions/unit-state";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { regenerate } from "../../stats/regeneration";
import type { MachineBehaviour } from "../behaviour";
import { alertPack, enterChase } from "./chase";
import { anchorAtHome, canSee, walkTo } from "./moves";

/**
 * The turn between one wander and the next around the spawn point, and between neighbouring
 * units' first wanders: the golden angle, which never repeats a bearing and spreads any run
 * of them evenly round the circle. A property of the circle, not a number design tunes.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * The next wander: the first after an arrival home is only scheduled, a slot's index later
 * than the interval so a pack does not step off together; each after it walks the wander
 * radius from the spawn point at a bearing a golden angle on from the last.
 */
const wander = (world: World, unit: Unit, index: number): void => {
  const tuning = world.scratch.machine.tuning;
  const ai = unit.ai;

  if (ai.wanderAtTick === null) {
    const stagger = tuning.wanderTicks > 0 ? index % tuning.wanderTicks : 0;

    ai.wanderAtTick = world.tick + tuning.wanderTicks + stagger;

    return;
  }

  if (world.tick < ai.wanderAtTick) {
    return;
  }

  ai.wanderAtTick = world.tick + tuning.wanderTicks;

  if (tuning.wanderRadius <= 0 || unit.disables.rooted) {
    return;
  }

  const bearing = (index + ai.wanders) * GOLDEN_ANGLE;

  ai.wanders += 1;
  walkTo(
    world,
    unit,
    unit.spawnPoint.x + Math.cos(bearing) * tuning.wanderRadius,
    unit.spawnPoint.y + Math.sin(bearing) * tuning.wanderRadius,
  );
};

/**
 * One tick of Idle: a hero the unit can see, inside its aggro radius or having hit it, sends
 * it and its pack through Aggro into Chase; otherwise it regenerates at its definition's
 * rates, as Return does, and wanders, so a unit home before it was whole keeps healing and
 * its pack can sleep again. A behaviour that never engages stands, and forgets what hit it.
 */
export const rest = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  const provoked = unit.ai.provoked;

  unit.ai.provoked = false;

  if (!behaviour.engages) {
    return;
  }

  const aggro = record.def.aggroRadius;
  const notices =
    canSee(hero) &&
    (provoked || distanceSquared(unit.curr, hero.curr) <= aggro * aggro);

  if (!notices) {
    regenerate(unit.resources, unit.stats);

    if (behaviour.wanders) {
      wander(world, unit, index);
    }

    return;
  }

  anchorAtHome(unit);
  unit.ai.state = "aggro";
  alertPack(world, unit, hero, heroId);
  enterChase(world, unit, index, record, behaviour, hero, heroId);
};
