# Development workflow

> **Entry point:** [Workflows](./README.md)

**Purpose:** build, test, and lint the repository, and understand what runs when.

---

## What you'll use most

```bash
pnpm check          # The gate: lint, typecheck, every test tier, build. Never modifies a file
pnpm check:ci       # What CI runs: the same gate, with coverage floors checked
pnpm test           # Every test tier in Node — unit, simulation, content, architecture
pnpm test:budget    # The stress test alone, uninstrumented: the tick budget
pnpm test:watch     # The same, rerunning on save
pnpm lint           # ESLint; pnpm lint:fix applies the auto-fixes and Prettier
pnpm typecheck      # tsc --noEmit, strict
pnpm dev            # The Vite dev server with hot reload
pnpm build          # The production build, with the panel and DevApi stripped
pnpm build:playtest # The playtest build: the same game, with the panel left in
pnpm bench          # Serves the render benchmark scene under bench/
```

**`pnpm check` is the gate.** Run it before every push. It runs lint, typecheck, and build first, then the test tiers, and it never modifies a file; when it reports lint findings, `pnpm lint:fix` applies them, then run `check` again.

CI runs **`pnpm check:ci`**, which is the same gate with coverage floors on the domain and simulation layers. Locally `check` stays uninstrumented because coverage makes the tests slower and you do not need the number on every push. A green `check` locally means a green build.

**The stress test runs outside the coverage pass**, as `pnpm test:budget` after it. It asserts a wall-clock budget, and coverage instrumentation makes the same tick about three times slower, so measured through the profiler it measures the profiler. Every other tier is instrumented and holds its floors. The replay determinism test stays in the coverage pass — it asserts that two worlds agree, never how fast — and carries a timeout long enough to survive being instrumented.

Nothing needs to be up for any of this. No containers, no database. `pnpm test` runs entirely in Node.

---

## The tiers

| Tier         | Lives under                     | Environment | Runs in | Tests |
| ------------ | ------------------------------- | ----------- | ------- | ----- |
| Unit         | `tests/domain/`, `tests/shared/`, `tests/instrumentation/` | Node | `pnpm test` | One rule at a time: an orb eviction, a turn step, a damage formula, an A* result |
| Simulation   | `tests/simulation/`, `tests/app/` | Node      | `pnpm test` | A world ticked with commands: the acceptance tests from the mechanics spec, spell casts, enemy behaviour, the replay determinism test, the stress test; the fixed-step driver over a world with an injected clock |
| Content      | `tests/content/`                | Node        | `pnpm test` | Every definition validates; every effect and behaviour key resolves; every atlas frame a definition names exists |
| Architecture | `tests/architecture.spec.ts`, `tests/docs-links.spec.ts` | Node | `pnpm test` | The layer import table, asserted a second time; a wrong-direction import fails here and in lint. Every relative link and anchor in the documentation resolves |
| Presentation | `tests/presentation/`, `tests/devtools/` | jsdom  | `pnpm test` | Input mapping, view binding, and the panel, with Phaser stubbed. Few, and small |
| Benchmark    | `bench/`                        | A browser   | `pnpm bench`, by hand | Render time, draw calls, heap over 30 seconds. Never in `check` |

The benchmark is deliberately outside `pnpm check`: it needs a GPU and a human reading a performance panel, and it answers a different question — not "is the code right" but "does it still hold frame time on the reference laptop". Run it after touching the atlas, the views, or upgrading Phaser, and put the numbers in the change description.

---

## Running one thing

Flags after the script name reach Vitest as they are. Do not put a `--` before them: pnpm passes it through, and Vitest then reads everything after it as a file filter, so `-t` and `--project` would be ignored.

```bash
pnpm test -t "AT-M2"                     # One spec by name — here, the 180-degree turn test
pnpm test tests/simulation/spells/        # One folder
pnpm test --project simulation           # One tier: unit, simulation, content, architecture, or presentation
pnpm test -t "replay"                    # The determinism test
pnpm test -t "stress"                    # The stress tests: 200 chasing, 300 on random orders, the zones
pnpm test:watch tests/domain/invoke/     # Rerun a folder on save
```

The acceptance tests from the [mechanics spec](../product/specs/character-movement-and-mechanics.md) are named by their identifiers — `AT-M1` to `AT-I9` — so a failure in review can be pointed at by name.

