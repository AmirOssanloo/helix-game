import { join, relative, sep } from "node:path";
import type * as TypeScript from "typescript";
import { describe, expect, it } from "vitest";
import { displayPath, REPOSITORY_ROOT } from "./repository";

/**
 * No module under the named folders holds mutable state at module scope. A binding there is a
 * second world: two worlds in one process share it, a test cannot reset it, and a replay on a
 * fresh world diverges from the session that wrote the log. What a rule works in belongs to the
 * world's scratch, and what a later tick reads belongs to run or map scope.
 *
 * A binding is mutable when it is declared with `let` or `var`, or when its type can be written
 * at any depth: a mutable array or tuple, a `Map`, a `Set`, a typed array or buffer, a `Date`,
 * or an object with a property that is not `readonly`, reached through properties, array
 * elements, and the values of a read-only map or set. A function is not state. A regular
 * expression is allowed when it has neither the `g` nor the `y` flag, since without them it
 * keeps nothing between calls.
 *
 * The compiler's type checker decides, so a `readonly` array of records with writable fields is
 * caught, and a record typed `Readonly<…>` at every depth passes.
 *
 * ```ts
 * describeNoModuleState({ srcDir, folders: ["domain", "simulation"] })
 * ```
 *
 * @see docs/standards/simulation-coding.md#quick-reference
 */

const STANDARD = "docs/standards/simulation-coding.md#quick-reference";

/** Which tree to scan, and the folders under it that may hold no module state. */
export type ModuleStateOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
  /** Top-level folders under `srcDir`: `["domain", "simulation"]`. */
  folders: readonly string[];
}>;

/** One mutable binding at module scope, with the message the failing test prints. */
export type ModuleStateViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  line: number;
  name: string;
  message: string;
}>;

/** Types whose instances are written in place, whatever they are declared as. */
const MUTABLE_TYPES: ReadonlySet<string> = new Set([
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  "Date",
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "Float32Array",
  "Float64Array",
  "BigInt64Array",
  "BigUint64Array",
]);

/** The containers whose element or value types are walked into. */
const READ_ONLY_CONTAINERS: ReadonlySet<string> = new Set([
  "ReadonlyMap",
  "ReadonlySet",
]);

/** How deep a type is walked: deep enough for a table of records of points, and bounded for a recursive type. */
const MAXIMUM_DEPTH = 6;

/** The compiler's flag for a property a mapped type such as `Readonly` made read-only. */
const MAPPED_READONLY = 8;

/** Loaded on first use, so a spec that imports the helpers barrel does not pay for the compiler. */
const loadTypeScript = async (): Promise<typeof TypeScript> => {
  const module = await import("typescript");

  return module.default;
};

/** A property's check flags, which the compiler keeps on the symbol's links and does not type. */
const checkFlagsOf = (symbol: TypeScript.Symbol): number => {
  const links = (symbol as { links?: { checkFlags?: number } }).links;

  return links?.checkFlags ?? 0;
};

const isReadonlyProperty = (
  ts: typeof TypeScript,
  symbol: TypeScript.Symbol,
): boolean => {
  if ((checkFlagsOf(symbol) & MAPPED_READONLY) !== 0) {
    return true;
  }

  if (
    (symbol.flags & ts.SymbolFlags.GetAccessor) !== 0 &&
    (symbol.flags & ts.SymbolFlags.SetAccessor) === 0
  ) {
    return true;
  }

  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];

  return (
    declaration !== undefined &&
    (ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Readonly) !== 0
  );
};

const isMethod = (ts: typeof TypeScript, symbol: TypeScript.Symbol): boolean =>
  (symbol.flags & ts.SymbolFlags.Method) !== 0;

/** Why a value of `type` can be written, as a path into it, or `null` when nothing in it can be. */
const whyWritable = (
  ts: typeof TypeScript,
  checker: TypeScript.TypeChecker,
  type: TypeScript.Type,
  depth: number,
  seen: Set<TypeScript.Type>,
): string | null => {
  if (depth > MAXIMUM_DEPTH || seen.has(type)) {
    return null;
  }

  seen.add(type);

  try {
    if (type.isUnion() || type.isIntersection()) {
      for (const member of type.types) {
        const why = whyWritable(ts, checker, member, depth, seen);

        if (why !== null) {
          return why;
        }
      }

      return null;
    }

    if (checker.isTupleType(type)) {
      const target = (type as TypeScript.TypeReference).target as
        TypeScript.TupleType | undefined;

      return target?.readonly === true ? null : "a mutable tuple";
    }

    const name = type.getSymbol()?.getName() ?? "";

    if (checker.isArrayType(type)) {
      if (name === "Array") {
        return "a mutable array";
      }

      const [element] = checker.getTypeArguments(
        type as TypeScript.TypeReference,
      );
      const why =
        element === undefined
          ? null
          : whyWritable(ts, checker, element, depth + 1, seen);

      return why === null ? null : `[] ${why}`;
    }

    if (MUTABLE_TYPES.has(name)) {
      return `a ${name}`;
    }

    if (READ_ONLY_CONTAINERS.has(name)) {
      for (const argument of checker.getTypeArguments(
        type as TypeScript.TypeReference,
      )) {
        const why = whyWritable(ts, checker, argument, depth + 1, seen);

        if (why !== null) {
          return `${name} of ${why}`;
        }
      }

      return null;
    }

    if (type.getCallSignatures().length > 0) {
      return null;
    }

    if ((type.flags & ts.TypeFlags.Object) === 0) {
      return null;
    }

    for (const property of type.getProperties()) {
      if (isMethod(ts, property)) {
        continue;
      }

      if (!isReadonlyProperty(ts, property)) {
        return `a writable property ${property.getName()}`;
      }

      const why = whyWritable(
        ts,
        checker,
        checker.getTypeOfSymbol(property),
        depth + 1,
        seen,
      );

      if (why !== null) {
        return `${property.getName()}: ${why}`;
      }
    }

    return null;
  } finally {
    seen.delete(type);
  }
};

