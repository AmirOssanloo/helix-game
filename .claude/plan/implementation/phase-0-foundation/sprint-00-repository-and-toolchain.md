# Sprint 00 — Repository and toolchain

**Phase:** 0 · **Sized days:** 5 · **Buffer:** 1 · **Note:** T00 was unplanned and done before the sprint opened; the sized total is 5 by that rule, and the overrun is recorded in [Estimation and capacity](../03-estimation-and-capacity.md)

## Goal

Every rule the documentation says a tool enforces is enforced, on an empty `src/`, before any game code exists.

## Playable outcome

Nothing plays. `pnpm check` is green on eight empty layers, and a deliberate violation of each enforced rule fails the build.

---

## Tickets

### P0-S00-T00 — Entry points, rules, agents, and the plan's status

| Field | Value |
| --- | --- |
| Layer | tooling, docs |
| Size | 1 |
| Depends on | none |
| Status | done |

*Unplanned. Done on 2026-09-20, before the sprint opened, so the documentation and the plan are discoverable from the repository root before any code exists.*

**Build:** A root `README.md` naming the product and pointing at the documentation, the plan, and `AGENTS.md`. `AGENTS.md` as the map every automated worker starts from, and a `CLAUDE.md` that imports it. Four path-scoped rules under `.claude/rules/` for the simulation, presentation, content, and docs folders, each linking quick-reference anchors. Three agent definitions under `.claude/agents/` with descriptions that say when to pick them and the narrowest tools. Four project skills that wrap a runbook: `pick-up-a-ticket`, `add-a-spell`, `add-an-enemy`, `write-a-docs-page`. `STATUS.md` in this folder naming the active sprint and next ticket. The agents standard and the where-to-look table reconciled with the folders that exist. A `.claude/settings.json` allowlist for the gate commands and read-only git. The [toolchain note](../notes/2026-09-20-toolchain-shape.md) and the answers to open questions Q13 to Q16.

**Acceptance:**
- `AGENTS.md` exists at the root and restates nothing; `CLAUDE.md` is one import line.
- Editing a file under `src/domain/`, `src/presentation/`, `src/content/`, or `docs/` loads the matching rule.
- The three agents and the four project skills are listed by the tooling with their descriptions.
- Every relative link under `docs/`, the root, and `.claude/` resolves. Checked by hand until T04 makes it a test.
- `docs/standards/agents-and-skills.md` and `docs/architecture/where-to-look.md` name only folders that exist.

**Tests:** none; T04 adds the link test.

**Definition of done:** Every change · A documentation change.

---

### P0-S00-T01 — Package, TypeScript, and path aliases

| Field | Value |
| --- | --- |
| Layer | tooling |
| Size | 1 |
| Depends on | T00 |
| Status | done |

*Done on 2026-09-20. Vite needs an entry to build, so this ticket also wrote a minimal `index.html` and `src/app/main.ts` that T02 fills in. `check` and `check:ci` run only the steps that exist (typecheck, build); T03 adds lint and T04 adds the test tiers. `lint`, `test`, `dev`, and `bench` print a clear not-yet and exit 1 until their ticket lands. pnpm 12 ships its binaries under a new package name, so a pnpm 10 older than the rename cannot self-switch to the pin; Corepack can, and that is the documented install path.*

**Build:** Shape and settings follow [the toolchain note](../notes/2026-09-20-toolchain-shape.md). Root `package.json` with `packageManager` pinned to a pnpm version and `.nvmrc` pinned to the current Node LTS. Scripts exactly as `docs/workflows/development.md` lists them: `check`, `check:ci`, `test`, `test:watch`, `lint`, `lint:fix`, `typecheck`, `dev`, `build`, `bench`. `tsconfig.json` strict, ES modules, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, with the eight aliases `@shared`, `@domain`, `@simulation`, `@content`, `@instrumentation`, `@presentation`, `@devtools`, `@app` pointing at `src/<layer>`. The build compiles `src/` and excludes `tests/` and `bench/`. Phaser 4.2.1 pinned exactly. The eight layer folders exist, each with a `public.ts` that exports one named type so the folder is not empty.

