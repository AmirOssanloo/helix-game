import type { LevelSchemas } from "./level-schemas";
import type { DefinitionOf, Registry, RegistryField } from "./registry";
import type { SchemaFault } from "./schema";
import type { StatusDef } from "./status-def";

/**
 * One reason a registry is refused: the content file it comes from, the path inside the
 * definition, and what was expected. The file is derived from the kind's folder and the
 * definition's id, since content keeps one definition per file named after its id.
 */
export type RegistryFault = Readonly<{
  file: string;
  path: string;
  message: string;
}>;

/** The set of ids a definition may reference, and the kind word a fault names them by. */
export type IdSpace = Readonly<{
  kind: string;
  ids: ReadonlySet<string>;
}>;

/** A definition whose shape passed its schema, and the content file it comes from. */
export type ValidDefinition<T> = Readonly<{ file: string; def: T }>;

/**
 * What a kind's cross-reference check reads and writes: the fault list, the schemas built for
 * the hero's orb level cap, the registry as handed in, the definitions of a kind whose shape
 * passed, and the ids of one or more kinds as a space a reference is checked against. A check
 * reads another kind only through the definitions that passed, since a shape that failed is
 * not known.
 */
export type ValidationContext = Readonly<{
  faults: RegistryFault[];
  levels: LevelSchemas;
  registry: Registry;
  valid: <F extends RegistryField>(
    field: F,
  ) => readonly ValidDefinition<DefinitionOf<F>>[];
  space: (kind: string, fields: readonly RegistryField[]) => IdSpace;
}>;

/** Copies schema faults under `file` into the registry's fault list. */
export const report = (
  faults: RegistryFault[],
  file: string,
  found: readonly SchemaFault[],
): void => {
  for (const fault of found) {
    faults.push({ file, path: fault.path, message: fault.message });
  }
};

/** Refuses `id` at `path` when `space` does not hold it. */
export const checkReference = (
  context: ValidationContext,
  file: string,
  path: string,
  id: string,
  space: IdSpace,
): void => {
  if (!space.ids.has(id)) {
    context.faults.push({
      file,
      path,
      message: `"${id}" is not the id of any ${space.kind}`,
    });
  }
};

/** Refuses the frame `name` at `path` when the atlas frame list does not hold it. */
export const checkFrame = (
  context: ValidationContext,
  file: string,
  path: string,
  name: string,
): void => {
  if (!context.space("atlas frame", ["atlasFrames"]).ids.has(name)) {
    context.faults.push({
      file,
      path,
      message: `"${name}" is not in the atlas frame list`,
    });
  }
};

/** Refuses each id of `ids`, a list field at `field`, that `space` does not hold, under its own index. */
export const checkReferences = (
  context: ValidationContext,
  file: string,
  field: string,
  ids: readonly string[],
  space: IdSpace,
): void => {
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];

    if (id !== undefined) {
      checkReference(context, file, `${field}[${String(index)}]`, id, space);
    }
  }
};

/** Every status whose shape passed, by id, the later of two sharing an id kept, for a check that reads what a status raises. */
export const statusesById = (
  context: ValidationContext,
): ReadonlyMap<string, StatusDef> =>
  new Map(
    context
      .valid("statuses")
      .map((entry): [string, StatusDef] => [entry.def.id, entry.def]),
  );

/** The check of a kind whose definitions reference nothing: its schema says everything. */
export const noCheck = (): void => undefined;
