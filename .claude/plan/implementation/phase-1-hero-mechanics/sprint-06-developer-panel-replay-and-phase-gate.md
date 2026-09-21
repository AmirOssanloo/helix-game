# Sprint 06 — Developer panel, replay, stress test, and the phase gate

**Phase:** 1 · **Sized days:** 4 · **Buffer:** 1

## Goal

The panel exists with every phase 1 control as a debug command, the session records and replays identically, 300 units hold the tick budget, and the phase 1 gate is walked and recorded.

## Playable outcome

Spawn 300 generic units, damage the hero, level up, set orb levels, move every slider, pause, step, save the log, reload, load it, and watch the same session replay. Kill the hero and watch it respawn.

---

## Tickets

### P1-S06-T01 — The debug command union, hero death and respawn, the channel stub

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1 |
| Depends on | P1-S04-T04 |
| Status | done |

**Build:** `DebugCommand` variants and their handling system: `apply_damage` (amount, type; mitigation is a pass-through until sprint 07), `drain_mana`, `heal`, `restore_mana`, `level_up`, `set_orb_levels`, `toggle_infinite_mana`, `toggle_no_cooldowns`, `kill_hero`, `spawn_units` (a generic unit definition, count, position, for the stress test), `clear_units`, `reset_map`, `begin_channel` (enters `channeling` for N ticks through the order state machine, not by writing the state field, so the abort path AT-O4 tests is the real one; the only way to channel until an ability does, and kept afterwards as the cheapest way to reach the state in a test), `set_disable_flag` (sets one flag on the hero for a duration so the validator's disable branches are testable before statuses exist). Pause, single-step, and the catch-up cap are driver operations exposed through `DevApi`, not commands: they never change world state, and a replay runs with no driver (Q12). Hero death: health at zero enters a death state that clears the order, closes nothing (the cursor is presentation), keeps clocks counting, ignores input; after a tunable delay the hero respawns at the spawn point with full resources, every clock cleared including the hidden map, orbs and slots kept. Every variant validated with a reason on refusal.

**Acceptance:**
- Each variant changes the world as its name says and is in the input log.
- `kill_hero` then the delay: the hero is at the spawn point with full health and mana, D and F unchanged, the orb buffer unchanged, no clock running.
- AT-O4: `begin_channel` then Q aborts the channel.
- `set_disable_flag('stun')` then a move: refused; then a `slot`: refused. Each disable against each blocked action from the status page, with flags set directly.

**Tests:**
- `tests/simulation/debug-commands.spec.ts` — one per variant.
- `tests/simulation/hero/death.spec.ts` — death state, respawn, clock clearing, orbs kept.
- `tests/simulation/at-orbs.spec.ts` — `AT-O4`.
- `tests/domain/orders/validator.spec.ts` — every disable against every blocked and unblocked action.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

> Built 2026-09-21. Two readings settled in the build: a generic unit carries no definition, since no enemy definition exists until phase 3, and wears the tuned hull; and `set_disable_flag` writes a row of the status table that a status system at the end of the tick expires and derives the flags from, so the flags are true from the end of the tick that consumes the command. Death is a `dead` order state with `die` and `respawn` transitions, resolved by a death system after collision; the respawn delay is the `respawn_delay` tunable. The replay determinism and stress rows of the definition of done wait on T03, which builds both tests.

---

### P1-S06-T02 — DevApi, the HTML panel, readouts, sliders, overlays

| Field | Value |
| --- | --- |
| Layer | devtools, presentation, instrumentation, tests |
| Size | 1.5 |
| Depends on | T01, P1-S05-T02 |
| Status | done |

**Build:** `window.DevApi` in development with `submit`, `view`, `rings`, `driver` (pause, step, catch-up cap, seed), `saveInputLog`, `loadInputLog`, `downloadAtlas`. The panel as plain DOM in the `<aside>`, importing nothing from Phaser: the Hero group with every control on the developer panel page that exists in phase 1; the Tuning group with one slider per tunable in the tuning table, its default beside it, each change a `set_tuning` command; the Simulation group (pause, step, catch-up cap, seed, save, load, reset map); a Units group with the generic spawn for now (the archetype dropdown arrives with archetypes); the Overlays group with toggles for collision discs, bound radii, facing and action cone, path lines, walkability grid, spatial hash cells with counts; the Readouts group computing mean and max over the last second from the rings for tick time, render time, frame rate, live counts, pool misses, event overwrites, and draw calls; the Atlas group with the download button. The draw-call ring (Q4): a module under `src/presentation/` wraps `drawElements` and `drawInstancedArrays` on the renderer instance at boot, both public Phaser 4 methods that every batch handler, the filter pass, and the GPU tile layer draw through; it resets the count on the renderer's pre-render event, attributes it per scene on the render event, and writes the frame total and the `PlayScene` share to the ring on post-render, so the world figure excludes the HUD. Under the Canvas renderer the readout shows a dash. Overlays drawn by `PlayScene` from a dedicated quad pool at depth 90 with `BitmapText` labels, binding no quads when off. Panel layout, overlay toggles, and last spawn settings in `localStorage`; nothing about the game.

**Acceptance:**
- Every control submits a command that appears in the log; no control touches world state directly (the import list proves it).
- The readouts update a few times per second and stop when the panel is closed while the rings keep sampling.
- Each overlay draws the right thing and binds nothing when off; draw calls do not rise when an overlay is on.
- The draw-call readout matches the browser's WebGL inspector on one frame of the bench scene, recorded in the exit.
- A production build contains no panel and no `DevApi`.

**Tests:**
- `tests/simulation/dev-api.spec.ts` — each panel operation becomes the right command and lands in the log.
- `tests/presentation/overlays.spec.ts` — a toggled-off overlay binds nothing.
- `tests/presentation/draw-call-counter.spec.ts` — with the Phaser stub, three draw method calls between pre-render and post-render write 3 to the ring, and a scene's share is attributed by the render event.

**Definition of done:** Every change · A developer-panel control · Anything under `src/presentation`.

> Built 2026-09-21. Three readings settled in the build. `loadInputLog` and the seed control's recreate are T03's, which owns the log format, the loader, and world recreation; T02 exposes `saveInputLog` over the live log through a serializer under `src/simulation/replay/` that T03 extends with the content version stamp, and shows the seed read-only. The overlay toggles are one object the composition root hands to both the play scene and the panel, each layer naming its fields, since neither may import the other; `DevApi` gained `overlays` and the devtools page says so. The play scene now writes the render-time ring around its sync and render, which the instrumentation table already promised and nothing wrote. The draw-call readout against the WebGL inspector is a person's row in `STATUS.md`; the readout showed 2 total and 1 for the world in Chrome with every overlay on, the same as with none.

---

### P1-S06-T03 — Replay in Node, the determinism test, the stress test

| Field | Value |
| --- | --- |
| Layer | simulation, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** `src/simulation/replay/`: an input log format (seed, a content version stamp computed from the registry, the ordered commands with ticks), a loader that creates a world with the seed and feeds commands tick by tick with no driver, and a refusal when the content version differs. `tests/simulation/replays/` with `phase-1-session.json` recorded during this sprint with the panel open, including a tuning change, a spawn, and a death. The determinism test replays it into two worlds and compares state at every tick; a second test replays a live-recorded session and compares against the state the recording world ended in. The stress test: 300 generic units with random orders from the world's seeded source on the full arena for a fixed number of ticks, asserting the mean tick under 4 ms; it runs in `pnpm test` and CI. `loadInputLog` and `tickUntil` helpers finished. The composition root draws a fresh session's seed from the wall clock at boot instead of booting on seed 1, and the panel's seed control recreates the world under a chosen seed as a driver operation, not a command (Q19).

**Acceptance:**
- Two replays of the same log are identical at every tick, including after the spawn and the tuning change.
- A log with a different content version is refused with a message naming both versions.
- The stress test passes on the reference laptop and in CI, and its mean tick is recorded.

**Tests:**
- `tests/simulation/replay-determinism.spec.ts` — named `replay`.
- `tests/simulation/stress.spec.ts` — named `stress`.
- `tests/simulation/replay-format.spec.ts` — version refusal.

**Definition of done:** Every change · `src/domain` or `src/simulation` (the replay and stress rows are this ticket).

---

### P1-S06-T04 — The phase 1 gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01, T02, T03 |
| Status | planned |

**Build:** Walk every row of the [phase 1 gate](../04-phase-exit-gates.md#phase-1-gate). Run the acceptance suite by name and paste the list. Walk the thirteen section 15 bullets in the arena and record each. Run the bench and the stress test and record numbers. Record a five-minute session with the panel open and replay it. Run the four browsers on the reference laptop with 300 units and record the readouts. Fill in the phase README's exit record and the sized-versus-actual table. Any bug found becomes a replay test before the gate closes. Docs sync: world model rows for every entity kind and definition kind added, where-to-look rows verified by running each pointer.

**Acceptance:**
- Every gate row holds, with evidence recorded, or the phase does not close.

**Tests:** any replay test born from a gate bug.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 1 gate rows, each with evidence | |
| Draw-call readout agrees with the WebGL inspector on one bench frame | |
| Milestone M2 | |
| Actual days per ticket | T01 1 · T02 1 · T03 · T04 |

## Risks in this sprint

- **R2 lives here.** If the stress test fails with a flat heap, profile before touching the object layout. If it is the layout, stop and schedule the typed-array rewrite before phase 2; do not start the pipeline on a tick that is already over budget.
