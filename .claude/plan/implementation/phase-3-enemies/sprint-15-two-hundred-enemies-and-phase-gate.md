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
| Status | done |

**Build:** Run the two-hundred scenario in Chrome, Firefox, Safari, and Edge on the reference laptop and record every readout per browser. Rerun the bench. Record a session with two hundred spawned from the panel and a fight, and replay it. Walk every row of the [phase 3 gate](../04-phase-exit-gates.md#phase-3-gate). Docs sync: world model, where-to-look, the enemies page against what shipped. Replay tests for gate bugs. Exit record and sized-versus-actual in the phase README.

**Acceptance:**
- Every gate row holds with evidence per browser, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-24:** the gate was walked and its evidence is in the [phase 3 gate walk](#phase-3-gate-walk). Six of eight rows hold on this machine. The other two, two hundred live in four browsers and the bar at the cap, hold headless and wait on a person for the browser half: the four browsers, the bench, and the reference laptop are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and rows of [Deferred](../backlog/deferred.md). The session was recorded in Node, not from the panel in a browser, for the same reason: every command in it is one the panel sends, and it is kept as [a dated note](../notes/2026-09-24-phase-3-gate-session.json). No gate bug was found, so no replay test was born from one. The phase does not close here: T04 is the sprint's last ticket, and it closes the sprint, the phase, and M6, filling the sized-versus-actual and largest-miss rows of the phase README.

---

### P3-S15-T04 — Pile-up and corridor buffer

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

**Build:** Reserved for R3: the corridor with two hundred chasers is the first real pile-up. If push-out jitters, tunnels, or fails to settle within the pass cap, this is the time to fix the separation order or the cap. If nothing is wrong, the half day goes to the gate.

**Acceptance:**
- Two hundred in the corridor settle with no overlap after the passes and no unit inside a wall, as a replay test.

**Tests:**
- `tests/simulation/replays/corridor-200.json` and its spec.

**Definition of done:** Every change · `src/domain`.

> **Note, 2026-09-24:** T03 walked the gate and left the phase open for this ticket, the sprint's last: closing it also closes sprint 15, the phase, and M6, fills the sized-versus-actual and largest-miss rows of the [phase README](./README.md#exit-record), and moves STATUS.md to phase 4.

**Note, 2026-09-24: R3 bit, mildly, and the cap moved from three passes to four.** The session is `tests/simulation/replays/corridor-200.json`, 1200 ticks and 174 commands, every one a kind the panel sends. The hero walks into the corridor and holds it at (3000, 2000), ordered back every half second and healed every ten ticks. Ten grunt packs and ten runner packs of ten spawn west of the corridor within sight and chase it in. At tick 600 the hero is lifted out of reach, and all two hundred walk home back through the corridor. The spec is `tests/simulation/corridor-200.spec.ts`.

- **Walls hold.** Pressing in and walking home, no disc sat deeper than 2.3e-13 in an obstacle or past the bounds on any tick, at three passes or four. Nothing tunnels through a wall.
- **Pairs did not hold at three passes.** Under the press, walkers renew the overlap every tick, and the passes leave some of it. At three passes, the worst pair over the session was 0.99 of its summed radii: two runners hugging the corridor's north wall, pressed onto one point at tick 180. The next worst ticks read 0.87 and 0.82. The worst of a median tick was 0.21.
- **The separation order does not fix it.** Measured on the same commands. Sweeping pairs in alternate directions on alternate passes, sorting the sweep by distance to the hero, and pushing out of walls inside the pair loop each changed the worst pair by a few hundredths. Walls inside the pair loop settled a frozen corridor pile a quarter faster. None was kept, and the code is unchanged.
- **The cap does.** At four passes the worst pair over the session is 0.68, the p99 tick 0.58, and the median 0.17. At five the worst is 0.59, at six 0.54, and at eight 0.37. Another seed, and a hero that does not hold, read the same within a few hundredths. Four is the smallest cap that stops a press putting two discs on one point. Under Vitest the corridor session's tick went from 1.74 to 2.07 ms mean. The stress spec's chase case reads 1.85 to 2.25 ms, against 1.89 to 1.98 at three passes, and the 300-unit case is unchanged. `push_out_passes` defaults to 4 in the tuning table. The phase 1 session is re-stamped for the new content version, and the coding standard's example comment says four.
- **Settling.** Frozen at the press's end with walking stopped, the pile needs 30 ticks of passes to fall under a world unit and 65 to reach touching, and no pass puts a disc in a wall. The slowest part is a column of grunts in the corridor: a hull 54 wide in a corridor 96 wide zig-zags against both walls, and every push loses its sideways half to them. The spec holds these to 45 and 90 ticks.
- **The crowd shoves the hero.** Push-out is even, so two hundred walking into the hero carry it: from (3000, 2000) to (3864, 2622) in fifteen seconds, despite the hold orders, with 25 grunts dragged past their leash by the press's end. At four passes the stress spec's crowd carried its hero far enough to leash two grunts at tick 456. That spec's chase warm-up is now 120 ticks, not 180, which is still time for the runners to arrive and the shots to fill, so measuring ends before the leash. Whether a crowd should shove the hero, and whether a standing unit should take less of a push than a walking one, is a change to the push rule, not a tuning. It is decided provisionally as unchanged in [Q31](../backlog/open-questions.md), awaiting the maintainer.
- **The spec's seven cases.** Every enemy sets off, with a column of 15 or more in the corridor at the press's end. No disc goes into a wall on any tick. No pair is pressed past 0.75 of its summed radii, which three passes fail. The frozen pile goes under a world unit within 45 ticks and to touching within 90. It settles in place, with no disc pushed into a wall and none carried a hull. Two replays agree on every position at every tick. All two hundred are home and idle by the end.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Readouts per browser at 200 enemies and 100 projectiles | Waiting on a person: Chrome, Firefox, Safari, and Edge on the reference laptop, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24. Headless in V8, the tick at 0.5 ms mean and 3.0 ms worst under load (T01); sync at 0.77 ms mean with 201 bound (P3-S14-T04) |
| Stress test mean tick | 1.89 to 1.98 ms at 200 chasing and 100 projectiles, 1.75 to 1.98 ms at 300 on random orders, under Vitest on the Apple M1 laptop, quiet; 0.33 ms as a bundle. CI and the reference laptop wait on a person |
| Milestone M6 | Reached 2026-09-24 on the rows an agent can verify: two hundred chasing within budget headless, in the isometric view, with the phase 3 gate walked. The four browsers are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, an open box in STATUS.md and a row of [Deferred](../backlog/deferred.md) |
| Corridor pile-up at two hundred | `tests/simulation/corridor-200.spec.ts` green. Walls never entered. Worst pair 0.68 of its summed radii at four passes, against 0.99 at three. The frozen pile goes under a world unit in 30 ticks and to touching in 65 (T04) |
| Actual days per ticket | T01 0.5 · T02 0.2 · T03 0.4 · T04 0.3. Sized 4, done in 1.4 |

### Phase 3 gate walk

Walked 2026-09-24 on the Apple M1 laptop, headless, by the engineer running the plan. Every row of the [phase 3 gate](../04-phase-exit-gates.md#phase-3-gate), in its order. Browser readouts, the bench, and the reference laptop are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24.

| Row | Holds | Evidence |
| --- | --- | --- |
| Four archetypes plus the dummy exist as definitions and appear in the panel dropdown with no code change | Yes | `ls src/content/enemies/`: `melee-grunt`, `fast-runner`, `ranged-archer`, `tank`, and `training-dummy`, each a `.def.ts`, and the index. `tests/devtools/panel.spec.ts` builds the dropdown's options from the registry's enemy list and spawns the archetype it names. Walked by the maintainer in the Enemies group, 2026-09-23 |
| Each archetype passes the six standard enemy tests | Yes | `pnpm test tests/simulation/enemies/`: six files, green. Each archetype spec has aggro on sight with its whole pack, aggro on a hit from outside the radius with its whole pack, closing to contact or holding at range and swinging, leash home with regeneration, death with the slot and the hash place given back, and experience to the hero; `edges.spec.ts` and `attacks.spec.ts` beside them |
| 200 live enemies chase and attack the hero within budget | Headless, yes; in four browsers, waiting on a person | `tests/simulation/stress.spec.ts` holds two hundred with their real AI chasing and a hundred projectiles, every one in Chase or Attack on every measured tick, 1.89 to 1.98 ms mean under Vitest (T02) and 0.33 ms as a bundle. The recorded session below ran two hundred live for sixty seconds of ticks. The four browsers on the reference laptop are an open box in STATUS.md and a row of [Deferred](../backlog/deferred.md) |
| Spells kill enemies correctly by damage type | Yes | `tests/simulation/combat/damage-types.spec.ts` green: physical, magical, and pure against each archetype's armour and resistance, forty literal cells, and five cases against live archetypes |
| Experience levels the hero from 1 to 30 | Yes | `tests/simulation/hero/experience.spec.ts` green, "climbs from 1 to 30 on kills, one skill point a level" among its eleven |
| Damage numbers, hit flashes, status icons, and every overlay on the developer panel page exist | Yes | By eye, each toggle: walked by the maintainer with fifty enemies and all ten spells, 2026-09-24, recorded in the sprint 14 [exit table](./sprint-14-combat-readability-and-overlays.md#sprint-exit) |
| The view is the 2:1 isometric projection at the one chosen scale, with no zoom and the maintainer's floor tile, and the simulation is unchanged by it | Yes | By eye, approved by the maintainer, sprint 24. `notes/2026-09-23-phase-2-gate-session.json`, stamped with the tree's content version, replayed in Node on this tree and on `09dbd91`, the last commit before the view: 2020 ticks each, and the chain of SHA-256 digests of run scope and every unit, projectile, effect, and zone slot at every tick is the same, `0047e92f…`, as is the last tick's, `17a73706…`. `grep -rni zoom src/` finds only the camera's fixed zoom of one and the comments saying it never changes |
| The bar | Headless, yes; per browser, waiting on a person | In V8, at two hundred chasing and a hundred projectiles: tick 0.5 ms mean and 3.0 ms worst under load, the tick's steady-state allocation down from about 100 KB to 13 KB, pool misses zero (T01); sync at 0.77 ms mean with 201 bound (P3-S14-T04). `pnpm check` green. Frame rate, render, draw calls, and heap per browser need a GPU browser on the reference laptop, deferred with the row above |

**The recorded session.** [`notes/2026-09-24-phase-3-gate-session.json`](../notes/2026-09-24-phase-3-gate-session.json), seed 20260924, 3600 ticks, 574 commands, every one a kind the panel or the player sends. Orbs set to 7, both switches on, the hero levelled to 30, ten grunt packs and ten runner packs of ten on a ring 700 units round the spawn point; the hero attack-moves round a square and throws Zenith and Bolide every half second, and is healed every ten ticks; a pack of ten is spawned into every gap of ten or more every five seconds, 360 enemies in all. 118 casts committed, 163 enemies died, and the live count ran between 84 and 200. Replayed into two fresh worlds, the chain of per-tick digests agrees, `4d3e4e9b…`, and each replay's last tick is byte for byte the recording world's. It was recorded in Node, not from the browser panel, because the browser runs are deferred.

## Risks in this sprint

- **R2, R3, and R4 all resolve here.** T01 is sized at two days because one of them will bite. If all three do, the gate moves a week; if the object layout is the cause, the plan pauses for the typed-array rewrite and phases 4 and 5 shift by two sprints.
