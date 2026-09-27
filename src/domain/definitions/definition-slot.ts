import { assert } from "@shared/public";
import type { RunScope } from "../entities/world-state";
import type { DefinitionKey } from "./definition-keys";
import type { TuningUnit } from "./tuning-def";
import { convertTunable, readTunable } from "./tuning-state";

/**
 * Where one definition number lives in a world: the object or array of the world's own copy
 * holding it and the property it sits under, the unit a tuning command's value is converted
 * from, and the rebuild of the one record read from that definition, made by its kind when
 * the world was created. A tuning command on its key writes the copy and rebuilds that record,
 * so the next cast or spawn reads the new number.
 */
export type DefinitionSlot = Readonly<{
  container: Record<string, unknown> | unknown[];
  property: string | number;
  unit: TuningUnit;
  rebuild: (run: RunScope, simHz: number) => void;
}>;

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
  slot.rebuild(run, simHz);
};
