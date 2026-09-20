# Sprint 02 — Locomotion, turn rate, and the render benchmark

**Phase:** 1 · **Sized days:** 4 · **Buffer:** 1

## Goal

The hero turns at the spec's rate and walks at the spec's speed on an empty plane, and the render bet in ADR 0001 is proven or disproven before a single view is written.

## Playable outcome

Nothing draws the hero yet. In tests, AT-M1, AT-M2, AT-M3, and AT-C1 are green. In the browser, `pnpm bench` shows 500 quads at 60 fps with under 5 draw calls.

---

## Tickets

### P1-S02-T01 — Order state machine and the command union

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | P0-S01-T03 |
| Status | done |

**Build:** Under `src/domain/orders/`: the order states from spec section 4.4 as a union (`idle`, `turning`, `moving`, `attack_windup`, `attack_backswing`, `ability_cast_point`, `ability_backswing`, `channeling`), the current order on the unit as one value (`none`, `move` with a destination, `attack_target` with a unit id, `attack_move` with a destination), the rule that a new legal order replaces the current one at the end of the tick, and a validator skeleton returning `ok` or a reason with the disable branches present and all flags false. The `Command` union gains `move`, `stop`, `attack_move`, `attack_target`, `slot` with a slot index 1 to 6, and `cast` with an ability id and a target payload (none, point, unit, direction). Shift-modified clicks produce nothing.

**Acceptance:**
- A `move` while `moving` replaces the destination; the previous destination is gone.
- A `stop` clears the order and freezes yaw.
- Every state transition in section 4.4 that is legal lands; every illegal one is refused with a reason.

**Tests:**
- `tests/domain/orders/state-machine.spec.ts` — one per transition.
- `tests/domain/orders/validator.spec.ts` — one per refusal reason present so far.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

---

### P1-S02-T02 — Movement system: turn, cone, constant speed, speed stack, tuning table

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests |
| Size | 2 |
| Depends on | T01, T05 |
| Status | done |

**Build:** The tuning table under `src/content/tuning.ts` with every parameter in spec section 17 and its default, typed in `domain/definitions/`, copied into run scope at world creation, read through the world. Under `src/domain/movement/`: the turn step (shortest arc, rate scaled by step over 0.03 s, ramp over `turn_ramp_ticks`, clamp on the last tick so facing equals target), the action cone test, the speed stack (`(base + Σflat) × (1 + Σpct)` clamped by the min and max tunables, recomputed every tick from modifier sources on the unit), and the advance along a fixed-capacity path buffer by `min(speed × dt, remaining)` with a small arrival epsilon. For this sprint the path buffer is one segment to the destination; A* fills it in sprint 03. `movementSystem` registered in `systems.ts` after command application. A `set_tuning` command variant applying on the next tick and landing in the log.

**Acceptance:**
- AT-M1: facing +X, move to +X, first translation on the same tick.
- AT-M2: facing +X, move to −X, no translation for about 0.16 s, shortest arc, translation once bearing ≤ 11.5°.
- AT-M3: 280 units in 1.00 s ± 1% with no modifiers, and the same at simulated 60 Hz and 144 Hz frame deltas through the driver.
- AT-C1: a second move before arrival abandons the first destination.
- The ramp eases in over the tunable's ticks and never overshoots.
- No literal number in the movement module other than 0, 1, and identities.

**Tests:**
- `tests/simulation/at-locomotion.spec.ts` — `AT-M1`, `AT-M2`, `AT-M3` by name.
- `tests/simulation/at-commands.spec.ts` — `AT-C1`, `AT-C2` (shift click produces one destination), `AT-C4` (stop clears the move).
- `tests/domain/movement/turn.spec.ts`, `speed-stack.spec.ts` — table-driven boundaries.
- `tests/simulation/tuning.spec.ts` — a `set_tuning` command changes the next tick's speed and is in the log.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

*Edited while closing T01: the dependency row gained T05, because the acceptance tests submit commands and need the step that applies them to the hero, which neither this ticket nor T01 named.*

*Edited while building: `set_tuning` is applied by the command system to run scope, hero or no hero, rather than by a system of its own, and it refuses `sim_hz`, because every converted duration and the driver's step already depend on it; the driver reads its tick rate from the table at boot so the two agree. The tuning table is typed as a flat record with the Whorl table as one key per level, `whorl_ms_per_instance:0` for level 1, matching Q5. The re-entry from `moving` to `turning` at a path corner is sprint 03's, since a one-segment path never leaves the cone once inside it.*

---

### P1-S02-T03 — The shape atlas and the frame list

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests |
| Size | 1 |
| Depends on | P0-S01-T04 |
| Status | planned |

