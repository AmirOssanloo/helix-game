# Sprint 18 — Profiling, headroom, and the phase gate

**Phase:** 4 · **Sized days:** 4 · **Buffer:** 1

## Goal

A headroom table: for every row of the bar, the budget, the measured value at the cap, and the margin, in four browsers, with the allocation sampler clean.

## Playable outcome

The same game, with numbers that say how much room phase 5 has. Milestone M7.

---

## Tickets

### P4-S18-T01 — Profile under load in four browsers and fix hot spots

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation |
| Size | 2 |
| Depends on | P4-S17-T04 |
| Status | done |

**Build:** The phase 3 scenario plus twenty zones and every overlay off, thirty seconds each in Chrome, Firefox, Safari, and Edge, performance panel and allocation sampler. Fix what the profile shows, with before and after numbers per change. Safari is the known unknown; record its WebGL behaviour separately.

**Acceptance:**
- Per browser, every row of the bar with the measured value; no allocation in tick or sync in the sampler after warm-up.

**Tests:** none new.

**Definition of done:** Every change · `src/domain` (hot-path numbers) · Anything under `src/presentation`.

**Note, 2026-09-25: the profile headless, what it found, and what changed.** The phase 3 scenario, ten grunt packs and ten runner packs of ten spawned on a ring 1100 units round the centre and each struck once so all two hundred chase a hero who walks the stress spec's square and is healed every tick, a hundred linear shots kept in flight from the hero's facing, plus twenty zones kept standing in front of the hero where the crowd is: Glacier's line of seven walls, then Bolide, Updraft, and Zenith in turn, every orb at 7, a cast passed over when it would take the count past twenty. Both enemy archetypes' health is set to ten million through `set_tuning` so no one dies and the cap stays full. 1200 ticks of warm-up, 1800 measured. Built with Vite as the game is, production defines, and run in plain Node, the same V8 as Chrome, as P3-S15-T01 found is the only honest headless figure. Every system is timed on its own, and allocation is read per system as the change in used heap across the call, with the young generation set to 128 MB so no scavenge lands in the window, and the sampling heap profiler with collected objects included to find the sites. The harness is not committed: the ticket adds no test, and T02 extends the stress spec. Machine: the Apple M1 laptop, load average 1.5 to 4.5. Overlays are a presentation matter and are not in a headless run.

- **The tick is well inside the budget, and the zones cost little.** Mean 0.51 to 0.53 ms, p99 0.72 to 0.77, worst tick 1.0 to 1.2 ms, over eight interleaved runs before and after the change. Collision 0.31 ms of it, projectiles 0.06, the status pass 0.05, pathing 0.05, the zones 0.02, movement 0.015. The same scenario without the zones reads 0.48 ms mean and 1.2 to 1.3 ms worst, so twenty zones cost about 0.03 ms. Pool misses zero for units, projectiles, and zones at the end of every run; 197 of 200 enemies in Chase or Attack at the end, the other three lifted.
- **The sampler found the status pass allocating 4.6 KB a tick.** All of it was damage over time: the burns the zones put on reach `applyDamage` with a fractional amount, and `mitigate` inside it took and returned a fractional number, and neither call was inlined, so V8 boxed a heap number per argument and per result for every burning unit every tick. Rounding the amount at the call took the pass to 0.27 KB, which located it; removing `mitigate` from the door took the rest.
- **The fix: the damage door takes a record.** `dealDamage` in `src/domain/combat/damage.ts` reads the amount from a `DamageRecord` and writes what landed back into it, after the damage hooks so a hook's own damage leaves the outer figure in place; the mitigation rule is one body that works on the record. `applyDamage`, returning what landed, stays the door for every caller holding a plain number and fills a module scratch record; `mitigate` stays the pure rule over plain numbers for anything asking what a hit would be worth. The status pass holds its own record. After: the status pass 4.6 KB to 0.22 to 0.32 KB a tick, the zone pass 0.9 to 0.44 KB, the whole tick 12.7 to 7.9 KB. Tick time unchanged. The simulation coding and performance standards now name a number returned from a call as well as one passed to it.
- **Tried and taken out.** The area-damage primitive on the same record: no change on the sampler, 0.44 KB before and after, so it was reverted; the zone pass's remainder is spread over the status application, the target collection, and the table reads, none over 0.16 KB. Announcing the damage from the record: no change, reverted.
- **What is left, and why it stays.** Movement 4.1 KB a tick with the zones and 8.6 KB without them, since the zones lift and slow part of the crowd: its pure rules, `turnToward`, `isInsideCone`, and `movementSpeed`, taking plain numbers, exactly as P3-S15-T01 left them under [Q30](../backlog/open-questions.md). Collision 0.8 KB, pathing 0.4, the behaviours 0.4, the zones 0.44. All young-generation garbage, which the heap stays flat under. The acceptance row "no allocation in tick" is read through Q30's provisional reading, updated with these numbers; the alternative is rules that take the unit or write into an out object.
- **Sync and the four browsers: waiting on a person.** Sync, render, world draw calls, the frame rate, the heap graph, and the allocation sampler over sync need a GPU browser with the overlays off. The DevTools Chrome on this machine was held by another session again, and the four browsers on the reference laptop are the maintainer's deferral until phase 5 is done by the standing instruction of 2026-09-24. Safari's WebGL behaviour is to be recorded on its own line there. It is an open box under "Waiting on a person" in STATUS.md, and T03's headroom table reads it. The tick rows hold headless: worst tick 1.2 ms against 4.
- **Definition of done.** Every change: `pnpm check` green, 162 files and 2854 tests with the stress group; no optional property, non-null assertion, or ticket reference added; the rule a page states is updated in the simulation coding and performance standards. `src/domain`: no allocation added and 4.8 KB a tick taken out; no clock, no literal, no new number; the rule keeps its unit tests in `tests/domain/combat/mitigation.spec.ts` and the door its simulation tests through the burns and hooks; replay determinism and the stress test pass; before and after numbers above. `src/presentation`: not applicable, nothing under it changed; the bench is not rerun since no atlas or view changed.

