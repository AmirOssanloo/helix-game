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
| Gate rows | | |
| Bench numbers (fps, render ms, draw calls, heap) | | |
| Stress test mean tick | | |
| Sized versus actual | | |
| Largest miss | | |