**Build:** `src/content/atlas-frames.ts` as the one frame list: `disc`, `ring_thin`, `ring_thick`, `square`, `square_outline`, `square_outline_thick`, `triangle`, `pixel`, a wedge sheet of 64 frames for cooldown sweeps, a placeholder status icon frame, and the glyphs `0-9`, `-`, `.`, `%`, `/` and the uppercase letters for a `RetroFont`. Cone frames are added by the spells that need them. `src/presentation/atlas/shape-atlas.ts` draws every frame white with alpha onto one canvas at boot, large enough that no view scales up more than two, registers one Phaser texture with named frames, and registers the bitmap font. A `download` hook that returns the canvas as a PNG data URL, exposed on `DevApi` later. `BootScene` bakes before starting the other scenes.

**Acceptance:**
- Every frame in the list exists on the texture; a frame name not in the list is a content validation error (the check lands with the registry in sprint 07; for now a unit test over the list and the bake).
- The wedge sheet's frame N covers N/64 of a circle clockwise from twelve o'clock.
- The PNG downloads and every frame is visible.

**Tests:**
- `tests/presentation/shape-atlas.spec.ts` (jsdom, canvas stubbed) — every listed frame gets a region; regions do not overlap.

**Definition of done:** Every change · Anything under `src/presentation`.

---

### P1-S02-T04 — The render benchmark

| Field | Value |
| --- | --- |
| Layer | bench |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** `bench/` with one scene exactly as ADR 0001 specifies: 300 tinted unit quads with position and rotation written every frame and a tenth flashing each second; 100 projectile quads spawning and despawning through a pool at 20 per second; 30 ring, disc, cone, and line quads changing scale, rotation, and alpha every frame; 6 wedges changing frame every frame; 50 `BitmapText` numbers changing text and position every frame; 50 static obstacle quads; a following camera at 1920 by 1080 with `Scale.FIT`. The expected numbers in the file header. A `pnpm bench` script that serves it. A draw-call readout in the corner that counts calls to the renderer's public `drawElements` and `drawInstancedArrays` between its pre-render and post-render events (Q4); the counting module is the one sprint 06 moves under `src/presentation/` for the panel.

**Acceptance:**
- On the reference laptop in Chrome and Safari over 30 seconds: 60 fps stable, render under 6 ms, under 5 draw calls, heap flat after warm-up, once with `maxTextures: 1` and once with the default.
- Numbers recorded in this sprint's exit and in the phase README.

**Tests:** none; this is the benchmark tier, read by a person.

**Definition of done:** Every change · Anything under `src/presentation` (the benchmark rerun row is this ticket).

---

### P1-S02-T05 — Command application: the tick hands consumed commands to the first system

| Field | Value |
| --- | --- |
| Layer | domain, simulation, docs, tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

**Build:** The tick keeps the consumed commands readable for the length of the tick: the buffer stays sorted and intact while the systems run and is cleared after them, and the world exposes the consumed commands to a system in order without copying. `commandSystem` first in `systems.ts`: for each consumed command, resolve the hero through run scope, run the validator, and on `ok` apply the order transition for `move`, `attack_move`, `attack_target`, and `stop`; a refusal drops the command and changes nothing; `slot` and `cast` are validated and then dropped until the kit and the cast skeleton exist in sprint 04; `noop` and `debug_noop` are dropped. A world with no hero drops every player command. A `spawnHero` helper under `tests/helpers/world/` acquires a hero-kind unit at a position and facing and sets `run.heroId`, so a simulation test has a hero before the hero definition exists.

**Acceptance:**
- A `move` consumed on tick N is the hero's order after tick N, and the hero is turning.
- A `stop` consumed after it clears the order.
- A refused command leaves the order and the state as they were.
- Two moves in one tick leave the later one by timestamp.

**Tests:**
- `tests/simulation/command-system.spec.ts` — the four acceptance bullets.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

*Unplanned: added while closing T01. T01 is domain only and T02 says `movementSystem` is registered "after command application", but no ticket named the step that walks the consumed commands and applies them to the hero, and the tick handed commands to no system.*

*Edited while building: the layer row gained `domain` and `docs`, because the architecture pages place a system in the domain module that owns it, so `commandSystem` lives under `src/domain/orders/` and only its registration is under `src/simulation/`, and the tick's steps on the simulation loop page changed.*

---

## Sprint exit

| Check | Result |
| --- | --- |
| AT-M1, AT-M2, AT-M3, AT-C1, AT-C2, AT-C4 green by name | |
| Bench: fps · render ms · draw calls · heap, Chrome and Safari, both `maxTextures` settings | |
| Milestone M1 | |
| Actual days per ticket | T01 0.5 · T02 2 · T03 · T04 · T05 0.5 |

## Risks in this sprint

- **R1 lives here.** If the benchmark fails on draw calls, something breaks the batch; on render time with draw calls fine, an allocation or a `Text` update. Spend the buffer day. A second failure is an ADR 0001 conversation and stops the plan until resolved.
- AT-M3 at two refresh rates is a driver test with simulated deltas, not a browser test. Make sure the test drives the real driver, not a copy of its arithmetic.
