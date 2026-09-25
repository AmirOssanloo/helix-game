import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import { ticksOfSeconds } from "../../definitions/duration";
import type {
  SpawnUnitEffectDef,
  SummonBonusDef,
} from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import type { UnitRecord } from "../../definitions/unit-state";
import type { Unit } from "../../entities/unit";
import { acquireUnit } from "../../entities/unit";
import { fillFromDefinition, wearDefinition } from "../../entities/unit-spawn";
import type { World } from "../../entities/world-state";
import { addModifier } from "../../stats/modifiers";
import { applyLifetimeStatuses } from "../../statuses/lifetime-statuses";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";

/** A bonus contributes a flat amount and no fraction: the orbs add to the definition's number, they do not scale it. */
const NO_FRACTION = 0;

/** Writes each of `bonuses` on the summon as a modifier row of its own kind, read at the levels the cast committed with. */
const writeBonuses = (
  unit: Unit,
  bonuses: readonly SummonBonusDef[],
  orbLevels: readonly number[],
): void => {
  for (let index = 0; index < bonuses.length; index += 1) {
    const bonus = bonuses[index];

    if (bonus === undefined) {
      continue;
    }

    addModifier(
      unit.modifiers,
      "summon",
      bonus.stat,
      tableAtOrbLevels(bonus.flat, orbLevels),
      NO_FRACTION,
    );
  }
};

/**
 * One summon from `record`, standing at the offset the entry names and facing the way the
 * caster faces. The offset is read in the caster's own frame: `forward` along the facing,
 * `right` across it clockwise, which is the unit's right in the counter-clockwise frame
 * every angle is written in. Returns whether the pool had room.
 */
const spawnOne = (
  world: World,
  cast: Cast,
  entry: SpawnUnitEffectDef,
  record: UnitRecord,
  lifetimeTicks: number,
): boolean => {
  const cos = Math.cos(cast.facing);
  const sin = Math.sin(cast.facing);
  const x =
    cast.anchor.x + entry.offset.forward * cos + entry.offset.right * sin;
  const y =
    cast.anchor.y + entry.offset.forward * sin - entry.offset.right * cos;
  const id: EntityId | null = acquireUnit(world, "summon", x, y);
  const summon = id === null ? null : world.map.units.resolve(id);

  if (id === null || summon === null) {
    return false;
  }

  summon.facing = cast.facing;
  summon.ownerId = cast.casterId;
  summon.expiresAtTick = world.tick + lifetimeTicks;
  wearDefinition(summon, record);
  writeBonuses(summon, entry.bonuses, cast.orbLevels);
  fillFromDefinition(summon, record);
  applyLifetimeStatuses(world, id, record);

  return true;
};

/**
 * The summons the entry asks for, owned by the caster and living for the lifetime its table
 * gives at the levels the cast committed with. Each wears its definition's body and numbers,
 * with the entry's bonuses on it as modifier rows of their own kind, so the definition owns
 * the base and the ability owns what the orbs add. Nothing orders a summon: its behaviour
 * key drives it, and the death pass takes it on its lifetime or on the tick its owner dies.
 *
 * Every one of a count stands at the same offset; the collision pass settles them apart on
 * the tick they spawn, as it settles any two units that overlap.
 *
 * A pool with no room leaves the rest of the list to run: a summon that did not spawn is a
 * miss the instrumentation counts, not a refusal the caster hears about. The count stops
 * there, since the pool that refused one refuses the next.
 */
export const spawnUnit: Primitive<SpawnUnitEffectDef> = (
  world: World,
  cast: Cast,
  entry: SpawnUnitEffectDef,
): void => {
  const record = world.run.units.get(entry.summonId);

  assert(record !== undefined, "The content tier resolves every summon id");

  const lifetimeTicks = ticksOfSeconds(
    world.run.tuning,
    entry.lifetimeSeconds,
    cast.orbLevels,
  );

  for (let count = 0; count < entry.count; count += 1) {
    if (!spawnOne(world, cast, entry, record, lifetimeTicks)) {
      return;
    }
  }
};
