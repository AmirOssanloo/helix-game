# How the ESLint folder is put together

The layout, the two behaviours that explain why the code here looks the way it does, and the
procedure that proves a rule still fires. The rules themselves are owned by the pages under
`docs/`; every message names the page that decided it.

## Layout

| Path | Holds |
| --- | --- |
| `../eslint.config.js` | Composes the blocks below and fixes their order. Nothing else decides order |
| `matrix.js` | `LAYER_IMPORTS`, the allow-list table from the layers page, and `forbiddenFor(layer)`, which derives one layer's import ban from its row. `tests/architecture.spec.ts` imports the same table |
| `rules/` | One restriction per file: a `no-restricted-syntax` selector, a `no-restricted-imports` pattern, or a `no-restricted-globals` name, with a message and no file glob and no rule id. Two files hold a rule implementation instead, because what they check is not in the AST: a file's own name, and a comment on the same line as a `.skip` |
| `plugin.js` | Wraps the two implementations so flat config can reach them as `helix/<rule>` |
| `src-files.js` | The block covering every file under `src/`, and `SRC_SYNTAX`, the list every layer block spreads back in |
| `layers/` | One block per layer folder under `src/`, plus one slice, `boot-scene.js`. `app/` has a matrix row and a block that only widens `no-console`; its row allows everything, so it has nothing to forbid |
| `tests.js` | The two blocks that cover `tests/` |

## Last block wins, and it replaces

When two blocks set the same rule id and a file matches both, ESLint keeps the later block's
options and throws the earlier one's away. They are replaced, not combined.

So a narrower block repeats every entry it wants to keep from a wider one. A file under
`src/domain/` matches both `src-files.js` and `layers/domain.js`; whatever the domain block
does not spread back in stops being checked for those files, and nothing reports it. That is
why `rules/` exports constants to drop into each block rather than blocks to extend, and why
`SRC_SYNTAX` exists.

## Two glob traps

Import patterns are matched by the `ignore` package, which follows gitignore rules.

**Keep the `/**` at the end of a folder pattern.** `DOMAIN_FACADE` in `rules/facades.js`
blocks the domain folder, then lets the door back in:

```js
group: ["@domain/**", "!@domain/public", "**/domain/**", "!**/domain/public"]
```

Shorten `**/domain/**` to `**/domain` and the negation stops working, because gitignore will
not let anything back in once a folder itself is excluded.

**`*` matches `..`.** Paths are compared as text, so `..` is an ordinary segment. `**/domain/**`
matches `../domain/public` and `../../domain/public` alike, which is what lets one group cover
both the alias and the relative spelling.

**A type-allowing pattern is a skip for the whole import.** `@typescript-eslint/no-restricted-imports`
ignores an `import type` when any matching pattern sets `allowTypeImports`, so such a group
must name only the paths it means to allow. `DOMAIN_TYPES_ONLY` names the door and nothing
else for this reason.

## Checking a change

Nothing in this folder has tests. A file pattern that matches nothing produces exactly the
same output as no rule at all, so a green run proves nothing on its own. The check is that
every rule still fires on a one-line violation and stays quiet on the line beside it.

Save the script below outside the repository and run it from the repository root with
`node <path>`. It plants one throwaway file per case, lints them in a single run, prints one
line per case, and removes every file and folder it created. Add a case whenever a rule is
added or a group is edited, then paste the output into the sprint's exit table.

