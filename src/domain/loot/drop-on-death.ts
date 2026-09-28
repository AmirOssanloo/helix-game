import type { Unit, UnitId } from "../entities/unit";
import type { World } from "../entities/world-state";
import { placeDrops } from "./place-drop";
import { rollDrop } from "./roll";

/**
 * The Legendary piece the map-scope pack record of `packId` names, or `null`: for a unit in no
 * pack, and for a pack the panel spawned, which has no record.
 */
const legendaryOfPack = (
  world: World,
  packId: number | null,
): string | null => {
  if (packId === null) {
    return null;
  }

  const packs = world.map.packs;

  for (let index = 0; index < packs.length; index += 1) {
    const pack = packs[index];

    if (pack !== undefined && pack.packId === packId) {
      return pack.def.legendaryId;
    }
  }

  return null;
};

/**
 * A dying enemy rolls its tier's loot table under its own id and leaves what it drops on the
 * ground around its body. An add, which has an owner, rolls nothing, and nor does the hero or
 * the panel's plain stress body, which wears no definition.
 */
export const dropOnDeath = (
  world: World,
  unit: Readonly<Unit>,
  id: UnitId,
): void => {
  if (
    unit.kind !== "enemy" ||
    unit.definitionId === null ||
    unit.summon.ownerId !== null
  ) {
    return;
  }

  const drop = world.scratch.drop;

  rollDrop(world, unit.tier, id, legendaryOfPack(world, unit.pack.id), drop);
  placeDrops(world, drop, unit.curr, id);
};
