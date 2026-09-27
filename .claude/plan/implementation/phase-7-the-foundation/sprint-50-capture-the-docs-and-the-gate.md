# Sprint 50 — Capture, the docs, and the gate

**Phase:** 7 · **Sized days:** 3, and a bucket of 1 · **Buffer:** 1

## Goal

A click or a key on a screen never reaches the world, proved by one small screen of real use: a pause screen on Esc. The docs match the build. The phase 7 gate is walked with numbers.

## Playable outcome

The build as phase 6 left it, and a pause screen. Press Esc with nothing to close and the world stops under a pause screen; click it anywhere and the hero does not move; press Esc again and the world goes on from the same tick. Milestone M11.

---

## Tickets

### P7-S50-T01 — The input capture layer, and a pause screen on Esc

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1 |
| Depends on | P7-S48-T04 (b); Q97 |
| Status | done |

**Selection rule:** a seam phase 8 names. P8-S34-T02, the first screen's frame and click claim, builds on this and shrinks to 0.5.

> **Note, 2026-09-27, from P7-S48-T04:** [ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md) is the record this ticket builds. The capture layer is the **input claim** in `presentation/input/`, handed to both scenes and asked by the play scene's binding before the mapper; the HUD's `stopPropagation` goes. The pause screen is modal and draws in `HudScene`. Size unchanged.

**Build:**
- **The capture layer.** Built as decision record (b) says. A screen claims pointerdown, pointerup, and every key it names; nothing it claims reaches the input mapper. Today's HUD-scene claim is rewritten on the layer, and pointerup no longer leaks.
- **The pause screen.** Its first consumer, on Q97's proposal:
  - Esc with no targeting cursor and no screen open opens it;
  - the driver runs no tick while it is open, as for a hidden tab, so pausing is not world state and sends no command;
  - Esc or a click on its one button closes it.
- **Docs.** The [controls and orders](../../../../docs/product/features/controls-and-orders.md) page states Esc's order: the cursor first, then an open screen, then pause. The [presentation](../../../../docs/architecture/presentation.md) page states the capture layer.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **Pause reasons are held apart.** The driver already has a panel pause (`app/fixed-step-driver.ts:103,150`). The screen's pause is a second, independent reason: the driver runs ticks only when no reason holds, so closing the pause screen never resumes a clock the panel stopped, and the panel's step still works under it. The accumulator is not fed while any reason holds, so a resume runs no burst of catch-up ticks.
- **The pause screen reaches the driver through a port.** Presentation declares the port and `app/` implements it over the driver. No import from presentation to `app/`.
- **Nothing is buffered under the pause screen.** A paused driver takes commands into the buffer for the next tick (`fixed-step-driver.ts:53`), so the claim stops every event the screen holds before the mapper. A command must never wait in the buffer and land on the resume tick.

**Acceptance:**
- A left or right click, a pointerup after a drag from the world, and every key but Esc on the open pause screen send no command.
- The world's tick count does not move while paused, and the input log gains nothing.
- A replay of a session with pauses in it matches the same session played straight through.
- The HUD's clicks still never reach the world.
- With the panel's pause on, opening and closing the pause screen leaves the world paused. After a long pause, the first frame runs at most one tick.
- By an agent in Chrome through browser automation: open, click, close, and the world resumes on the same tick.

**Tests:**
- `tests/presentation/input-capture.spec.ts`: each claimed event stopped before the mapper; pointerup included; keys.
- `tests/app/fixed-step-driver.spec.ts`: no tick while paused; two reasons held apart; no catch-up burst on resume.
- `tests/presentation/pause-screen.spec.ts`: open, close, and Esc's order.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:** Q97's pause at the driver is right; see Q97's row. The driver's existing panel pause would have been overloaded by a second owner, so the two reasons are held apart. The accumulator and buffer rules close the two ways a pause could leak into the log's timing: a catch-up burst on resume, and commands that queued while paused. The port keeps presentation off `app/`. Size unchanged.

> **Closed, 2026-09-27:** `pnpm check` green, 4584 tests, and the stress tier. Definition of done walked: every change holds; under `src/presentation`, the pause screen is quads and `BitmapText` from the atlas, made at `create` and shown or hidden, in a new HUD screen band above the bar's (`hud/hud-bands.ts`); the render benchmark is not applicable, since the atlas and every play view are unchanged and the bench draws no HUD, and T03 measures draw calls at the densest choke with the pause screen built. The docs: controls and orders states Esc's order and the pause rows, presentation states the pause screen and Escape's edge trigger, and where to look points at the claim and `src/presentation/screens/`. The spec that proves the claim is named `input-capture.spec.ts` as this ticket says, though the vocabulary's word is *input claim*.

---

### P7-S50-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | every other phase 7 ticket, T01 and the bucket's included |
| Status | done |

