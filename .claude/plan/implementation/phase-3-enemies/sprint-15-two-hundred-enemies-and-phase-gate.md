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
| Status | done |

**Build:** Spawn two hundred grunts and runners, walk, and record thirty seconds in the browser's performance panel and the allocation sampler. Read the rings. Tune before rewriting: the re-path budget and cadence, the push-out pass cap, the hash cell size, the aggro query cadence. Fix allocations found by the sampler. Only if the profile shows the object layout itself over budget, stop and raise R2 with numbers; do not start a typed-array rewrite inside this ticket.

**Acceptance:**
- Before and after numbers for every change, in the ticket's note.
- Tick max under 4 ms, sync under 1 ms, render under 6 ms, draw calls under 5, heap flat, pool misses zero, at two hundred enemies and one hundred projectiles, in Chrome.

**Tests:** none new; the stress test next ticket is the proof.

**Definition of done:** Every change · `src/domain` (hot-path numbers row) · Anything under `src/presentation`.

**Note, 2026-09-24: the profile, what it found, and what changed.** Two hundred enemies, ten packs of grunts and ten of runners, spawned 600 units around a hero who walks a seven-point loop through the corridor and is healed every tick so the fight never ends. A hundred linear projectiles are kept in flight from the hero each tick. Every system is timed on its own. The harness is not committed: the ticket adds no test, and T02 turns the scenario into the stress spec. Machine: the Apple M1 laptop under a load average of 13 to 50 from other work, so single-tick maxima below are noisy and means are the steadier figure.

- **Measure the bundle, not the test transform.** Under vitest the same scenario read 1.9 to 8.6 ms mean. The module transform turns every cross-module call into a getter, and those getters were a fifth of the CPU profile. Built with Vite as the game is and run in plain Node, the same V8 as Chrome, it reads 0.53 to 0.92 ms mean. Every number below is the bundle's.
- **The object layout is not over budget, so R2 does not bite.** Mean tick 0.5 ms at two hundred chasing and a hundred projectiles; collision 0.27 ms, projectiles 0.13, pathing 0.02, movement 0.03 of it. No typed-array rewrite is raised.
- **The allocation sampler found the tick allocating about 100 KB a tick in steady state, after warm-up (ticks 1200 to 2700, every hot function TurboFan-compiled).** Collision 70 KB, movement 15 KB, projectiles 9.6 KB. The source was not literals. It was fractional coordinates handed to spatial-hash calls the engine does not inline: `move(id, x, y)` for every push and every unit, `queryCircle(x, y, …)` for every unit every pass, and `querySegment(ax, ay, bx, by, …)` for every projectile. V8 boxes each such argument into a new heap number. Taking out the pair-loop `move` calls alone took collision from 70 to 20 KB, and taking out the query took it to zero.
- **The fix: the hash takes points as the objects they live in.** `move(id, position)`, `queryCircle(centre, radius, out)`, and `querySegment(from, to, radius, out)`. Every caller already held a point object except pack placement and the unit pick, which fill a module scratch point. After, per tick: collision 70 KB to under 1.7 KB, which is within the ±0.6 KB the measurement's own calibration moves; movement 15 to 8.5 KB; projectiles 9.6 to 3 KB; everything else under 0.7 KB. The rule is written into the simulation coding and performance standards.
- **What is left, and why it stays.** Movement's 8.5 KB is fractional arguments to its pure rules, `turnToward`, `isInsideCone`, and `movementSpeed`, each taking plain numbers so it is testable with three arguments. Reshaping them to take the unit would trade the rule shape the standard asks for against a scavenge every forty-odd seconds. The heap stays flat; only young-generation garbage is made. Decided provisionally in [Q30](../backlog/open-questions.md).
- **Tick maxima, interleaved runs under the same load, four each.** Before: 2.3, 11.5, 27.3, and 35.8 ms max, p99 1.2 to 5.5 ms. After: 1.7, 1.8, 2.5, and 3.0 ms max, p99 1.0 to 1.7 ms. The large maxima before were scavenges landing inside a tick. Scavenges over ticks 900 to 2700 went from 33 to 15, and the 15 left are the harness's own garbage (the timing array, the cast contexts, the heal command), made outside the tick.
- **The knobs, tuned before rewriting: none moved.** One run of two each, mean and max: default 0.57 to 0.60 mean; `hash_cell_size` 64 gave 0.38 and 256 gave 0.58; `push_out_passes` 2 gave 0.32 and 4 gave 0.48; `repath_budget` 4 gave 0.28 and 16 gave 0.41 to 0.48; `chase_repath_interval` 0.25 s gave 0.36. Pathing never passed 2.1 ms max at any setting, so R4 does not bite either. Every setting is inside the budget with the default at an eighth of it, and each one changes the fight as well as the cost, so the choice stays with the balance pass.
- **Pool misses zero** for units and projectiles at the end of every run.
- **In Chrome: waiting on a person.** Sync, render, draw calls, the frame rate, and the thirty seconds in the performance panel need a GPU browser. The DevTools Chrome on this machine was held by another session. The maintainer deferred every benchmark until phase 5 is done (2026-09-24), so it is an open box under "Waiting on a person" in STATUS.md. The tick acceptance row holds in V8 headless: the mean is 0.5 ms and the worst tick 3.0 ms under load. The sync row stands on P3-S14-T04's 0.77 ms mean with 201 bound.

