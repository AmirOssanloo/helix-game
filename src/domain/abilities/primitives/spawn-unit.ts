import type { EntityId } from "@shared/public";
import { assert } from "@shared/public";
import type { AbilityDef } from "../../definitions/ability-def";
import { ticksOfSeconds } from "../../definitions/duration";
import type {
  SpawnUnitEffectDef,
  SummonBonusDef,
} from "../../definitions/effect-def";
import { tableAtOrbLevels } from "../../definitions/level-table";
import type { UnitRecord } from "../../definitions/unit-state";
import type { Unit } from "../../entities/unit";
import {
  acquireUnit,
  countLiveEnemies,
  ENEMY_LIVE_CAP,
} from "../../entities/unit";
import { fillFromDefinition, wearDefinition } from "../../entities/unit-spawn";
import type { World } from "../../entities/world-state";
import { addModifier } from "../../stats/modifiers";
import { applyLifetimeStatuses } from "../../statuses/lifetime-statuses";
import type { Cast } from "../cast-context";
import type { Primitive } from "./index";

/** A bonus contributes a flat amount and no fraction: the orbs add to the definition's number, they do not scale it. */
const NO_FRACTION = 0;

/** A spawned unit takes the normal tier whatever its caster's, so its health is its definition's. */
const NORMAL_HEALTH = 1;

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
 * One unit from `record`, of the kind its definition spawns, standing at the offset the entry
 * names and facing the way the caster faces. The offset is read in the caster's own frame:
 * `forward` along the facing, `right` across it clockwise, which is the unit's right in the
 * counter-clockwise frame every angle is written in. An enemy joins the pack its caster
 * belongs to and takes where it stands as its spawn point, as a pack member does. Returns
 * whether the pool had room.
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
  const id: EntityId | null = acquireUnit(world, record.kind, x, y);
  const summon = id === null ? null : world.map.units.resolve(id);
  const caster = world.map.units.resolve(cast.casterId);

  if (id === null || summon === null) {
    return false;
  }

  if (record.kind === "enemy") {
    summon.packId = caster === null ? null : caster.packId;
  }

  summon.facing = cast.facing;
  summon.ownerId = cast.casterId;
  summon.expiresAtTick = world.tick + lifetimeTicks;
  wearDefinition(summon, record);
  writeBonuses(summon, entry.bonuses, cast.orbLevels);
  fillFromDefinition(summon, record, NORMAL_HEALTH);
  applyLifetimeStatuses(world, id, record);

  return true;
};

/**
 * Whether the live enemy cap has room for every enemy `ability`'s own list spawns: the counts
 * of its spawn-unit entries whose definition is an archetype, against the enemies already
 * holding a slot. A list that spawns no enemy always fits and counts nothing. The content
 * tier lets an archetype be spawned from a cast's own list alone, so this is every enemy a
 * cast can spawn. The request stage refuses a cast that does not fit, and the commit cancels
 * one that no longer does, so a spawn past the cap is refused whole with nothing spent.
 */
export const spawnsFit = (world: World, ability: AbilityDef): boolean => {
  const effects = ability.effects;
  let enemies = 0;

  for (let index = 0; index < effects.length; index += 1) {
    const entry = effects[index];

    if (entry === undefined || entry.kind !== "spawn_unit") {
      continue;
    }

    if (world.run.units.get(entry.unitId)?.kind === "enemy") {
      enemies += entry.count;
    }
  }

  return enemies === 0 || countLiveEnemies(world) + enemies <= ENEMY_LIVE_CAP;
};

/**
 * The units the entry asks for, owned by the caster and living for the lifetime its table
 * gives at the levels the cast committed with. Each is the kind its definition spawns, a
 * summon on the hero's side or an enemy on the enemies', and wears its definition's body and
 * numbers, with the entry's bonuses on it as modifier rows of their own kind, so the definition owns
 * the base and the ability owns what the orbs add. Nothing orders a summon: its behaviour
 * key drives it, and the death pass takes it on its lifetime or on the tick its owner dies,
 * whatever its kind.
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
  const record = world.run.units.get(entry.unitId);

  assert(record !== undefined, "The content tier resolves every unit id");

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
