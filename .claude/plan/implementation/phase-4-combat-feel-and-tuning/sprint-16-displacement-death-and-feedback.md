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
| Status | done |

**Build:** Tests and fixes for: knockback into an obstacle stops at the edge; knockback keeps the order and resumes it; lift suspends the order and restores it on drop; rooted while lifted drops where the updraft leaves and root keeps counting; a lifted unit cannot be hit, targeted, or acquired; the hero knocked into a wall (a debug displacement or a phase 5 charge stub); displacement against another unit pushes both by the collision rule; two displacements in one tick apply in order.

**Acceptance:**
- Each case is a test named after the row on the status or map page, and green.

**Tests:**
- `tests/simulation/feel/displacement.spec.ts`.

**Definition of done:** Every change · `src/domain`.

**Note, 2026-09-24: seventeen cases, four fixes, and one reading decided provisionally.** `tests/simulation/feel/displacement.spec.ts` names each case after its row on the status, spells, or map page. Eleven cases held already: a push into a wall stops at the edge, the order is kept through a push and through a lift, a root keeps counting under a lift, a lifted unit is out of every area and every acquire, and two pushes in one tick leave the first holding. Four did not, and each is fixed in `src/domain`. First, a push still carried a lifted unit, so a push and a lift in the same tick moved it 600 units in the air. Now a push on a lifted unit counts its ticks off without moving it. Second, a walker shoved a lifted unit off its spot in the collision pass. A lifted unit is now a disc nothing moves, and the grounded unit takes the whole overlap (`separateFromHeld`, unit-tested in `tests/domain/movement/collision.spec.ts`). Third, Hoarfrost thrown at a lifted unit walked, cast, and spent its mana. The request stage now refuses a target that is `target_untargetable`. Fourth, a target lifted during the approach or the cast point now cancels the cast at no cost, as one that dies does. The docs are silent on these, so they are written into the status, spells, movement, and pipeline pages and recorded as [Q32](../backlog/open-questions.md), provisional. Letting walkers pass under a lifted unit was tried first. It let the corridor-200 crowd flood through where the lifted hero hung, and pressed one pair to 0.80 of its summed radii, past the 0.75 bar, so the held disc stands. `tests/simulation/corridor-200.spec.ts` now measures overlap only between units on the ground. Its session is 1260 ticks, up from 1200, because with the hero held in place the last grunt gets home near tick 1230; before the change it arrived just under 1200. The worst press stays 0.68 and the walk home 0.71. The hero knocked into a wall uses a push aimed at the hero through `runPrimitive`, which stands in for phase 5's charge. No new debug command was added. `pnpm check` and `pnpm test:budget` green.

---

### P4-S16-T02 — Death handling edge cases and damage-number colours

| Field | Value |
| --- | --- |
| Layer | domain, presentation, tests |
| Size | 1.5 |
| Depends on | T01 |
| Status | done |

**Build:** Tests and fixes for every death row on the hero, enemies, spells, and status pages: hero dies with enemies chasing; respawn on an occupied spot; killed during a cast point; killed with a projectile in flight; summon out when the hero dies; status on a dying unit; enemy killed while returning; enemy summon adds at the cap (stubbed until phase 5); dummy at lethal. Damage numbers take a colour per type from a small tunable table; crit styling stays deferred.

**Acceptance:**
- Each row a named green test.
- Physical, magical, and pure numbers are distinguishable by eye.

**Tests:**
- `tests/simulation/feel/death.spec.ts`; `tests/presentation/floating-number.spec.ts` extended for colour.

**Definition of done:** Every change · `src/domain` · Anything under `src/presentation`.

**Note, 2026-09-24: twelve death rows, all holding already, and numbers coloured by type.** `tests/simulation/feel/death.spec.ts` names each death row on the hero, enemies, spells and attack, status, and map pages. Two more cases cover the sprint's "die mid-Updraft": a lifted unit that a burn kills in the air, and the hero dying with a unit in the air. The enemy summon at the live cap is an `it.todo` until an enemy ability summons adds. Every case held on the code as it stood, so `src/domain` did not change and the domain rows of the definition of done do not apply. The spec reads the hero's mana from its form, since `hero.resources` is not where the hero's resources live. The two mana checks in the displacement spec read `hero.resources` and could not fail, so they now read the form too, and they still hold. Damage numbers now take a colour per type from `DAMAGE_NUMBER_TINTS` beside the floating-number set: physical red, magical blue, pure gold. The merge window is one per unit per damage type, as the HUD page foresaw, so a burn and an auto-attack on one unit rise as two numbers. The colours and where the table lives are decided provisionally in [Q33](../backlog/open-questions.md). The HUD, spells, and presentation pages are updated, and crit styling stays deferred on the HUD page. Tests: `tests/presentation/floating-number.spec.ts` gains four colour cases, one of which checks that no two tints are alike and none is the white of the hit flash, and `tests/presentation/hit-feedback.spec.ts` gains a case for a hit of another type inside the window. `pnpm check` and `pnpm test:budget` green. The look by eye and the render benchmark after the view change are deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, under "Waiting on a person" in STATUS.md.

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
| Actual days per ticket | T01 0.4 · T02 0.4 · T03 · T04 |

## Risks in this sprint

- Presentation reading tunables through the world view is the only way a feedback timing can be in the log. Do not read the content module from presentation.