**Acceptance:**
- `pnpm install` succeeds on a clean clone with Corepack enabled.
- `pnpm typecheck` passes with an alias import from `presentation` to `@simulation/public`.
- `pnpm build` produces a bundle that does not include `tests/`.
- Scripts that cannot yet run (`bench`, `dev`) print a clear "not yet" rather than failing obscurely.

**Tests:** none; this ticket is wiring.

**Definition of done:** Every change.

---

### P0-S00-T02 — Vite: dev server, production build, DevApi strip

| Field | Value |
| --- | --- |
| Layer | tooling, app |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

*Done on 2026-09-20. The define is `__DEV__`, declared in `src/app/build-flags.d.ts` and set from the Vite mode. The sentinel is `DEVTOOLS_SENTINEL` in `src/devtools/devtools-sentinel.ts`; `mountPanel` writes it onto its host, so the string is in a bundle exactly when panel code is. The grep is a Vite plugin in `vite.config.ts` that reads every chunk at `generateBundle`, so the string has one owner and the check runs on every platform; the config imports the sentinel with a `.ts` suffix because Vite's native config loader asks for one, which needed `allowImportingTsExtensions` (harmless under `noEmit`; T03's lint keeps suffixes out of `src/`). `vite.config.ts` is typechecked, so `@types/node` was added. The page serves `<main id="game">` as the host the canvas mounts into; the canvas element itself arrives with the game config in P0-S01-T04. An empty icon link keeps the browser's favicon request out of the console.*

**Build:** `vite.config.ts` with the aliases, an `index.html` mounting the canvas and an empty `<aside id="devtools">`, and one `define` that is true in development and false in production. `src/app/main.ts` mounts the panel only inside a branch on that define, so the production bundle contains no `devtools/` code. The `pnpm build` step greps the bundle for a sentinel string exported by `devtools/` and fails if found.

**Acceptance:**
- `pnpm dev` serves a page with a canvas and no console errors.
- `pnpm build` succeeds and the sentinel grep passes.
- Moving the `devtools` import outside the define branch makes `pnpm build` fail.

**Tests:** none; the build grep is the test.

**Definition of done:** Every change.

---

### P0-S00-T03 — ESLint flat config and Prettier with every documented rule

| Field | Value |
| --- | --- |
| Layer | tooling |
| Size | 1 |
| Depends on | T01 |
| Status | done |

*Done on 2026-09-20. Layout as the toolchain note: `eslint/matrix.js` owns `LAYER_IMPORTS`, one restriction per file under `eslint/rules/`, one block per layer under `eslint/layers/`, the tests blocks in `eslint/tests.js`, and `eslint/README.md` holds the probe procedure. Decisions the ticket left open: the Phaser ban exempts `src/app/` as well as `src/presentation/`, because the layers page gives the composition root the Phaser game config and every import, and Q17 asks the docs to say so in one place. The `Readonly` cast ban catches a cast to a type named `World`, `Mutable`, or `Writable`; that name list is the contract the live world type and any widening helper keep. `window`, `document`, `navigator`, and `requestAnimationFrame` are restricted globals under domain and simulation, the DOM half of the layers rule. The file-name and skip-reason rules are two small implementations under `eslint/rules/` rather than a plugin dependency. `no-import-type-side-effects` joins `consistent-type-imports` so `import type` is the one spelling. Prettier defaults reformatted the existing source to double quotes. The probe caught one real bug before it shipped: a types-only pattern that overlapped the domain facade let a type import walk past the door, so that pattern names only `public`.*

