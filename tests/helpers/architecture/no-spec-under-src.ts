import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { displayPath, walkFiles } from "./repository";

/**
 * Every spec lives under `tests/`, mirroring `src/`. The build compiles `src/` and excludes
 * `tests/`, so a spec under `src/` is one exclude pattern away from shipping, and a `__tests__/`
 * folder is the same thing with a different name.
 *
 * ```ts
 * describeNoSpecUnderSrc({ srcDir })
 * ```
 *
 * @see docs/standards/testing.md#quick-reference
 */

const TESTING_STANDARD = "docs/standards/testing.md#quick-reference";

/** Which tree to scan. */
export type NoSpecUnderSrcOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
}>;

/** One test-shaped file found under `src/`, with the message the failing test prints. */
export type SpecUnderSrcViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  message: string;
}>;

const looksLikeATest = (path: string): boolean =>
  path.endsWith(".spec.ts") ||
  path.endsWith(".test.ts") ||
  path.split(sep).includes("__tests__");

/** The folders directly under `src/`, so the rule mounts one test per layer. */
const listLayerFolders = (srcDir: string): string[] =>
  readdirSync(srcDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

/** Every spec, test, or `__tests__/` file under `dir`. Exported so a message can be asserted on directly. */
export const collectSpecUnderSrcViolations = (
  dir: string,
): SpecUnderSrcViolation[] =>
  walkFiles(dir, looksLikeATest).map((file) => {
    const shown = displayPath(file);

    return {
      file: shown,
      message: `${shown} is a test under src/. Every spec lives under tests/ at the repository root, mirroring src/, and is named *.spec.ts; the build excludes tests/ and nothing else. Move it to tests/${shown.slice("src/".length)}. See ${TESTING_STANDARD}.`,
    };
  });

/** Mounts the rule as one `describe` with one test per layer folder, so a failure names the layer and lists the files. */
export const describeNoSpecUnderSrc = ({
  srcDir,
}: NoSpecUnderSrcOptions): void => {
  describe("no spec lives under src/", () => {
    it.each(listLayerFolders(srcDir))("src/%s/ holds no spec file", (layer) => {
      const violations = collectSpecUnderSrcViolations(join(srcDir, layer));

      expect(violations.map((violation) => violation.message)).toEqual([]);
    });
  });
};
