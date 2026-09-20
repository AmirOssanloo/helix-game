import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type * as TypeScript from "typescript";
import { describe, expect, it } from "vitest";
import { displayPath, walkFiles } from "./repository";

/**
 * The dependency table, asserted a second time. Lint sees a static import; this rule sees every
 * module reference the compiler's own parser finds, so a re-export through a barrel and a dynamic
 * import cross the same table and fail the same way.
 *
 * ```ts
 * describeLayerImports({ srcDir, layerImports: LAYER_IMPORTS })
 * ```
 *
 * @see docs/architecture/layers-and-dependency-rule.md#quick-reference
 */

const DEPENDENCY_TABLE = "docs/architecture/layers-and-dependency-rule.md";

/** One row per layer folder: the layers it may import. The lint matrix owns the values. */
export type LayerImports = Readonly<Record<string, readonly string[]>>;

/** Which tree to walk and which table to hold it to. */
export type LayerImportsOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
  layerImports: LayerImports;
}>;

/** The three ways a module reaches another. */
export type ModuleReferenceKind = "import" | "re-export" | "dynamic import";

/** One import that crosses a layer its row forbids, with the message the failing test prints. */
export type LayerImportViolation = Readonly<{
  /** Repository-relative, `/`-separated: `src/domain/public.ts`. */
  file: string;
  line: number;
  specifier: string;
  kind: ModuleReferenceKind;
  message: string;
}>;

type ModuleReference = Readonly<{
  specifier: string;
  line: number;
  kind: ModuleReferenceKind;
}>;

/** Every extension Vite bundles as a module. Lint matches `.ts` only, so the others are this rule's alone. */
const MODULE_EXTENSIONS = [
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
];

const isSourceFile = (path: string): boolean =>
  MODULE_EXTENSIONS.some((extension) => path.endsWith(extension));

/** Loaded on first use, so a spec that imports the helpers barrel does not pay for the compiler. */
const loadTypeScript = async (): Promise<typeof TypeScript> => {
  const module = await import("typescript");

  return module.default;
};

/** Every module specifier in one file, with its line and how it is reached. */
const collectModuleReferences = (
  ts: typeof TypeScript,
  sourceFile: TypeScript.SourceFile,
): ModuleReference[] => {
  const references: ModuleReference[] = [];

  const lineOf = (node: TypeScript.Node): number =>
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line +
    1;

  const visit = (node: TypeScript.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      references.push({
        specifier: node.moduleSpecifier.text,
        line: lineOf(node),
        kind: "import",
      });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      references.push({
        specifier: node.moduleSpecifier.text,
        line: lineOf(node),
        kind: "re-export",
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      references.push({
        specifier: node.moduleReference.expression.text,
        line: lineOf(node),
        kind: "import",
      });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const [argument] = node.arguments;

      if (argument !== undefined && ts.isStringLiteralLike(argument)) {
        references.push({
          specifier: argument.text,
          line: lineOf(node),
          kind: "dynamic import",
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return references;
};

/** The layer a specifier lands in, by alias or by relative path, or null when it leaves `src/`. */
const layerOfSpecifier = (
  specifier: string,
  fileDir: string,
  srcDir: string,
  layers: readonly string[],
): string | null => {
  const alias = /^@([a-z]+)(?:\/|$)/.exec(specifier);

  if (alias !== null) {
    const layer = alias[1];

    return layer !== undefined && layers.includes(layer) ? layer : null;
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const target = relative(srcDir, resolve(fileDir, specifier));

  if (target.startsWith("..") || isAbsolute(target)) {
    return null;
  }

  const [layer] = target.split(sep);

  return layer !== undefined && layers.includes(layer) ? layer : null;
};

/** `foo/, bar/ or baz/`, the list the messages read best with. */
const listFolders = (layers: readonly string[]): string => {
  const folders = layers.map((layer) => `${layer}/`);

  if (folders.length <= 1) {
    return folders.join("");
  }

  return `${folders.slice(0, -1).join(", ")} or ${folders.at(-1)}`;
};

const remedyFor = (layer: string, allowed: readonly string[]): string =>
  allowed.length === 0
    ? `The ${layer} layer imports nothing under src/.`
    : `The ${layer} layer may import ${listFolders(allowed)} and nothing else under src/.`;

/** Every file under `srcDir`, absolute, in a stable order. Exported so a spec can mount one test per file. */
export const listSourceFiles = (srcDir: string): string[] =>
  walkFiles(srcDir, isSourceFile);

/**
 * Every module reference in `files` that crosses a layer the table forbids. Exported so a failure
 * message can be asserted on directly rather than by reading a test runner's output.
 */
export const collectLayerImportViolations = async (
  { srcDir, layerImports }: LayerImportsOptions,
  files: readonly string[] = listSourceFiles(srcDir),
): Promise<LayerImportViolation[]> => {
  const ts = await loadTypeScript();
  const layers = Object.keys(layerImports);
  const violations: LayerImportViolation[] = [];

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

      if (target === null || target === layer || allowed.includes(target)) {
        continue;
      }

      const shown = displayPath(file);

      violations.push({
        file: shown,
        line: reference.line,
        specifier: reference.specifier,
        kind: reference.kind,
        message: `${shown}:${reference.line} reaches the ${target} layer through a ${reference.kind} of "${reference.specifier}". ${remedyFor(layer, allowed)} Dependency table: ${DEPENDENCY_TABLE}.`,
      });
    }
  }

  return violations;
};

/** Mounts the rule as one `describe` with one test per file under `src/`, so a failure names the file. */
export const describeLayerImports = (options: LayerImportsOptions): void => {
  describe("every module reference under src/ stays inside the dependency table", () => {
    const files = listSourceFiles(options.srcDir).map((file) =>
      relative(options.srcDir, file),
    );

    it.each(files)(
      "src/%s imports only the layers its row allows",
      async (file) => {
        const violations = await collectLayerImportViolations(options, [
          join(options.srcDir, file),
        ]);

        expect(violations.map((violation) => violation.message)).toEqual([]);
      },
    );
  });
};
