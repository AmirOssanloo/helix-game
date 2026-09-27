import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { displayPath, walkFiles } from "./repository";

/**
 * No rule under the domain or the simulation reads a field the content version leaves out as
 * presentation-only. The narrow stamp is only honest while that holds: a rule that read a tint
 * would let an art edit change a replay the stamp still calls valid.
 *
 * Two uses are not reads. A spawn copies the field onto the thing it makes, for the view to draw,
 * as a line `foo.frame = bar.atlasFrame;`; the copy's field is then written and never read. And
 * a named file may check the field, each with its reason, as the registry's validation checks a
 * frame is one the atlas has.
 *
 * ```ts
 * describePresentationFieldsUnread({ srcDir, fields, copiedInto, checkedIn })
 * ```
 *
 * @see docs/standards/testing.md#quick-reference
 */

/** The layers whose rules must not read a presentation field. */
const RULE_LAYERS = ["domain", "simulation"];

export type PresentationFieldsOptions = Readonly<{
  /** Absolute path to `src/`. */
  srcDir: string;
  /** The definition fields the narrow stamp leaves out. */
  fields: readonly string[];
  /** The fields of a spawned thing a presentation field is copied into, which a rule may write and never read. */
  copiedInto: readonly string[];
  /** Files under the rule layers that may check a presentation field, by repository path, each with its reason. */
  checkedIn: Readonly<Record<string, string>>;
}>;

/** One read of a presentation field under the rule layers, with the message the failing test prints. */
export type PresentationFieldViolation = Readonly<{
  /** Repository-relative, `/`-separated, with the line number. */
  at: string;
  message: string;
}>;

const escape = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether `line` is a comment line, which reads nothing. */
const isComment = (line: string): boolean => {
  const trimmed = line.trim();

  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
};

/** Every presentation field read under `srcDir`'s rule layers outside the files that may check one. */
export const collectPresentationFieldReads = ({
  srcDir,
  fields,
  copiedInto,
  checkedIn,
}: PresentationFieldsOptions): PresentationFieldViolation[] => {
  const names = [...new Set([...fields, ...copiedInto])].map(escape).join("|");
  const access = new RegExp(
    `(\\.(${names})\\b)|((?<=[\\w\\])])\\[["'](${names})["']\\])`,
  );
  const target = [...new Set(copiedInto)].map(escape).join("|");
  const copy = new RegExp(`^\\s*[\\w.]+\\.(${target}) = ([^;]*);$`);
  const listed = fields.map(escape).join("|");
  const passThrough = new RegExp(`^[\\w.]+\\.(${listed})$`);
  const violations: PresentationFieldViolation[] = [];

  for (const layer of RULE_LAYERS) {
    const files = walkFiles(join(srcDir, layer), (path) =>
      path.endsWith(".ts"),
    );

    for (const file of files) {
      const shown = displayPath(file).replace(/^\//, "");

      if (shown in checkedIn) {
        continue;
      }

      const lines = readFileSync(file, "utf8").split("\n");

      lines.forEach((line, index) => {
        if (isComment(line) || !access.test(line)) {
          return;
        }

        const copied = copy.exec(line);
        const source = copied?.[2] ?? "";

        // A write to the copy, of a constant or of a presentation field as it is, decides nothing.
        if (
          copied !== null &&
          (!access.test(source) || passThrough.test(source))
        ) {
          return;
        }

        const at = `${shown}:${String(index + 1)}`;

        violations.push({
          at,
          message: `${at} reads a presentation-only field: ${line.trim()}. The content version leaves ${fields.join(", ")} out, so no rule under src/domain or src/simulation may read one; copy it onto what the view draws, or take it off the list in src/simulation/replay/content-version.ts and re-stamp the logs.`,
        });
      });
    }
  }

  return violations;
};

/** Mounts the rule as one test that lists every read it finds. */
export const describePresentationFieldsUnread = (
  options: PresentationFieldsOptions,
): void => {
  describe("no rule reads a presentation-only field", () => {
    it("src/domain/ and src/simulation/ only copy or check the fields the content version leaves out", () => {
      const violations = collectPresentationFieldReads(options);

      expect(violations.map((violation) => violation.message)).toEqual([]);
    });
  });
};
