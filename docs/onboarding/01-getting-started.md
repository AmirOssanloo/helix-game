# Getting started

> **Entry point:** [Onboarding](./README.md)

**Purpose:** clone, install, get the game running on your machine, and confirm the checks pass. This is the first-time path and the reference you come back to.

---

## What you get

One process. No database, no containers, no credentials.

| Process           | Address                 | Needs   |
| ----------------- | ----------------------- | ------- |
| Vite dev server   | `http://localhost:5173` | Nothing |

The dev server serves the game with hot reload. The simulation, the renderer, and the developer panel all run inside the browser tab. There is no backend, and nothing is persisted between sessions.

---

## What you need first

| Tool              | Version                                                        | Needed for |
| ----------------- | -------------------------------------------------------------- | ---------- |
| Node              | The LTS pinned in `.nvmrc` and in `packageManager` of `package.json` | Everything |
| pnpm              | `corepack enable` picks the pinned version                     | Everything |
| A desktop browser | Latest Chrome, Firefox, Safari, or Edge                        | Running the game. Chrome's performance panel is the profiler |

That is the whole list. If `nvm` is on your machine, `nvm use` reads `.nvmrc`.

---

## Install

```bash
corepack enable
pnpm install
```

`pnpm install` also installs the git hooks that run lint and typecheck on commit. There is no setup script, no generated configuration, and nothing to fill in.

---

## Run

```bash
pnpm dev
```

Open the address Vite prints. You should see:

- The arena: a grey-walled square with a handful of grey rectangular obstacles and one narrow corridor.
- The hero at the centre: a white circle with a triangle pointing the way it faces.
- The HUD along the bottom: health and mana bars, three empty orb sockets, six ability squares labelled Q W E R D F, and a level with an experience bar.
- The developer panel beside the canvas, in plain HTML, with the hero, tuning, enemies, simulation, overlay, and readout groups.

Right-click the ground and the hero turns, then walks. Press Q, W, E and orb instances appear around the hero. Press R and slot D fills. If all of that happens, your machine is set up.

---

## Verify

```bash
pnpm check
```

`pnpm check` is the gate: lint, typecheck, every test tier, and a production build. Green means the layers compile, no import runs the wrong way, and the simulation is deterministic on your machine.

Then look at the browser console. The Phaser banner names the renderer:

```text
Phaser v4.2.1 (WebGL | Web Audio)
```

**It must say WebGL.** If it says Canvas, the machine is unsupported: the Canvas renderer boots so the page is not blank, and a warning banner appears over the arena, but nothing is tested against it and the frame budget will not hold. Use a machine with WebGL, or a browser that has not disabled it.

---

## Editor setup

- **ESLint and Prettier on save.** The repository ships `eslint.config.js` and a Prettier config; point your editor at them. Lint carries the layer import allow-list, so a wrong-direction import shows as a red squiggle before you run anything.
- **TypeScript strict.** The `tsconfig.json` is strict with path aliases `@shared`, `@domain`, `@simulation`, `@content`, `@instrumentation`, `@presentation`, `@devtools`, `@app`. Use the aliases; relative paths that climb out of a layer are a lint failure.
- **Vitest.** The Vitest extension, if your editor has one, runs a single spec from the gutter.

---

## Where things are

| You want                                        | Look in                                  |
| ----------------------------------------------- | ---------------------------------------- |
| The rules: orders, orbs, Invoke, movement, combat, AI | `src/domain/`                       |
| The world, the tick, the system order, replays  | `src/simulation/`                        |
| Every spell, enemy, status, map, and tunable    | `src/content/`                           |
| Anything that draws, or reads the keyboard and mouse | `src/presentation/`                 |
| The developer panel                             | `src/devtools/`                          |
| Timing samples                                  | `src/instrumentation/`                   |
| The Phaser config and the fixed-step driver     | `src/app/`                               |
| Pure helpers with no game knowledge             | `src/shared/`                            |
| Every test                                      | `tests/`, mirroring `src/`               |
| The render benchmark scene                      | `bench/`                                 |
| How it all fits, and the rules code follows     | `docs/`                                  |

The layer each folder belongs to, and what it may import, is in [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md).

---

## When it doesn't work

| Symptom                                         | Cause                                      | Fix                                                                 |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm install` refuses the Node version         | Wrong Node                                 | `nvm use`, or install the version in `.nvmrc`                       |
| `pnpm` is not found                             | Corepack is off                            | `corepack enable`                                                   |
| The page is blank                               | The dev server is not running, or the wrong address | Check the terminal for the address Vite printed            |
| A warning banner reads "Canvas renderer"        | WebGL is unavailable in this browser       | Enable hardware acceleration, or use another machine                |
| The hero does not move when you click           | Left click selects; right click moves      | Right-click the ground                                              |
| Holding Q adds one orb, not three               | Q, W, E are edge-triggered                 | By design. Press three times                                        |
| `pnpm check` fails in `tests/architecture.spec.ts` | A file imports across a layer boundary  | Read the failure; it names the file and the layer it may not import |

---

## Next

- [Tech stack](./02-tech-stack.md) — what you just installed, and why
- [Running and debugging](./03-running-and-debugging.md) — the developer panel, overlays, replays, and the benchmark

---

## Related documentation

- [Development workflow](../workflows/development.md) — the commands you'll use daily
- [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) — what each `src/` folder is for
- [Controls and orders](../product/features/controls-and-orders.md) — why right click moves and left click does not
- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the control model you just tried
