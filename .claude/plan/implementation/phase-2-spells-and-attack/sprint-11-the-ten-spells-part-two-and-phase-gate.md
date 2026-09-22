# Sprint 11 — The ten spells, part two, and the phase gate

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

The three hard named effects and the two remaining spells, then the phase 2 gate with twenty concurrent zones within budget.

## Playable outcome

All ten spells against the dummy. Glacier segments, a travelling updraft that lifts, a rolling meteor that burns, a cone that pushes and disarms, a emberling that fights. Milestone M4.

---

## Tickets

### P2-S11-T01 — Glacier and Updraft

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1.5 |
| Depends on | P2-S10-T04 |
| Status | done |

**Build:** Glacier: point, named effect `glacier_place` spawning N wall-segment zones in a line perpendicular to the cast direction at a distance in front of the hero, each an `aura_status` zone applying a heavy slow and a damage-over-time status, with count, spacing, duration, slow, and damage by Quartz and Ember level; wall segments block nothing (the walkability grid is static). Updraft: point, named effect `updraft_launch` spawning a `travel_line` zone that moves along the cast direction at a speed for a distance, and on first contact with each enemy applies `displace('lift')` for a duration by Whorl and Quartz level, carrying the lifted unit with the zone, then drops it with magical damage; lifted units are stunned and untargetable; Hoarfrost keeps counting while lifted; a rooted unit dropped where the updraft leaves it. Definitions, the two named effects, the zone rules they need, tests at levels 1 and 7.

**Acceptance:**
- Glacier places its segments perpendicular to facing; a dummy inside a segment's aura is slowed and burning and recovers after leaving plus the duration.
- Updraft lifts a dummy it passes, carries it, drops it after the duration with damage; a second dummy behind the first is lifted when the zone reaches it; a lifted dummy cannot be hit by a projectile.

**Tests:**
- `tests/domain/abilities/effects/glacier-place.spec.ts`, `updraft-launch.spec.ts`.
- `tests/simulation/spells/glacier.spec.ts`, `updraft.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-21:** per the catalogue Updraft is a `spawn_zone` with a line motion whose each-tick list runs the named effect `updraft_carry`, which lifts on first contact and carries; the drop and its damage are the expiry list of the `updraft_lift` status, so they happen on time after the zone is gone. There is no `updraft_launch`; the effect test is `tests/domain/abilities/effects/updraft-carry.spec.ts`. Section 3.5 of `docs/product/specs/spell-catalogue.md`.

> **Note, 2026-09-22:** Glacier is a direction spell, not a point one; sections 3.3 and 7.4 of the catalogue, and the definition and its preview were already written that way. Two pieces the build needed and did not name: the status expiry list had to be made to run, since it was declared, validated, and read by nothing, and the segment zone Glacier's named effect carries in its fields had to become something the content tier checks as an effect entry of its own, so a frame or a status id written inside it is caught at load like any other. Both are named in the ability pipeline page.

---

### P2-S11-T02 — Bolide and Clarion

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** Bolide: point, named effect `meteor_launch` spawning a delayed zone that, on landing, becomes a `travel_line` zone rolling along the cast direction for a distance, dealing magical damage each tick to units in contact and applying a `burn` damage-over-time status, by Ember and Whorl level. Clarion: point (cone), `damage_area` in the cone frame's angle, `displace('push')` along the cone direction, and `apply_status('disarm')`, all by all three levels. Definitions, tests at levels 1 and 7, the push stopping at an obstacle edge.

**Acceptance:**
- Bolide lands after its delay, rolls its distance, damages a dummy each tick of contact, and leaves it burning.
- Blast hits a dummy inside the cone and not one outside, pushes it the table distance, and disarms it; a dummy against a wall does not enter the wall.

**Tests:**
- `tests/domain/abilities/effects/meteor-launch.spec.ts`.
- `tests/simulation/spells/bolide.spec.ts`, `clarion.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-21:** per the catalogue Bolide needs no named effect: it is one `spawn_zone` with a delay, a line motion, and an each-tick list of damage area and apply status, so `meteor_launch` and its test are dropped. Clarion is a direction spell. Section 3.9 and 3.10 of `docs/product/specs/spell-catalogue.md`.

