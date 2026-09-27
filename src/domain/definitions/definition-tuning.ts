import type { TuningState } from "../entities/world-state";
import type {
  DefinitionField,
  DefinitionKind,
  TunableDefinitions,
} from "./definition-keys";
import {
  definitionFieldUnit,
  definitionKeyOf,
  walkDefinitionNumbers,
} from "./definition-keys";
import type { AnyKind, KindTuning } from "./definition-kind";
import type { DefinitionSlot } from "./definition-slot";
import { DEFINITION_KINDS } from "./kinds/index";
import { convertTunable, readTunable } from "./tuning-state";

/** Definitions by registry field, as the tuning surface walks them under any list of kinds. */
type DefinitionsByField = Readonly<Record<string, unknown>>;

/**
 * Calls `each` with every definition of every kind of `kinds` whose numbers the tuning surface
 * reaches, in list order, with the kind's tuning and the definition's id. The one definition
 * of a single kind is named by its kind's word, so the hero is `hero`.
 */
const forEachTunable = (
  kinds: readonly AnyKind[],
  defs: DefinitionsByField,
  each: (tuning: KindTuning<string, unknown>, id: string, def: object) => void,
): void => {
  for (const kind of kinds) {
    const tuning = kind.tuning;

    if (tuning === null) {
      continue;
    }

    const value = defs[kind.field];

    if (kind.shape === "single") {
      if (value !== null && typeof value === "object") {
        each(tuning, tuning.kind, value);
      }

      continue;
    }

    if (Array.isArray(value)) {
      for (const def of value as readonly object[]) {
        each(tuning, kind.nameOf(def), def);
      }
    }
  }
};

/** Calls `each` with every tunable definition in `defs`, its kind, and its id, the hero first. */
export const forEachTunableDefinition = (
  defs: TunableDefinitions,
  each: (kind: DefinitionKind, id: string, def: object) => void,
): void => {
  forEachTunable(DEFINITION_KINDS, defs, (tuning, id, def): void => {
    each(tuning.kind as DefinitionKind, id, def);
  });
};

/**
 * Every number of every definition in `defs` the tuning surface reaches, in the designer's
 * units: the hero, then each kind in list order, each definition's fields in the order it
 * writes them. The panel generates a slider from each; nothing here converts.
 */
export const definitionFields = (
  defs: TunableDefinitions,
): readonly DefinitionField[] => {
  const fields: DefinitionField[] = [];

  forEachTunableDefinition(defs, (kind, id, def): void => {
    walkDefinitionNumbers(def, (path, index, _container, _property, value) => {
      fields.push({
        key: definitionKeyOf(kind, id, path, index),
        kind,
        id,
        path,
        index,
        value,
        unit: definitionFieldUnit(path),
      });
    });
  });

  return fields;
};

/** The title of the panel folder `kind`'s sliders sit in. */
export const definitionKindTitle = (kind: DefinitionKind): string => {
  for (const entry of DEFINITION_KINDS) {
    if (entry.tuning?.kind === kind) {
      return entry.tuning.title;
    }
  }

  return kind;
};

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

/** A copy of every definition of every tunable kind of `kinds` in `defs`, by field, owned by one world. */
export const copyTunableDefinitionsOf = (
  kinds: readonly AnyKind[],
  defs: DefinitionsByField,
): DefinitionsByField => {
  const copies: Record<string, unknown> = {};

  for (const kind of kinds) {
    if (kind.tuning !== null) {
      copies[kind.field] = copyData(defs[kind.field]);
    }
  }

  return copies;
};

/** A copy of every tunable definition in `defs`, owned by one world. */
export const copyTunableDefinitions = (
  defs: TunableDefinitions,
): TunableDefinitions =>
  copyTunableDefinitionsOf(DEFINITION_KINDS, defs) as TunableDefinitions;

/**
 * Every number of the world's copies of the kinds of `kinds` under its key, converted into the
 * tuning state beside the tuning table, and the slot a tuning command writes it through. Run
 * once, when a world is created: the tuning state takes every key it will ever hold here and
 * never grows, and each slot's rebuild is made here, not per command.
 */
export const createDefinitionSlotsOf = (
  kinds: readonly AnyKind[],
  copies: DefinitionsByField,
  tuning: TuningState,
): Map<string, DefinitionSlot> => {
  const slots = new Map<string, DefinitionSlot>();
  const simHz = readTunable(tuning, "sim_hz");

  forEachTunable(kinds, copies, (kindTuning, id, def): void => {
    const rebuild: DefinitionSlot["rebuild"] = (run, rate): void => {
      kindTuning.rebuild(run, id, def, rate);
    };

    walkDefinitionNumbers(def, (path, index, container, property, value) => {
      const key = definitionKeyOf(kindTuning.kind, id, path, index);
      const unit = definitionFieldUnit(path);

      tuning.set(key, convertTunable(unit, value, simHz));
      slots.set(key, { container, property, unit, rebuild });
    });
  });

  return slots;
};

/** The slots of every tunable definition in the world's `copies`: see `createDefinitionSlotsOf`. */
export const createDefinitionSlots = (
  copies: TunableDefinitions,
  tuning: TuningState,
): Map<string, DefinitionSlot> =>
  createDefinitionSlotsOf(DEFINITION_KINDS, copies, tuning);