---

### P4-S18-T02 — Heap, pool misses, event overwrites at the cap

| Field | Value |
| --- | --- |
| Layer | tests, instrumentation |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

**Build:** Verify heap flat over five minutes at the cap; pool misses zero; event ring overwrites zero at the cap with the panel open (size the ring if not). A CI assertion that the stress test's pool-miss and overwrite counters are zero at the end.

**Acceptance:**
- All three zero; the stress test asserts the counters.

**Tests:**
- `tests/simulation/stress.spec.ts` extended.

**Definition of done:** Every change.

**Note, 2026-09-25: the ring counted the wrong thing and was too small; both fixed, all three zero.** The cap is T01's scenario: two hundred grunts and runners chasing the hero, their health retuned to ten million by `set_tuning` so the cap stays full, twenty zones kept standing ahead of the hero in the crowd from Glacier, Bolide, Updraft, and Zenith at every orb 7, and a hundred shots in the air.

- **The overwrite counter read nonzero in every session.** It counted every write once the ring had wrapped, whether or not any reader had read the event overwritten, so after the first 1024 events of a session it climbed by every event and could never read zero; over the stress run it read 51,903. It now counts what it was for: an event a reader finds overwritten before it read it, counted when that reader next reads, once per reader. An event every reader has read is overwritten silently.
- **The ring was too small at the cap.** The heaviest tick announces 430 events: 233 `unit_damaged`, 100 `projectile_hit`, 96 `status_applied`, one `tick_completed`. A render frame at the catch-up cap of three ticks is 1290, over the 1024 slots, so the presentation itself would lose hits at the cap. The open panel drains four times a second, about eight ticks at 30 Hz; drained at twice that to allow a refresh that slips behind a busy frame, the panel's reader has up to 7037 events waiting. `EVENT_RING_CAPACITY` is now 8192: nineteen of the heaviest ticks, about 1.1 MB of slots against 0.14 MB before. At 4096 the new stress test fails with 6733 lost, so the assertion bites.
- **A folded panel skips rather than loses.** The panel stops reading while folded, so its reader would count everything it passed as lost when it opens. The ring has `skip`, which moves a reader past every event written so far without counting, and the panel calls it each time it opens. The panel's last-event readouts and its death count now cover the time it was open, and the developer panel page says so.
- **The stress test asserts the counters.** A third case in `tests/simulation/stress.spec.ts` runs the cap for 150 ticks of warm-up and 300 measured, a presentation reader draining every three ticks and a panel reader every sixteen, and asserts overwrites zero, pool misses zero for units, projectiles, effects, and zones, twenty zones standing before every measured tick, the live cap and a hundred shots at the end, and the mean tick under 4 ms: 2.4 ms under Vitest's development build, max 4.0 to 4.2. The ring's spec covers counting per reader, no count when every reader has read, `skip`, and a reader across a clear; the panel spec covers a fold across a full ring.
- **Heap flat over five minutes at the cap, headless.** The same scenario for 9000 ticks after the warm-up, both readers draining, a full collection forced twice before each sample every thirty seconds of play: 25.62 MB at thirty seconds, 25.72 MB at five minutes, never above 25.77 MB; the first sample, 25.18 MB at the end of the warm-up, is the engine settling. Overwrites 0, pool misses 0, twenty zones standing throughout. The first run of it climbed 1.1 MB, about 125 bytes a tick: the harness healed the hero by command every tick and the input log keeps every command by design, so the check heals outside the command path; 187 commands in the log at the end. The harness is not committed: five minutes of play is thirty seconds of CI for a figure the three-case stress test already guards by its counters.
- **In a browser: waiting on a person.** The heap graph, the panel's Pool misses and Event overwrites readouts over five minutes at the cap in a browser with the panel open, needs a person; it is an open box under "Waiting on a person" in STATUS.md, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24.
- **Unplanned: T05.** A reader kept its cursor across a restart, found in the same method; see T05.
- **Definition of done.** Every change: `pnpm check` green, 162 files and 2861 tests with the stress group; no optional property, non-null assertion, or ticket reference added; the ring's rule is updated where pages state it, in commands and events, developer tools and instrumentation, and the developer panel page. No hot-path number moved: the ring's read is outside the tick, and its write lost a branch.

