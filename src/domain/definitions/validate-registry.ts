import type { AnyKind } from "./definition-kind";
import { DEFINITION_KINDS } from "./kinds/index";
import type { LevelSchemas } from "./level-schemas";
import { createLevelSchemas } from "./level-schemas";
import type { DefinitionOf, Registry, RegistryField } from "./registry";
import type {
  IdSpace,
  RegistryFault,
  ValidationContext,
  ValidDefinition,
} from "./registry-checks";
import { report } from "./registry-checks";
import type { Schema, SchemaFault } from "./schema";

/** The content file a definition of kind `folder` with `id` lives in. */
const fileOf = (folder: string, id: unknown, index: number): string =>
  typeof id === "string"
    ? `${folder}/${id.replace(/_/g, "-")}.def.ts`
    : `${folder}/[${String(index)}]`;

const idOf = (value: unknown): unknown =>
  value !== null && typeof value === "object" && "id" in value
    ? value.id
    : undefined;

/**
 * Runs `schema` over what the registry holds for `kind`, reporting under the file each
 * definition comes from, and returns the definitions that passed, since a cross-reference
 * check reads only a definition whose shape is known.
 */
const checkShape = (
  faults: RegistryFault[],
  kind: AnyKind,
  schema: Schema<unknown>,
  value: unknown,
): ValidDefinition<unknown>[] => {
  if (kind.shape === "single") {
    const found: SchemaFault[] = [];

    if (schema(value, "", found)) {
      return [{ file: kind.file, def: value }];
    }

    report(faults, kind.file, found);

    return [];
  }

  if (!Array.isArray(value)) {
    faults.push({ file: kind.folder, path: "", message: "expected a list" });

    return [];
  }

  const list: readonly unknown[] = value;
  const valid: ValidDefinition<unknown>[] = [];

  for (let index = 0; index < list.length; index += 1) {
    const candidate = list[index];
    const file = fileOf(kind.folder, idOf(candidate), index);
    const found: SchemaFault[] = [];

    if (schema(candidate, "", found)) {
      valid.push({ file, def: candidate });
    } else {
      report(faults, file, found);
    }
  }

  return valid;
};

/** The schema of `kind`: a gate's as written, any other's built for the orb level cap. */
const schemaOf = (kind: AnyKind, levels: LevelSchemas): Schema<unknown> =>
  kind.stage === "gate" ? kind.schema : kind.schema(levels);

/** Reports every id that appears twice among `entries`, each under the file of its second appearance. */
const checkUnique = (
  faults: RegistryFault[],
  namespace: string,
  entries: readonly Readonly<{ file: string; id: string }>[],
): void => {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const first = seen.get(entry.id);

    if (first !== undefined) {
      faults.push({
        file: entry.file,
        path: "id",
        message: `"${entry.id}" is already the id of ${namespace} in ${first}`,
      });
    } else {
      seen.set(entry.id, entry.file);
    }
  }
};

/**
 * Every fault in `registry` under the kinds `kinds`, or none when it is sound. The gate kinds
 * are checked first, since the hero's orb level cap fixes every table's length, and a fault
 * in one stops validation there. Then every other kind's definitions against its schema; then,
 * over the definitions whose shape passed, each kind's cross-references in list order: keys
 * against the domain's registries, referenced ids against the ids that exist, frames against
 * the list; then every id namespace for a duplicate, in the order its first kind is listed. A
 * fault names the content file, the path inside the definition, and what was expected.
 */
export const validateRegistryOf = (
  kinds: readonly AnyKind[],
  registry: Registry & Readonly<Record<string, unknown>>,
): RegistryFault[] => {
  const faults: RegistryFault[] = [];
  const checked = new Map<string, ValidDefinition<unknown>[]>();

  for (const kind of kinds) {
    if (kind.stage === "gate") {
      checked.set(
        kind.field,
        checkShape(faults, kind, kind.schema, registry[kind.field]),
      );
    }
  }

  if (faults.length > 0) {
    return faults;
  }

  const levels = createLevelSchemas(registry.hero.maxOrbLevel);

  for (const kind of kinds) {
    if (kind.stage !== "gate") {
      checked.set(
        kind.field,
        checkShape(faults, kind, schemaOf(kind, levels), registry[kind.field]),
      );
    }
  }

  const spaces = new Map<string, IdSpace>();
  const namesOf = (field: string): readonly string[] => {
    const names: string[] = [];

    for (const kind of kinds) {
      if (kind.field === field && kind.shape === "list") {
        for (const entry of checked.get(field) ?? []) {
          names.push(kind.nameOf(entry.def));
        }
      }
    }

    return names;
  };

  const context: ValidationContext = {
    faults,
    levels,
    registry,
    valid: <F extends RegistryField>(field: F) =>
      (checked.get(field) ?? []) as readonly ValidDefinition<DefinitionOf<F>>[],
    space: (kind, fields) => {
      const known = spaces.get(kind);

      if (known !== undefined) {
        return known;
      }

      const space = { kind, ids: new Set(fields.flatMap(namesOf)) };

      spaces.set(kind, space);

      return space;
    },
  };

  for (const kind of kinds) {
    for (const entry of checked.get(kind.field) ?? []) {
      kind.check(context, entry.file, entry.def);
    }
  }

  const namespaces = new Map<
    string,
    Readonly<{ file: string; id: string }>[]
  >();

  for (const kind of kinds) {
    if (kind.shape !== "list") {
      continue;
    }

    const entries = namespaces.get(kind.namespace) ?? [];

    for (const entry of checked.get(kind.field) ?? []) {
      entries.push({ file: entry.file, id: kind.nameOf(entry.def) });
    }

    namespaces.set(kind.namespace, entries);
  }

  for (const [namespace, entries] of namespaces) {
    checkUnique(faults, namespace, entries);
  }

  return faults;
};

/** Every fault in `registry`, or none when it is sound: every kind of the kind list, validated in its order. */
export const validateRegistry = (registry: Registry): RegistryFault[] =>
  validateRegistryOf(DEFINITION_KINDS, registry);

/** One line per fault, for the error a refused registry throws. */
export const describeRegistryFaults = (
  faults: readonly RegistryFault[],
): string =>
  faults
    .map((fault) => `${fault.file}: ${fault.path} — ${fault.message}`)
    .join("\n");

/** Throws with every fault named when `registry` is unsound, so a broken definition stops the game before a world exists. */
export const assertRegistryValid = (registry: Registry): void => {
  const faults = validateRegistry(registry);

  if (faults.length > 0) {
    throw new Error(
      `The content registry has ${String(faults.length)} fault(s):\n${describeRegistryFaults(faults)}`,
    );
  }
};
