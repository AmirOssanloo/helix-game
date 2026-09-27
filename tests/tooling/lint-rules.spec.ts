import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ESLint, RuleTester } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import { describe, expect, it } from "vitest";
import { NO_AMBIENT_TIME_IN_SIMULATION } from "../../eslint/rules/no-ambient-time-in-simulation.js";
import { NO_DOM_GLOBALS } from "../../eslint/rules/no-dom-in-simulation.js";
import { MAX_LINES_PER_FILE, OVER_THE_LIMIT } from "../../eslint/size-limit.js";
import { REPOSITORY_ROOT } from "../helpers";

RuleTester.describe = describe;
RuleTester.it = it;

/** A core rule by id. Every rule here is ESLint's own, configured by the lists under eslint/rules/. */
const coreRule = (id: string) => {
  const rule = builtinRules.get(id);

  if (rule === undefined) {
    throw new Error(`ESLint has no core rule "${id}"`);
  }

  return rule;
};

/** Each spelling of one ambient source the simulation layers refuse: `owner.property`. */
const spellingsOf = (owner: string, property: string): string[] => [
  `${owner}.${property}();`,
  `const f = ${owner}.${property};`,
  `const { ${property} } = ${owner};`,
  `let ${property}; ({ ${property} } = ${owner});`,
  `${owner}["${property}"]();`,
  `globalThis.${owner}.${property}();`,
  `self.${owner}.${property}();`,
  `window.${owner}.${property}();`,
  `const { ${property} } = globalThis.${owner};`,
  `globalThis["${owner}"]["${property}"]();`,
];

const AMBIENT_TIME = [
  ...spellingsOf("Math", "random"),
  ...spellingsOf("Date", "now"),
  ...spellingsOf("performance", "now"),
  "new Date();",
  "new globalThis.Date();",
  "Date();",
];

const DOM_GLOBAL_NAMES = NO_DOM_GLOBALS.map((entry) => entry.name);

/** The folders whose files must refuse each form, and the one that must allow it. */
const REFUSED_IN = ["src/domain", "src/simulation"];
const ALLOWED_IN = "src/presentation";

/** One probe file's worth of source: `lines` lines, each a comment, as `wc -l` counts them. */
const linesOfSource = (lines: number): string => "// a line\n".repeat(lines);

const eslint = new ESLint({ cwd: REPOSITORY_ROOT });

/** The rule ids the real config reports for `source` placed at `path`. */
const ruleIdsAt = async (path: string, source: string): Promise<string[]> => {
  const [result] = await eslint.lintText(source, {
    filePath: join(REPOSITORY_ROOT, path),
  });

  if (result === undefined) {
    throw new Error(`ESLint returned no result for ${path}`);
  }

  return result.messages.map((message) => message.ruleId ?? "fatal");
};

describe("the ambient time and randomness entries", () => {
  new RuleTester().run(
    "no-restricted-syntax",
    coreRule("no-restricted-syntax"),
    {
      valid: [
        "rng.random();",
        "Math.floor(1.5);",
        "const { floor } = Math;",
        "new Date(0);",
        "clock.now();",
        "const { now } = clock;",
        "foo.Math.random();",
      ].map((code) => ({ code, options: NO_AMBIENT_TIME_IN_SIMULATION })),
      invalid: AMBIENT_TIME.map((code) => ({
        code,
        options: NO_AMBIENT_TIME_IN_SIMULATION,
        errors: 1,
      })),
    },
  );
});

describe("the host globals", () => {
  new RuleTester().run(
    "no-restricted-globals",
    coreRule("no-restricted-globals"),
    {
      valid: DOM_GLOBAL_NAMES.map((name) => ({
        code: `const ${name} = 1; export const read = ${name};`,
        options: NO_DOM_GLOBALS,
        languageOptions: { sourceType: "module" },
      })),
      invalid: DOM_GLOBAL_NAMES.map((name) => ({
        code: `const read = ${name};`,
        options: NO_DOM_GLOBALS,
        errors: 1,
      })),
    },
  );
});

describe("the layer blocks in the real config", () => {
  it.each(AMBIENT_TIME)(
    "refuses `%s` under domain and simulation and allows it in presentation",
    async (line) => {
      for (const folder of REFUSED_IN) {
        expect(await ruleIdsAt(`${folder}/probe.ts`, line)).toContain(
          "no-restricted-syntax",
        );
      }

      expect(await ruleIdsAt(`${ALLOWED_IN}/probe.ts`, line)).not.toContain(
        "no-restricted-syntax",
      );
    },
  );

  it.each(DOM_GLOBAL_NAMES)(
    "refuses `%s` under domain and simulation and allows it in presentation",
    async (name) => {
      const line = `export const read = (): unknown => ${name};\n`;

      for (const folder of REFUSED_IN) {
        expect(await ruleIdsAt(`${folder}/probe.ts`, line)).toContain(
          "no-restricted-globals",
        );
      }

      expect(await ruleIdsAt(`${ALLOWED_IN}/probe.ts`, line)).not.toContain(
        "no-restricted-globals",
      );
    },
  );
});

describe("the size limit", () => {
  it(`refuses a file of ${MAX_LINES_PER_FILE + 1} raw lines under src/ and allows one of ${MAX_LINES_PER_FILE}`, async () => {
    expect(
      await ruleIdsAt(
        "src/domain/probe.ts",
        linesOfSource(MAX_LINES_PER_FILE + 1),
      ),
    ).toContain("max-lines");
    expect(
      await ruleIdsAt("src/domain/probe.ts", linesOfSource(MAX_LINES_PER_FILE)),
    ).not.toContain("max-lines");
  });

  it("counts blank lines", async () => {
    expect(
      await ruleIdsAt(
        "src/presentation/probe.ts",
        `export const a = 1;\n${"\n".repeat(MAX_LINES_PER_FILE)}`,
      ),
    ).toContain("max-lines");
  });

  it("lets a map definition past as data", async () => {
    expect(
      await ruleIdsAt(
        "src/content/maps/probe.def.ts",
        linesOfSource(MAX_LINES_PER_FILE * 2),
      ),
    ).not.toContain("max-lines");
  });

  it.each(Object.entries(OVER_THE_LIMIT))(
    "lets %s past with its reason while it is over the limit",
    async (path, reason) => {
      const source = readFileSync(join(REPOSITORY_ROOT, path), "utf8");
      const rawLines = source.split("\n").length - 1;

      expect(reason.length).toBeGreaterThan(0);
      // A file split under the limit leaves the list in the same change.
      expect(rawLines).toBeGreaterThan(MAX_LINES_PER_FILE);
      expect(await ruleIdsAt(path, source)).not.toContain("max-lines");
    },
  );
});
