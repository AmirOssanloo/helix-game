# Sprint 12 — Enemy catalogue, the AI state machine, behaviours, and packs

**Phase:** 3 · **Sized days:** 4 · **Buffer:** 1

## Goal

Enemies exist as definitions, run one shared state machine driven by a behaviour key, aggro as packs, chase on a re-path budget, attack with the hero's attack code, and leash home.

## Playable outcome

Spawn a pack of grunts and runners; walk in; the runner arrives first; both hit the hero; walk away past the leash and watch them go home. The archer stands off and shoots.

---

## Tickets

### P3-S12-T01 — The enemy catalogue

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | none |
| Status | done |

**Build:** `docs/product/specs/enemy-catalogue.md`, the first half of the document the roadmap lists for phases 3 and 5. For the melee grunt, fast runner, ranged archer, tank, and training dummy: every `EnemyDef` field with a starting value and the reasoning in one line (the grunt is slower than the hero so kiting works; the runner is faster so it cannot be kited forever), the behaviour key, the colour, the frame, and the experience reward against the level table so that a pack of five grunts is about one level at level 1. A section for phase 5 left as a heading.

**Acceptance:**
- Every number in the four definitions next ticket comes from this page.
- The product owner approves the starting values.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

> **Approved** by the product owner, 2026-09-23: the starting values stand as written, for testing. The long roster may retune these four when it is written.

---

### P3-S12-T02 — Four archetype definitions and pack spawning

| Field | Value |
| --- | --- |
| Layer | content, domain, devtools, tests |
| Size | 1 |
| Depends on | T01, P2-S09-T03 |
| Status | done ||

**Build:** `melee-grunt.def.ts`, `fast-runner.def.ts`, `ranged-archer.def.ts`, `tank.def.ts` under `src/content/enemies/`, every field required, with the frames (square, small square, square with a dot, large square) and tints. The `spawn_pack` debug command: archetype, tier, count, position; units placed on the nearest free cells around the point, given one pack id and each its own spawn point, refused past the live cap with a message naming the cap; spawn mode at click or at a distance from the hero. `kill_all` (kills with experience) and `clear_all` (releases without deaths). The panel's Enemies group finished per the developer panel page.

**Acceptance:**
- The dropdown lists the five without a code change (it reads the registry).
- A pack of twenty on a blocked cell lands on free cells and nothing is inside an obstacle.
- The 201st enemy is refused with the cap named: `ENEMY_LIVE_CAP`, 200, per Q9. A pack the pool has no room for is still refused as `pool_full`.

> **Edited** 2026-09-23: the acceptance said the 513th unit, the pool's size, but Q9 settled the cap as `ENEMY_LIVE_CAP` at 200 beside the pool, enforced by the one pack spawn, with the stress test's plain bodies outside it.

**Tests:**
- `tests/content/enemies.spec.ts` — the four validate, every field present.
- `tests/simulation/spawn-pack.spec.ts` — placement, pack id, cap refusal.

**Definition of done:** Every change · A new enemy or behaviour · A developer-panel control.

> **Built** 2026-09-23. `spawn_enemies` became `spawn_pack` and `clear_units` became `clear_all`, the old names deleted. `melee_chaser` and `ranged_holder` are registered as keys whose behaviour holds where it spawned, so the four definitions validate; T03 gives them their bodies. Spawn at click reached presentation and the composition root: a one-shot ground pick the panel arms and the input mapper answers with the next left click that opens no cursor. The archer's `square_dot` frame is new in the atlas, so the render benchmark is owed; the maintainer deferred it to the phase 5 gate the same day. The Enemies group was walked by the maintainer and approved, 2026-09-23.

---

### P3-S12-T03 — The AI state machine, three behaviours, packs, leash

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 2 |
| Depends on | T02, P1-S03-T04 |
| Status | planned |

**Build:** Under `src/domain/ai/`: the six states from the enemies page (Idle, Aggro, Chase, Attack, Return, Dead) as a shared machine on the unit; `aiSystem` before pathing: Idle wanders a few units around its spawn on a tunable cadence and leaves on the hero entering the aggro radius (a hash circle query, ignoring a hero with the `aggro_hidden` flag) or on taking damage; Aggro alerts every unit with the same pack id on the same tick and enters Chase; Chase requests a path to the hero through the budgeted queue, re-pathing on a tunable cadence, and enters Attack in range or Return past the leash radius measured from its own spawn point; Attack faces, runs the attack code from sprint 09 against the hero, returns to Chase when out of range and to Return when the target is lost; Return paths home ignoring the hero, regenerating, and idles on arrival or at the nearest free spot; Dead is entered by the death system. Behaviours under `domain/ai/behaviours/` as keyed functions deciding the target and the desired standing position: `melee_chaser` (close to contact), `ranged_holder` (hold at attack range minus a margin, fire projectiles), `stationary` (never leaves Idle). Wane drops aggro except for units already in Attack range. Leashed mid-attack cancels the attack point; a projectile already fired lands.

**Acceptance:**
- Aggro on sight, aggro on damage, pack sharing, range holding for the archer, closing for the grunt, leash and return with regeneration, for each of the three behaviours: one test per transition.
- Ten grunts in the corridor form a queue by pushing and none walks through another.
- Hero dies with enemies chasing: they keep chasing to the spawn point.

**Tests:**
- `tests/simulation/enemies/melee-grunt.spec.ts`, `fast-runner.spec.ts`, `ranged-archer.spec.ts`, `tank.spec.ts` — the six standard tests each per the adding-an-enemy runbook (death and experience land next sprint; the test file is created with those two pending and named).
- `tests/simulation/ai/transitions.spec.ts` — one per transition per behaviour.
- `tests/simulation/ai/corridor.spec.ts` — the queue.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A new enemy or behaviour.

---

### P3-S12-T04 — Enemy attacks through the hero's attack code, and Wane's aggro test

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** Confirm and test that an enemy in Attack uses `attackSystem` with its definition's attack block: melee with no projectile speed hits at the attack point; ranged fires the homing projectile; damage is physical against the hero's armour; disarm on an enemy blocks it. The Wane aggro-drop test deferred from sprint 10.

**Acceptance:**
- A grunt's hit reduces the hero's health by its damage after armour; an archer's arrow lands 900 units per second later.
- Wane cast with a pack chasing at distance: they return; a grunt already adjacent keeps attacking.

**Tests:**
- `tests/simulation/enemies/attacks.spec.ts`, `tests/simulation/spells/wane.spec.ts` extended.

**Definition of done:** Every change · `src/domain`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every transition test green for three behaviours | |
| Corridor queue by hand with path lines on | |
| Actual days per ticket | T01 0.3 · T02 0.9 · T03 · T04 |

## Risks in this sprint

- T03 is the largest ticket in the plan. If it runs long, T04 slides into sprint 13's buffer; nothing else moves.
- The re-path cadence and the budget are two knobs that interact. Both are tunables; sprint 15 tunes them with two hundred units, not this sprint with ten.
