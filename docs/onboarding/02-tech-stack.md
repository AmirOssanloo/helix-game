# Tech stack

> **Entry point:** [Onboarding](./README.md)

**Purpose:** know what's in the box, and why each piece is there. One line on what; a paragraph on why only where the why isn't obvious. The decision records hold the full argument.

---

## Language

**TypeScript, strict mode, ES modules.**

Strict matters more here than in most projects: entity ids are generational numbers, absence is `Type | null` rather than an optional property, and every per-tick system takes a typed world. The compiler is the first line of the layer boundary — a Phaser type reaching the domain is a type error before it is a lint error.

---

## Engine

**Phaser 4.2.1, built-in WebGL renderer, used under `src/presentation/` and imported under `src/app/` only to construct the game.**

Phaser draws and reads input. It does not simulate anything. The `physics` key is absent from the game config, so no Arcade or Matter world exists; positions, velocities, facings, and radii live in the domain, and a sprite is written every frame and never read back. [ADR 0002](../adr/0002-custom-fixed-step-simulation.md) says why.

The renderer is configured with `type: Phaser.AUTO` and `render: { maxTextures: 1 }`. `AUTO` falls back to Canvas on a machine without WebGL so the page is not blank, but Canvas is unsupported and untested; the boot scene shows a warning banner when it happens. [ADR 0001](../adr/0001-phaser-renderer-and-quad-atlas.md) says why Phaser's own renderer and not another engine.

---

## Build

**Vite.** The dev server with hot reload, and the production build.

One Vite `define` matters: it strips `DevApi` and the developer panel from production builds. In development, `window.DevApi` exists and the panel is mounted; in production neither is in the bundle. Content definitions under `src/content/` hot-reload, so retuning a spell does not restart the world.

**pnpm**, pinned through `packageManager` in `package.json` and picked up by Corepack. One package, one `package.json`, no workspace.

---

## Tests

**Vitest.** The Node environment for everything under `src/domain/`, `src/simulation/`, and `src/content/` — no canvas, no DOM, no Phaser. That is not a convenience; it is the proof that the simulation has no hidden dependency on the screen. Only presentation adapter tests use jsdom, and there are few of them.

Three test files are unusual enough to mention: `tests/architecture.spec.ts` asserts the layer import table a second time, the replay determinism test replays a recorded input log and asserts identical state, and the stress test ticks 300 units and asserts the mean tick under 4 ms. All three run in `pnpm test`.

---

## Lint and format

**ESLint, flat config, and Prettier with defaults.**

Lint carries three rules that hold the architecture up:

- The layer import allow-list from [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md). A wrong-direction import fails the build.
- The determinism bans: `Math.random`, `Date.now`, and `performance.now` are errors under `src/domain/` and `src/simulation/`.
- The presentation bans: `this.add.graphics`, `this.add.circle`, `this.add.rectangle`, and the other Shape factories are errors everywhere, because every visible thing is a tinted quad from the atlas.

Prettier runs on save and in the commit hook. Nobody argues about formatting in review.

---

## Art

**A shape atlas generated at boot. No image files on disk.**

`ShapeAtlas` draws every frame — discs, rings, squares, a pixel, spell cones, cooldown wedges, status icons, and the glyphs of a bitmap font — onto one canvas with the Canvas 2D API, registers it as one Phaser texture, and names each region. Every frame is white; colour is a runtime tint. The developer panel can download the generated PNG so you can see what was baked. When real art arrives, the atlas comes from disk with the same frame names and the game code does not change.

---

## What isn't there

- **No database, no server, no network.** The game is a single browser tab.
- **No persistence.** Reloading the page starts a fresh run. The developer panel may remember its own settings in `localStorage`, and that is the only thing that survives a reload.
- **No audio.**
- **No physics library, no collision library, no pathfinding library.** The simulation is plain TypeScript: turn-then-move locomotion, disc push-out, a spatial hash, grid A*. [ADR 0002](../adr/0002-custom-fixed-step-simulation.md) has the cost table.

---

## Profiling

**The browser's performance panel is the profiler.** Chrome's is the reference. Record 30 seconds, read frame time, scripting time, and heap. Draw calls come from the readouts in the developer panel, which counts calls to the renderer's two public draw methods between its pre-render and post-render events; Phaser keeps no counter of its own.

Nothing else is installed for this. The instrumentation layer keeps preallocated rings of tick and render samples and the panel shows them live, so most questions are answered without opening the profiler at all.

---

## Related documentation

- [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) — where each of these pieces is allowed to appear
- [ADR 0001 — Phaser renderer and quad atlas](../adr/0001-phaser-renderer-and-quad-atlas.md) — why Phaser draws, and why everything is a quad
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why there is no physics engine
- [ADR 0003 — Layered single-package architecture](../adr/0003-layered-single-package-architecture.md) — why one package and eight folders
- [Running and debugging](./03-running-and-debugging.md) — using the panel and the profiler
