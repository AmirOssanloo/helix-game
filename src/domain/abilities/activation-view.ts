import type { DeepReadonly } from "@shared/public";
import { entryAtLevel } from "../definitions/spell-state";
import type { SpellRecord } from "../definitions/spell-state";
import type { Unit } from "../entities/unit";
import type { RunScope } from "../entities/world-state";
import { activeItemById } from "../items/item-defs";
import type { SlotDescriptor } from "../kits/kit";
import { spellLevelOf } from "./spell-level";

/** The orb levels of a reader with no hero: the first level, as any caster that levels no orbs. */
const NO_ORB_LEVELS: readonly number[] = [];

/** The ability record the active item `activeId` casts, or `undefined` for no such item. */
const recordOf = (
  run: DeepReadonly<RunScope>,
  activeId: string | null,
): DeepReadonly<SpellRecord> | undefined => {
  const active = activeItemById(run.activeItems, activeId);

  return active === null ? undefined : run.spells.get(active.active.abilityId);
};

/** The level `hero` casts `record` at, as the commit reads it: its active form's orb levels, or the first level with no hero. */
const levelOf = (
  run: DeepReadonly<RunScope>,
  hero: DeepReadonly<Unit> | null,
  record: DeepReadonly<SpellRecord>,
): number => {
  const form = hero === null ? undefined : run.forms[hero.activeFormIndex];

  return spellLevelOf(
    form === undefined ? NO_ORB_LEVELS : form.kit.orbLevels,
    record.def.recipe,
  );
};

/**
 * What the active item `activeId` shows for `hero`, written into `out` as a slot descriptor:
 * a prepared ability, the one its active block names, its clock on the hero by the ability's
 * id, the whole clock and the mana cost at the level the hero casts it at, and no disable,
 * since an item reads no spell key's column. An id no active item has, or `null`, writes an
 * empty socket. Pure and read-only, so the HUD asks it of the world view every frame.
 */
export const describeActiveItem = (
  run: DeepReadonly<RunScope>,
  hero: DeepReadonly<Unit> | null,
  activeId: string | null,
  out: SlotDescriptor,
): SlotDescriptor => {
  const record = recordOf(run, activeId);

  out.kind = "prepared";
  out.blockedBy = null;

  if (record === undefined) {
    out.abilityId = null;
    out.readyAtTick = 0;
    out.clockTicks = 0;
    out.cost = 0;
    out.level = 0;

    return out;
  }

  const level = levelOf(run, hero, record);
  const abilityId = record.def.id;

  out.abilityId = abilityId;
  out.readyAtTick = hero === null ? 0 : (hero.cooldowns.get(abilityId) ?? 0);
  out.clockTicks = entryAtLevel(record.cooldownTicks, level);
  out.cost = entryAtLevel(record.def.manaCost, level);
  out.level = level;

  return out;
};

/**
 * The cooldown the active item `activeId`'s ability has at the level `hero` casts it at, in
 * seconds as content writes it, before any cooldown reduction, or `0` for no such item: what
 * its tooltip names.
 */
export const activeItemCooldownSeconds = (
  run: DeepReadonly<RunScope>,
  hero: DeepReadonly<Unit> | null,
  activeId: string | null,
): number => {
  const record = recordOf(run, activeId);

  return record === undefined
    ? 0
    : entryAtLevel(record.def.cooldownSeconds, levelOf(run, hero, record));
};
