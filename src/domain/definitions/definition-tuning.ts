import { assert } from "@shared/public";
import type { RunScope, TuningState } from "../entities/world-state";
import { createAttackRecord } from "./attack-state";
import type {
  DefinitionKey,
  DefinitionKind,
  TunableDefinitions,
} from "./definition-keys";
import {
  definitionFieldUnit,
  definitionKeyOf,
  forEachTunableDefinition,
  walkDefinitionNumbers,
} from "./definition-keys";
import type { EnemyDef, SummonDef } from "./enemy-def";
import type { FormDef } from "./form-def";
import { formInSimulationUnits } from "./form-state";
import type { HeroDef } from "./hero-def";
import type { SpellDef } from "./spell-def";
import { createSpellRecord } from "./spell-state";
import type { StatusDef } from "./status-def";
import { createStatusRecord } from "./status-state";
import type { TuningUnit } from "./tuning-def";
import { convertTunable, readTunable } from "./tuning-state";
import { createUnitRecord } from "./unit-state";

/**
 * Where one definition number lives in a world: the world's own copy of the definition it
 * belongs to, the object or array holding it and the property it sits under, and the unit a
 * tuning command's value is converted from. A tuning command on its key writes the copy and
 * rebuilds the one record read from it, so the next cast or spawn reads the new number.
 */
export type DefinitionSlot = Readonly<{
  kind: DefinitionKind;
  id: string;
  def: object;
  container: Record<string, unknown> | unknown[];
  property: string | number;
  unit: TuningUnit;
}>;

/**
 * `value`, plain data as content writes it, copied at every depth. A world takes its own
 * copy of every definition it may retune, so a tuning command in one world never reaches the
 * registry or another world made from it.
 */
const copyData = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(copyData) as T;
  }

  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};

    for (const [field, entry] of Object.entries(value)) {
      copy[field] = copyData(entry);
    }

    return copy as T;
  }

  return value;
};

/** A copy of every tunable definition in `defs`, owned by one world. */
export const copyTunableDefinitions = (
  defs: TunableDefinitions,
): TunableDefinitions => ({
  hero: copyData(defs.hero),
  forms: copyData(defs.forms),
  spells: copyData(defs.spells),
  abilities: copyData(defs.abilities),
  statuses: copyData(defs.statuses),
  enemies: copyData(defs.enemies),
  summons: copyData(defs.summons),
});

/**
 * Every number of the world's copies under its key, converted into the tuning state beside
 * the tuning table, and the slot a tuning command writes it through. Run once, when a world is
 * created: the tuning state takes every key it will ever hold here and never grows.
 */
export const createDefinitionSlots = (
  copies: TunableDefinitions,
  tuning: TuningState,
): Map<string, DefinitionSlot> => {
  const slots = new Map<string, DefinitionSlot>();
  const simHz = readTunable(tuning, "sim_hz");

  forEachTunableDefinition(copies, (kind, id, def): void => {
    walkDefinitionNumbers(def, (path, index, container, property, value) => {
      const key = definitionKeyOf(kind, id, path, index);
      const unit = definitionFieldUnit(path);

      tuning.set(key, convertTunable(unit, value, simHz));
      slots.set(key, { kind, id, def, container, property, unit });
    });
  });

  return slots;
};

/** Rebuilds the one record of run scope read from the definition `slot` belongs to, from the world's copy. */
const rebuildRecord = (
  run: RunScope,
  slot: DefinitionSlot,
  simHz: number,
): void => {
  switch (slot.kind) {
    case "hero":
      run.heroAttack = createAttackRecord((slot.def as HeroDef).attack, simHz);

      return;

    case "form":
      for (const form of run.forms) {
        if (form.def.id === slot.id) {
          form.def = formInSimulationUnits(slot.def as FormDef, simHz);
        }
      }

      return;

    case "spell":
      run.spells.set(slot.id, createSpellRecord(slot.def as SpellDef, simHz));

      return;

    case "status":
      run.statuses.set(
        slot.id,
        createStatusRecord(slot.def as StatusDef, simHz),
      );

      return;

    case "enemy":
      run.units.set(slot.id, createUnitRecord(slot.def as EnemyDef, 0, simHz));

      return;

    case "summon":
      run.units.set(
        slot.id,
        createUnitRecord(
          slot.def as SummonDef,
          (slot.def as SummonDef).followDistance,
          simHz,
        ),
      );

      return;

    case "ability":
      // No record reads an enemy ability yet; the copy holds the number for the first that does.
      return;
  }
};

/**
 * Sets the definition number `key` names to `value`, in the designer's units: the world's
 * copy of the definition takes the value as written, the tuning state takes it converted
 * exactly as at creation, and the record read from that definition is rebuilt, so the next
 * cast or spawn reads it. A unit already spawned keeps what it was dressed with. The key was
 * validated against the tuning state, which holds every slot's key, so a miss is a broken
 * invariant.
 */
export const setDefinitionTunable = (
  run: RunScope,
  key: DefinitionKey,
  value: number,
): void => {
  const slot = run.definitionSlots.get(key);

  assert(
    slot !== undefined,
    "Every definition key the tuning state holds has a slot",
  );

  const simHz = readTunable(run.tuning, "sim_hz");

  if (Array.isArray(slot.container)) {
    slot.container[slot.property as number] = value;
  } else {
    slot.container[slot.property as string] = value;
  }

  run.tuning.set(key, convertTunable(slot.unit, value, simHz));
  rebuildRecord(run, slot, simHz);
};
