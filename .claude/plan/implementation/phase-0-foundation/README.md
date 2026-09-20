# Phase 0 — Foundation

**Sprints:** 00–01 · **Sized days:** 8 · **Gate:** [Phase 0 gate](../04-phase-exit-gates.md#phase-0-gate)

## Goal

A repository where the architecture is enforced by tools before the first rule is written, and a world that ticks in Node with pools, ids, a command buffer, an event ring, and an input log, driven by a fixed-step driver that owns the only clock.

## Why it is its own phase

The roadmap's phase 1 assumes `pnpm check` exists. It does not. Eight days of toolchain and skeleton hidden inside phase 1 would make phase 1 look late on day one and would tempt the engineer to write the movement system before the lint that keeps Phaser out of it.

## Cut-line

**In:** package, TypeScript strict with aliases, Vite with the DevApi strip, ESLint with every rule the docs name, Prettier, Vitest tiers, the architecture test, git hooks, CI, the eight layer folders with their `public.ts` doors, shared helpers, the pool primitive and the four entity pools, the world with run and map scope, the seeded random source, the command buffer with ordering, the event ring with its overwrite counter, `tick`, input log recording, the instrumentation rings, the fixed-step driver, the game config, and a `BootScene` that checks the renderer.

**Out:** anything that moves. No movement system, no order machine, no atlas, no HUD, no panel. The blank canvas is the deliverable.

## What the engineer can do at the end

Run `pnpm dev` and see a blank canvas with the WebGL banner in the console. Run `pnpm check` and see green. Add a Phaser import to `src/domain/` and watch it fail twice. Create a world in a test, submit a command, tick, and read it back from the input log.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [00](./sprint-00-repository-and-toolchain.md) | Repository and toolchain | 4 |
| [01](./sprint-01-simulation-skeleton-and-instrumentation.md) | Simulation skeleton and instrumentation | 4 |

## Exit record

Filled in when the phase closes.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| Sized versus actual | | |
| Largest miss | | |
