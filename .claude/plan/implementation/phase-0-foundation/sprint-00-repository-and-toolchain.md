# Sprint 00 — Repository and toolchain

**Phase:** 0 · **Sized days:** 4 · **Buffer:** 1

## Goal

Every rule the documentation says a tool enforces is enforced, on an empty `src/`, before any game code exists.

## Playable outcome

Nothing plays. `pnpm check` is green on eight empty layers, and a deliberate violation of each enforced rule fails the build.

---

## Tickets

### P0-S00-T01 — Package, TypeScript, and path aliases

| Field | Value |
| --- | --- |
| Layer | tooling |
| Size | 1 |
| Depends on | none |
| Status | planned |

**Build:** Root `package.json` with `packageManager` pinned to a pnpm version and `.nvmrc` pinned to the current Node LTS. Scripts exactly as `docs/workflows/development.md` lists them: `check`, `check:ci`, `test`, `test:watch`, `lint`, `lint:fix`, `typecheck`, `dev`, `build`, `bench`. `tsconfig.json` strict, ES modules, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, with the eight aliases `@shared`, `@domain`, `@simulation`, `@content`, `@instrumentation`, `@presentation`, `@devtools`, `@app` pointing at `src/<layer>`. The build compiles `src/` and excludes `tests/` and `bench/`. Phaser 4.2.1 pinned exactly. The eight layer folders exist, each with a `public.ts` that exports one named type so the folder is not empty.

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
| Status | planned |

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
| Status | planned |

**Build:** `eslint.config.js` carrying, as named blocks so the architecture test can read them:
- The layer allow-list from `docs/architecture/layers-and-dependency-rule.md`, as `no-restricted-imports` per layer folder. `content` may import from `domain` with `import type` only.
- Restricted globals `Math.random`, `Date.now`, `performance.now` under `src/domain/**` and `src/simulation/**`.
- A ban on `phaser` imports anywhere but `src/presentation/**`.
- A ban on the Shape and Graphics factories (`add.graphics`, `add.circle`, `add.rectangle`, `add.line`, `add.polygon`, `add.ellipse`, `add.arc`, `add.star`, `add.triangle`, `add.curve`, `add.grid`, `add.isobox`, `add.isotriangle`) under `src/**`, and `add.text` outside `boot.scene.ts`.
- A ban on casting away from the `Readonly` world view outside `src/simulation/**`.
- `@typescript-eslint` rules: no explicit `any`, no non-null assertion, no optional properties on type members (via a restricted-syntax selector).
- Import order: external, aliased, relative, with a blank line between.
- File-name kebab-case rule.
Prettier with defaults. A `.prettierrc` exists so editors find it.

**Acceptance:**
- Each rule above fails on a one-line violation placed on a branch and passes when removed. Record the eleven checks in the sprint exit.
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
| Status | planned |

**Build:** `vitest.config.ts` with the Node environment as default and jsdom only for `tests/presentation/**`, the aliases, coverage floors on `src/domain` and `src/simulation` applied only under `check:ci`, and no retries. `tests/architecture.spec.ts` reads the allow-list block from the lint config and walks `src/` with a real import parser, asserting: no import crosses a layer the table forbids, including re-exports and dynamic imports; no `.spec.ts` under `src/`; the game config object under `src/app/` has no `physics` key (asserted by importing the config in Node with Phaser stubbed to a plain object). A `tests/helpers/` folder with an empty `makeWorld` signature to be filled in sprint 01.

**Acceptance:**
- `pnpm test` runs the six tiers' folders even when empty.
- A barrel re-export from `src/domain/public.ts` of something under `src/presentation/` fails the architecture test and passes lint, proving the second net catches what the first misses.
- `pnpm check:ci` reports coverage and fails below the floor; `pnpm check` does not report coverage.

**Tests:**
- `tests/architecture.spec.ts` — the three assertions above.

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
| `pnpm check` green on empty layers | |
| Eleven lint rule branch checks recorded | |
| Architecture test catches a barrel re-export | |
| CI green | |
| Actual days per ticket | T01 · T02 · T03 · T04 · T05 |

## Risks in this sprint

- The `Readonly` cast ban and the no-optional-property rule need `no-restricted-syntax` selectors that take trial and error. If T03 runs over, the cast ban may move to sprint 01 with a note; the optional-property rule may not.
- Phaser 4.2.1's type surface for the stubbed config import in the architecture test may need a small shim. Budget for it in T04.
