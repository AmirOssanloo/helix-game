# Sprint 21 — Tiers, the roster, and the boss encounter

**Phase:** 5 · **Sized days:** 4 · **Buffer:** 1

## Goal

Elite and boss tiers multiply and add abilities, the enemy catalogue's roster exists as definitions with the six standard tests each, and one boss encounter with adds runs within the cap decided at the end of phase 4.

## Playable outcome

A boss and its adds among two hundred grunts, fought with the full kit, within the bar.

---

## Tickets

### P5-S21-T01 — Tiers

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, devtools, tests |
| Size | 0.5 |
| Depends on | P5-S20-T02 |
| Status | done |

**Build:** Tier multipliers as tunables: elite health ×3 with one extra ability from a per-archetype `eliteAbility` field; boss ×10 with a `bossAbilities` list; outline frames per tier; the panel's tier selector applies at spawn. A boss is stunned like a grunt; no immunity.

**Acceptance:**
- An elite grunt has triple health and its extra ability; a boss has ten times and its list; Hoarfrost stuns the boss.

**Tests:**
- `tests/simulation/enemies/tiers.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new enemy or behaviour · A developer-panel control.

> **Note, 2026-09-25:** the outline per tier and the panel's tier selector were already built, by the outline view kind and the enemies group, with their tests in `tests/presentation/unit-view.spec.ts` and `tests/devtools/panel.spec.ts`, so this ticket changed neither. What it built: the `elite_health_multiplier` and `boss_health_multiplier` tunables, read at spawn; `eliteAbility` and `bossAbilities` on every unit definition, validated by the registry and joined after the definition's own list per tier on the unit record, which the selection rule and the cast pipeline read by the unit's tier; and the grunt's picks. The readings the ticket left open are Q45, decided provisionally.

---

### P5-S21-T02 — The roster: catalogue and definitions

| Field | Value |
| --- | --- |
| Layer | docs, content, tests |
| Size | 2 |
| Depends on | T01, P5-S19-T04 |
| Status | done |

**Build:** The enemy catalogue's phase 5 section: a long roster (twelve to sixteen archetypes) composed from the three existing behaviours, the two new ones next ticket, and the nine abilities, each with a role in one line, its numbers, its colour and frame, its tier eligibility, and its elite and boss ability picks. One definition file per archetype, registered, each with the six standard tests from the adding-an-enemy runbook plus one per ability effect.

> **Note, 2026-09-25:** the section's headings are drafted, by P4-S18-T04: [section 7 of the enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md#7-the-long-roster) holds how an entry reads, the table at a glance, the entries, experience across the roster, and the frames the roster adds, each with one sentence saying what goes there. This ticket writes the content under them.

**Acceptance:**
- `ls src/content/enemies/` matches the catalogue; every archetype's six tests are green; the dropdown lists them all.

**Tests:**
- `tests/simulation/enemies/<archetype>.spec.ts` per archetype.
- `tests/content/enemies.spec.ts` extended.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

> **Note, 2026-09-25:** the roster is thirteen, the four and nine new: the brute, the frost raider, the hexer, the trapper, the skirmisher, the crusher, the summoner, the lancer, and the troll, in [section 7 of the enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md#7-the-long-roster). Each of the nine enemy abilities is in at least one of their own lists or statuses, and each carries an elite ability and boss abilities it does not already cast; the brute at boss tier is a bash, a slam, adds, and a charge. The six standard tests are mounted by `describeArchetype` under `tests/helpers/world/`, as the risk below asked, and each spec adds one test per ability effect, two for the crusher's slam. The hexer, the skirmisher, and the lancer name `ranged_holder` and `melee_chaser` until T03 registers theirs; T03 carries the switch. `tests/content/catalogues.spec.ts` now also reads the roster's entries and summary rows against the files and checks the catalogue names every file under `src/content/enemies/` and no other. The five stored replay logs are re-stamped for the new content version. The panel check by hand is deferred until phase 5 is done under Waiting on a person. Q46 records the readings as provisional.

---

### P5-S21-T03 — New behaviours the roster needs

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | done |

**Build:** `ranged_kiter` (backs away when the hero closes, keeps firing) and `charger` (waits at range for its charge clock, then closes), registered by key; one test per transition each.

**Acceptance:**
- A kiter backs off along a path and fires; a charger waits and charges when ready.

**Tests:**
- `tests/simulation/ai/transitions.spec.ts` extended.

**Definition of done:** Every change · `src/domain` · A new enemy or behaviour.

> **Note, 2026-09-25:** the roster names these two behaviours for three archetypes before they exist, so it writes the nearest registered key in their place: the hexer and the skirmisher hold as `ranged_holder`, and the lancer closes as `melee_chaser`. This ticket also switches those three definitions to `ranged_kiter` and `charger`, their rows in section 7 of the enemy catalogue, and the range test each passes through `describeArchetype`, which for a kiter reads the gap it backs away to. Q46.

> **Note, 2026-09-25:** built. `ranged_kiter` and `charger` are registered under `src/domain/ai/behaviours/`. The machine behaviour gains `kites`, which the Attack step reads: a kiter the hero has come nearer than a second hold margin inside its hold point backs away to that point along a path while its attack is on its clock, and turns to fire when the clock allows. The standing rule is now handed the world, so the charger reads the clock of the first ability its list names at its tier and waits at that ability's range less the margin until it is ready. A unit whose standing point is where it stands stops rather than walking to its own feet. The hexer and the skirmisher name `ranged_kiter` and the lancer `charger`, in their definitions and in section 7 of the enemy catalogue. `tests/simulation/ai/transitions.spec.ts` runs every shared transition under both new keys and adds four cases for the kiter and five for the charger; `describeKiting` under `tests/helpers/world/` gives the hexer and the skirmisher their kiting case, and the lancer spec gains its waiting case. The runbook's behaviour step and the enemies page's behaviour table follow. The five stored replay logs are re-stamped for the new content version. Q47 records the readings as provisional.

---

### P5-S21-T04 — The boss encounter

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 1 |
| Depends on | T02, T03 |
| Status | done |

**Build:** One boss definition with a bash, a slam, adds, and a charge, spawned from the panel at boss tier among grunts, the boss and its adds counting inside `ENEMY_LIVE_CAP`, the constant inside the unit pool's capacity, at the number phase 4 decided, because they are enemies (Q9); a stress test variant with the boss and its adds; readouts recorded in Chrome; a recorded and replayed encounter.

**Acceptance:**
- Every row of the bar holds during the encounter; the replay matches.

**Tests:**
- `tests/simulation/stress.spec.ts` extended with the boss variant.
- `tests/simulation/replays/boss-encounter.json` and its spec.

**Definition of done:** Every change · A new enemy or behaviour.

> **Note, 2026-09-25:** built. The boss is the brute at boss tier: T02 gave the brute's definition a bash it carries and boss abilities of a slam, adds, and a charge, so no new definition was written and the new-enemy rows of the definition of done are met by T02's file and its six tests. Q48. The recorded session is `tests/simulation/replays/boss-encounter.json`, 1200 ticks and 271 commands, every one a kind the panel or the player sends: the brute spawned at boss tier by `spawn_pack` 550 west of the hero, and nineteen packs of grunts and runners, 197 enemies, on a ring round the hero, so the boss's two imps fill `ENEMY_LIVE_CAP` at 200. The hero, orbs at 7 and mana without end, invokes and casts Hoarfrost, Bolide, Zenith, Updraft, and Glacier at the boss as each comes off its clock, attacks it between casts, and is healed every ten ticks; the boss bashes, slams, summons, and charges, is carried off its leash as the crowd shoves the hero north, walks home, and takes the hero up again. `tests/simulation/boss-encounter.spec.ts` checks the boss's tier and health, that it bashes and commits its three tier abilities, that the hero commits all five spells, that the adds make 200 and never 201, that no tick announces more than 714 events and a reader draining every tick loses none, and that two replays agree at every tick. The stress spec's fourth case puts the boss 500 west of the hero among 197 grunts and runners on the ring, all struck once, with the hero's loop and a hundred shots, and asserts the mean tick under 4 ms, 200 enemies at the end and never more, and the heaviest tick at or under 714 events. It is the heaviest case in the file: the bash stuns the hero early, the crowd closes on it, and it walks 570 units in the measured ten seconds against 2198 in the chase case, with some 75 enemies within 200 against 22 and 93 shots landing and respawned a tick against 37. Under Vitest's development build that reads 3.15 to 3.40 ms mean over five runs, against 1.93 to 2.01 for the chase; a normal-tier brute in the boss's place reads the same, so the cost is the hemmed-in hero, not the boss's abilities. Measured as phase 4's headroom table was, a Vite production build in plain Node v24.21.0 on the Apple M1 laptop, 1200 ticks of warm-up and 1800 measured, load 2.7 to 3.2, 21 runs: mean 0.58 to 0.69 ms, median 0.58 to 0.60, p99 0.81 to 1.83, worst 1.33 to 3.19 on nineteen and one stalled tick on two, 26.7 and 55.9 ms, with p99 0.90 and 1.83; `--trace-gc` on six runs shows no collection over 1.3 ms, so the two are read as scheduler stalls, as phase 4 read its 3.11 at 100. The chase case beside it, five runs: mean 0.52 to 0.56, worst 1.28 to 3.13. The heaviest tick announces 209 events against the ring's 714, so the ring is not resized; pool misses 0. The boss adds about 0.07 ms to the mean against the chase. The case leaves the least margin of the file under Vitest, some 0.6 ms: one `pnpm check` on a machine at load 52, where the chase case read 4.66 ms, failed it at 4.23 along with four replay tests that timed out, and the same tree was green at load 5. Starting the boss 800 or 1100 west instead of 500 reads the same within noise, since the bash traps the hero wherever it starts. The cap stays 200 on this reading; the phase 5 README records why. Readouts in Chrome, and the encounter by hand, wait on a person, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24. The performance standard, the development workflow, and the onboarding page name the boss case among the stress cases, and the performance standard now also names the zones case it had left out.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Roster complete and green; boss encounter readouts | Green, 2026-09-25: `ls src/content/enemies/` matches section 7 of the enemy catalogue, which `tests/content/catalogues.spec.ts` checks, and every archetype's six tests are green. The boss encounter replays identically in `tests/simulation/boss-encounter.spec.ts`, and the stress spec's boss case holds the mean tick under 4 ms. Headless in a production build, 21 runs: mean 0.58 to 0.69 ms, worst 1.33 to 3.19 on nineteen runs, two single-tick scheduler stalls, heaviest tick 209 events, pool misses 0. The readouts in Chrome, the roster, tiers, and behaviours by hand, and the encounter by hand wait on a person, deferred until phase 5 is done |
| Actual days per ticket | T01 0.3 · T02 0.6 · T03 0.2 · T04 0.3. Sized 4, done in 1.4 |

## Risks in this sprint

- Sixteen archetypes times six tests is a hundred tests. They are copies of a pattern; if writing them takes more than the two days, the pattern needs a fixture helper, not more days.