**Build:** `eslint.config.js` in the layout [the toolchain note](../notes/2026-09-20-toolchain-shape.md) describes — one restriction per file under `eslint/rules/`, one block per layer under `eslint/layers/`, and the allow-list as a matrix the architecture test imports — carrying, as named blocks:
- The layer allow-list from `docs/architecture/layers-and-dependency-rule.md`, as `no-restricted-imports` per layer folder. `content` may import from `domain` with `import type` only.
- Restricted globals `Math.random`, `Date.now`, `performance.now` under `src/domain/**` and `src/simulation/**`.
- A ban on `phaser` imports anywhere but `src/presentation/**`.
- A ban on the Shape and Graphics factories (`add.graphics`, `add.circle`, `add.rectangle`, `add.line`, `add.polygon`, `add.ellipse`, `add.arc`, `add.star`, `add.triangle`, `add.curve`, `add.grid`, `add.isobox`, `add.isotriangle`) under `src/**`, and `add.text` outside `boot.scene.ts`.
- A ban on casting away from the `Readonly` world view outside `src/simulation/**`.
- `@typescript-eslint` rules: no explicit `any`, no non-null assertion, no optional properties on type members (via a restricted-syntax selector).
- Import order by `perfectionist/sort-imports`: built-in, external, aliased layers (a custom group matching the eight `@layer/` prefixes), then parent, sibling, and index together; alphabetical, case ignored, no blank line between groups.
- `no-console` as an error under `src/**`, with `warn` and `error` allowed under `src/app/**` and `src/devtools/**`.
- Under `tests/**`: `.only` banned; `.skip` requires a comment on the same line; no `as any`, no `as unknown as`, no `vi.mock`, no `setTimeout`, no `new Date()` without an argument, no fake timers; helpers imported from `tests/helpers/index.ts` only.
- File-name kebab-case rule.
Prettier with defaults. A `.prettierrc` exists so editors find it.

**Acceptance:**
- Each rule above fails on a one-line violation placed on a branch and passes when removed. Record the checks in the sprint exit, one row per rule.
- `pnpm lint:fix` applies Prettier.

**Tests:** none; the branch checks are the evidence.

**Definition of done:** Every change.

---

### P0-S00-T04 — Vitest tiers and the architecture test

| Field | Value |
| --- | --- |
| Layer | tooling, tests |
| Size | 1 |
| Depends on | T01, T03 |
| Status | done |

*Done on 2026-09-20. Five projects, each inheriting the root aliases, with `passWithNoTests` so an empty tier is green. The coverage floors sit in the config and only `check:ci` passes `--coverage`, so `check` and `test` stay uninstrumented; the config refuses to load when a floor's key is not checked against a file that exists. pnpm 12 passes a `--` through to the script and Vitest then reads everything after it as a file filter, so the flag examples in the runbooks, the gate page, and the `.only` lint message drop the `--`: `pnpm test --project simulation` and `pnpm test -t "…"` work, `pnpm test -- -t "…"` silently runs everything. Lint's `no-restricted-imports` does see a barrel re-export, so the acceptance bullet below was rewritten to what lint misses. The tiers table now names `tests/instrumentation/` under unit and `tests/devtools/` under presentation, so a spec there runs rather than being skipped in silence. The layer rule walks every module extension Vite bundles, not only `.ts`, and parses with TypeScript's own parser, loaded lazily so the helpers barrel stays light. `allowJs` was added to `tsconfig.json` so the spec imports `LAYER_IMPORTS` from `eslint/matrix.js` without a shadow declaration file. The game config does not exist yet, so the physics rule is mounted with an `absentUntilCreated` allowance that becomes a violation the moment `src/app/game-config.ts` appears; the change that creates it flips the flag.*

