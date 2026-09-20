# Toolchain shape

**Written:** 2026-09-20 · **For:** P0-S00-T01, P0-S00-T03, P0-S00-T04 · **Source:** a read of the maintainer's shared lint, TypeScript, and testing packages from another repository

What the sprint 00 toolchain takes from those presets, what it changes, and what it leaves out. The presets were written for a monorepo of Node services and React clients; Helix is one Vite package with eight layers, so the shape carries over and most of the contents do not. The documentation under `docs/` wins wherever this note and a page disagree.

---

## The layout to copy

The presets keep one restriction per file, one lint block per layer, and one matrix that every block derives its import ban from. That layout is the reason `docs/architecture/layers-and-dependency-rule.md` can be enforced twice — by lint and by the architecture test — from one table. Adopt it as is:

```text
eslint.config.js        # Composes the blocks below and fixes their order. Nothing else decides order
eslint/
├── rules/              # One restriction per file: a selector or import pattern, a message, no file glob, no rule id
├── layers/             # One block per layer folder under src/: files, and the rules it repeats
├── matrix.js           # LAYER_IMPORTS: the allow-list table, one row per layer; forbiddenFor(layer) derives the ban
└── tests.js            # The blocks that cover tests/
```

Three behaviours from the presets' own notes carry over unchanged and belong in a comment at the top of `eslint.config.js`:

- **Last block wins, and it replaces.** A narrower block repeats every entry it wants to keep from a wider one. Leaving one out is silent.
- **Import patterns follow gitignore rules.** `**/domain/**` with a `!**/domain/public` negation works; `**/domain` does not. `*` matches `..`.
- **A pattern that matches nothing looks like a rule that works.** Every rule is proven by a one-line violation on a branch, which is T03's acceptance already.

`tests/architecture.spec.ts` imports `LAYER_IMPORTS` from `eslint/matrix.js` and walks `src/` against it, instead of parsing the lint config. The matrix is the one owner; the docs table is the copy that lint messages cite.

Every message says what to do instead and names the docs page that decided it. That is the whole user interface of a rule.

---

## Rules to carry over, adapted

| From the presets | Here |
| --- | --- |
| Layer matrix over `domain`, `application`, `infrastructure`, `api`, `workers`, `container` | The eight rows of the layers page: `shared`, `domain`, `simulation`, `content`, `instrumentation`, `presentation`, `devtools`, `app`. `app` allows everything, so it gets a row and no block |
| The domain facade pattern (`**/domain/**` with `!**/domain/public`) | The same, for `domain/public` and `simulation/public`, applied to `presentation`, `devtools`, and `content`. `app` is exempt: it is the composition root |
| `FRAMEWORK_IMPORT_BAN`, a list of packages the inner layers may not import | One package: `phaser`, banned everywhere but `src/presentation/**`. Also `@phaser/*` if a scoped package appears |
| `NO_AMBIENT_TIME_IN_SRC`: selectors for `new Date()`, `Date.now()`, `randomUUID` | Selectors for `Date.now()`, `new Date()` with no argument, `performance.now()`, and `Math.random()`, under `src/domain/**` and `src/simulation/**`. A selector is preferred over `no-restricted-globals` because `Date.now` is a member expression, not a global, and the message can name the seeded random source and the tick counter |
| `NO_OPTIONAL_DOMAIN_PROPS` (`TSPropertySignature[optional=true]`), domain only | Everywhere under `src/`. The coding standard bans optional properties in every layer |
| `NO_DEFAULT_EXPORT` | Everywhere under `src/`. Named exports only, and the file name matches the export |
| `NO_DYNAMIC_IMPORT`, `NO_IMPORT_META_GLOB` | Everywhere under `src/`. The architecture test catches a dynamic import too; lint reports it first. Dropped under `tests/` |
| `NO_FOCUSED_TEST` (three selectors for `.only`) | As is, under `tests/**` |
| `NO_AMBIENT_TIME` in tests (`setTimeout`, `new Date()`, `vi.useFakeTimers`) | As is, under `tests/**`. Time in a simulation test is `tick`, and the testing standard already says no fake timers and no sleep |
| `NO_TYPE_CAST_DOUBLE` (`as any`, `as unknown as`) | As is, under `tests/**`. A double is built from the port's type through a `tests/helpers/` factory |
| `NO_MODULE_MOCKING` (`vi.mock`) | As is, under `tests/**`, with no carve-out folder. Phaser is stubbed by a Vitest alias, not a mock; see the testing section |
| `NO_DEEP_HELPER_IMPORT`: `tests/helpers/index.ts` is the one import path | As is |
| `skip-needs-ticket`, a rule implementation reading a same-line comment | Adapted to `skip-needs-reason`: the same-line comment must exist; review checks it names an owner and a condition, never a ticket |
| `@typescript-eslint/consistent-type-imports` with `prefer: 'type-imports'` | As is. It is what makes "content imports domain types only" checkable: the content block's `no-restricted-imports` pattern for `@domain/**` sets `allowTypeImports: true` |
| `explicit-module-boundary-types`, `no-non-null-assertion`, `no-explicit-any`, `curly: all` | As is, all at error. `no-explicit-any` moves from warn to error; the coding standard says no `any` |
| `prettier/prettier` as a lint rule; Prettier defaults | As is. One `.prettierrc` with defaults so editors find it |
| `perfectionist/sort-imports` | As is. The exact shape is in the import order section below |
| `eslint --max-warnings 0` | As is. Every rule is then `error`; a `warn` severity means nothing under it |
| The probe script that writes a throwaway file per layer and prints what was blocked | Kept as the procedure for T03's acceptance and for the sprint exit table. It lives in `eslint/README.md`, not in `package.json` |

