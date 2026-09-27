import type { EntityId } from "@shared/public";
import { assertNever } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { UnitRecord } from "../definitions/unit-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import type { MachineBehaviour } from "./behaviour";
import { fight } from "./states/attack";
import { chase } from "./states/chase";
import { rest } from "./states/idle";
import { goHome } from "./states/return";

/**
 * The shared state machine every behaviour that fights runs. Each state's tick is a file of
 * its own under `states/`, with what they share in `states/moves.ts`.
 */

/** Reads the machine's tunables for this tick. The AI pass calls it once, before the first unit. */
export const readMachineTuning = (world: World): void => {
  const tuning = world.scratch.machine.tuning;
  const table = world.run.tuning;

  tuning.wanderRadius = readTunable(table, "wander_radius");
  tuning.wanderTicks = readTunable(table, "wander_interval");
  tuning.repathTicks = readTunable(table, "chase_repath_interval");
  tuning.haltChance = readTunable(table, "chase_halt_chance");
  tuning.haltTicks = readTunable(table, "chase_halt_seconds");
  tuning.holdMargin = readTunable(table, "ranged_hold_margin");
  tuning.epsilon = readTunable(table, "arrival_epsilon");
};

/**
 * One tick of the shared state machine for one unit its behaviour drives, `index` being its
 * slot. Aggro is passed through on the tick it is entered, and Dead is the death system's to
 * enter, so a tick finds the unit in one of the other four. The orders it issues are carried
 * out by the systems after it exactly as the player's are.
 */
export const runMachine = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  switch (unit.ai.state) {
    case "idle":
      rest(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "aggro":
    case "chase":
      unit.ai.provoked = false;
      chase(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "attack":
      unit.ai.provoked = false;
      fight(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "return":
      goHome(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "dead":
      return;

    default:
      return assertNever(unit.ai.state);
  }
};