**Build:** `vitest.config.ts` with one project per tier, named so `pnpm test --project simulation` works: `unit`, `simulation`, `content`, and `architecture` on the Node environment, `presentation` on jsdom. Every project aliases `phaser` to `tests/helpers/doubles/phaser-stub.ts`, so no spec mocks a module. The eight path aliases, a slow-test threshold of 50 ms, coverage floors on `src/domain` and `src/simulation` applied only under `check:ci`, and no retries. A coverage key that matches no file reports 100% and passes forever, so each key is checked against a file it is known to match. `tests/architecture.spec.ts` mounts one `describe` per rule from `tests/helpers/architecture/`; each rule file exports a collect function that returns violations with messages and a describe function that asserts one test per file, so a failure names the file. The layer rule imports `LAYER_IMPORTS` from the lint matrix and walks `src/` with a real import parser. The rules assert: no import crosses a layer the table forbids, including re-exports and dynamic imports; no `.spec.ts` under `src/`; the game config object under `src/app/` has no `physics` key (asserted by importing the config in Node with Phaser stubbed to a plain object). The `tests/helpers/` layout from the testing standard, with `index.ts`, the `architecture/` rules, `doubles/phaser-stub.ts`, `factories/define-factory.ts`, and an empty `makeWorld` signature under `world/` to be filled in sprint 01. `tests/docs-links.spec.ts` walks every Markdown file under `docs/`, the repository root, `.claude/agents/`, `.claude/rules/`, `.claude/plan/`, and `.claude/skills/*/SKILL.md`, skips fenced code blocks, and asserts that every relative link resolves to a file and every `#anchor` to a heading in the target file. It runs in the architecture tier, so a dead pointer fails `pnpm check`.

**Acceptance:**
- `pnpm test` runs the six tiers' folders even when empty.
- A link to a renamed page, or to a heading that no longer exists, fails `pnpm test` with the file, the line, and the target named. The documentation is green on the day the spec lands.
- A barrel re-export from `src/domain/public.ts` of something under `src/presentation/` fails the architecture test. The same re-export where lint cannot see it — under a disable directive, or in a `.mts` file the lint globs never match — passes lint and fails the architecture test, proving the second net catches what the first misses.
- `pnpm check:ci` reports coverage and fails below the floor; `pnpm check` does not report coverage.

**Tests:**
- `tests/architecture.spec.ts` — the three assertions above.
- `tests/docs-links.spec.ts` — every relative link and anchor in the documentation resolves.

**Definition of done:** Every change.

---

### P0-S00-T05 — Hooks, CI, and documentation reconciliation

| Field | Value |
| --- | --- |
| Layer | tooling, docs |
| Size | 0.5 |
| Depends on | T03, T04 |
| Status | planned |

**Build:** A commit hook that runs lint and typecheck on staged files. A CI workflow that runs `pnpm check:ci` on every push and pull request with Node from `.nvmrc`. Then three documentation fixes so the first definition file is written against one shape:
- `docs/workflows/adding-a-spell.md`: the example definition uses seconds (`cast_point_seconds`, `cooldown_seconds`, `mana_cost`) not tick counts, snake_case ids and keys (`frost_lance`, `frost_lance_hit`), and the `as const satisfies SpellDef` shape from the content standard.
- `docs/adr/0005-content-references-by-string-key.md`: the example id and key become snake_case.
- `docs/workflows/adding-an-enemy.md`: `attackPointTicks` and `baseAttackTicks` become seconds; the behaviour and ability keys stay snake_case.

**Acceptance:**
- A commit with a lint error is refused by the hook.
- CI runs green on the sprint's final commit.
- The three pages agree with `docs/standards/content-authoring.md` and `docs/standards/coding.md`.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| `pnpm check` green on empty layers | Green on 2026-09-20: lint, typecheck, build, then 154 tests over five projects in under a second; `check:ci` green with the coverage report and both floors |
| Lint rule branch checks recorded, one row per rule | 92 cases, all as expected, in the table below (2026-09-20) |
| Architecture test catches a barrel re-export | Yes (2026-09-20). `export type { ViewSync } from "@presentation/public"` in `src/domain/public.ts` fails `src/domain/public.ts imports only the layers its row allows` and names the line. The same line under an `eslint-disable-next-line`, and in `src/domain/leak.mts`, passes `pnpm lint` and fails the same test. A dead link and a dead anchor planted in `docs/README.md` fail with file, line, and target named. A spec planted under `src/domain/` fails naming the file. Untested code planted in `src/domain/` fails `check:ci` at the 90% floor; `check` prints no coverage |
| CI green | |
| Actual days per ticket | T00 1 · T01 0.25 · T02 0.25 · T03 0.5 · T04 0.5 · T05 |

