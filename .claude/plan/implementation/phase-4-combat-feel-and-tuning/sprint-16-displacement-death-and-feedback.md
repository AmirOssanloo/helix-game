# Sprint 16 — Displacement, death handling, and feedback

**Phase:** 4 · **Sized days:** 4 · **Buffer:** 1

## Goal

Every edge case the product pages list for displacement, death, and feedback is a named test, and every feedback timing is a tunable.

## Playable outcome

Blast a pack into a wall and nothing clips. Die mid-Updraft and nothing breaks. Numbers are coloured by type.

---

## Tickets

### P4-S16-T01 — Displacement edge cases

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1 |
| Depends on | P3-S15-T03 |
| Status | planned |

**Build:** Tests and fixes for: knockback into an obstacle stops at the edge; knockback keeps the order and resumes it; lift suspends the order and restores it on drop; rooted while lifted drops where the updraft leaves and root keeps counting; a lifted unit cannot be hit, targeted, or acquired; the hero knocked into a wall (a debug displacement or a phase 5 charge stub); displacement against another unit pushes both by the collision rule; two displacements in one tick apply in order.

**Acceptance:**
- Each case is a test named after the row on the status or map page, and green.

**Tests:**
- `tests/simulation/feel/displacement.spec.ts`.

**Definition of done:** Every change · `src/domain`.

---

### P4-S16-T02 — Death handling edge cases and damage-number colours

| Field | Value |
| --- | --- |
| Layer | domain, presentation, tests |
| Size | 1.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Tests and fixes for every death row on the hero, enemies, spells, and status pages: hero dies with enemies chasing; respawn on an occupied spot; killed during a cast point; killed with a projectile in flight; summon out when the hero dies; status on a dying unit; enemy killed while returning; enemy summon adds at the cap (stubbed until phase 5); dummy at lethal. Damage numbers take a colour per type from a small tunable table; crit styling stays deferred.

**Acceptance:**
- Each row a named green test.
- Physical, magical, and pure numbers are distinguishable by eye.

**Tests:**
- `tests/simulation/feel/death.spec.ts`; `tests/presentation/floating-number.spec.ts` extended for colour.

**Definition of done:** Every change · `src/domain` · Anything under `src/presentation`.

---

### P4-S16-T03 — Feedback timings as tunables

| Field | Value |
| --- | --- |
| Layer | content, presentation, devtools, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | planned |

**Build:** Flash duration, number rise distance and fade duration, refusal flash duration, wedge sweep smoothing, and the camera lerp as tunables in the tuning table with panel sliders. Presentation reads them through the world view's tuning state, so a change is in the log.

**Acceptance:**
- Each slider changes the visible behaviour on the next event and lands in the input log.

**Tests:**
- `tests/simulation/dev-api.spec.ts` extended.

**Definition of done:** Every change · A developer-panel control · Anything under `src/presentation`.

---

### P4-S16-T04 — Experience flow verified and hero-death acceptance tests

| Field | Value |
| --- | --- |
| Layer | tests, domain |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** A level-curve test walking 1 to 30 against the table with literal thresholds; the skill-point marker and spend from both the HUD and the panel; the level-cap edge; every hero-page death row as a named test in the style of the mechanics spec's acceptance tests; replay tests for any bug found in the phase 3 gate not yet covered.

**Acceptance:**
- All green; the hero page's states table is fully covered by name.

**Tests:**
- `tests/simulation/hero/experience.spec.ts` extended; `tests/simulation/hero/death.spec.ts` extended; replay specs as needed.

**Definition of done:** Every change · `src/domain`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every displacement and death row green by name | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- Presentation reading tunables through the world view is the only way a feedback timing can be in the log. Do not read the content module from presentation.