---

## Left out

- **Everything React, vanilla-extract, and CSS.** No stylesheet is written by hand; the developer panel is plain HTML with a tiny stylesheet, and its property order is not worth a rule.
- **`eslint-plugin-import`.** The presets switch off most of it and keep `import/first`. Perfectionist covers order and a plain `no-restricted-syntax` covers dynamic imports. One plugin fewer.
- **`eslint-plugin-promise`.** The simulation has no promises; the loader in `presentation/` has a few. Nothing here warrants four warnings that `--max-warnings 0` would turn into errors anyway.
- **Use-case coupling, container, repository, and Awilix rules.** No container, no use cases. Wiring is `src/app/`, and it is allowed everything.
- **The `.js` import extension.** The presets' Node presets resolve with `nodenext` and require the suffix. Helix resolves with `bundler` under Vite and writes no suffix. See the TypeScript section.
- **`no-console` at warn.** It is an error under `src/**`, with `warn` and `error` allowed under `src/app/**` and `src/devtools/**`. Nothing under `domain/`, `simulation/`, or `presentation/` logs; it emits an event or a sample.

---

## TypeScript

Start from the presets' `base.json` and the shape of their `react.json`, without JSX:

| Setting | Value | Why |
| --- | --- | --- |
| `strict`, `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames`, `skipLibCheck` | as the presets | Same reasons |
| `exactOptionalPropertyTypes` | `true` | Not in the presets. T01 asks for it and the no-optional-property rule leans on it |
| `target`, `module` | `ESNext` | Vite bundles; the browser target is set in Vite, not here |
| `moduleResolution` | `bundler` | Vite. No `.js` suffix on imports |
| `verbatimModuleSyntax` | `true` | The presets set it false for React. Here it makes `import type` load-bearing, which is what keeps content's view of the domain type-only |
| `isolatedModules` | `true` | esbuild transpiles one file at a time |
| `lib` | `ESNext`, `DOM`, `DOM.Iterable` | The presentation and devtools layers need the DOM types; the domain never uses them, and lint, not the compiler, keeps it that way |
| `noEmit` | `true` | Vite emits |
| `types` | `[]` in the root config; Vitest's globals off | Specs import from `vitest` explicitly |
| `paths` | the eight aliases | As T01 lists them |
| `sourceMap`, `incremental` | as the presets | |
| `outDir`, `rootDir` | not set | One package; nothing extends this file |

