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
| Status | planned |

**Build:** `ranged_kiter` (backs away when the hero closes, keeps firing) and `charger` (waits at range for its charge clock, then closes), registered by key; one test per transition each.

**Acceptance:**
- A kiter backs off along a path and fires; a charger waits and charges when ready.

**Tests:**
- `tests/simulation/ai/transitions.spec.ts` extended.

**Definition of done:** Every change · `src/domain` · A new enemy or behaviour.

> **Note, 2026-09-25:** the roster names these two behaviours for three archetypes before they exist, so it writes the nearest registered key in their place: the hexer and the skirmisher hold as `ranged_holder`, and the lancer closes as `melee_chaser`. This ticket also switches those three definitions to `ranged_kiter` and `charger`, their rows in section 7 of the enemy catalogue, and the range test each passes through `describeArchetype`, which for a kiter reads the gap it backs away to. Q46.

---

### P5-S21-T04 — The boss encounter

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 1 |
| Depends on | T02, T03 |
| Status | planned |

**Build:** One boss definition with a bash, a slam, adds, and a charge, spawned from the panel at boss tier among grunts, the boss and its adds counting inside `ENEMY_LIVE_CAP`, the constant inside the unit pool's capacity, at the number phase 4 decided, because they are enemies (Q9); a stress test variant with the boss and its adds; readouts recorded in Chrome; a recorded and replayed encounter.

**Acceptance:**
- Every row of the bar holds during the encounter; the replay matches.

**Tests:**
- `tests/simulation/stress.spec.ts` extended with the boss variant.
- `tests/simulation/replays/boss-encounter.json` and its spec.

**Definition of done:** Every change · A new enemy or behaviour.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Roster complete and green; boss encounter readouts | |
| Actual days per ticket | T01 0.3 · T02 0.6 · T03 · T04 |

## Risks in this sprint

- Sixteen archetypes times six tests is a hundred tests. They are copies of a pattern; if writing them takes more than the two days, the pattern needs a fixture helper, not more days.