---

### P4-S18-T03 — The phase 4 gate and the headroom table

| Field | Value |
| --- | --- |
| Layer | docs, tests |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** Walk every row of the [phase 4 gate](../04-phase-exit-gates.md#phase-4-gate): the designer retune demonstration with three random keys, the bench, the stress test, replay, hot reload, version refusal. Write the headroom table into the phase README, with a second simulation-tick row at 100 enemies so the per-enemy slope is known (Q9). Docs sync: feature pages against what shipped, where-to-look pointers run, the tuning key format written into the developer panel page and the content-and-registries page. Replay tests for gate bugs. Exit record and sized-versus-actual.

**Acceptance:**
- Every gate row holds with evidence; the headroom table has a margin for every row and none is negative, and its tick row is measured at 200 and at 100 enemies.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

### P4-S18-T04 — Deferred review and the phase 5 shopping list

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** Read [Deferred](../backlog/deferred.md) and [Open questions](../backlog/open-questions.md); close what phase 4 answered; draft the disable matrix's row and column headings and the enemy catalogue's phase 5 section headings so sprint 19 starts on content, not on structure. Confirm the phase 5 sprints against the headroom table: if the margin on the worst browser's max tick is under 1 ms, `ENEMY_LIVE_CAP` is planned at the largest multiple of ten whose projected max tick, from the slope between the 100 and 200 rows, leaves 1 ms, and the ticket says so (Q9).

**Acceptance:**
- Both backlog pages are current; the phase 5 README has the headroom-adjusted cap written in.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

---

### P4-S18-T05 — A reader across a restart starts at the new run

| Field | Value |
| --- | --- |
| Layer | simulation |
| Size | 0.05 |
| Depends on | T02 |
| Status | done |

Unplanned, found while T02 changed how the event ring counts a reader that falls behind.

**Build:** A restart, whether a new seed from the panel or a loaded input log, clears the event ring, but the presentation's, the HUD's, and the panel's readers kept their cursors, so each read nothing until the new run had written as many events as the old one: no hit numbers, no HUD reactions, and no panel readouts for as long as the old run had lasted, or longer. The ring numbers its runs; a clear starts a new one, and a reader from an earlier run starts at the new run's first event, counting nothing lost.

**Acceptance:**
- A reader that read before a clear reads the first event written after it.

**Tests:**
- `tests/simulation/event-ring.spec.ts`, a reader from before a clear.

**Definition of done:** Every change.

**Note, 2026-09-25.** Done with T02 in one change, since the fix is two lines of the method T02 rewrote. `pnpm check` green as T02 records.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Headroom table complete, per browser | |
| Milestone M7 | |
| Actual days per ticket | T01 0.4 · T02 0.3 · T03 · T04 · T05 0.05 (unplanned) |

## Risks in this sprint

- If Safari fails a row that Chrome passes, the gate does not close on Chrome alone. The bar names four browsers. Record it, fix it, or take it to leadership as a support-matrix decision with numbers.
