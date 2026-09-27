import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type * as TypeScript from "typescript";
import { describe, expect, it } from "vitest";
import type { LayerImports } from "./layer-imports";
import {
  collectModuleReferences,
  layerOfSpecifier,
  listSourceFiles,
  loadTypeScript,
} from "./layer-imports";
import { displayPath } from "./repository";

/**
 * The doors, asserted a second time. Lint sees a static import; these rules see every module
 * reference the compiler's parser finds, so a re-export or a dynamic import that reaches past
 * a door fails the same way. The second rule holds a types door to types.
 *
 * ```ts
 * describeLayerDoors({ srcDir, layerImports: LAYER_IMPORTS, doorsOpenTo })
 * describeTypesOnlyDoor({ file: join(srcDir, "foo", "public.ts") })
 * ```
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-public-doors
 */

const DOORS_SECTION =
  "docs/architecture/layers-and-dependency-rule.md#the-public-doors";

/** Which tree to walk, which table to read the rows from, and which doors each layer has open to another. The lint matrix owns both. */
export type LayerDoorsOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
  layerImports: LayerImports;
  doorsOpenTo: (layer: string, target: string) => readonly string[];
}>;

/** One module reference that reaches past a door, or one export a types door lets through, with the message the failing test prints. */
export type DoorViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  line: number;
  message: string;
}>;

const STRIPPED_EXTENSION = /\.[cm]?[jt]sx?$/;

/** The path under the target layer a specifier names, without its extension: `public` for `@foo/public`. */
const pathInLayer = (
  specifier: string,
  fileDir: string,
  srcDir: string,
  target: string,
): string => {
  const inside = specifier.startsWith("@")
    ? specifier.slice(target.length + 2)
    : relative(join(srcDir, target), resolve(fileDir, specifier))
        .split(sep)
        .join("/");

  return inside.replace(STRIPPED_EXTENSION, "");
};

const listDoors = (target: string, doors: readonly string[]): string => {
  const names = doors.map((door) => `${target}/${door}.ts`);

  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
};

/**
 * Every module reference in `files` that enters another layer anywhere but a door open to it.
 * A reference its row forbids outright is the dependency table's to report, not this rule's.
 */
export const collectDoorViolations = async (
  { srcDir, layerImports, doorsOpenTo }: LayerDoorsOptions,
  files: readonly string[] = listSourceFiles(srcDir),
): Promise<DoorViolation[]> => {
  const ts = await loadTypeScript();
  const layers = Object.keys(layerImports);
  const violations: DoorViolation[] = [];

  for (const file of files) {
    const [layer] = relative(srcDir, file).split(sep);
    const allowed = layer === undefined ? undefined : layerImports[layer];

    if (layer === undefined || allowed === undefined) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );

    for (const reference of collectModuleReferences(ts, sourceFile)) {
      const target = layerOfSpecifier(
        reference.specifier,
        dirname(file),
        srcDir,
        layers,
      );

      if (target === null || target === layer || !allowed.includes(target)) {
        continue;
      }

      const doors = doorsOpenTo(layer, target);
      const inside = pathInLayer(
        reference.specifier,
        dirname(file),
        srcDir,
        target,
      );

      if (doors.includes(inside)) {
        continue;
      }

      const shown = displayPath(file);

      violations.push({
        file: shown,
        line: reference.line,
        message: `${shown}:${reference.line} enters ${target}/ at "${reference.specifier}" through a ${reference.kind}. The ${layer} layer enters ${target}/ only through ${listDoors(target, doors)}. Doors: ${DOORS_SECTION}.`,
      });
    }
  }

  return violations;
};

/** Mounts the rule as one `describe` with one test per file under `src/`, so a failure names the file. */
export const describeLayerDoors = (options: LayerDoorsOptions): void => {
  describe("every module reference into another layer goes through a door open to it", () => {
    const files = listSourceFiles(options.srcDir).map((file) =>
      relative(options.srcDir, file),
    );

    it.each(files)(
      "src/%s enters other layers only by their doors",
      async (file) => {
        const violations = await collectDoorViolations(options, [
          join(options.srcDir, file),
        ]);

        expect(violations.map((violation) => violation.message)).toEqual([]);
      },
    );
  });
};

/** Which file is a types door. */
export type TypesOnlyDoorOptions = Readonly<{
  /** Absolute path to the door. */
  file: string;
}>;

/** Whether a statement exports a type and nothing else: a type-only re-export, a type alias, or an interface. */
const exportsOnlyTypes = (
  ts: typeof TypeScript,
  statement: TypeScript.Statement,
): boolean => {
  if (ts.isExportDeclaration(statement)) {
    if (statement.isTypeOnly) {
      return true;
    }

    const clause = statement.exportClause;

    return (
      clause !== undefined &&
      ts.isNamedExports(clause) &&
      clause.elements.every((element) => element.isTypeOnly)
    );
  }

  if (
    ts.isTypeAliasDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isImportDeclaration(statement)
  ) {
    return true;
  }

  return false;
};

/** Every statement in a types door that could let a value through: a value re-export, an `export *`, or a declaration. */
export const collectTypesOnlyViolations = async ({
  file,
}: TypesOnlyDoorOptions): Promise<DoorViolation[]> => {
  const ts = await loadTypeScript();
  const sourceFile = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const shown = displayPath(file);
  const violations: DoorViolation[] = [];

  for (const statement of sourceFile.statements) {
    if (exportsOnlyTypes(ts, statement)) {
      continue;
    }

    const line =
      sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile))
        .line + 1;

    violations.push({
      file: shown,
      line,
      message: `${shown}:${line} lets a value through a types door. Export types only, with \`export type\`; a value goes through the layer's queries or rules door. Doors: ${DOORS_SECTION}.`,
    });
  }

  return violations;
};

/** Mounts the rule as one test for the door. */
export const describeTypesOnlyDoor = (options: TypesOnlyDoorOptions): void => {
  it(`${displayPath(options.file).slice(1)} exports only types`, async () => {
    const violations = await collectTypesOnlyViolations(options);

    expect(violations.map((violation) => violation.message)).toEqual([]);
  });
};
