# Sprint 94 — The Mirrorhalls, the Glass Twins, and the playtest

**Phase:** 14 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

> **If the cut after the Warrens was taken at sprint 91's start,** T01 to T03 move to the phase that takes the Furnace and the Mirrorhalls, IDs kept; T04 and T05 run straight after sprint 91, with the playtest from the saves at maps 31 and 41 only.

## Goal

The Mirrorhalls are finished and walked: the recipe with the zone pool at its worst, the Glass Twins on map 70, and the four sweeps together putting the hero at about level 25 by map 50. The maintainer plays strata 4 to 7 from saves, and the pages are read against the build.

## Playable outcome

From the driver's save at map 61, walk the Mirrorhalls to map 70 and fight the Glass Twins: they blink apart, Fetter Bolas holds one, the combo spent on it takes both down together.

---

## Tickets

### P14-S94-T01 — The Mirrorhalls' recipe and its stress case, the zone pool at its worst

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | P14-S93-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Mirrorhalls' recipe, the most kindlers a map as P14-S87-T02 set, the Ossuary's two at IV as the crowd, and a floor tint that reads as the Mirrorhalls. Its stress case on a sampled sweep with every kindler walking and the hero's zones cast, the zone pool at its worst. The content version moves; re-stamped, no checksum moved.

**Acceptance:**
- A 1000-seed sweep of maps 61 to 70: checks passed or fallbacks counted, at most 2%; the figures recorded.
- It plays: the driver walks a sampled sweep of maps 61 to 69.
- The bar: under `pnpm test:budget`, no `enemy_cap_reached` and no zone pool miss on the worst Mirrorhalls map; the zone pool's highest fill printed.

**Tests:** `tests/content/strata.spec.ts`, the Mirrorhalls' recipe; its case in `tests/simulation/stress-recipes.spec.ts`, with the zone pool's miss counter read; the golden hash for the new recipe only.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), checked.

**Definition of done:** Every change · A documentation change.

---

### P14-S94-T02 — The Glass Twins: two flickers whose damage mirrors by hook, and their piece

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P14-S93-T02, P14-S92-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Glass Twins on map 70, as Q130 decided and P14-S87-T02 numbered: two boss-tier flickers in one pack, each carrying a status whose damage-taken hook deals the amount taken to the other twin as hook damage, which runs no hooks, found through the pack's member list, and dealt whatever the other's state, so `ethereal` or a lift on one does not part their health. They die on the same tick. Their changes below three quarters, a half, and a quarter of their health. The chamber's portal opens when both are dead. Their phase 13 piece wired to the pair's drop, once.

**Acceptance:**
- Any damage to either leaves their health equal at the end of the tick; a lethal hit on one kills both on that tick.
- `ethereal` on one, Veilblade's, keeps their health equal; hook damage is not mirrored back.
- One piece drops for the pair, at the named-boss rate over rolls; experience as one boss's, not two, unless the design said otherwise.
- It plays: in a simulation spec, one twin rooted by Fetter Bolas and burned by the combo, both dying together; in Chrome by an agent, the same from the save at map 61's run.
- The bar: two hooks; nothing allocates.

**Tests:** `tests/simulation/bosses/glass-twins.spec.ts`: the mirror, equal health across every damage type, ethereal on one, the shared death, one drop, the gate; `tests/domain/loot/roll.spec.ts`, their piece.

**Pages:** the enemy catalogue and the descent's section 5.2, checked; the [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the mirror's hook.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new enemy or behaviour · A documentation change.

---

### P14-S94-T03 — The Mirrorhalls balanced; the hero at about level 25 by map 50 across the four sweeps

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver walks a seed sweep of maps 61 to 70 from a save at map 61 through the Glass Twins' kill with no panel help, catching one twin with Fetter Bolas. The Mirrorhalls' numbers tuned as content until the hero reaches about level 28 at map 70. Then the four sweeps run end to end from the save at map 31, and the hero's level at maps 40, 50, 60, and 70 is read against the descent's line. The driver writes a save at map 61's arrival for the playtest.

**Acceptance:**
- The Glass Twins killed on every sampled seed; the level at every stratum's kill recorded, about 25 at map 50.
- The four sweeps green together.
- It plays: in Chrome by an agent, the save at map 61 loads and a run reaches the kill.
- The bar: the Mirrorhalls' stress case still green after the tuning.

**Tests:** the Mirrorhalls' balance sweep and the four together under the budget tier; the save at map 61 stored under `tests/`.

**Pages:** the enemy catalogue, by the content test.

**Definition of done:** Every change · A documentation change.

---

### P14-S94-T04 — The maintainer's playtest and its triage

| Field | Value |
| --- | --- |
| Layer | tests, docs, tooling |
| Size | 0.5 |
| Depends on | T03, and every ticket of sprints 86 to 93 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the commit the playtest is played on tagged `playtest-phase-14` and served at its own path, so the sessions can be proved after main moves. The maintainer plays from the driver-written saves at maps 31, 41, 51, and 61, each stratum sampled through its boss's kill, across sittings as a stratum takes one ([R41](../02-risks-and-hidden-work.md)), with the panel closed. F9 for each note; **Save input log** at the end of each sitting. A box under Waiting on a person in STATUS.md holds the steps and the addresses, and asks what only play can judge: whether fear is fair with the six keys to answer it, whether a chain of bursts reads before it lands, whether a nest reads as a thing to break, and whether the Glass Twins can be caught.

An agent stores each session as `tests/simulation/replays/strata-4-to-7-playtest-<stratum>.json` with its save, and each feedback file under `notes/`, and a spec replays each from its save. The triage is held in `notes/<date>-strata-4-to-7-triage.md` by the pillar order of [R24](../02-risks-and-hidden-work.md): each note one outcome, with a new system to Deferred and the game designer in the triage for any note that says a pillar is bent. Accepted items are written as P14-S95-T02 onward, in the bucket's order until three days are spent.

**Acceptance:**
- Each session begins from its save, holds no panel command, and reaches its stratum boss's kill or says where it stopped.
- Two replays of each session agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/strata-4-to-7-playtest.spec.ts`: skips until the logs exist; then each replay from its save, no panel command, the kill, and the level at it printed.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P14-S94-T05 — Documentation sync, beside the playtest

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01 to T03, and every ticket of sprints 86 to 93 |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 14 touched read against the build as it stands, and corrected: the ability pipeline, entities and pools, the simulation loop, and movement, collision, and pathing under `docs/architecture/`; the descent, the enemy catalogue, the disable matrix, status effects, and enemies under `docs/product/`; the where-to-look pointers; the vocabulary for **fear**, **brood**, **raise**, and any word the four strata added. Each correction is a line in the ticket's closing note. The bucket's tickets update their own pages by the definition of done; the gate reads what is left ([R17](../02-risks-and-hidden-work.md)).

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 14 added is in its page's quick reference.
- No page under `docs/` gains a phase number outside the roadmap.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** `tests/docs-links.spec.ts` green.

**Pages:** as the build lists.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Mirrorhalls' sweep, and the zone pool with no miss at its worst | |
| The Glass Twins: the mirror, the shared death, one piece | |
| The four sweeps: level at maps 40, 50, 60, and 70 | |
| The pinned build served at its own path | |
| The maintainer's sessions, and the triage | |
| The docs read against the build | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Four strata take more than one sitting; sprint 95 waits on the triage, and phase 15 does not start while two phases' runs are outstanding.
- **The mirror and overkill.** A lethal hit larger than a twin's health is mirrored as the amount taken, not the hit, so their health stays equal at zero; the spec holds it.