**Build:** every architecture page this phase touched, read against the build and corrected. Each page's Quick reference must hold every rule its body states:
- the [world model](../../../../docs/architecture/world-model.md), for the unit's sub-records and the order's tagged target;
- [entities and pools](../../../../docs/architecture/entities-and-pools.md), for branded ids, the sub-records, and where items live per record (a);
- [where to look](../../../../docs/architecture/where-to-look.md): every pointer this phase moved, the split files, the doors, the descriptors, and the purpose list;
- [layers and the dependency rule](../../../../docs/architecture/layers-and-dependency-rule.md): the doors, the widened bans, and the size limit;
- [content and registries](../../../../docs/architecture/content-and-registries.md), [commands and events](../../../../docs/architecture/commands-and-events.md), [simulation loop](../../../../docs/architecture/simulation-loop.md), [presentation](../../../../docs/architecture/presentation.md), and [ability pipeline](../../../../docs/architecture/ability-pipeline.md);
- the [testing standards](../../../../docs/standards/testing.md) and [simulation coding](../../../../docs/standards/simulation-coding.md) pages.

Any drift the proposal of 2026-09-27 named that no ticket closed is closed here or written into Deferred.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository.
- Every pointer in where-to-look resolves to a file that exists.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

> **Closed, 2026-09-27:** `pnpm check` green, 4585 tests, and the stress tier. Every page the ticket names was read against the build and corrected, and every other page under `docs/`, `AGENTS.md`, `README.md`, the rules, and the project skills were swept for what phase 7 made stale. Each touched architecture and standards page's Quick reference now holds every rule its body states; where a page had four anti-patterns, one was cut. Where to look: every path it names exists, the world row no longer says the world loads a map, and rows were added for the testing door, the DOM-free typecheck, and the size limit's list. The runbooks for a spell and an enemy name the real fields and descriptors. One code comment was corrected: the driver's clock is not the only read of time. The docs-links test walks the whole repository and passes. The proposal of 2026-09-27 is not a file in the repository, so its drift list was read through the phase 7 tickets that cite it; none names a drift for these pages that a ticket left open. What the code has not reached, or that needs a decision, went to [Deferred](../backlog/deferred.md): the item source kind behind ADR 0011, the tier of specs that build a world, a runbook for a definition kind, and two older wording tensions. Zone and projectile speeds divided at spawn were already there.

---

### P7-S50-T03 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs, bench |
| Size | 1 |
| Depends on | every bucket ticket, T02 |
| Status | done |