---

### P2-S11-T03 — Emberling

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | P2-S09-T02 |
| Status | planned |

**Build:** Emberling: no-target, self, `spawn_unit` of the `emberling` summon definition beside the hero with a lifetime, attack damage, and health by Ember and Quartz level, behaviour `summon_follow`. A summon definition file under `src/content/summons/` with a small-disc frame in dimmed hero white.

**Acceptance:**
- The spirit spawns beside the hero, follows, attacks a dummy in range with physical damage, expires on its timer and on hero death; it cannot be selected or ordered.

**Tests:**
- `tests/simulation/spells/emberling.spec.ts`.

**Definition of done:** Every change · A new spell, effect, or enemy ability.

---

### P2-S11-T04 — The phase 2 gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01, T02, T03, T05, T06 |
| Status | planned |

**Build:** `tests/simulation/stress-zones.spec.ts`: twenty concurrent zones and effects (a mix of walls, bolides, updrafts, and Zeniths) with 100 projectiles and one dummy, asserting the tick under budget. Rerun the bench (views changed this phase: zones, projectiles, icons, numbers). Record a session throwing all ten spells and replay it. Walk every row of the [phase 2 gate](../04-phase-exit-gates.md#phase-2-gate) and record evidence. Docs sync: world model rows for zones, projectiles, summons as kinds and the new definition kinds; where-to-look pointers run; the spells page updated if any behaviour differs from what it says. Replay tests for gate bugs. Fill the phase README's exit record and sized-versus-actual.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** `stress-zones.spec.ts`, plus any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

### P2-S11-T05 — Damage numbers that coalesce

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | P2-S09-T04 |
| Status | done |

**Build:** The floating-number set learns to add to a number instead of raising a second one. A hit on a unit that already has a number rising, spawned inside a window of ticks, adds its amount to that number and rewrites the text in place; the number keeps the rise and the fade it began with, so it leaves on its own schedule and the next hit after it starts a fresh one. A hit on a unit with no number, or one older than the window, raises a number as now. The window is a named constant beside the hit flash's, in ticks. The bookkeeping is one entry per slot of the unit pool, as the flashes are, keyed by the id so a reused slot inherits nothing.

Numbers are white, so a merged number needs no colour rule yet; the HUD page's deferred colour-per-type is what would make the window per unit and per damage type, and the page says so.

**Acceptance:**
- A dummy burning under Glacier at the orb cap shows one number a window, worth the health it lost over that window, instead of one a tick.
- A single hit still raises its own number on the tick it lands.
- Two units hit in the same window each have their own number.
- A hit on a unit whose number is older than the window raises a new one.
- A dummy burning alone no longer empties the number set, so a hit landing beside the burn keeps its own number.

**Tests:**
- `tests/presentation/hit-feedback.spec.ts`, `tests/presentation/floating-number.spec.ts`.

**Definition of done:** Every change · Anything under `src/presentation`.

> **Note, 2026-09-22:** unplanned, from the maintainer's arena walk of P2-S11-T01. Damage over time is taken every tick, which section 4 of the catalogue asks for and which makes the total right; the presentation's rule that every hit raises a number was written for discrete hits and turns the drip into thirty numbers a second, overlapping into a block. At the orb cap one burning dummy recycles the whole 64-number set twice a second, so a real hit beside it loses its number early, which is the worse half. Nothing in the domain changes: the arithmetic, the events, and the replays stand. Bolide's `burn` in T02 is the same shape, so this lands before it is walked.

> **Note, 2026-09-22:** the window is a third of a second, ten ticks, so a burning unit reads as three numbers a second. Two pieces the build needed and did not name: the number set had to hand back the label it spawned onto and the spawn running there, because it recycles a label whose rise is still running and a hit must not add to the number that took it; and `tests/presentation/floating-number.spec.ts` held both the set's own rules and what a drained hit does, so the hit cases moved to the `hit-feedback.spec.ts` the ticket names and the set's stayed. The view changed, so the render benchmark is a person's and is a row of its own in `STATUS.md`.

---

### P2-S11-T06 — Updraft lifts in place

| Field | Value |
| --- | --- |
| Layer | domain, content, docs, tests |
| Size | 0.5 |
| Depends on | P2-S11-T01 |
| Status | planned |

**Build:** Updraft's funnel lifts and moves nobody. `updraft_carry` becomes `updraft_catch`: each tick the travelling zone lifts every enemy inside it that it has not already taken and records it on the zone's hit list, and that is all it does. A lifted unit stands where it was lifted for the whole of its lift and comes down on that spot, which leaves the drop and its damage exactly where they are, in the `updraft_lift` status's expiry list. The zone still travels its distance along the facing and still expires with its motion. The hit list stays: without it a lift ending while the funnel is still over the unit would lift it again.

Content: `src/content/spells/updraft.def.ts` names the new key. Docs: section 3.5 of the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md) — the effect list, the paragraph on what the named effect does, and the edge about a rooted unit; section 7.2's row for the key; the Updraft row of [spells and attack](../../../../docs/product/features/spells-and-attack.md); and the rooted-while-lifted row of [status effects](../../../../docs/product/features/status-effects.md).

