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
| Status | done |

**Build:** Bolide: point, named effect `meteor_launch` spawning a delayed zone that, on landing, becomes a `travel_line` zone rolling along the cast direction for a distance, dealing magical damage each tick to units in contact and applying a `burn` damage-over-time status, by Ember and Whorl level. Clarion: point (cone), `damage_area` in the cone frame's angle, `displace('push')` along the cone direction, and `apply_status('disarm')`, all by all three levels. Definitions, tests at levels 1 and 7, the push stopping at an obstacle edge.

**Acceptance:**
- Bolide lands after its delay, rolls its distance, damages a dummy each tick of contact, and leaves it burning.
- Blast hits a dummy inside the cone and not one outside, pushes it the table distance, and disarms it; a dummy against a wall does not enter the wall.

**Tests:**
- `tests/domain/abilities/effects/meteor-launch.spec.ts`.
- `tests/simulation/spells/bolide.spec.ts`, `clarion.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-21:** per the catalogue Bolide needs no named effect: it is one `spawn_zone` with a delay, a line motion, and an each-tick list of damage area and apply status, so `meteor_launch` and its test are dropped. Clarion is a direction spell. Section 3.9 and 3.10 of `docs/product/specs/spell-catalogue.md`.

> **Note, 2026-09-22:** nothing under `src/domain` changed. Both spells are effect lists over primitives that already exist: Bolide is the delayed travelling zone the catalogue writes, with a per-second damage area and a `burn` reapplied every tick of contact in its each-tick list, and Clarion is a damage area, a push away from the hero, and a disarm, each naming the same cone at the caster. The ticket's layer row said domain because it was written before the 2026-09-21 note dropped `meteor_launch`; the pieces Clarion needed — the cone target, the push through the movement step, and the two statuses — landed in sprint 08. Three things the build met and the ticket did not name. The damage-over-time reaches a unit a tick late, since the status pass runs before the zone pass, so the tick a meteor lands costs only its own share and every tick after it costs both. Clarion is the dearest of the ten and a hero at its first level cannot hold 300 mana, so its spec levels the hero until the pool holds the cost rather than turning on the switch that skips it. And the recorded session's content stamp had to be restamped, since a spell's effect list is part of the registry hash; the session casts no spell, so its records stand as they are.

---

### P2-S11-T03 — Emberling

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | P2-S09-T02 |
| Status | done |

**Build:** Emberling: no-target, self, `spawn_unit` of the `emberling` summon definition beside the hero with a lifetime, attack damage, and health by Ember and Quartz level, behaviour `summon_follow`. A summon definition file under `src/content/summons/` with a small-disc frame in dimmed hero white.

**Acceptance:**
- The spirit spawns beside the hero, follows, attacks a dummy in range with physical damage, expires on its timer and on hero death; it cannot be selected or ordered.

**Tests:**
- `tests/simulation/spells/emberling.spec.ts`.

**Definition of done:** Every change · A new spell, effect, or enemy ability.

> **Note, 2026-09-23:** content alone, as the ticket's layer row says: `spawn_unit`, the summon's ownership and lifetime, and the `summon_follow` behaviour that acquires before it follows all landed in sprint 09, so the spell is one effect entry over them and the spirit is one definition file. Three things the build met and the ticket did not name. The summon definition holds every field an enemy definition holds, and the catalogue gives the body one radius and none of the projectile's, so the bound radius, the selection radius, the projectile's size, and the colour its shots carry are the definition file's starting values with the rest; the file says which are its own. The registry spec's case for an enemy and a summon sharing an id replaced the whole summon list with its fixture, which from now on leaves the Emberling spell naming a summon that does not exist and raises a second fault, so that case adds to the content's summons as the spell and status cases already do. And the recorded session's content stamp had to be restamped, since a spell's effect list and a new summon are both part of the registry hash; the session casts no spell, so its records stand as they are.

---

### P2-S11-T04 — The phase 2 gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01, T02, T03, T05, T06 |
| Status | done |

**Build:** `tests/simulation/stress-zones.spec.ts`: twenty concurrent zones and effects (a mix of walls, bolides, updrafts, and Zeniths) with 100 projectiles and one dummy, asserting the tick under budget. Rerun the bench (views changed this phase: zones, projectiles, icons, numbers). Record a session throwing all ten spells and replay it. Walk every row of the [phase 2 gate](../04-phase-exit-gates.md#phase-2-gate) and record evidence. Docs sync: world model rows for zones, projectiles, summons as kinds and the new definition kinds; where-to-look pointers run; the spells page updated if any behaviour differs from what it says. Replay tests for gate bugs. Fill the phase README's exit record and sized-versus-actual.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** `stress-zones.spec.ts`, plus any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-23:** the gate was walked and its evidence is in the [phase 2 gate walk](#phase-2-gate-walk). Every row holds on this machine; the bar holds in Chrome on the Apple M1 laptop and waits, as phase 1's does, on the reference laptop in four browsers and the allocation sampler, a row on the status page. No gate bug was found, so no replay test was born from one. Four things the build met and the ticket did not name. The stress spec keeps the zones and the shots at the cap by committing the real spell definitions through the effect runner between ticks, not by casting through the pipeline, since one hero's cast point cannot hold twenty zones up; the systems measured are the same, and the arrangement is outside the timed tick as it is in the unit stress test. The two stress specs now run in one project one file at a time, so neither times a tick while the other holds the cores. The gate's content row asks for a walk of every table at every level, which the content tier did only for the cooldown and mana tables, so the spells spec gains one case per spell per level that reads every table the definition carries. And nothing in the game fires a hundred projectiles by hand, so the cap's projectiles are held in the stress spec in Node, and the browser reading is twenty zones, one dummy, and the hero.

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
| Status | done |

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

> **Note, 2026-09-22:** the carry came out whole: the named effect is now the pick-up alone, so nothing writes a unit's position or tells the spatial hash about it, and the zone's own travel is untouched. Two pieces the build needed and did not name. The acceptance row about a lift ending while the funnel is still over the unit cannot be reached with the catalogue's numbers — the funnel covers a unit for 0.4 s and the shortest lift is 0.8 s — so it is the effect spec that ends a lift under a standing zone and reads that the hit list still refuses the second lift; the spell spec reads instead that one cast drops a dummy once. And the recorded session's content stamp had to be restamped, since renaming the key changes the registry hash; the session casts no spell, so its records stand as they are.

---

### P2-S11-T07 — The playable build on GitHub Pages

| Field | Value |
| --- | --- |
| Layer | build, docs |
| Size | 0.5 |
| Depends on | none |
| Status | done |

**Build:** A push to `main` publishes the production build so anyone with the link can play it. The build asks for its bundle beside the page instead of at the server root, which is what lets one build serve from a project page's path under the repository name; the dev server keeps the root, where the bench entry is an absolute path away. A workflow beside `ci.yml` installs, builds, and deploys the artifact; it runs the build alone, since the same push runs the gate in `ci.yml`. Docs: the publishing section of [development workflow](../../../../docs/workflows/development.md), and the build paragraph of [tech stack](../../../../docs/onboarding/02-tech-stack.md).

**Acceptance:**
- The built page loads and plays from a path under the domain root, not only from the root itself.
- The published build has no developer panel and no `DevApi`.
- A person can reach it at the repository's Pages address.

**Tests:**
- No new spec: `pnpm build` and the strip check already own what a build may contain. The subpath was proved by serving `dist/` under one and loading it in a browser.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-22:** unplanned, asked for by the maintainer. Nothing in the game changed: the only reason a build could not already be published was the absolute path in the emitted page. Turning **Settings → Pages → Source** to **GitHub Actions** is a person's, once, and is on the status page until it is done.

---

### P2-S11-T08 — The developer panel on a pane

| Field | Value |
| --- | --- |
| Layer | devtools, build, docs, tests |
| Size | 1 |
| Depends on | none |
| Status | done |

**Build:** The panel's hand-written controls are replaced by Tweakpane. `dom.ts` goes; what it held that no pane control offers — saving a file and picking one — becomes `files.ts`, and the shapes every group binds through become `bindings.ts`. Each group takes the folder it builds into and returns its refresh; the panel keeps its groups, its memory, its refresh loop, and its sentinel. A control is a binding over a plain object the group owns, so a group reads a field rather than parsing an input, and the overlays bind to the toggles object itself.

A binding reports a change when the panel rewrites it as well as when a person moves it, so every control that follows the world — the two hero switches, the seed, the catch-up cap — compares what it is handed against the world before it acts, and the refresh touches only those. The pane declares no side effects of its own, so the build is told it has none; without that the production bundle keeps the whole pane although the panel that builds one is gone. The strip check grows a second half that fails the build on a pane module in the bundle, so that cannot regress in silence.

Tunables lose the default printed beside each slider, which the pane has no column for, and gain **Reset tunables** in its place: every slider a person moved goes back to its default, one command each.

Docs: the panel section of [devtools and instrumentation](../../../../docs/architecture/devtools-and-instrumentation.md), the tunables section of [developer panel](../../../../docs/product/features/developer-panel.md), the panel section of [running and debugging](../../../../docs/onboarding/03-running-and-debugging.md), and [tech stack](../../../../docs/onboarding/02-tech-stack.md).

**Acceptance:**
- Every control the panel had still sends what it sent: the spec's cases pass unchanged but for how a control is found.
- The panel's own refresh sends nothing; a session that only refreshes leaves an empty log.
- The reset sends one command per slider that moved and none for the rest.
- The production bundle holds neither the panel nor the pane, and the build says so when it does.

**Tests:**
- `tests/devtools/panel.spec.ts`, its helpers rewritten to find a control by the label beside it, plus the two cases above.

**Definition of done:** Every change · A developer-panel control · A documentation change.

> **Note, 2026-09-22:** unplanned, asked for by the maintainer. The panel was walked in the browser: every group renders, the readouts run, a spawn and a kill land, and the infinite-mana switch agrees with the world after the refresh that had every chance to flip it back. The one thing a person still has to say is whether the pane reads better than what it replaces.

---

### P2-S11-T09 — The tick budget measured outside the profiler

| Field | Value |
| --- | --- |
| Layer | build, tests, docs |
| Size | 0.25 |
| Depends on | none |
| Status | done |

**Build:** `check:ci` stops measuring the tick budget through a profiler. The coverage pass runs every tier but the stress one; the stress test then runs on its own, uninstrumented, as `pnpm test:budget`. The replay determinism test stays inside the coverage pass and gains a named timeout, because it asserts that two worlds agree and never how fast they got there.

Docs: the commands and gate sections of [development workflow](../../../../docs/workflows/development.md), and the stress-test section of [performance standards](../../../../docs/standards/performance.md).

**Acceptance:**
- `pnpm check:ci` is green, with the coverage floors on domain and simulation still held.
- The stress test asserts the same 4 ms budget it always did; the number is not moved to fit the run.

**Tests:**
- No new spec. The two that were failing are the check: they pass for the right reason now.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-22:** unplanned, found when the first CI run in 26 commits went red on `stress.spec.ts` and `replay-determinism.spec.ts`. Neither was a regression. Measured on the maintainer's machine, the stress mean is **2.438 ms** uninstrumented against the 4 ms budget and **8.286 ms** under coverage, and the replay spec takes 1.70 s uninstrumented and 5.67 s instrumented against a 5 s default timeout. Coverage instrumentation was the whole of both failures, and `pnpm check` never saw it because only `check:ci` collects coverage. The budget was not moved; the measurement was. One thing this leaves open: CI has never reported an uninstrumented stress number, so the next push is the first reading from that machine. If it lands near 4 ms, the question of which machine the budget is defined on is a plan question, not a code one.

---

### P2-S11-T10 — The panel in the published build

| Field | Value |
| --- | --- |
| Layer | app, build, docs |
| Size | 0.5 |
| Depends on | P2-S11-T07, P2-S11-T08 |
| Status | done |

**Build:** The published build carries the developer panel, so anyone with the link can spawn, tune, and read the instrumentation while the game is being shown to people.

`__DEV__` was doing two jobs — deciding how the code behaves, and deciding whether the panel ships — and they are now two defines. `__DEV__` keeps the first and still gates `assert`. `__PANEL__` takes the second. The playtest build, `vite build --mode playtest`, sets `__PANEL__` alone: the production game, with no development path and no assert that throws, published with the panel beside it. A production build sets neither and carries no panel, no `DevApi`, and no pane.

The build check works in both directions now: it fails a production bundle holding the sentinel or a pane module, and fails a playtest bundle missing either, so neither build can quietly become the other. The Pages workflow builds the playtest flavour.

Docs: [devtools and instrumentation](../../../../docs/architecture/devtools-and-instrumentation.md), [developer panel](../../../../docs/product/features/developer-panel.md), [development workflow](../../../../docs/workflows/development.md), [tech stack](../../../../docs/onboarding/02-tech-stack.md), [running and debugging](../../../../docs/onboarding/03-running-and-debugging.md), and the new term in the [vocabulary](../../../../docs/product/vocabulary.md).

**Acceptance:**
- The published build plays with the panel beside it, and `DevApi` is on `window`.
- `pnpm build` still produces a bundle with no panel, no `DevApi`, and no pane, and fails if it would not.
- `pnpm build:playtest` fails if the panel is missing from it.

**Tests:**
- No new spec: both directions of the build check are the test, and both were proved by breaking them on purpose.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-22:** unplanned, asked for by the maintainer, and it reverses a line the developer panel page carried under **Deferred**: production access. The page now says what is true — the playtest build is a separate build that carries the panel openly, not a production build with a way into it — and the deferred line stands for production. This is a call for this phase: anyone with the link can spawn three hundred units and retune the world, which is the point while the game is shown to people meant to poke at it, and is not the point once it is not. Changing back is the one `pnpm build:playtest` line in the Pages workflow. Both builds were walked in a browser from a subpath: the playtest one plays with every group of the panel live, the production one has an empty hidden host and no `DevApi`.

---

---

### P2-S11-T11 — Clarion pushes at Bolide's speed

| Field | Value |
| --- | --- |
| Layer | domain, content, docs, tests |
| Size | 0.5 |
| Depends on | P2-S11-T02 |
| Status | done |

**Build:** A push travels at a speed rather than over a fixed time. Clarion's push keeps its distance table, 100 to 400 by Whorl level, and moves the unit at 300 units a second, Bolide's roll speed, so the push lasts a third of a second at the first level and four thirds at the cap; the unit is displaced for all of it and stops at an obstacle edge as before. The push entry names its speed and the duration comes from the distance at the level cast, converted to whole ticks once, where the push is applied. The damage and the disarm are untouched.

Docs: section 3.10 and the `displace` row of section 7.1 of the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md), and the Clarion rows of [spells and attack](../../../../docs/product/features/spells-and-attack.md) if they name the push's timing.

**Acceptance:**
- A dummy Clarion hits moves 10 units a tick away from the hero until it has gone the distance its table gives, at level 1 and at level 7.
- A dummy with a wall behind it stops at the wall's edge.
- The damage and the disarm land on the commit tick as before.

**Tests:**
- `tests/simulation/spells/clarion.spec.ts`: the push's per-tick step and its length in ticks at levels 1 and 7.
- The displace primitive's spec under `tests/domain/abilities/primitives/` for the speed-to-ticks conversion.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability · A documentation change.

> **Note, 2026-09-23:** unplanned, from the maintainer's arena walk of the ten spells: the push reads better at the meteor's pace. The maintainer chose to keep the distance table and let the time follow from it.

> **Note, 2026-09-23:** a push entry now names a `speed` in world units a second instead of `seconds`, and its length in ticks follows from the distance at the level cast, once, where the push is applied: at least one tick, and none for a push with no distance or no speed, which moves nobody and puts no knockback on it. Clarion's push is ten ticks at the first level and forty at the cap, ten units a tick at both. Two things the ticket did not name: the displacement spec under `tests/simulation/movement/` builds a push of its own and now names a speed that keeps its ten ticks, and the status page's knockback row said "over a few ticks", which forty is not. The recorded session's content stamp was restamped; it casts no spell.

---

### P2-S11-T12 — Glacier placed by press and drag

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, docs, tests |
| Size | 1.5 |
| Depends on | P2-S11-T01 |
| Status | done |

**Build:** Glacier is aimed with two inputs instead of one. With the spell thrown, the player presses on the ground: that point is the centre of the wall. Holding the button and dragging sets the line the wall lies along, and while the button is down a line from the press point to the pointer shows it, with the wall's outline laid along it. Releasing the button commits the cast. A release with no drag lays the wall across the line from the hero to the point, which is where today's Glacier stands. The spell gains a cast range; a press beyond it makes the hero walk into range and cast, as the other point spells do. Esc or a right click while the button is down closes the cursor at no cost.

The cast command carries the second input, the pipeline hands the effect an anchor and a direction, and `glacier_place` lays its segments centred on the anchor along that direction. The shape of the new targeting input is the architect's to settle first.

Docs: section 3.3 and section 7 of the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md), the Glacier row and the casting section of [spells and attack](../../../../docs/product/features/spells-and-attack.md), the targeting sections of the architecture pages the architect names, and the [vocabulary](../../../../docs/product/vocabulary.md) if a term is added.

**Acceptance:**
- A press and a drag lay the seven segments centred on the press point along the drag, at orb levels 1 and 7.
- A press and a release with no drag lay them across the line from the hero to the point.
- A press beyond the range walks the hero in and casts on arrival; S cancels.
- While the button is down the direction line and the wall outline follow the pointer; Esc or a right click closes the cursor with nothing spent.
- A recorded session with a dragged Glacier replays identically.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: press, drag, release; release without a drag; cancel while held.
- `tests/domain/abilities/effects/glacier-place.spec.ts`: centred on the anchor, along the direction.
- `tests/simulation/spells/glacier.spec.ts`: the cast through the pipeline at levels 1 and 7, and the walk into range.
- The validator spec for the new target's refusals.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A new spell, effect, or enemy ability · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-23:** unplanned, from the maintainer's arena walk of the ten spells. The maintainer chose the wall along the drag, a cast range with a walk into it, and a release without a drag falling back to today's placement.

> **Note, 2026-09-23:** the aim is a targeting kind of its own, `vector`, settled by the architect before the build: the cast command carries the press point and the release point, and a release with no drag carries the press twice. The domain turns the two into a direction once at the request, keeps it on the cast record through a walk-in, and hands the effect an anchor on the press, a facing along the exact bearing from where the caster stands at commit, and the direction or none; `glacier_place` lays the wall along the direction, or across the facing when there is none, so the fallback is decided at commit and not where the hero stood at release. The cast range starts at 1000 and a drag is sixteen logical pixels of pointer travel, both starting values. Three things the ticket did not name. A right click while the button is held closes the cursor and gives no move, the one place a right click on an open cursor does not walk; the controls page says so. The effect's `distance` field is gone, and the stress spec's vector cast now aims at the dummy as a point spell does. And the content stamp of the recorded session was restamped once more; it casts no spell. Driven in Chrome: a press and a drag laid seven segments centred on the press along the drag, each turned to the drag's bearing within a thousandth of a radian, with the outline and the drag line following the pointer while the button was held; a press and a release laid the wall across the line from the hero. A press on the HUD strip at the bottom of the screen is taken by the HUD, not the cursor. Bench after it, Chrome on the Apple M1 laptop, 90 s: 60 fps, render 0.6 ms, 1 draw call, 1 texture, heap 62.1 to 69.1 MB with no climb, against 0.7 to 0.8 ms and 60.9 to 72.5 MB before it.

---

### P2-S11-T13 — Glacier's preview is the drag line alone

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, docs, tests |
| Size | 0.25 |
| Depends on | P2-S11-T12 |
| Status | done |

**Build:** Glacier's targeting preview draws no wall outline. Before the press nothing shows but the range ring; while the button is held and dragged, the drag line from the press to the pointer is the only preview. The `line` preview kind keeps its name and loses the length, width, and frame it carried for the outline, which nothing draws any more. The range ring still turns red against the press while held.

Docs: the preview in section 3.3 and section 7.4 of the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md), the targeting preview in [presentation](../../../../docs/architecture/presentation.md), and any other page that says the wall's outline follows the pointer.

**Acceptance:**
- With Glacier's cursor open and nothing held, only the range ring shows.
- Held and not yet dragged, only the ring shows; held and dragged, the ring and the drag line.
- Every other spell's preview is unchanged.

**Tests:**
- `tests/presentation/targeting-preview.spec.ts`: the line preview shows no shape in any state, and the drag line as before.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-23:** unplanned, from the maintainer's walk of Clarion and Glacier after P2-S11-T11 and T12, which were approved; the outline under the pointer read as clutter before the press.

> **Note, 2026-09-23:** the `line` preview kind carries nothing but its kind now, and the registry no longer looks for a frame on it. The HUD page also said the spell's shape sits under the pointer, which a line no longer draws, and was corrected with the others. The recorded session's content stamp was restamped; it casts no spell. Driven in Chrome: with the cursor open only the range ring showed, held and dragged the ring and the drag line, and the release laid the seven segments. The bench was not rerun: its scene draws no targeting preview and the atlas did not change, so the row does not apply.

---

### P2-S11-T14 — Clarion pushes twice as far, for twice as long

| Field | Value |
| --- | --- |
| Layer | content, docs, tests |
| Size | 0.25 |
| Depends on | P2-S11-T11 |
| Status | done |

**Build:** Clarion's push distance table doubles, from 100 to 400 by Whorl level to 200 to 800, at the same 300 units a second, so the push lasts twice as long: twenty ticks at the first level and eighty at the cap.

**Acceptance:**
- A dummy Clarion hits is carried 10 units a tick for 20 ticks at level 1 and 80 at level 7, and stops at a wall's edge.

**Tests:**
- `tests/simulation/spells/clarion.spec.ts`: the level 1 and level 7 cases carry the doubled distance and ticks.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

> **Note, 2026-09-23:** unplanned, from the maintainer's walk of P2-S11-T13; everything else was approved. Content alone: section 3.10 of the catalogue carries the new table and times, and the recorded session's content stamp was restamped, since it casts no spell. The maintainer asked for this change specifically, so it needs no second walk.

## Sprint exit

| Check | Result |
| --- | --- |
| Every spell of this sprint walked in the arena | Glacier and Updraft walked by the maintainer, 2026-09-22. Glacier behaves as T01 built it; its burn raises a number a tick, which T05 coalesces in the presentation. Updraft's carry was reversed on the walk and is cut in T06, which needs a walk of its own. Bolide and Clarion landed in T02 and need a walk of their own, in a row of their own on the status page. Emberling landed in T03 and needs the same, in a row of its own. At the gate on 2026-09-23 the agent threw all ten through the keys and a click in Chrome, and each committed. The maintainer then walked all ten the same day and approved them, with two changes that became T11 and T12 |
| Ten spells green at levels 1 and 7; twenty-zone stress test green | Yes. `tests/simulation/spells/` holds 136 named tests across the ten files, each spell with a level 1 and a level 7 block. `stress-zones.spec.ts` green: over five runs of 300 measured ticks with twenty zones, a hundred projectiles, and one dummy, the mean tick was 0.10 to 0.11 ms and the max 0.28 to 0.82 ms, against the 4 ms budget, with no pool miss. The 300-unit stress test the same runs: 1.80 to 2.22 ms mean, 7.95 to 8.95 ms max |
| Bench numbers after this phase's views | Chrome on the Apple M1 laptop, `pnpm bench` as configured, 90 s, 2026-09-23: 60 fps, render 0.7 to 0.8 ms, 1 draw call, 1 texture, heap 60.9 to 72.5 MB in a collector's sawtooth with no climb. The coalesced numbers of T05, Chrome on the Apple M1 laptop, `pnpm bench` as configured, measured 2026-09-23 over 60 s after a 30 s warm-up, each in a fresh tab of a worktree at the commit: before, `50d1696`, 60 fps, render 0.7 ms, 1 draw call, heap 61.5 to 68.4 MB; after, `b4d7961`, 60 fps, render 0.8 ms, 1 draw call, heap 62.4 to 68.7 MB. After T12's preview, on the phase's final code: 60 fps, render 0.6 ms, 1 draw call, heap 62.1 to 69.1 MB |
| Milestone M4 | Reached 2026-09-23 on the gate evidence: all ten spells thrown at the dummy through the real input path in Chrome, and twenty concurrent zones held inside the budget in Node and in the browser. The maintainer walked all ten the same day and approved them |
| Actual days per ticket | T01 1.5 · T02 0.5 · T03 0.25 · T04 0.5 · T05 0.5 · T06 0.5 · T07 0.5 · T08 1 · T09 0.25 · T10 0.5 · T11 0.25 · T12 1 · T13 0.25 · T14 0.1 |

### Phase 2 gate walk

Walked 2026-09-23 on an Apple M1 laptop, Chrome, under `pnpm dev`, with the panel open. Every row of the [phase 2 gate](../04-phase-exit-gates.md#phase-2-gate), in its order.

| Row | Holds | Evidence |
| --- | --- | --- |
| Each of the ten spells has a definition file registered in the index | Yes | `ls src/content/spells/`: ten `.def.ts` files and the index; the content tier green, with "are the ten the hero composes, each listed once" and "every spell validates in the registry" among its 204 spell cases |
| Each spell has a simulation test per effect at orb levels 1 and 7 | Yes | `pnpm test tests/simulation/spells/`: 136 named tests, all green; every file has a level 1 block and a level 7 block |
| Each spell casts correctly at every orb level | Yes | `tests/content/spells.spec.ts` walks levels 1 to 7 for every spell: the cooldown and the cost, and, new at this gate, every level table the definition carries anywhere, 70 cases; the level-1 and level-7 blocks of each spell spec assert the catalogue's numbers |
| Auto-attack and attack-move work against the dummy | Yes | `tests/simulation/attack/`: four files, 18 tests, green. By hand in Chrome, driving the input mapper with dispatched clicks and keys: a right click on a dummy became `attack_target` and the hero turned onto it; A then a left click past the dummies became `attack_move`, the hero walked, acquired the first dummy on the way, and was in its backswing on it when read |
| Every status can be applied from the panel and blocks what the status page says | Yes | `tests/domain/orders/validator.spec.ts` sets each disable — stunned, silenced, rooted, disarmed, lifted, untargetable, hidden from aggro, displaced, and lifted by a status that stuns — against every command, refused and accepted, and the lists agree row for row with the [status page](../../../../docs/product/features/status-effects.md) |
| Domain events drive hit and cast feedback; the HUD sums nothing | Yes | Read through `src/presentation/`. The HUD's bars are handed the form's health and mana and the unit's maxima as they stand. The one sum in the layer is the floating-number set adding the amounts of damage events into a number that is still rising, which is the coalescing P2-S11-T05 built; it adds what events reported for display and derives no health |
| The tick holds with 20 concurrent zones and effects | Yes | `tests/simulation/stress-zones.spec.ts` green, the numbers in the exit table above. In Chrome, Bolide on D and Glacier on F thrown at orb level 7 with infinite mana and no cooldowns to hold 19 to 20 zones for 30 s: 60 fps every second, tick mean 0.07 to 0.14 ms and max 0.3, render mean 0.31 to 0.53 ms and max 1.3, two draw calls, one of them the world's, pool misses 0, view misses 0, heap 69.8 to 75.3 MB with no climb |
| A recorded session replays identically | Yes | 2020 ticks under seed 20260923, kept as [a dated note](../notes/2026-09-23-phase-2-gate-session.json): orbs set to 7, the two switches, two dummies, all ten spells invoked with Q, W, E, R and thrown from D with a click where they aim, an attack-target, an attack-move, and two stops; 59 commands. Loaded back in the browser and stepped to its last tick, the end state is identical to the recording's byte for byte, a 17,406-character snapshot of run scope and every pool. Replayed into two Node worlds, the full snapshot agrees at every one of the 2020 ticks, and all ten spells commit, Hoarfrost first on tick 40 and Updraft last on tick 385 |
| The bar, at the phase 2 live cap | In Chrome on this machine | The zone row above is the reading: frame rate, tick, render, draw calls, misses, and heap all inside the bar. `pnpm check:ci` green; the 300-unit stress test green; the bench numbers in the exit table. What the browser cannot hold is the cap's hundred projectiles, since nothing in the game fires that many by hand; the stress spec holds them in Node. Firefox, Safari, Edge, the reference laptop, and the 30-second allocation sampler wait on a person, as phase 1's do |

## Risks in this sprint

- **R8 lives here.** Updraft carrying units is the hardest thing in the phase. If T01 runs past 1.5 days, T04's gate day is the buffer and the gate slides into the following week; do not cut Updraft's carry to make the date. Answered on 2026-09-22: T01 landed on its 1.5 days with the carry built, and the carry was then cut by the maintainer as a design call rather than a date one, in T06. R8 retires.
- **The buffer is spent, and then some.** T05 and T06 add a day to a sprint sized four with one day of buffer, so the sprint is sized five against five. T07 and T08 add another one and a half on top, neither of them spell work: the sprint now carries six and a half sized days, and T02, T03, and T04 — two spells and the phase gate — are all still open. The date moves or something else does; the maintainer asked for both, so this is a fact to plan around rather than a call to reverse. Anything that slips now moves T04's gate day, and the phase gate with it. Both are corrections to what the maintainer walked, so neither is a candidate for cutting; if the date matters more than the gate, T04 is the row to move.
- After this sprint the ratio of actual to sized days across phases 1 and 2 is known. If it is over 1.3, re-cut phases 3 to 5 before starting sprint 12. Answered on 2026-09-23: 38.7 actual against 46.85 sized with T11 to T14, 0.83, so phases 3 to 5 stand as cut.