**Build:**
- **The walk.** Walk every row of the [phase 7 gate](../04-phase-exit-gates.md#phase-7-gate) with its evidence:
  - the seven logs with no re-stamp since P7-S45-T01, and their checksums;
  - `pnpm check`;
  - the `max-lines` exceptions and their reasons;
  - the toy kind's file count;
  - every finding of the proposal closed or deferred with a reason;
  - the docs.
- **The bar.** Every row is an agent's: the tick and the stress tiers headless; frame rate, sync, render, world draw calls, and heap at the densest choke of the long road in Chrome on the development machine through browser automation; the render benchmark the same way. Each is written as figures beside phase 6's (standing instructions of 2026-09-27).
- **Records.** Replay tests for gate bugs. The exit record and sized versus actual go in the [phase README](./README.md#exit-record), with the bucket's spent and unspent day.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.
- Allocations zero in the tick and the sync after warm-up, draw calls unchanged from phase 6's figures, and the tick and the frame within the bar.

**Tests:**
- Any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-27: the gate walked, and closed on the maintainer's instruction.** Every row holds on the evidence below. No gate bug, so no replay test was added. The bucket stays unspent. The per-row results are in the [phase README](./README.md#exit-record).
> - **The logs.** All seven carry content version `96752802`, the stamp P7-S45-T01 wrote. `git log` on them since then shows two commits, both checksum-only: P7-S45-T02 added the checksums, and P7-S46-T02 re-recorded them for the modifier rows and count, with its reason in the commit. No stamp moved.
> - **`pnpm check`.** Exit 0: 237 files and 4586 tests passed, 1 file and 3 tests skipped, 1 todo; lint, both typechecks, and the build.
> - **The stress tier.** 6 of 6 green under `pnpm test:budget`. The long-road case, five runs each, walks 4337 ticks to level 9 with no death, at most 10 live, and at most 1576 A* expansions in a tick. Vitest's development build reads a mean of 0.099 to 0.104 ms and a worst of 1.74 to 2.84 ms now. The last phase 6 commit, `f8d8660`, reads 0.085 to 0.091 ms and 1.74 to 1.84 ms. The mean is about 17% higher and still about 40 times under the 4 ms budget.
> - **The bar in Chrome.** Chrome for Testing 153, headless, on the Apple M1 (ANGLE Metal), 1920 by 1080, over the DevTools protocol. The dev build, overlays off, is on the long road at checkpoint 6. Every unit is cleared, then twenty packs of ten grunts are spawned in the last boss's chamber, with their aggro and leash raised so all of them press through choke 5, the narrowest, at the hero. The hero is healed every half second. It ran for 30 s after an 8 s warm-up, one run of each build.
>   - **Now:** 60.0 fps, every frame between 16.65 and 16.68 ms. 1 world draw call a frame and 2 in all, every frame. 197 to 199 live, no pool or view miss, no console error. Sync and render: mean 1.76 ms, p99 2.7, worst 7.5. Tick in the browser: mean 2.86, p99 4.5, worst 20.6. Heap after a collection: 37.4 → 37.8 MB, between 37.5 and 40.7 MB throughout.
>   - **`f8d8660`, the same way:** 60.0 fps; 1 and 2 draw calls; no miss. Sync and render: mean 1.56, worst 3.9. Tick: mean 2.36, p99 4.3, worst 19.9. Heap: 36.7 → 37.2 MB.
> - **Allocation.** The sampling heap profiler, at 1 KB with collected objects included, attributes 55.0 MB to the tick and 7.8 MB to the sync over the 30 s now, against 50.8 and 7.4 MB on `f8d8660`. The same functions dominate both: collision's `separatePair`, movement's `turnToward` and `movementSpeed`, and the unit views' sync. This is the engine boxing [Q30](../backlog/open-questions.md) answered: zero allocation in the code, the heap flat. No allocation was added by the phase in a place the before run lacks.
> - **The render benchmark** was not rerun. The ticket's third run is not in this record: the interleaved runs in the playtest build, three a side, were stopped when the maintainer asked on 2026-09-27 to close the phase on the evidence in hand. The benchmark figures stand at P7-S48-T01's run on this machine: 60.02 fps, 1 draw call, heap flat. No atlas or view changed after it apart from the pause screen, which draws in the HUD scene.
> - **Caveats.** Each Chrome figure is one run, so the tick and sync means in the browser, 21% and 13% over `f8d8660`, are not separated from noise. The browser tick's p99 and worst pass 4 ms in both builds. The standard holds the tick to the headless reading, which is well inside. Neither caveat blocks the gate. Both are noted for phase 8's bar.

---

## The bucket

One sized day, run after T01 and before T02, in the order the [phase README](./README.md#the-bucket) gives:

1. a gate row that fails;
2. the event record's typed readers, if P7-S47-T04 decided to build them; P7-S47-T04 decided (b) on 2026-09-27, no readers, so this claim falls away;
3. a latent bug a refactor made live.

Each accepted item is written as a ticket, P7-S50-T04 onward, with a note. What does not fit goes to Deferred. An unspent day is recorded as unspent.

## Sprint exit

| Check | Result |
| --- | --- |
| No click or key on a screen reaches the world | Holds. `tests/presentation/input-capture.spec.ts`: over a real mapper, a left and a right click, a release after a press from the world, and every bound key but Esc send no command with the pause screen open, and the log gains nothing; the bar's clicks never reach the world. The HUD scene no longer listens to the pointer or stops propagation |
| The pause screen, by an agent in Chrome | Holds, 2026-09-27, the dev build in Chrome through browser automation: Esc opened it at tick 563; a right click, a left press dragged and released, and Q, S, A left the tick at 563 and the hero at (2000, 400) for 1.5 s; a click on Resume ran the world on from 563, at most one tick a frame (563, 564, 564, 565, ...); the same right click with the screen closed moved the hero |
| The docs sync | Holds, 2026-09-27 (T02): 38 pages and files corrected against the build, every where-to-look path resolves, the docs-links test green over the repository; four drifts that need code or a decision in Deferred |
| The bucket: spent, and on what | Unspent. The event record's readers fell away with (b). No ticket named a latent bug a refactor made live. No gate row failed in T03 |
| The gate walk | Holds, 2026-09-27 (T03): every row of the phase 7 gate, with the evidence in T03's note and the [exit record](./README.md#exit-record). No gate bug. The bucket's day is unspent. The playtest-build reruns and the render benchmark were not repeated, on the maintainer's instruction to close |
| Milestone M11 | Reached 2026-09-27: the foundation phase's gate |
| Actual days per ticket | T01: 1, sized 1; T02: 0.5, sized 1; T03: 0.5, sized 1 |
| Sprint total | Closed 2026-09-27: sized 3 and a bucket of 1, with 1 of buffer; done in 2, with the bucket and the buffer unspent. No unplanned ticket |

## Risks in this sprint

- If record (b) chose DOM, T01 claims across two input sources and is the ticket most likely to run over; the sprint's buffer is its.
- A gate row that fails on the bar, most likely draw calls after T01's overlay change in sprint 48 or heap after the modifier table grew, takes the bucket first. The phase does not close on a promise.