No `composite`, no `declaration`: nothing consumes the package.

---

## Import order

The presets' sort configuration, with the aliased layers in place of the internal packages. No blank line between groups, alphabetical inside each, case ignored. Lint fixes it, so nobody arranges imports by hand.

```javascript
'perfectionist/sort-imports': [
  'error',
  {
    type: 'alphabetical',
    order: 'asc',
    ignoreCase: true,
    newlinesBetween: 0,
    groups: ['builtin', 'external', 'layers', ['parent', 'sibling', 'index'], 'style'],
    customGroups: [
      {
        groupName: 'layers',
        elementNamePattern: '^@(shared|domain|simulation|content|instrumentation|presentation|devtools|app)/',
      },
    ],
  },
],
```

`style` stays last for the one stylesheet the developer panel loads. Type imports are not a separate group; `consistent-type-imports` decides the keyword, and the sort treats `import type { Foo }` like any other import of its module.

---

## Test helpers

The testing package's design rule is that everything test-shaped lives in one place with one shape, and nothing test-shaped ever sits under `src/`. In a monorepo that place is a package with a subpath per kind; in one package it is `tests/helpers/` with a folder per kind and one barrel, which is the layout the testing standard now describes. What carries over:

| From the testing package | Here |
| --- | --- |
| A subpath per kind, no root barrel, so a spec pulls in only what it needs | One barrel at `tests/helpers/index.ts`, because nothing here is heavy. The folders keep the kinds apart: `world/`, `content/`, `factories/`, `doubles/`, `assertions/`, `architecture/` |
| `defineFactory`: counter-backed defaults, `build`, `buildMany`, `sequence`, `reset` | As is, under `factories/`. Every `makeFooDef` is written with it, so the third definition in a test has the same id every run |
| `describePort` and `stubPort`: a compile-time-exhaustive method list and a strict double that throws on an unstubbed call | Kept under `doubles/` for the few ports the presentation layer has: the input source and the view sink. The simulation has no ports; a test hands it a world |
| `fixedClock` and `sequenceIds` | Not needed. Time is `tick` and ids come from the seeded world; `makeWorld({ seed })` is the fixed clock |
| `expectRight` and `expectLeft` for an `Either` | `expectAccepted` and `expectRefused(result, reason)` for a command result, under `assertions/`. A refusal is a value with a reason, and the assertion prints the reason it got instead of `expected false to be true` |
| `describeLayerLayout`, `describeDomainPurity`: each rule exports a collect function and a describe function, one test per file, messages that name the page | The same shape under `architecture/`, one file per rule: the layer table from the lint matrix, the determinism bans, no spec under `src/`, no `physics` key, every docs link resolves. `tests/architecture.spec.ts` and `tests/docs-links.spec.ts` mount them |
| An allow-list whose entries must still match, so an exemption cannot outlive its reason | As is, for the architecture rules. There are no exemptions on day one, and the mechanism is what keeps that true |
| `defineServiceTestConfig`: named projects, one pool each, a slow-test threshold, coverage floors per directory with the stacking hazard | One `vitest.config.ts` with five named projects, one per tier: `unit`, `simulation`, `content`, `architecture` on Node, `presentation` on jsdom. Threshold 50 ms. Floors on `src/domain/**` and `src/simulation/**` under `check:ci` only. A key that matches nothing passes forever, so each key is checked against a file it is known to match |
| Module stubs through the runner, not `vi.mock` | Every project aliases `phaser` to `tests/helpers/doubles/phaser-stub.ts`. The stub exports the names the presentation layer imports as plain objects and classes with no behaviour. The architecture rule that imports the game config, and the presentation tier, both run against it |
| Database, queue, HTTP, auth, tenant isolation | Not needed. One process, no backend |

---

## Decided

Q13 to Q16 in [Open questions](../backlog/open-questions.md) are answered, and the sections above and tickets T03 and T04 are written against the answers.
