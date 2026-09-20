# Sprint 15 — Two hundred enemies, profiling, and the phase gate

**Phase:** 3 · **Sized days:** 4 · **Buffer:** 1

## Goal

Two hundred enemies chase and attack within every row of the bar in four browsers, the stress test says so in CI, and the phase 3 gate is recorded.

## Playable outcome

Two hundred squares converge on the hero, the corridor fills, the tick readout stays under 4 ms, and the frame rate stays at 60. Milestone M6.

---

## Tickets

### P3-S15-T01 — Profile at two hundred chasing and fix the hot spots

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation |
| Size | 2 |
| Depends on | P3-S14-T04 |
| Status | planned |

**Build:** Spawn two hundred grunts and runners, walk, and record thirty seconds in the browser's performance panel and the allocation sampler. Read the rings. Tune before rewriting: the re-path budget and cadence, the push-out pass cap, the hash cell size, the aggro query cadence. Fix allocations found by the sampler. Only if the profile shows the object layout itself over budget, stop and raise R2 with numbers; do not start a typed-array rewrite inside this ticket.

**Acceptance:**
- Before and after numbers for every change, in the ticket's note.
- Tick max under 4 ms, sync under 1 ms, render under 6 ms, draw calls under 5, heap flat, pool misses zero, at two hundred enemies and one hundred projectiles, in Chrome.

**Tests:** none new; the stress test next ticket is the proof.

**Definition of done:** Every change · `src/domain` (hot-path numbers row) · Anything under `src/presentation`.

---

### P3-S15-T02 — The stress test at the phase 3 cap

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Extend `tests/simulation/stress.spec.ts`: two hundred enemies with real AI chasing the hero across the arena with one hundred projectiles in flight for a fixed number of ticks, mean tick under 4 ms; the 300-unit random-orders case stays as a second test. Both in CI.

**Acceptance:**
- Green on the reference laptop and in CI, with the mean recorded.

**Tests:** as above.

**Definition of done:** Every change.

---

### P3-S15-T03 — Four browsers, the bench, replay with spawns, the phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** Run the two-hundred scenario in Chrome, Firefox, Safari, and Edge on the reference laptop and record every readout per browser. Rerun the bench. Record a session with two hundred spawned from the panel and a fight, and replay it. Walk every row of the [phase 3 gate](../04-phase-exit-gates.md#phase-3-gate). Docs sync: world model, where-to-look, the enemies page against what shipped. Replay tests for gate bugs. Exit record and sized-versus-actual in the phase README.

**Acceptance:**
- Every gate row holds with evidence per browser, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

### P3-S15-T04 — Pile-up and corridor buffer

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Reserved for R3: the corridor with two hundred chasers is the first real pile-up. If push-out jitters, tunnels, or fails to settle within the pass cap, this is the time to fix the separation order or the cap. If nothing is wrong, the half day goes to the gate.

**Acceptance:**
- Two hundred in the corridor settle with no overlap after the passes and no unit inside a wall, as a replay test.

**Tests:**
- `tests/simulation/replays/corridor-200.json` and its spec.

**Definition of done:** Every change · `src/domain`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Readouts per browser at 200 enemies and 100 projectiles | |
| Stress test mean tick | |
| Milestone M6 | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **R2, R3, and R4 all resolve here.** T01 is sized at two days because one of them will bite. If all three do, the gate moves a week; if the object layout is the cause, the plan pauses for the typed-array rewrite and phases 4 and 5 shift by two sprints.
