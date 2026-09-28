# Sprint 63 — The Nave and the Gaolmaster

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

> **The roster must be approved first** ([R43](../02-risks-and-hidden-work.md)). If P10-S55-T01 is not approved when this sprint starts, the sprint takes phase 10's engineering work that does not wait on numbers, P10-S64-T01's stress case on the stand-in roster, and this sprint's tickets move one sprint on.

## Goal

The Nave is itself: six families at variant I as rows, its recipe on its own roster with a floor that reads as the Nave, a level table that carries a hero to about 12 by map 10 without moving the long road, and the Gaolmaster in its chamber on map 10, whose death opens the way down.

## Playable outcome

Jump to map 1 of the Nave and fight its own grunts, runners, archers, tanks, frost raiders, and lancers, each in its variant's tint, on a floor tinted as the Nave. Jump to map 10, reach the chamber, and fight the Gaolmaster: disjoint its stun bolt with Slipknife among its grunt adds; the portal opens when it dies, and its Legendary piece drops.

---

## Tickets

### P10-S63-T01 — The Nave's six families at variant I

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P10-S62-T02, P10-S55-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** six family files under `src/content/families/`: grunt, runner, archer, tank, frost raider, and lancer. Each shares its long-road archetype's behaviour, body, and abilities by key, with its variant I row at the numbers, name, tint, and experience P10-S55-T01 approved. The tints are the view's existing tint modes; the silhouette frame is the existing shape frame, since silhouettes are phase 12's. No drawn or sourced asset. The map boss's tier abilities come from the kit as the long road's bosses' do.

**Acceptance:**
- Each variant's expanded record matches the enemy catalogue's table, as the long road's archetypes are held to theirs.
- The long road's thirteen archetypes and every stored log are unchanged.
- It plays: in Chrome by an agent, each variant spawned from the panel and fought, its tint distinct from its long-road twin's.
- The bar: not applicable alone; the stress case (P10-S64-T01) reads the roster.

**Tests:**
- `tests/content/families.spec.ts`: the six families, their shared keys, each row's numbers against the catalogue's table.
- `tests/content/catalogues.spec.ts`: the Nave's rows read from the enemy catalogue.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked by the content test; [enemies](../../../../docs/product/features/enemies.md), a variant named.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

### P10-S63-T02 — The Nave's recipe on its own roster, with its floor

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1 |
| Depends on | T01, P10-S61-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/content/strata/nave.def.ts` names the six families' variant I rows in place of the long road's stand-ins, and its map bosses from them. The generator version moves only if the generator's code did. The content version moves; the golden hash is recorded again and the stored descent walk recorded again, each named in the sprint exit. The recipe gains the floor's tint, P10-S54-T04's colour, applied by the floor view to the one floor tile the build already loads. The town keeps the untinted floor. No new image, frame, or sound.

**Acceptance:**
- A 1000-seed sweep with the Nave's roster: every check passed or fallen back and counted, fallbacks at most 2%, enemies per map in 90 to 110.
- The floor tint read on every descent map and not in town or on the long road.
- It plays: in Chrome by an agent, maps 1, 5, and 9 of a seed jumped to and fought.
- The bar: the tinted floor adds no draw call, by the draw-call counter.

**Tests:**
- `tests/content/recipes.spec.ts`: the roster names only the Nave's rows; the tint.
- `tests/domain/generation/golden-sweep.spec.ts`: recorded again.
- `tests/presentation/floor-view.spec.ts`: the tint by the map's recipe, none on an authored map.
- `tests/simulation/replays/descent-walk.spec.ts`: recorded again and green.

**Pages:** the Nave's spec, checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P10-S63-T03 — The level table above the long road's reach

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | P10-S55-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the level table's rows from 13 to 30 at P10-S55-T01's numbers, levels 1 to 12 unchanged ([Q128](../backlog/open-questions.md)). The variants' experience is already on their rows. The content version moves; `pnpm restamp` re-stamps.

**Acceptance:**
- Levels 1 to 12 are equal to before, field by field; every stored log replays with a re-stamp and no checksum moved ([R36](../02-risks-and-hidden-work.md)).
- A hero past 12 levels on to 30 and stops.
- It plays: in Chrome by an agent, a hero set to 12 from the panel levels to 13 on the Nave.
- The bar: not applicable.

**Tests:**
- `tests/content/hero.spec.ts`: the table to 30, 1 to 12 unchanged.
- `tests/simulation/hero/experience.spec.ts`: levelling past 12 and the cap.
- `tests/domain/stats/levels.spec.ts`: green.

**Pages:** [hero](../../../../docs/product/features/hero.md), checked by the content test.

**Definition of done:** Every change · A documentation change.

---

### P10-S63-T04 — The Gaolmaster

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | T01, T02, P9-S52-T03, P10-S61-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Gaolmaster at P10-S55-T01's numbers, an archetype written once, `src/content/enemies/gaolmaster.def.ts` ([stratum bosses](../../../../docs/product/specs/the-descent.md#52-stratum-bosses)):
- `stun_bolt` every six seconds, phase 9's ability with its own cooldown;
- grunt adds from the Nave's grunt row, by the existing `summon_adds`, to the designed count and cap;
- a slam, the existing `slam`;
- what changes below three quarters, a half, and a quarter of its health, by the ability conditions that exist.

The Nave's recipe stands it in map 10's chamber as the stratum boss, and the portal waits on its pack. Its Legendary piece, under `src/content/items/legendaries/`, drops at the named-boss rate beside its boss drops. The item catalogue's Legendary table grows by one.

**Acceptance:**
- The Gaolmaster throws the bolt on its clock, calls adds to its cap, and slams, in a simulation spec; Slipknife or Gyre Sceptre on the hero disjoints the bolt.
- Map 10's portal refuses until its death, then takes the hero to map 11's refusal, since no stratum below exists. The refusal says so, and the portal's ring reads open.
- Its piece drops at the named-boss rate over a sampled 200 kills.
- It plays: in Chrome by an agent, the fight on a jumped-to map 10, the bolt disjointed once, the kill, and the piece.
- The bar: the adds keep the chamber's live count under the bound; the stress case reads it in P10-S64-T01.

**Tests:**
- `tests/simulation/enemies/gaolmaster.spec.ts`: the clock, the adds and their cap, the slam, the health fractions, the disjoint, the gate on the portal.
- `tests/content/items.spec.ts`: its Legendary piece.
- `tests/content/enemies.spec.ts`: its row against the catalogue.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md) and [item catalogue](../../../../docs/product/specs/item-catalogue.md), checked by the content tests; [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked.

**Definition of done:** Every change · A new enemy or behaviour · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The six families at variant I, against the catalogue | |
| The Nave's recipe on its roster; the 1000-seed sweep's figures and fallback rate | |
| The golden hash and the descent walk recorded again, named | |
| The level table to 30; every stored log re-stamped with no checksum moved | |
| The Gaolmaster, in Chrome; the portal opened on its death | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The Nave's numbers move the sweep.** A roster heavier than the stand-ins can push a map past the bound or the budget; the sweep reruns in T02 and a miss is a recipe change, content only ([R42](../02-risks-and-hidden-work.md)).
- **What is below map 10.** Nothing, in this phase: the portal opens and refuses the step with a reason. The designer may prefer it stay shut with a message; that is asked in the playtest, not built twice.
