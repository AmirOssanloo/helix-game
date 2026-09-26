# Sprint 30 — The rest of the bucket and the phase gate

**Phase:** 6 · **Sized days:** 1.5 in tickets, 1.5 of bucket appetite, committed on 2026-09-26 to T03 · **Buffer:** 1

## Goal

The last of what the triage accepted is built, the docs match the build, and the phase 6 gate is walked with numbers.

## Playable outcome

The long road, as the maintainer's feedback left it. Milestone M10.

---

## Tickets

### P6-S30-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | every bucket ticket, T02 |
| Status | done |

**Build:** Walk every row of the [phase 6 gate](../04-phase-exit-gates.md#phase-6-gate) with its evidence: the long road's content tests, the long-road stress case, the Q31 corridor bound, the checkpoint and dormancy specs, the playtest session replayed, the triage note, and the bar at the cap on the long road. Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

**Closed 2026-09-26, on the rows an agent can verify.** No bucket ticket existed, since the triage waits on a person, so T02's sync stood as the docs the gate reads. The [gate walk](#phase-6-gate-walk) below holds six rows headless and the docs row on T02's checklist. The playtest session, the feedback and its triage, and the bar's browser half wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and a row of [Deferred](../backlog/deferred.md). No gate bug, so no replay test was added. The exit record is in the [phase README](./README.md#exit-record). `pnpm check` green.

---

### P6-S30-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every bucket ticket |
| Status | done |

**Build:** The world model's map and map-scope rows, the where-to-look pointers for checkpoints, sleeping packs, map choice, and the feedback file, the feature pages (map and camera, enemies, developer panel, HUD, spells and attack if a spell was swapped), the vocabulary, the long road spec against its file, and the spell and enemy catalogues against any number the bucket moved, each read against the build and corrected.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

**Closed 2026-09-26.** No bucket ticket existed, so the pages were read against the build as phase 6 left it. The world model's pack, map-scope, and checkpoint rows now say the hero keeps its slot and is carried to the spawn, a reset makes every pack whole, and a sleeping pack is its record in map scope. Where-to-look gained pointers for map choice and the maps index, the feedback file and note, the build stamp, `restart`, where the hero comes back, and the push share. The feature pages were corrected: the checkpoint ring's tint and the word at the spawn, the fifth choke into the last boss's chamber, the pack radii with their numbers, the HUD's checkpoint word and rings, the hero's push share and respawn, and the developer panel's labels, its Units folder, and its readouts as they read. The vocabulary splits dormant, how a pack is written, from asleep, awake, waiting, and dead, what it is now, and adds choke and push share. The long road spec's nearest pack to checkpoint 6 is pack 28, and the block gap reads about 260. Three derived figures in the enemy catalogue and one in the spell catalogue were corrected; no definition number had moved. The runbooks that check in the arena now choose it under **Map**, since a fresh session starts on the long road. Relative links all resolve; `pnpm check` green, 3601 tests.

---

### The bucket — 1.5 days of appetite

Tickets P6-S30-T03 onward are the rest of what P6-S29-T02 accepted, written there. They run before T02 and T01.

Written 2026-09-26 from the triage: T03, the enemy retune, spends the 1.5 days. T02 and T01 closed before the triage, so T03 carries its own documentation rows, and the gate's playtest, triage, and replay rows are walked again after the maintainer's clean run, as the [phase README](./README.md#exit-record) says.

---

### P6-S30-T03 — Enemies retuned to Diablo II's first act

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P6-S29-T03, P6-S29-T04, P6-S29-T05, P6-S29-T06, P6-S29-T07, P6-S29-T08, Q71 (answered) |
| Status | done |

> **Note, 2026-09-26:** came from triage, a tuning change, the fifth in the maintainer's order and the last, since the whole swing, the bodies, the halts, and the hit on a returning enemy change the pressure it is tuned against. The maintainer's note: "Enemies too quick and far too much health; in Diablo II Act 1 normal, enemies die in 1–4 hits." The evidence: the hero's basic attack is 42 at 1.7 seconds, so a grunt at 400 takes 10 to 11 hits, a runner at 220 about 6, a tank at 1200 about 29. Enemy side only: the hero's Dota-based numbers stay, and a move of the hero toward Diablo II's curves is a row of [Deferred](../backlog/deferred.md). It supersedes the starting values approved under P3-S12-T01 and the numbers Q38 left standing.

> **Note, 2026-09-26, the maintainer's numbers:** the delivery strategist drafted the retune and the maintainer approved it the same day with changes, all written in [the ratios note](../notes/2026-09-26-diablo-ii-act-1-ratios.md): health, regeneration, and speed as drafted; attack damage twice the draft, since the draft discounted each hit by Diablo II's hit chance and this game has no miss; `boss_health_multiplier` 10 to 4; both tier damage multipliers 1.5, built as P6-S29-T08; `self_heal` 40 a second to 10; the last boss left a boss-tier brute, the gap to Andariel the Deferred row "A dedicated last boss"; spells not changed. The Build, Acceptance, and Tests below were rewritten to the approved numbers; the size stays 1.5, since the tier damage multiplier's domain half is T08's.

**Build:** Every fighting archetype retuned to the table in [the ratios note](../notes/2026-09-26-diablo-ii-act-1-ratios.md#the-approved-numbers), each mapped to its Act 1 monster there and the mapping written in its entry of the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), with a link to the note. The numbers, health, health regeneration a second, movement speed, attack damage:

| Archetype | Health | Regen | Speed | Damage |
| --- | --- | --- | --- | --- |
| `melee_grunt` | 95 | 0.2 | 155 | 26 |
| `fast_runner` | 25 | 0.1 | 250 | 18 |
| `ranged_archer` | 100 | 0.2 | 225 | 24 |
| `frost_raider` | 60 | 0.1 | 240 | 30 |
| `lancer` | 55 | 0.1 | 225 | 38 |
| `hexer` | 65 | 0.1 | 210 | 30 |
| `trapper` | 95 | 0.1 | 210 | 30 |
| `skirmisher` | 65 | 0.1 | 265 | 34 |
| `tank` | 100 | 0.2 | 195 | 58 |
| `troll` | 125 | 0.6 | 225 | 64 |
| `summoner` | 60 | 0.1 | 210 | 46 |
| `crusher` | 110 | 0.2 | 210 | 62 |
| `imp` | 25 | 0 | 265 | 20 |
| `brute` | 85 | 0.2 | 225 | 46 |

In `src/content/tuning.ts`: `elite_health_multiplier` stays 3, `boss_health_multiplier` 10 to 4, `elite_damage_multiplier` and `boss_damage_multiplier` 1 to 1.5, the experience multipliers unchanged. `self_heal`'s heal 40 a second to 10, so a boss troll does not outheal the hero. Attack timings, armour, magic resistance, mana, ranges, radii, and every other ability number stay; the training dummy is not retuned. Experience per kill does not move, so the levelling budget of Q58 and the spec does not either. The last boss stays a boss-tier brute, 340 health. Every archetype is now slower than the hero's 280, so the catalogue's role lines for the runner ("not kited") and the skirmisher ("faster than the hero, caught by a spell") are rewritten: the runner dies to one hit and is not a kiting problem, and the skirmisher is outranged by the hero's 600. Sections 3, 5, and 7 of the catalogue carry the new numbers, the mapping, the balance goals as the recordings now read, and the flag, from the ratios note, that spells overkill early enemies and the last boss, not changed and left to the clean run. The balance hero and archetypes sessions are recorded again with `HELIX_RECORD=balance pnpm test tests/simulation/replays/record-balance.spec.ts`, the spells session and the boss encounter by their own specs' recording steps.

**Acceptance:**
- Every normal fighting archetype dies to 1 to 4 of the hero's basic attacks of 42, after its armour, the imp included; the basic attack's damage does not grow with level, so this holds at every region's level.
- Every archetype's health, regeneration, speed, and damage are the table's; each catalogue entry names its monster and links the ratios note.
- Hits to kill the hero at its region's entry level are about half the draft's, 17 to 33 for a normal fighting archetype and 53 for the imp, as the note's table gives them; an elite or a boss lands 1.5 times its archetype's hit.
- Elites are 3 times a normal's health and bosses 4 times: the boss grunt 380, the boss frost raider 240, the boss skirmisher 260, the boss troll 500, the last boss 340.
- Every archetype's speed is below the hero's 280, and the runner's and skirmisher's role lines no longer say they outrun it.
- The spec's budget still reaches level 10 with the last boss's kill and not before; no experience value moved.
- The balance hero, archetypes, and spells sessions and the boss encounter recorded again, their specs moved to the goals the catalogue now states. The corridor session recorded again if its specs read positions the new speeds move, with every bar held as written; if a bar fails at the new speeds, the ticket reports it and the maintainer chooses, as P6-S29-T04 did, rather than loosening it. The phase 1 session re-stamped; the long-road stress case green.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/content/catalogues.spec.ts`: hits to kill of 1 to 4 per normal archetype at 42 after armour; the tier health multipliers at 3 and 4 and the damage multipliers at 1.5; experience and the level budget unchanged.
- `tests/content/enemies.spec.ts`: every fighting archetype's speed below the hero's; the exception for an archetype that outruns the hero is removed, since none does.
- `tests/simulation/enemies/tiers.spec.ts`: moved to the new defaults, the boss at 4 times.
- `tests/simulation/replays/balance.spec.ts` and `tests/simulation/boss-encounter.spec.ts`: on the recorded logs, the goals the catalogue states.
- `tests/simulation/corridor-200.spec.ts`: every bar on its log, recorded again if the speeds move it.
- `tests/simulation/stress.spec.ts`: the long-road case reaches the last boss with the cap held.

**Definition of done:** Every change · A documentation change.

Built 2026-09-26. Two of the corridor session's bars failed at the new speeds, and the ticket stopped for the maintainer rather than loosen a bar or lay the packs again; [Q72](../backlog/open-questions.md) answers both, below. The fourteen archetypes carry the table's health, regeneration, speed, and damage; `boss_health_multiplier` is 4, both tier damage multipliers 1.5, and `self_heal` 10 a second. Every fighting archetype dies to one to four of the hero's 42 after its armour and walks under the hero's 280; the level budget is 5408 before the last boss and 6308 with it, level 10, as before. The long-road stress walk ends at level 9 with no death on the old numbers and on the new, in 4337 ticks against 8413.

The six logs are on content version `08d1c2e4`. The balance hero, spells, and archetypes sessions are recorded again by the drivers under `tests/helpers/recording/`; the spells session had been recorded with the panel, and re-stamped it no longer read what it was: kills at orb level 1 levelled the hero past 3, and the orb 7 Hoarfrost named a grunt that no longer stood. It gains a driver that plays it as section 8 of the spell catalogue describes, and the tank's combo, which a 100-health tank cannot take, becomes a level-1 hero standing against one tank. What moved, before to after: a level-1 hero standing against five grunts kills 2, not 0, and still falls; five runners all die, one attack each, where the hero fell; at level 10 it clears grunts, runners, and archers, and kills 3 tanks, not 0; at level 20 it clears all four. The kite kills the grunt in about 8 s with three shots, not 45 s, still unhit. The runner walking the circle no longer reaches the hero, where it landed five hits. The standing archer takes about 10 health a second and the walking about 3, where they were 9 and 5. The tank dies to four attacks, and to any one of Updraft, Zenith, Bolide, Clarion, or Glacier at orb 7, where no single spell took half. In the spells session no spell thrown alone kills a grunt at orb 1, and each level kills more of the pack or as many and deals more. `balance.spec.ts` reads those goals: the level pinned at a block's start and allowed to rise inside it, and stronger meaning more kills or as many and more damage. The boss-encounter and phase 1 logs are re-stamped, their specs unchanged and green. `corridor-200` is re-stamped, and fails as Q72 says.

Tests moved: `catalogues.spec.ts` gains the hits to kill, the tier multipliers at 3, 4, and 1.5, the experience multipliers, and the budget pinned at 5408 and 6308; `enemies.spec.ts` holds every fighting archetype, the imp included, under the hero's speed, in place of the grunt-below, runner-above case; `tiers.spec.ts` reads the boss at 4 and both damage multipliers at 1.5; `unit-speed.spec.ts` says the hero gains on a runner; `against-enemies.spec.ts` fights back with a grunt of 1000 health, since three attacks now kill a content grunt before it closes; `damage-types.spec.ts` holds its matrix targets at a deep health and throws the live Clarion at orb 1, 40 on a 25-health runner and 30 on the tank; `panel.spec.ts` reads the grunt's and the runner's health from their definitions. The enemy catalogue's sections 1 to 5 and 7 carry the numbers, a Diablo II monster row per entry with a link to the ratios note, the tiers, the sessions as they now read, and what spells do to the new numbers; the spell catalogue's section 8 and self-heal rate, the enemies page's tier table and role lines, the adding-an-enemy runbook's example and rule, the adding-a-spell runbook's recording step, and the development page's recording line are corrected. The ratios note's flag that Siphon removes every caster in one cast at Whorl 1 does not hold: 100 mana burned is 50 damage, short of the archer's 100, the hexer's 65, and the summoner's 60, and the catalogue says what holds. `pnpm check` exits 1 on the two corridor bars alone: lint, typecheck, build, and 3725 tests pass, the stress tier included, 5 skipped, 1 todo.

On Q72's answer, 2026-09-26: `corridor-200.spec.ts` restates the touching bar as 90 ticks at a grunt speed of 240, scaled to the grunt's definition, 139.4 ticks at 155, and the pile's 110 holds. The log's one changed input is the lift, 900 ticks scaled the same way to 1394, so the hero lands on tick 1799; the log runs on idle to tick 1440, about five seconds after all 200 are home on tick 1297. Every bar holds. The ratios note's Siphon line is corrected. Closed 2026-09-26: `pnpm check` exit 0.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 6 gate rows | Walked headless 2026-09-26 by T01, in the [gate walk](#phase-6-gate-walk): six rows hold on what an agent can verify, and the docs row holds since T02 on its checklist. Walked again after the maintainer's clean run the same day: the level row by play, the replay row, and the triage row hold. The bar in Chrome, Firefox, Safari, and Edge waits on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| The bucket: days spent of four, and what was cut to Deferred | Triaged 2026-09-26: 4 of 4 committed, 2.5 in sprint 29 to P6-S29-T03 to T06 and 1.5 here to T03, then P6-S29-T07, 0.5, unplanned and approved by the maintainer the same day, 4.5 of 4 on sprint 29's buffer; then P6-S29-T08, 0.5, from Q71's answer, unplanned and approved by the maintainer the same day, 5 of 4, sprint 29's buffer spent, nothing cut; spent 2026-09-26, T03 done at about 1.75 of its 1.5, so the bucket closes at about 5.25 of 4. Deferred: the hero's side toward Diablo II curves, a bet of its own, and a dedicated last boss. Was: 0 of 4 spent while the triage waited on a person |
| Milestone M10 | Reached 2026-09-26 on what an agent can verify, and confirmed by the maintainer's clean run the same day: level 10 at the last boss's kill by play, the session replaying identically, the feedback triaged. The bar in Chrome, Firefox, Safari, and Edge is the one row left, a box in STATUS.md. Was: the play, the triage, and the replay waited on a person |
| Actual days per ticket | T01: 0.25 of 1 · T02: 0.5 of 0.5 · T03: about 1.75 of 1.5 of agent work, the quarter over for Q72's corridor rounds, done 2026-09-26. Bucket 1.5 of 1.5 committed to T03, spent 1.75. Sprint: sized 3 and the bucket's 1.5, done in 2.5; closed 2026-09-26 on what an agent can verify, and closed again the same day with T03 done |

### Phase 6 gate walk

Walked 2026-09-26 on the Apple M1 laptop, headless, by the engineer running the plan, on commit `f23af0a` plus this ticket's plan edits. The rows of the [phase 6 gate](../04-phase-exit-gates.md#phase-6-gate), in order. Anything that needs a person, the playtest, the triage, or a GPU browser, is deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24.

| Row | Holds | Evidence |
| --- | --- | --- |
| The hero can walk the long road from the spawn at level 1 to the last boss and reach about level 10 | Yes, 2026-09-26, headless and by the maintainer's clean run | `tests/content/maps.spec.ts`: a small unit and a hero unit each walk from the spawn through the six checkpoints in order to the last boss's pack. `tests/content/catalogues.spec.ts`: the spec's budget reaches level 10 with the last boss's kill and not before, and stays under level 11. `tests/simulation/replays/long-road-playtest.json`, the clean run on seed 3742014961 and content version `08d1c2e4`: `long-road-playtest.spec.ts` prints "the last boss killed on tick 12961 at hero level 10", with no `level_up` in the log; its 2 `heal` and 8 `restore_mana` grant no experience. Was: the session did not exist, so the spec skipped |
| Every pack on the long road places | Yes | `tests/content/maps.spec.ts`: `long_road` places each of its 32 packs on its empty map within the placement radius, every one at least 256 from an obstacle and 1080 from a checkpoint |
| Live enemies never pass the cap, and no pack is refused silently | Yes | `pnpm test:budget`, 6 of 6 green, the long-road case among them: the live count at or under 200 on every tick of the walk from the spawn to the last boss, no `enemy_cap_reached`, the packs behind asleep. `tests/content/maps.spec.ts`: no walkable point on `long_road` has more enemies within the sleep radius than the spec's bound |
| The hero takes the smaller share of push-out (Q31) | Yes, at Q59's provisional default | `tests/domain/movement/collision.spec.ts` green, the even split at 0.5 to the bit. `tests/simulation/corridor-200.spec.ts`, 8 green: at a share of 0 the press carries the hero less than 20 units in fifteen seconds, and the overlap bar holds at the default. The default stays at 0.5, not the gate's 0, because the overlap bar fails at 0; that is Q59, decided provisionally and waiting on the maintainer |
| Death comes back at the furthest checkpoint; packs sleep and wake with their survivors | Yes | `tests/domain/map/checkpoint.spec.ts`, `tests/simulation/hero/death.spec.ts`, and `tests/simulation/enemies/dormancy.spec.ts` green: the respawn at the furthest after walking back, a killed pack kept dead through a death, a pack asleep past the sleep radius and woken with its survivors, and sleep and wake allocating nothing |
| The playtest session replays identically | Yes, 2026-09-26, on the final content version `08d1c2e4` | `tests/simulation/replays/long-road-playtest.spec.ts` passes on the stored clean run, 13164 ticks: two replays agree at every tick. No F9 file was filed, so no feedback file loads at a tick and that half holds with nothing to load. Was: the spec skipped until the session was stored |
| The maintainer has played the long road and filed feedback, and it is triaged | Yes, 2026-09-26 | The first run reached the last boss only with 19 panel level-ups and was discarded by the maintainer; its five notes, given in chat, are triaged in the [triage note](../notes/2026-09-26-long-road-triage.md), 4 of 4 days committed, 5.25 spent. The clean run after T03 filed no F9 file; its two points came in chat and each has an outcome in the note's [clean run](../notes/2026-09-26-long-road-triage.md#the-clean-run) table: the five fixes feel much better, no change; the 2 heals and 8 mana restores, accepted by the maintainer pending loot, to Deferred's "Health and mana from loot drops". No new ticket. Q57's final value and Q59 to Q67 are not settled by it and wait on the maintainer's answers; the gate row does not ask for them |
| The docs are in sync | Yes, 2026-09-26 | P6-S30-T02's checklist above. This ticket changes plan files only |
| The bar | Headless, yes; per browser, waiting on a person | Tick: the long-road case's production-build reading under P6-S28-T03, mean 0.019 to 0.026 ms and worst 0.62 to 3.49 ms, stands, since nothing under `src/domain/` or `src/simulation/` has changed since; the case is green under `pnpm test:budget` today. The walk holds at most 10 enemies live, so the tick at 200 is the arena cap cases', green in the same run. Tests in Node: `pnpm check` green. Frame rate, sync, render, and world draw calls at the densest choke in Chrome, Firefox, Safari, and Edge are a person's |

## Risks in this sprint

- A number the bucket moves re-records the balance logs and re-stamps the playtest session. Leave a day between the last bucket ticket and the gate so the gate reads the final version.
- T03 cuts the grunt from 240 to 155 and every other speed but the crusher's, and the corridor session is tuned to its crowd: P6-S29-T04 tried 54 pack layouts before one met every bar. If the corridor's bars fail at the new speeds, the retune overruns its 1.5; the ticket reports the failing bar and the maintainer chooses, and the bar is not loosened to fit.
