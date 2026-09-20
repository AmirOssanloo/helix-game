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
| Status | planned |

**Build:** Tier multipliers as tunables: elite health ×3 with one extra ability from a per-archetype `eliteAbility` field; boss ×10 with a `bossAbilities` list; outline frames per tier; the panel's tier selector applies at spawn. A boss is stunned like a grunt; no immunity.

**Acceptance:**
- An elite grunt has triple health and its extra ability; a boss has ten times and its list; Hoarfrost stuns the boss.

**Tests:**
- `tests/simulation/enemies/tiers.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new enemy or behaviour · A developer-panel control.

---

### P5-S21-T02 — The roster: catalogue and definitions

| Field | Value |
| --- | --- |
| Layer | docs, content, tests |
| Size | 2 |
| Depends on | T01, P5-S19-T04 |
| Status | planned |

**Build:** The enemy catalogue's phase 5 section: a long roster (twelve to sixteen archetypes) composed from the three existing behaviours, the two new ones next ticket, and the nine abilities, each with a role in one line, its numbers, its colour and frame, its tier eligibility, and its elite and boss ability picks. One definition file per archetype, registered, each with the six standard tests from the adding-an-enemy runbook plus one per ability effect.

**Acceptance:**
- `ls src/content/enemies/` matches the catalogue; every archetype's six tests are green; the dropdown lists them all.

**Tests:**
- `tests/simulation/enemies/<archetype>.spec.ts` per archetype.
- `tests/content/enemies.spec.ts` extended.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

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

---

### P5-S21-T04 — The boss encounter

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 1 |
| Depends on | T02, T03 |
| Status | planned |

**Build:** One boss definition with a bash, a slam, adds, and a charge, spawned from the panel at boss tier among two hundred enemies at the cap decided in phase 4; a stress test variant with the boss and its adds; readouts recorded in Chrome; a recorded and replayed encounter.

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
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- Sixteen archetypes times six tests is a hundred tests. They are copies of a pattern; if writing them takes more than the two days, the pattern needs a fixture helper, not more days.
