import type { DefinitionKey } from "./definition-keys";
import {
  definitionFields,
  forEachTunableDefinition,
  walkDefinitionNumbers,
} from "./definition-keys";
import { copyTunableDefinitions } from "./definition-tuning";
import type { Registry } from "./registry";
import type { TuningKey, TuningUnit } from "./tuning-def";
import { TUNING_KEYS, TUNING_UNITS } from "./tuning-def";
import { convertTunable } from "./tuning-state";

/** One number a new registry changes in a running world: its key and the new value in the designer's units, what a tuning command carries. */
export type Retune = Readonly<{
  key: TuningKey | DefinitionKey;
  value: number;
}>;

/**
 * What a new registry changes against the one a world was made from. Reshaped when it differs
 * anywhere but a number the tuning surface reaches, or in the step rate, which no command may
 * change: a world cannot take that without being made again. Retuned otherwise, with each
 * changed number the world still holds at the old default, and the keys of the changed numbers
 * a tuning command has moved away from it, which are the person's and are kept.
 */
export type ContentChange =
  | Readonly<{ kind: "reshaped" }>
  | Readonly<{
      kind: "retuned";
      retunes: readonly Retune[];
      kept: readonly (TuningKey | DefinitionKey)[];
    }>;

/** One number of a registry the tuning surface reaches: its value as content wrote it and the unit it is converted from. */
type Tunable = Readonly<{ value: number; unit: TuningUnit }>;

/** Every number of `registry` the tuning surface reaches, under its key: the tuning table's entries, then every definition field. */
const tunablesOf = (
  registry: Registry,
): Map<TuningKey | DefinitionKey, Tunable> => {
  const tunables = new Map<TuningKey | DefinitionKey, Tunable>();

  for (const key of TUNING_KEYS) {
    tunables.set(key, { value: registry.tuning[key], unit: TUNING_UNITS[key] });
  }

  for (const field of definitionFields(registry)) {
    tunables.set(field.key, { value: field.value, unit: field.unit });
  }

  return tunables;
};

/**
 * `registry` as one string with every number the tuning surface reaches written as zero, and
 * the step rate as it is: two registries with the same shape differ only in numbers a tuning
 * command can set.
 */
const shapeOf = (registry: Registry): string => {
  const copies = copyTunableDefinitions(registry);

  forEachTunableDefinition(copies, (_kind, _id, def): void => {
    walkDefinitionNumbers(def, (_path, _index, container, property): void => {
      if (Array.isArray(container)) {
        container[property as number] = 0;
      } else {
        container[property as string] = 0;
      }
    });
  });

  return JSON.stringify({
    simHz: registry.tuning.sim_hz,
    tuningKeys: Object.keys(registry.tuning),
    copies,
    maps: registry.maps,
    disableMatrix: registry.disableMatrix,
    atlasFrames: registry.atlasFrames,
  });
};

/**
 * What `next` changes in a world made from `previous` whose tuning state is `tuning`. A number
 * is the person's when the world holds anything but `previous`'s default for it, converted as
 * the world converts it, unless its key is in `pending`: a number an earlier reload retuned by a
 * command still waiting for its tick, which holds `previous`'s default by construction. A tuning
 * command that set exactly the default cannot be told from no command, and the new default
 * replaces it. Both registries are validated before they get here.
 */
export const contentChangeOf = (
  previous: Registry,
  next: Registry,
  tuning: ReadonlyMap<string, number>,
  pending: ReadonlySet<string>,
): ContentChange => {
  if (shapeOf(previous) !== shapeOf(next)) {
    return { kind: "reshaped" };
  }

  const simHz = previous.tuning.sim_hz;
  const before = tunablesOf(previous);
  const retunes: Retune[] = [];
  const kept: (TuningKey | DefinitionKey)[] = [];

  for (const [key, after] of tunablesOf(next)) {
    const old = before.get(key);

    if (old === undefined || old.value === after.value) {
      continue;
    }

    if (
      pending.has(key) ||
      tuning.get(key) === convertTunable(old.unit, old.value, simHz)
    ) {
      retunes.push({ key, value: after.value });
    } else {
      kept.push(key);
    }
  }

  return { kind: "retuned", retunes, kept };
};
