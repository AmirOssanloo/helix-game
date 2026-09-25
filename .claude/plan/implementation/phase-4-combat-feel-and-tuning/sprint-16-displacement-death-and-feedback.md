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

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. Three grunts lifted out of a walking pack of ten stayed where they were lifted while the rest walked round them; Clarion did not carry them; Hoarfrost at one was refused as `target_untargetable`. Q32 answered: the held disc stays.

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

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. A Zenith's gold 475, Bolide's blue burn, and a red physical hit read apart at a glance on one dummy. Q33 answered: the colours stay. The render benchmark waits for the hardware sitting.

---

### P4-S16-T03 — Feedback timings as tunables

| Field | Value |
| --- | --- |
| Layer | content, presentation, devtools, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | done |

**Build:** Flash duration, number rise distance and fade duration, refusal flash duration, wedge sweep smoothing, and the camera lerp as tunables in the tuning table with panel sliders. Presentation reads them through the world view's tuning state, so a change is in the log.

**Acceptance:**
- Each slider changes the visible behaviour on the next event and lands in the input log.

**Tests:**
- `tests/simulation/dev-api.spec.ts` extended.

**Definition of done:** Every change · A developer-panel control · Anything under `src/presentation`.

**Note, 2026-09-24: six feedback timings in the tuning table, read through the world view.** The tuning table gains `hit_flash_duration` 0.133 s, `refusal_flash_duration` 0.333 s, `damage_number_rise` 56 pixels, `damage_number_fade_duration` 1 s, `cooldown_wedge_steps` 64, and `camera_follow_lerp` 0.1. Each default is the constant it replaces, so nothing on screen changes until a slider moves. A new `pixels` unit is read as written. The tuning group makes a slider for each one with no change of its own, and a move is a `set_tuning` in the log like any other. Presentation reads them from `world.run.tuning` and never from the content module. The hit flash and the number's life are read as the hit is shown. The refusal flash is read as the refusal is flashed, by the HUD and the mapper. The rise, the wedge's steps, and the lerp are read each frame. A flash or a number already showing keeps the length it began with. The constants `HIT_FLASH_TICKS`, `FLASH_TICKS`, `FLOATING_NUMBER_TICKS`, the rise, and `FOLLOW_LERP` are gone. "Wedge sweep smoothing" is read as the number of steps the sweep moves in, held to the 64-frame sheet (`wedgeFrameFor`). That reading, the key names, and when a change applies are decided provisionally in [Q34](../backlog/open-questions.md). The content version changes with the table, so the two stored replays are re-stamped. Both still replay identically, because nothing in the simulation reads the new keys. The presentation, developer panel, HUD, and map pages are updated. Tests: `tests/simulation/dev-api.spec.ts` gains a case per key, checking the log and the converted value in the world view. `tests/presentation/hud.spec.ts` gains a tuned refusal flash and a tuned wedge. `tests/presentation/hit-feedback.spec.ts` gains a tuned hit flash and a tuned number life. `tests/presentation/world-camera.spec.ts` is new, for the lerp. Specs read the defaults through `FEEDBACK_TIMINGS` in the helpers. `pnpm check` and `pnpm test:budget` green. The slider walk by eye and the render benchmark after the view change are deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, under "Waiting on a person" in STATUS.md.

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. The six keys set away from their defaults each land as a `set_tuning` line in the saved log; a wedge at 4 steps shows exactly three quarters; a lerp of 0.02 leaves the camera trailing the hero. Q34 answered as decided. The render benchmark waits for the hardware sitting.

---

### P4-S16-T04 — Experience flow verified and hero-death acceptance tests

| Field | Value |
| --- | --- |
| Layer | tests, domain, presentation |
| Size | 1 |
| Depends on | T02 |
| Status | done |

**Build:** A level-curve test walking 1 to 30 against the table with literal thresholds; the skill-point marker and spend from both the HUD and the panel; the level-cap edge; every hero-page death row as a named test in the style of the mechanics spec's acceptance tests; replay tests for any bug found in the phase 3 gate not yet covered.

**Acceptance:**
- All green; the hero page's states table is fully covered by name.

**Tests:**
- `tests/simulation/hero/experience.spec.ts` extended; `tests/simulation/hero/death.spec.ts` extended; replay specs as needed.

**Definition of done:** Every change · `src/domain` · Anything under `src/presentation`.

> Edited 2026-09-24: presentation added to the layer and the definition of done, because the hero page's "targeting closes" on death failed as a named test and its fix is in the input mapper.

**Note, 2026-09-24: the curve walked with literal thresholds, the states table named, and one fix.** `tests/simulation/hero/experience.spec.ts` writes the thirty thresholds out as literals and checks the content table against them. It then walks 1 to 30, holding one experience short of each threshold at the level below and reaching it at the threshold, with its skill point and its strength. The panel's Level up climbs the same curve a level a press. A point from Level up spends on the orb the slot names, as the HUD's click does. Set orb levels assigns without touching the points. At 30, Level up is refused as `at_level_cap` and changes nothing, a point unspent is kept and still spends, and kills worth more than the last gap land on the cap's threshold. The states table on the hero page is covered by name. "Level cap reached" and "Skill point unspent" are in the experience spec. "Zero mana and R pressed" and "Regeneration while at full" are in `tests/simulation/hero/death.spec.ts`. The three death rows were named in `tests/simulation/feel/death.spec.ts` by T02 and are not repeated. The death paragraph gains the one claim no case held: death costs nothing, with experience, level, and points unspent the same through the death and the respawn. "Targeting closes" did not hold. A slot or attack-move cursor opened before the death stayed open on a dead hero. The input mapper's per-frame check now closes every cursor when the hero is dead, at no cost and with no flash, like a stun. It is tested in `tests/presentation/input-mapper.spec.ts`, and the presentation page states it. The HUD half of the skill point is in `tests/presentation/hud.spec.ts`: a level from the panel raises the marker, a click spends the point through the world, and the marker goes. The phase 3 gate found no bug, so no replay spec was added. `src/domain` did not change, so its rows are not applicable. The input mapper is not a view and the atlas did not change, so the render benchmark row is not applicable. `pnpm check` and `pnpm test:budget` green.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every displacement and death row green by name | Yes. Seventeen displacement cases in `tests/simulation/feel/displacement.spec.ts` (T01). Twelve death rows and two lift cases in `tests/simulation/feel/death.spec.ts`, with the enemy summon at the cap an `it.todo` until an enemy ability summons (T02). The hero page's states table and death paragraph by name in `tests/simulation/hero/` (T04). By-eye checks of T01 to T03 are deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md |
| Actual days per ticket | T01 0.4 · T02 0.4 · T03 0.3 · T04 0.3. Sized 4, done in 1.4 |

## Risks in this sprint

- Presentation reading tunables through the world view is the only way a feedback timing can be in the log. Do not read the content module from presentation.