### Lint rule checks

Each row is a one-line violation planted by the probe in `eslint/README.md`, linted, and removed. "Fails" means the named rule reported the line; "passes" means nothing did.

| Rule | Violation planted | Result |
| --- | --- | --- |
| Layer allow-list, alias spelling | One forbidden import from each of shared, domain, simulation, content, instrumentation, presentation, devtools | Fails, 14 cases; allowed pairs pass, 12 cases |
| Layer allow-list, relative spelling | `../domain/public` from shared; `../domain/entities/unit` from content; `../simulation/public` from presentation | Fails, fails, passes |
| Public doors | `@simulation/world` from presentation and devtools; `@domain/entities/unit` from presentation and content; the same from app | Fails ×4; app passes |
| Content imports domain types only | Value import of `@domain/public`; `import type` of it | Fails; passes |
| `Math.random`, `Date.now`, `new Date()`, `performance.now`, `globalThis.performance.now` under domain and simulation | One each in domain; two in simulation; `performance.now` in presentation | Fails ×7; presentation passes |
| DOM globals under domain and simulation | `window.innerWidth`, `document.title` in domain | Fails ×2 |
| `phaser` outside presentation | In domain, devtools, and a `phaser/` subpath in shared; in presentation and app | Fails ×3; passes ×2 |
| Shape and Graphics factories under `src/**` | `add.circle`, `add.graphics` in presentation, `add.rectangle` in app; `add.bitmapText` | Fails ×3; passes |
| `add.text` outside `boot.scene.ts` | In presentation and in another scene file; in `boot.scene.ts` | Fails ×2; passes |
| Cast away from the `Readonly` world view | `as World` in presentation, `as Mutable<…>` in devtools; `as World` in simulation | Fails ×2; passes |
| No explicit `any`, no non-null assertion | One each in domain | Fails ×2 |
| No optional property | `{ a?: number }` and an interface member | Fails ×2 |
| Named exports, static imports | `export default`, `import()`, `import.meta.glob` in shared | Fails ×3 |
| `import type` is the one spelling | A type through a value import; the inline `{ type T }` form | Fails ×2 |
| Import order | Relative before aliased; a blank line between groups; two aliases out of order | Fails ×3 |
| `no-console` | `console.log` in domain and app, `console.warn` in presentation; `console.warn` in app, `console.error` in devtools | Fails ×3; passes ×2 |
| Braced control flow | An unbraced `if` | Fails |
| File names kebab-case | `ProbeNine.ts`, `probe_ten.ts`; `probe-eleven.def.ts` | Fails ×2; passes |
| Tests: `.only` | `it.only`, `describe.concurrent.only` | Fails ×2 |
| Tests: `.skip` needs a same-line comment | Without; with | Fails; passes |
| Tests: no `as any`, no `as unknown as` | One each | Fails ×2 |
| Tests: no `vi.mock`, no fake timers | `vi.mock("phaser")`, `vi.useFakeTimers()` | Fails ×2 |
| Tests: no `setTimeout`, no `new Date()` without an argument | One each; `new Date("2026-01-01")` | Fails ×2; passes |
| Tests: helpers through the barrel only | Deep import from `tests/` and from `tests/domain/`; the barrel from both; a sibling inside `tests/helpers/`; a dynamic import | Fails ×2; passes ×4 |
| `pnpm lint:fix` applies Prettier | The tree as written with single quotes and 100 columns | 235 formatting findings fixed, then zero |

## Risks in this sprint

- The `Readonly` cast ban and the no-optional-property rule need `no-restricted-syntax` selectors that take trial and error. If T03 runs over, the cast ban may move to sprint 01 with a note; the optional-property rule may not.
- Phaser 4.2.1's type surface for the stubbed config import in the architecture test may need a small shim. Budget for it in T04.