---

### P3-S15-T02 — The stress test at the phase 3 cap

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

**Build:** Extend `tests/simulation/stress.spec.ts`: two hundred enemies with real AI chasing the hero across the arena with one hundred projectiles in flight for a fixed number of ticks, mean tick under 4 ms; the 300-unit random-orders case stays as a second test. Both in CI.

**Acceptance:**
- Green on the reference laptop and in CI, with the mean recorded.

**Tests:** as above.

**Definition of done:** Every change.

**Note, 2026-09-24: the case, its mean, and what the mean measures.** The second case in `tests/simulation/stress.spec.ts` spawns ten grunt packs and ten runner packs of ten on a ring 1100 units round the centre, past every aggro radius, and strikes each enemy once from the hero so all two hundred set off across the arena with their real AI. The hero walks a 600-unit square round the centre, turning for the next corner on arrival or after a second, since the crowd slows it to a push; it is healed every tick. A hundred linear shots from the hero's facing are kept in flight, and their hit runs the damage path for no damage so the live cap stays full. 180 ticks of warm-up, 300 measured. Besides the mean it asserts that all two hundred are in Chase or Attack on every measured tick, the hero is alive, and no pool missed. The first shape tried, T01's ring of 600, engulfed the hero at once, the crowd pushed it north without it ever walking its loop, and packs leashed home; spawning further out and keeping the loop inside the grunts' leash fixed both.

- **The mean, on the Apple M1 laptop, quiet, five runs:** chase 1.89 to 1.98 ms, worst tick 3.0 to 3.8; the 300-unit case beside it 1.75 to 1.98 ms. Both under 4.
- **What the mean measures.** The same scenario built with Vite and run in Node, as T01 measured, reads 0.33 to 0.36 ms mean with the development asserts on and 0.28 without. The test's figure is about five times the game's, the cost of the Vitest module runner T01 found; the test is a conservative bar, not the game's number.
- **Under load it fails, and so does the 300-unit case.** With two other repositories' test suites and a virtual machine holding the laptop, load average 30 to 50 and the kernel throttling, both cases read 6 to 17 ms mean with 100 to 275 ms single ticks. This is the wall-clock bar the performance standard chose, unchanged; the stress group already runs alone and last for that reason.
- **CI and the reference laptop.** Nothing is pushed from this ticket, so CI's figure comes with the next push; the last CI run took the 300-unit case in 991 ms against about 1100 here, so CI is not the slower machine. The reference-laptop half is the maintainer's deferral to the phase 5 gate. Both are open under "Waiting on a person" in STATUS.md.

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
| Stress test mean tick | 1.89 to 1.98 ms at 200 chasing and 100 projectiles, 1.75 to 1.98 ms at 300 on random orders, under Vitest on the Apple M1 laptop, quiet; 0.33 ms as a bundle. CI and the reference laptop wait on a person |
| Milestone M6 | |
| Actual days per ticket | T01 0.5 · T02 0.2 · T03 · T04 |

## Risks in this sprint

- **R2, R3, and R4 all resolve here.** T01 is sized at two days because one of them will bite. If all three do, the gate moves a week; if the object layout is the cause, the plan pauses for the typed-array rewrite and phases 4 and 5 shift by two sprints.