---

## What the gate enforces

- **Lint** carries the layer import allow-list, the determinism bans (`Math.random`, `Date.now`, `performance.now` under `src/domain/` and `src/simulation/`), and the presentation bans (Phaser Shape and Graphics factories anywhere).
- **Typecheck** is strict. No optional properties, no non-null assertions; both are lint errors as well.
- **The architecture spec** reads the import table and walks `src/`. It fails on an import lint missed — a dynamic import, a re-export through a barrel.
- **The content tier** fails on an unresolved string key, so a typo in an effect name is caught before the world is created.
- **The replay determinism test** replays a recorded input log twice and asserts identical state. It fails the moment any system reads the clock or an unseeded random source.
- **The stress test** asserts the mean tick under 4 ms with 200 enemies chasing the hero and 100 projectiles in flight, and again with 300 units on random orders. It fails when a change makes a system too expensive.
- **The build** fails if `DevApi`, the developer panel, or the pane the panel is built from leaks into the production bundle — and the playtest build fails if the panel is missing from it, so neither build can quietly become the other.
- **The docs link test** fails on a relative link or anchor that does not resolve, so a renamed page or heading cannot leave a dead pointer behind.

---

## Publishing the playable build

A push to `main` builds the game and publishes it to GitHub Pages at **https://amirossanloo.github.io/helix-game/**, from `.github/workflows/pages.yml`. It publishes the **playtest build**: the game exactly as it ships — nothing runs a development path and an `assert` does not throw — with the developer panel beside it, so anyone with the link can spawn, tune, and read the instrumentation. `pnpm build` is still the production build and still has no trace of the panel.

The workflow runs `pnpm build:playtest` and nothing else; `ci.yml` runs the gate on the same push, in parallel. A red gate does not hold the deploy back, so a push that builds but fails a test still reaches the site — read CI, not the site, for whether a change is good.

**The panel on a public address is a deliberate call for this phase, not a permanent one.** Anyone with the link can spawn three hundred units, set every orb to seven, and retune the world. That is the point while the game is being shown to people who are meant to poke at it; when the game is played by people who are not, the workflow builds `pnpm build` instead and the playtest build goes back to being a thing you run locally. Nothing but the one line in the workflow has to change.

The build asks for its bundle beside itself rather than at the server root, which is what lets one build serve from the repository-name path a project page uses. Nothing in the page knows the repository name, so a rename or a custom domain needs no change here.

Two things are a person's, once:

- **Settings → Pages → Source** must be **GitHub Actions**. Until it is, the deploy job fails and the site stays empty.
- The first run creates the `github-pages` environment. Nothing to approve unless the repository adds a protection rule.

---

## Where the scripts live

Every command on this page is under `scripts` in the root `package.json`. That file, not this page, is the authority when a command here doesn't exist any more.

---

## While you work

- **Prettier runs on save** if your editor is set up, and in the commit hook regardless.
- **Content hot-reloads.** Editing a definition under `src/content/` swaps the registry in the running world without a page reload. Editing anything under `src/domain/` or `src/simulation/` reloads the page, because the world cannot be patched mid-tick.
- **The commit hook** runs `pnpm lint` and `pnpm typecheck` on staged files. It does not run tests; that is what `pnpm check` before a push is for.

---

## When something looks wrong

**A test passes alone and fails in the suite.** Something shares state between worlds — a module-level pool, a cached registry. Each test builds its own world.

**The replay test fails after a change that "didn't touch the simulation".** It did. Look for a system reading iteration order from a `Map` keyed by object, or a sort without a tie-break.

**Lint passes but the architecture spec fails.** A barrel re-export or a dynamic import crossed a layer. The failure names the file.

**`pnpm build` fails on `DevApi`.** Something under `src/presentation/` or `src/app/` imports `src/devtools/` outside the development-only branch.

---

## Related documentation

- [Getting started](../onboarding/01-getting-started.md) — what your machine needs first
- [Running and debugging](../onboarding/03-running-and-debugging.md) — the panel, replays, and the benchmark
- [Testing standards](../standards/testing.md) — what to test and at which tier
- [Definition of done](./definition-of-done.md) — the checklist a change passes before review
- [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) — the table lint and the architecture spec enforce
