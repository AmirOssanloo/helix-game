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
| Status | planned |

**Build:** The phase 3 scenario plus twenty zones and every overlay off, thirty seconds each in Chrome, Firefox, Safari, and Edge, performance panel and allocation sampler. Fix what the profile shows, with before and after numbers per change. Safari is the known unknown; record its WebGL behaviour separately.

**Acceptance:**
- Per browser, every row of the bar with the measured value; no allocation in tick or sync in the sampler after warm-up.

**Tests:** none new.

**Definition of done:** Every change · `src/domain` (hot-path numbers) · Anything under `src/presentation`.

---

### P4-S18-T02 — Heap, pool misses, event overwrites at the cap

| Field | Value |
| --- | --- |
| Layer | tests, instrumentation |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Verify heap flat over five minutes at the cap; pool misses zero; event ring overwrites zero at the cap with the panel open (size the ring if not). A CI assertion that the stress test's pool-miss and overwrite counters are zero at the end.

**Acceptance:**
- All three zero; the stress test asserts the counters.

**Tests:**
- `tests/simulation/stress.spec.ts` extended.

**Definition of done:** Every change.

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

## Sprint exit

| Check | Result |
| --- | --- |
| Headroom table complete, per browser | |
| Milestone M7 | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- If Safari fails a row that Chrome passes, the gate does not close on Chrome alone. The bar names four browsers. Record it, fix it, or take it to leadership as a support-matrix decision with numbers.
