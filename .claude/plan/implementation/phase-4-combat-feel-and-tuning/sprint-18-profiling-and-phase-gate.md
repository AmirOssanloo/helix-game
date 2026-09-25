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

> **Note, 2026-09-25:** the ring's margin above was sized on a heaviest tick of 430 events. The phase 4 gate's measurement found 714 when a hundred shots land in one tick, which 8192 slots hold for only eleven ticks, so a panel a whole refresh behind lost events. P4-S18-T06 raised the ring to 16384.

---

### P4-S18-T03 — The phase 4 gate and the headroom table

| Field | Value |
| --- | --- |
| Layer | docs, tests |
| Size | 1 |
| Depends on | T02 |
| Status | done |

**Build:** Walk every row of the [phase 4 gate](../04-phase-exit-gates.md#phase-4-gate): the designer retune demonstration with three random keys, the bench, the stress test, replay, hot reload, version refusal. Write the headroom table into the phase README, with a second simulation-tick row at 100 enemies so the per-enemy slope is known (Q9). Docs sync: feature pages against what shipped, where-to-look pointers run, the tuning key format written into the developer panel page and the content-and-registries page. Replay tests for gate bugs. Exit record and sized-versus-actual.

**Acceptance:**
- Every gate row holds with evidence; the headroom table has a margin for every row and none is negative, and its tick row is measured at 200 and at 100 enemies.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

**Note, 2026-09-25: the gate walked, the headroom table written, one gate bug.** The evidence per row is in the [phase 4 gate walk](#phase-4-gate-walk), and the table is in the [phase README](./README.md#headroom-table), with the tick measured at 200 and at 100 enemies: worst 2.33 ms and 3.11 ms on their highest quiet readings, 1.38 and 1.02 at the median, a slope of 0.0036 ms an enemy on the worst tick and 0.0024 on the mean. No margin is negative. Frame rate, sync, render, draw calls, the allocation sampler over sync, and the bench need a GPU browser and wait on a person, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24.

- **The gate bug.** The measurement found the heaviest tick at 714 events, not the 430 the ring was sized on, and with the panel draining every sixteen ticks, the margin T02 promised, 1664 events were lost at 8192 slots. P4-S18-T06 raised the ring; nothing is lost at either drain rate now. The stress test's own scenario does not reach 714 in a tick, so the evidence is the harness's runs, recorded under T06. No replay test comes from it: a lost event changes nothing in the world, and the ring's spec covers counting what a reader lost.
- **Docs sync.** The tuning key format, `def:<kind>:<id>:<field path>[:<index>]`, is owned by the content-and-registries page, with the unit read from the last property name, and shown with real keys on the developer panel page; coding standards now links it. The developer panel page was behind what shipped in four places and now lists the Abilities folder, every tuning table entry as a slider, the Content line, and the four hot-reload edge cases. The other eight feature pages agree with the code. Every where-to-look pointer returns something; the page gained rows for the input log, the event ring, and content hot-reload.
- **Definition of done.** Every change: `pnpm check` green, 162 files and 2862 tests with two todo, after a first run failed four timing cases under a load of 30 from another project's test run and passed once it fell; no optional property, non-null assertion, or ticket reference added. A documentation change: the pages follow the documentation standards, the placeholder legend in the architecture page and real names on the feature page, and the link test passes.

---

### P4-S18-T04 — Deferred review and the phase 5 shopping list

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | T03 |
| Status | done |

**Build:** Read [Deferred](../backlog/deferred.md) and [Open questions](../backlog/open-questions.md); close what phase 4 answered; draft the disable matrix's row and column headings and the enemy catalogue's phase 5 section headings so sprint 19 starts on content, not on structure. Confirm the phase 5 sprints against the headroom table: if the margin on the worst browser's max tick is under 1 ms, `ENEMY_LIVE_CAP` is planned at the largest multiple of ten whose projected max tick, from the slope between the 100 and 200 rows, leaves 1 ms, and the ticket says so (Q9).

**Acceptance:**
- Both backlog pages are current; the phase 5 README has the headroom-adjusted cap written in.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

**Note, 2026-09-25: the backlog reviewed, the headings drafted, the cap kept at 200.**

- **The cap.** The worst tick at 200 enemies is 2.33 ms headless, 1.67 ms of margin, over the 1 ms the rule asks for, so `ENEMY_LIVE_CAP` stays 200 and the code is not touched; on the slope of 0.0036 ms an enemy the tick leaves 1 ms up to about 380. The rule reads the worst browser's max tick, which waits on a person and is deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, so the cap is written into the [phase 5 README](../phase-5-full-enemy-roster/README.md#live-cap-for-the-boss-encounter) as provisional, with the formula that lowers it if the browser figure is over 3 ms: the largest multiple of ten not above 200 + (3 − M) ÷ 0.0036. The phase 4 gate's box in STATUS.md now points there. Q9 is provisional at 200.
- **The phase 5 sprints against the table.** They stand as written. The note under the cap names what the roster adds per tick against the margin, and that P5-S21-T04 resizes the event ring if the boss variant's heaviest tick passes 714 events.
- **Deferred.** Eight rows of "Cut from a phase" were built by the sprint they waited on, and moved to a new table, "Cut and since built", with where each landed: content hot-reload, the `Readonly` cast ban, the replay loader, real enemy definitions for the stress test, Wane's aggro-drop test, a unit's own speed and turn rate, the melee attack, and the disable matrix's draft, which is this ticket. The rows waiting on sprint 19, a designer, or the phase 5 gate stand. The phase 5 gate's reference-laptop row named three deferred rows; it now names every row that waits on it, phases 1 to 4 and the benches.
- **Open questions.** Q9 as above. Nothing phase 4 did settles another; three are brought up to date. Q23: the balance pass moved no radius, and the definition tuning surface reaches the form's three numbers with the same catch, since the hero copies them when it is made. Q26: the condition its alternative waited on is measured, the zone pass 0.02 ms of the tick, so the one door stands. Q31: the balance pass took up neither the push rule nor the cap, and its goals held with both. Q30 and Q32 to Q38 wait on the maintainer as they stood; Q24, Q25, and Q28 are not phase 4 matters.
- **The headings.** The disable matrix's rows and columns are drafted under [P5-S20-T01](../phase-5-full-enemy-roster/sprint-20-the-disable-matrix.md), with the status definitions each row covers and the flags each raises, and three things for that ticket to settle. The enemy catalogue's long roster, [section 7](../../../../docs/product/specs/enemy-catalogue.md#7-the-long-roster), has five subsection headings with a sentence each, and P5-S21-T02 points to them.
- **Definition of done.** Every change: `pnpm check` green, 162 files and 2863 tests with two todo, after a first run failed three timing cases under a load of 55 from another project's test run and passed once it fell below 8; no code changed, so no optional property, non-null assertion, or ticket reference is added. A documentation change: the catalogue's new subsections follow the documentation standards, present tense and real names on a product page, and the link test passes.

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

### P4-S18-T06 — The event ring holds the heaviest tick at the cap

| Field | Value |
| --- | --- |
| Layer | simulation |
| Size | 0.05 |
| Depends on | T02 |
| Status | done |

Unplanned, found while T03 measured the headroom table.

**Build:** The heaviest tick at the cap announces 714 events when a hundred shots land together: 100 `projectile_spawned`, 100 `projectile_hit`, about 333 `unit_damaged`, and about 101 `status_applied`. T02 sized the ring on 430, so 8192 slots held eleven such ticks, and a panel a whole refresh behind, reading every sixteen ticks, lost 1664 events in a run. `EVENT_RING_CAPACITY` is 16384, twenty-two such ticks.

**Acceptance:**
- No event lost at the cap with the panel reading every eight or every sixteen ticks; the tick unchanged.

**Tests:** none new; `tests/simulation/event-ring.spec.ts` reads the constant, and the stress test's overwrite assertion stands.

**Definition of done:** Every change.

**Note, 2026-09-25.** Done with T03 in one change. T01's harness at the cap, 1800 measured ticks after 1200 of warm-up, the presentation reading every three ticks: with the panel every sixteen, five runs, overwrites 0 and at most 9183 waiting, 7201 slots free; every eight, two runs, 0 and 5022. Pool misses 0. Tick mean 0.51 and 0.52 ms and worst 1.05 and 1.26 on the quiet runs, against 0.514 and 1.38 at 8192. The ring's slots are 139 bytes each, measured with full collections: 1.08 MB at 8192 and 2.17 MB at 16384, allocated once at start. No page states the number; the constant's comment does.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Headroom table complete, per browser | Headless, yes: every row an agent can measure has a margin in the [phase README](./README.md#headroom-table), none negative, the tick at 200 and at 100 enemies (T03). Per browser, waiting on a person: frame rate, sync, render, draw calls, the sampler over sync, and Safari's WebGL on the reference laptop, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24 |
| Milestone M7 | Reached 2026-09-25 on what an agent can verify: a designer's retune of three random keys by command with no code change, read on the next use and held in the log, and the headroom table recorded with no margin negative. Retuning from the panel by hand and the table's browser rows are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24 |
| Actual days per ticket | T01 0.4 · T02 0.3 · T03 0.4 · T04 0.2 · T05 0.05 (unplanned) · T06 0.05 (unplanned). Sized 4.1, 4 planned and 0.1 unplanned, done in 1.4 |

### Phase 4 gate walk

Walked 2026-09-25 on the Apple M1 laptop, headless, by the engineer running the plan. Every row of the [phase 4 gate](../04-phase-exit-gates.md#phase-4-gate), in its order. What needs a person, by hand or in a GPU browser, is deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24.

| Row | Holds | Evidence |
| --- | --- | --- |
| A designer retunes any exposed number without a code change | By command, yes; from the panel by hand, waiting on a person | Three keys drawn from the 611 of `definitionFields` over the registry by mulberry32 seeded 20260925, one per group: `def:hero:hero:experienceThresholds:21`, `def:spell:siphon:effects.0.onActivate.0.fields.burn.byLevel:6`, and `def:enemy:tank:mana`. The hero group's draw landed on an experience threshold, a number of the hero definition rather than a stat in the narrow sense. In a session world on the arena, the three `set_tuning` commands went in at tick 2: the threshold from 21495 to 20000, and twenty-one level ups land the hero on level 22 at 20000 experience; a tank spawned before the change keeps 0 mana and the next one spawned has 600; Siphon's burn at orb level 7 from 550 to 300, and the next cast takes the tuned tank from 600 to 300. The input log holds all three as entries 3 to 5. `tests/simulation/tuning.spec.ts` (15) and `tests/devtools/panel.spec.ts` (26) green. By hand from the panel is the sprint 17 box in STATUS.md |
| The profile shows headroom on every row of the bar | Headless, yes; per browser, waiting on a person | The [headroom table](./README.md#headroom-table): the tick at 200 enemies 2.33 ms worst, 1.67 ms of margin, and at 100 enemies for the slope. One gate bug found in it, the ring's margin, fixed as T06 |
| Hit feedback, knockback, displacement, death handling, experience flow each have their edge-case tests | Yes, by content; two of the five sit outside the folder the row names | `tests/simulation/feel/displacement.spec.ts` (17, knockback among them) and `tests/simulation/feel/death.spec.ts` (13 and a todo, the enemy summon at the cap). Hit feedback in `tests/presentation/hit-feedback.spec.ts` (16) and `tests/presentation/floating-number.spec.ts` (23), since it is presentation; knockback also in `tests/simulation/statuses/knockback.spec.ts` (4); the experience flow in `tests/simulation/hero/experience.spec.ts` (20). 137 green. The sprint 16 exit names the same places |
| A balance pass was run and its input logs are kept | Yes | `tests/simulation/replays/balance-hero.json`, `balance-spells.json`, and `balance-archetypes.json` exist; `tests/simulation/replays/balance.spec.ts` replays each, 3 of 3 green |
| Content hot-reload works for a definition edit, and a replay against a changed content version is refused with a message | By test, yes; by hand, waiting on a person | `tests/app/content-reload.spec.ts` (6), `tests/domain/definitions/content-change.spec.ts` (7), and `tests/simulation/replay-format.spec.ts`, 34 green: an edited health reaches the next grunt by a logged command, a typo is refused, a reshape asks for a page reload, a tuned number is kept, a reload during a replay is refused, and a log from another content version is refused naming both. By hand in a browser are the sprint 17 boxes in STATUS.md |
| The bar | Headless, yes; per browser, waiting on a person | Every row with its margin in the headroom table. Determinism: `vitest run -t replay` green, 10 files and 22 tests, and the session below replays identically. `pnpm check` green. Frame rate, sync, render, draw calls, the heap in a browser, and the bench wait on a person |

**The recorded session.** [`notes/2026-09-25-phase-4-gate-session.json`](../notes/2026-09-25-phase-4-gate-session.json), seed 20260925, content version `ace34657`, 3600 ticks, 821 commands, every one a kind the panel or the player sends: 359 heals, 224 casts, 173 pack spawns, 29 level ups, 20 attack moves, 8 slot presses, the orb levels, the two switches, and five `set_tuning` among the fight, grunt health 900 at tick 600, Zenith's level-7 amount 600 at 1200, `base_ms` 340 at 1800, the hero's attack damage 90 at 2400, and the runner's speed 420 at 3000. Twenty packs of ten on a ring 700 units round the spawn point, refilled every 150 ticks; the hero at level 30 attack-moves a square and throws Zenith and Bolide in turn. 1730 enemies spawned, and the live count ran between 47 and 200. Replayed into two fresh worlds, the chain of per-tick SHA-256 digests agrees, `74ed52ca…`, and the last tick is byte for byte the recording's, `3672e2a6…`. It was recorded in Node, not from the panel in a browser, for the reason above.

## Risks in this sprint

- If Safari fails a row that Chrome passes, the gate does not close on Chrome alone. The bar names four browsers. Record it, fix it, or take it to leadership as a support-matrix decision with numbers.