**Acceptance:**
- A dummy the funnel reaches is lifted where it stands, does not move while it is in the air, and comes down on the same spot with the drop's damage.
- A dummy further down the line is lifted when the funnel reaches it, not when the first was lifted, and it too stays where it stood.
- One updraft lifts a dummy once, including where the lift ends while the funnel is still over it.
- A rooted dummy is lifted and comes down where it stood.

**Tests:**
- `tests/domain/abilities/effects/updraft-catch.spec.ts`, renamed from `updraft-carry.spec.ts`.
- `tests/simulation/spells/updraft.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability · A documentation change.

> **Note, 2026-09-22:** unplanned, from the maintainer's arena walk of P2-S11-T01, and a reversal rather than a fix: P2-S11-T01 built the carry section 3.5 asked for, and the product owner approved that section on 2026-09-21. The maintainer reversed it on seeing it. At the orb cap the funnel carries a unit close to 2000 world units, which takes it off the screen and out of the fight — more displacement than anything else in the game — and with nothing drawing a lifted unit as airborne it reads as a knockback. The spell's identity is the window it buys, not the displacement, which Clarion already owns. The catalogue is rewritten to say lift in place, so the approved text and the code agree again.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every spell of this sprint walked in the arena | Glacier and Updraft walked by the maintainer, 2026-09-22. Glacier behaves as T01 built it; its burn raises a number a tick, which T05 coalesces in the presentation. Updraft's carry was reversed on the walk and is cut in T06 |
| Ten spells green at levels 1 and 7; twenty-zone stress test green | |
| Bench numbers after this phase's views | |
| Milestone M4 | |
| Actual days per ticket | T01 1.5 · T02 · T03 · T04 · T05 0.5 · T06 |

## Risks in this sprint

- **R8 lives here.** Updraft carrying units is the hardest thing in the phase. If T01 runs past 1.5 days, T04's gate day is the buffer and the gate slides into the following week; do not cut Updraft's carry to make the date. Answered on 2026-09-22: T01 landed on its 1.5 days with the carry built, and the carry was then cut by the maintainer as a design call rather than a date one, in T06. R8 retires.
- **The buffer is spent.** T05 and T06 add a day to a sprint sized four with one day of buffer, so the sprint is sized five against five. Anything that slips now moves T04's gate day, and the phase gate with it. Both are corrections to what the maintainer walked, so neither is a candidate for cutting; if the date matters more than the gate, T04 is the row to move.
- After this sprint the ratio of actual to sized days across phases 1 and 2 is known. If it is over 1.3, re-cut phases 3 to 5 before starting sprint 12.
