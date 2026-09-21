# Phase 1 — Hero mechanics, camera, and the arena

**Sprints:** 02–06 · **Sized days:** 20 · **Gate:** [Phase 1 gate](../04-phase-exit-gates.md#phase-1-gate)

## Goal

Movement and the Skein kit feel exactly right before any spell does damage. Every acceptance test in the mechanics spec section 16 is green by name; every feel requirement in section 15 holds by hand.

## Why five sprints

ADR 0002 sizes the simulation core at eleven to twelve days. That covers sprints 02 and 03 and half of 04. The other half of the phase is what sits on top and is easy to forget: the hero's stats and forms, the kit registry, the cooldown pipeline, the input mapper, the first views and the camera, the HUD, the developer panel, the debug command union, replay, and the stress test. None of it is optional; the roadmap lists it all under phase 1.

## Cut-line

**In:** the order state machine, movement and turn rate, collision, pathing, the spatial hash, the arena, the hero and form definitions, stats and modifiers, orbs, Invoke, slots, cooldown clocks, a cast-point skeleton for the ten stub spells, the input mapper, views, camera, HUD, targeting cursor, the developer panel with every phase 1 control, replay, the stress test, the render benchmark, and hero death and respawn.

**Out:** effects of any kind. A stub spell spends mana, faces, runs a cast point, starts a clock, and emits an event that flashes a glyph. Nothing is damaged. No enemy exists except a generic unit the stress test spawns. No status exists; the disable flags are all false and the validator's disable branches are written but only reachable from a debug command that sets a flag directly for testing.

## Decisions taken here

- **Stub spells use their final ids from day one** (`hoarfrost`, `wane`, and so on) with placeholder effect lists. Ids never rename once shipped; giving stubs throwaway ids like `spell_qqq` would force a rename in phase 2 and invalidate every phase 1 replay. See [Open questions](../backlog/open-questions.md) Q8.
- **The channel needed by AT-O4** is entered through a `begin_channel` debug command until an ability channels. See Q2.

## What the engineer can do at the end

Right-click to walk, watch the hero turn first. Press Q W E and see orbs orbit. Press R and see D fill. Press D, see a range ring, click, watch the hero face the point and the wedge sweep. Spawn 300 generic units from the panel and read a tick time under 4 ms. Save the session, reload, load it, and watch the same thing happen.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [02](./sprint-02-locomotion-turn-rate-and-the-render-benchmark.md) | Locomotion, turn rate, and the render benchmark | 4 |
| [03](./sprint-03-collision-pathing-and-the-arena.md) | Collision, pathing, the spatial hash, and the arena | 4 |
| [04](./sprint-04-orbs-invoke-and-slots.md) | Hero definition, orbs, Invoke, slots, and cooldowns | 4 |
| [05](./sprint-05-hud-input-and-camera.md) | Input mapper, views, camera, and HUD | 4 |
| [06](./sprint-06-developer-panel-replay-and-phase-gate.md) | Developer panel, replay, stress test, and the phase gate | 4 |

## Exit record

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-21; the evidence per row is in the [sprint 06 gate walk](./sprint-06-developer-panel-replay-and-phase-gate.md#phase-1-gate-walk). Eight of nine rows hold. The ninth, the bar, holds in Chrome on the Apple M1 laptop and waits on the reference laptop in four browsers and the allocation sampler, each a row under "Waiting on a person" in `STATUS.md`. The phase closes when those hold | the engineer running the plan |
| Bench numbers (fps, render ms, draw calls, heap) | Sprint 02, Chrome on an Apple M1 laptop: 60 fps, 0.67 ms render (1.7 max), 1 draw call, heap flat, with `maxTextures` 1; 60 fps, 0.9 ms (1.3 max), 1 draw call, heap flat, with the default. Sprint 06, the same machine and browser after the overlays, 90 s as configured: 60 fps, 0.8 to 0.9 ms, 1 draw call, 1 texture, heap 59 to 60 MB flat. Safari and the reference laptop outstanding | the engineer running the plan |
| Stress test mean tick | 1.67 to 1.80 ms over 300 measured ticks in four of five runs on the Apple M1 laptop, 2.84 in the fifth, which held one 61 ms tick; the max otherwise 7.8 to 9.0 ms. The reference laptop's number outstanding | the engineer running the plan |
| Sized versus actual | Sized 21.1 days: 20 planned and 1.1 unplanned (P1-S02-T05 0.5, P1-S05-T04 0.5, P1-S05-T05 0.1). Actual 18.6: sprint 02 took 4.5 against 4.5, sprint 03 4 against 4, sprint 04 3.5 against 4, sprint 05 3.1 against 4.6, sprint 06 3.5 against 4. Ratio 0.88 | the engineer running the plan |
| Largest miss | No ticket went over its size. Five landed half a day under: P1-S04-T02, P1-S05-T01, P1-S05-T02, P1-S05-T03, and P1-S06-T02. The widest sprint gap is sprint 05, sized 4.6 and done in 3.1. A ratio of 0.88 after phase 0's 0.47 says the scale is about right once the toolchain is in; phase 2 keeps it | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 1 | 21.1 | 18.6 | 0.88 | Sprint 05: sized 4.6, actual 3.1 |