```js
// Plants one-line violations, lints them in one run, and prints whether each expected rule fired.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const IMPORTS = "@typescript-eslint/no-restricted-imports";
const SYNTAX = "no-restricted-syntax";
const GLOBALS = "no-restricted-globals";

const t = (p) => `import type { T } from "${p}";\nexport type P = T;\n`;
const v = (p) => `import { t } from "${p}";\nexport const p = t;\n`;
const fn = (body) => `export const f = (): void => {\n  ${body}\n};\n`;

/** [file, source, expected rule id or null when the line must be allowed, label] */
const cases = [
  ["src/shared/probe-1.ts", t("@domain/public"), IMPORTS, "shared -> domain"],
  ["src/domain/probe-1.ts", t("@shared/public"), null, "domain -> shared"],
  ["src/content/probe-1.ts", t("@domain/public"), null, "content -> domain type via door"],
  ["src/content/probe-2.ts", v("@domain/public"), IMPORTS, "content -> domain value import"],
  ["src/content/probe-3.ts", t("@domain/entities/unit"), IMPORTS, "content -> domain past the door"],
  ["src/presentation/probe-1.ts", t("@simulation/world"), IMPORTS, "presentation -> simulation past the door"],
  ["src/domain/probe-2.ts", t("phaser"), IMPORTS, "phaser in domain"],
  ["src/domain/probe-3.ts", "export const r = (): number => Math.random();\n", SYNTAX, "Math.random in domain"],
  ["src/domain/probe-4.ts", "export const r = (): number => window.innerWidth;\n", GLOBALS, "window in domain"],
  ["src/presentation/probe-2.ts", "export const f = (s: { add: { circle: () => void } }): void => {\n  s.add.circle();\n};\n", SYNTAX, "add.circle"],
  ["src/presentation/scenes/boot.scene.ts", "export const f = (s: { add: { text: () => void } }): void => {\n  s.add.text();\n};\n", null, "add.text in boot.scene.ts"],
  ["src/presentation/probe-3.ts", "type World = { tick: number };\nexport const w = (v: Readonly<World>): World => v as World;\n", SYNTAX, "as World outside simulation"],
  ["src/domain/probe-5.ts", "export type P = { a?: number };\n", SYNTAX, "optional property"],
  ["src/domain/probe-6.ts", fn("console.log(1);"), "no-console", "console.log in domain"],
  ["src/shared/ProbeSeven.ts", "export const p = 1;\n", "helix/file-name-kebab-case", "PascalCase file name"],
  ["tests/probe-1.spec.ts", "it.only(\"x\", () => {});\n", SYNTAX, ".only"],
  ["tests/probe-2.spec.ts", "it.skip(\"x\", () => {});\n", "helix/skip-needs-reason", ".skip without a comment"],
  ["tests/probe-3.spec.ts", "import { makeWorld } from \"./helpers/world/make-world\";\nexport const w = makeWorld;\n", IMPORTS, "deep helper import"],
];

const created = [];
for (const [file, source] of cases) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, source);
  created.push(file);
}

const run = spawnSync("node_modules/.bin/eslint", ["--format", "json", ...created], { encoding: "utf8" });
const results = new Map(
  JSON.parse(run.stdout).map((r) => [r.filePath.replace(`${process.cwd()}/`, ""), r.messages]),
);

let failures = 0;
for (const [file, , expected, label] of cases) {
  const fired = (results.get(file) ?? []).map((m) => m.ruleId);
  const ok = expected === null ? fired.length === 0 : fired.includes(expected);
  if (!ok) {
    failures += 1;
  }
  console.log(`${ok ? "ok  " : "FAIL"} ${label.padEnd(44)} expected ${expected ?? "allowed"}`);
}

for (const file of created) {
  rmSync(file);
}
for (const dir of ["src/presentation/scenes", "tests/helpers", "tests"]) {
  if (existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir);
  }
}
process.exit(failures === 0 ? 0 : 1);
```

The list above is the short form. The full list, one case per documented rule and one per
layer pair, is what the sprint exit table records; extend it the same way. Afterwards make
sure `git status --porcelain` shows no probe file and no empty folder left behind.

## Adding a restriction

1. Create `rules/<what-it-bans>.js` and export a `SCREAMING_SNAKE_CASE` constant: a
   `no-restricted-syntax` entry (`{ selector, message }`), a `no-restricted-imports` pattern
   (`{ group, message }`), or a `no-restricted-globals` entry (`{ name, message }`). Export an
   array only if the restriction needs more than one selector.
2. Write the message so it says what to do instead, and name the page that decided it. The
   message is the only thing most people will ever read about the rule.
3. Comment why the restriction exists, above the export. What it does is in the selector.
4. Add it to every block that must enforce it, including the narrower blocks sitting inside a
   broader one. Re-read the last-block-wins section before deciding one place is enough.
5. Add a case to the probe and run it.

Only add a rule for something a developer can still write. A rule against a pattern that
cannot occur can never fire, and it makes the config look bigger than it is.

## Adding a layer

One matrix row, one layer file, one line to compose it.

1. Add a row to `LAYER_IMPORTS` in `matrix.js` listing the layers the new one may import.
   Every layer it does not list is forbidden to it, and it is forbidden to every layer that
   does not list it.
2. Create `layers/<layer>.js` exporting one block: `files` and `rules`. Its direction rule is
   `forbiddenFor("<layer>")`; never write layer names by hand. If the block sets
   `no-restricted-syntax`, spread `SRC_SYNTAX` back in.
3. Add it to the array in `../eslint.config.js`, after the block whose files it sits inside.
4. Update the dependency table in `docs/architecture/layers-and-dependency-rule.md` in the
   same change. The lint message points at that table.
5. Add the layer's cases to the probe and run it.
