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
| Status | done |

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

> Built 2026-09-21. Four readings settled in the build. The log file carries the map id and the tick count the session ran beside the seed, the content version, and the records, so a replay knows which map to create and when it is done; the content version is a hash over the registry with sorted keys, until the content tier computes one over converted numbers. The hero enters a world through one session door in `src/simulation/session.ts`, used by the composition root and by `beginReplay` alike, so a replay starts from the state the recording did. Recreating under a seed and loading a log restart the world in place: run scope and map scope are rebuilt on the same world object, so the scenes, the mapper, and the panel keep every reference; a test proves a restarted world equals a fresh one. The driver steps a `Steppable`, which a session and a replay both are, and a replay refuses input until its recorded ticks have run. `phase-1-session.json` was recorded in Chrome with the panel open: a move, a `base_ms` slider change, a spawn of 60, two moves, a kill, and a move after the respawn, over 1554 ticks. The stress test runs in a Vitest project group of its own after every other project, since its mean doubled while sharing the cores with the other workers; alone it measured 1.7 to 2.0 ms mean over 300 ticks with 300 units on this machine, max 8 to 29 ms. The reference-laptop number is the phase gate's.

---

### P1-S06-T04 — The phase 1 gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01, T02, T03 |
| Status | done |

**Build:** Walk every row of the [phase 1 gate](../04-phase-exit-gates.md#phase-1-gate). Run the acceptance suite by name and paste the list. Walk the thirteen section 15 bullets in the arena and record each. Run the bench and the stress test and record numbers. Record a five-minute session with the panel open and replay it. Run the four browsers on the reference laptop with 300 units and record the readouts. Fill in the phase README's exit record and the sized-versus-actual table. Any bug found becomes a replay test before the gate closes. Docs sync: world model rows for every entity kind and definition kind added, where-to-look rows verified by running each pointer.

**Acceptance:**
- Every gate row holds, with evidence recorded, or the phase does not close.

**Tests:** any replay test born from a gate bug.

**Definition of done:** Every change · A documentation change.

> Built 2026-09-21. The gate was walked in Chrome on the Apple M1 laptop; each row's evidence is in the [gate walk](#phase-1-gate-walk) below and the numbers in the phase README. Three things came out of the walk. `AT-C3` had its two tests in the input mapper spec without the name, so they now sit under an `AT-C3` block there, the one acceptance test outside `tests/simulation/`, since the rule it proves, a right click on a non-enemy unit sends nothing, lives in the mapper. The world model had no row for the atlas frame definition and has one now. Every where-to-look pointer resolves except the six phase 2 and phase 3 folders and `src/content/index.ts`, which P2-S07-T01 creates. No bug was found, so no replay test was born; the five-minute log is kept as [a dated note](../notes/2026-09-21-phase-1-gate-session.json) rather than a fixture, because two Node replays of its 9061 ticks take 30 s. The bar's four-browser run, the reference laptop's stress and bench numbers, the WebGL inspector check, and the allocation sampler are rows a person walks, listed in `STATUS.md`; the phase closes when they hold.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 1 gate rows, each with evidence | Walked 2026-09-21, row by row in the [gate walk](#phase-1-gate-walk) below: eight rows hold; the bar holds in Chrome on the Apple M1 laptop and waits on the reference laptop and the other three browsers |
| Draw-call readout agrees with the WebGL inspector on one bench frame | Waits on a person, as recorded in `STATUS.md`. The readout showed 1 draw call on every bench frame and 2 total, 1 world, on every frame of the gate session with 300 units and two overlays on |
| Milestone M2 | Reached 2026-09-21 on the Apple M1 laptop in Chrome: 38 acceptance tests green by name, the five-minute session replays identically in the browser and in Node, and 300 units hold the tick budget at a 1.7 ms mean |
| Actual days per ticket | T01 1 · T02 1 · T03 1 · T04 0.5 |

### Phase 1 gate walk

Walked 2026-09-21 on an Apple M1 laptop, Chrome, under `pnpm dev`, with the panel open. Every row of the [phase 1 gate](../04-phase-exit-gates.md#phase-1-gate), in its order.

| Row | Holds | Evidence |
| --- | --- | --- |
| Every acceptance test green by name | Yes | `pnpm test -t "AT-"`: 38 tests in five files, all green. AT-M1, M2, M3, M4, M5 in `at-locomotion.spec.ts`; AT-C1, C2, C4, C5 in `at-commands.spec.ts`; AT-C3 in `tests/presentation/input-mapper.spec.ts`; AT-O1 to O5 in `at-orbs.spec.ts`; AT-I1 to I9 in `at-invoke.spec.ts` |
| No section 15 row fails | Yes | Walked by the maintainer at the sprint 05 exit, and again on the final phase 1 code the same day by the agent in Chrome, driving the mapper with dispatched clicks and key events and reading the world view: rows 1 and 2, the hero yaws from tick 46 and first translates on tick 51, an about-face of five ticks; row 3, a right click 120 units beside a spawned unit is a move to that ground point with no target; row 4, a right click on the hero changes nothing; row 5, two Shift right-clicks are two ordinary moves, the second replacing the first with a one-waypoint path, and the first point, inside an obstacle, resolved to the obstacle's edge; row 6, D with Glacier prepared opens the cursor and Esc closes it with the slots unchanged and no mana spent; row 7, Q on the key alone adds an orb; row 8, Q, Q, Q, W reads Q, Q, W in age order; row 9, Q, Q, W and W, Q, Q both invoke Wane; row 10, Hoarfrost, Siphon, Zenith invoked in turn leave D and F holding Zenith and Siphon, Hoarfrost evicted, and throwing D casts Zenith while F keeps Siphon; row 11, Q, W, E then R prepares Clarion with the hero idle, and D then a click casts it; row 12, `collision_radius`, `bound_radius`, and `selection_radius` are three sliders and the two overlays draw two rings on every unit; row 13 by AT-M3 at 60 and 144 Hz |
| The 300-unit stress test holds the tick budget | Yes | `pnpm test -t "stress"` green. Five runs of the same loop with the mean printed: 1.67, 1.71, 1.75, 1.80, and 2.84 ms mean over 300 measured ticks, the last with one 61 ms tick, max otherwise 7.8 to 9.0 ms; pool misses 0. The reference laptop's run waits on a person |
| The render benchmark passes | Yes, on this machine | `pnpm bench` in Chrome, 90 s, as configured: 60 fps, render 0.8 to 0.9 ms, 1 draw call, 1 texture, heap 59 to 60 MB and flat. Safari and the reference laptop wait on a person, as they did at M1 |
| A recorded session replays identically | Yes | Five minutes and two seconds, 9061 ticks, recorded with the panel open under seed 20260921: every slider moved out and back, a spawn of one and a spawn of 300, every Hero control, a death, and 103 moves; 258 commands in the log. Loaded back in the browser and stepped to its last tick, the world's end state is identical to the recording's byte for byte, an 808,575-character snapshot of run scope and every pool. Replayed into two Node worlds, the two agree on the random state, every unit's position, facing, state, health, and mana at every one of the 9061 ticks, and end identical. Node's end state differs from Chrome's by one ulp in the hero's facing, which is inside the same-machine, same-build contract the simulation loop page states |
| Every tunable is a slider that applies on the next tick and lands in the log | Yes | 52 sliders, one per key of the tuning table; 51 moved once and back, each landing as a `set_tuning` record, 102 in the log; `sim_hz` is fixed at world creation and its slider is disabled, as the tuning group says. The tuning state read back after the moves held the new value for all 51, in its converted unit |
| The HUD shows bars, three orb squares in age order, six slot squares, wedges, mana costs, level and XP | Yes | By eye in Chrome: health and mana as bars with numbers; three orb squares oldest first; Q, W, E, R, D, F squares from the kit, the orb squares carrying their level; R its mana cost; D and F holding Glacier and Wane with their costs; the level with the unspent-point marker and the experience bar under it. The wedge sweep was seen on D after the Zenith throw |
| Death and respawn | Yes | `tests/simulation/hero/death.spec.ts` green; from the panel with 300 units live, the hero went `dead`, then idle at full health and mana with orbs and slots kept, ten units off the spawn point because the crowd's push-out moved it after the respawn |
| The bar, at 300 units | In Chrome on this machine | 60 s with 302 units and two overlays on: 60 fps every second; tick mean 0.35 to 1.52 ms, tick max under 3.7 ms in every second but the one the spawn landed in, which read 7.1; render mean 0.3 to 1.3 ms, max 3.5; draw calls 2 total, 1 world; pool misses 0, view misses 0; heap 59.6 to 63.1 MB across the run, 61.7 at the start and 61.3 at the end. The sync is inside the render ring's number, since the play scene writes that ring around its sync and its render. Firefox, Safari, Edge, the reference laptop, the WebGL inspector check, and the 30-second allocation sampler wait on a person |

## Risks in this sprint

- **R2 lives here.** If the stress test fails with a flat heap, profile before touching the object layout. If it is the layout, stop and schedule the typed-array rewrite before phase 2; do not start the pipeline on a tick that is already over budget.