/** Whether `declaration` is a regular expression literal that keeps nothing between calls. */
const isStatelessPattern = (
  ts: typeof TypeScript,
  declaration: TypeScript.VariableDeclaration,
): boolean => {
  const initializer = declaration.initializer;

  if (
    initializer === undefined ||
    !ts.isRegularExpressionLiteral(initializer)
  ) {
    return false;
  }

  const flags = initializer.text.slice(initializer.text.lastIndexOf("/") + 1);

  return !flags.includes("g") && !flags.includes("y");
};

/** The files under the named folders, as the project's own configuration sees them. */
const projectFiles = (
  ts: typeof TypeScript,
  options: ModuleStateOptions,
): { fileNames: string[]; compilerOptions: TypeScript.CompilerOptions } => {
  const configPath = join(REPOSITORY_ROOT, "tsconfig.json");
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );

  if (parsed === undefined) {
    throw new Error(`${configPath} could not be read`);
  }

  const inFolders = (file: string): boolean => {
    const [folder] = relative(options.srcDir, file).split(sep);

    return folder !== undefined && options.folders.includes(folder);
  };

  return {
    fileNames: parsed.fileNames.filter(inFolders),
    compilerOptions: parsed.options,
  };
};

/**
 * Every mutable binding at module scope in `files`, with `sources` standing in for files on
 * disk by absolute path, so a spec can check the rule on source it writes. Exported so a
 * failure message can be asserted on directly.
 */
export const collectModuleStateViolations = async (
  options: ModuleStateOptions,
  sources: ReadonlyMap<string, string> = new Map(),
): Promise<ModuleStateViolation[]> => {
  const ts = await loadTypeScript();
  const { fileNames, compilerOptions } = projectFiles(ts, options);
  const host = ts.createCompilerHost(compilerOptions, true);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);

  host.readFile = (file) => sources.get(file) ?? readFile(file);
  host.fileExists = (file) => sources.has(file) || fileExists(file);

  const roots = sources.size > 0 ? [...sources.keys()] : fileNames;
  const program = ts.createProgram(roots, compilerOptions, host);
  const checker = program.getTypeChecker();
  const violations: ModuleStateViolation[] = [];

  for (const file of roots) {
    const sourceFile = program.getSourceFile(file);

    if (sourceFile === undefined) {
      continue;
    }

    const shown = displayPath(file);

    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      const isConst =
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;

      for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText(sourceFile);
        const line =
          sourceFile.getLineAndCharacterOfPosition(
            declaration.getStart(sourceFile),
          ).line + 1;
        const why = !isConst
          ? "it is not const"
          : isStatelessPattern(ts, declaration)
            ? null
            : whyWritable(
                ts,
                checker,
                checker.getTypeAtLocation(declaration.name),
                0,
                new Set(),
              );

        if (why === null) {
          continue;
        }

        violations.push({
          file: shown,
          line,
          name,
          message: `${shown}:${String(line)} holds \`${name}\` at module scope, and ${why === "it is not const" ? why : `its type holds ${why}`}. Working memory goes on the world's scratch and what a later tick reads into run or map scope; a constant is typed read-only at every depth. ${STANDARD}.`,
        });
      }
    }
  }

  return violations;
};

/** Mounts the rule as one test over every file under the named folders. */
export const describeNoModuleState = (options: ModuleStateOptions): void => {
  describe(`no module under ${options.folders.map((folder) => `src/${folder}/`).join(" or ")} holds mutable state`, () => {
    it("every binding at module scope is a constant typed read-only at every depth", async () => {
      const violations = await collectModuleStateViolations(options);

      expect(violations.map((violation) => violation.message)).toEqual([]);
    }, 60_000);

    it("refuses a let, a mutable array, a writable record, and a typed array, and lets a read-only table and a plain pattern past", async () => {
      const file = join(options.srcDir, options.folders[0] ?? "", "probe.ts");
      const violations = await collectModuleStateViolations(
        options,
        new Map([
          [
            file,
            [
              "export let count = 0;",
              "export const buffer: number[] = [];",
              "export const point = { x: 0, y: 0 };",
              "export const words = new Uint32Array(4);",
              "export const rows: readonly { at: number }[] = [];",
              "export const table: ReadonlyMap<string, Readonly<{ at: number }>> = new Map();",
              'export const names: readonly string[] = ["a"];',
              "export const SHAPE = /^[a-z]+$/;",
              "export const GLOBAL = /[a-z]/g;",
              "export const read = (value: number): number => value;",
            ].join("\n"),
          ],
        ]),
      );

      expect(violations.map((violation) => violation.name)).toEqual([
        "count",
        "buffer",
        "point",
        "words",
        "rows",
        "GLOBAL",
      ]);
    }, 60_000);
  });
};
