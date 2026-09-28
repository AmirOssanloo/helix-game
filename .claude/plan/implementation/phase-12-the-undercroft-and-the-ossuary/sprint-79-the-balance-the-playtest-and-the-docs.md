# Sprint 79 — The balance, the playtest, and the docs

**Phase:** 12 · **Sized days:** 3 · **Buffer:** 2
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The driver walks strata 2 and 3 to their bosses with the hero on the descent's line; the maintainer plays both from saves the driver wrote; the pages match the build.

## Playable outcome

Resume from the driver's save at map 11, walk the Undercroft to the Hollow Abbess's kill, and stop. In another sitting, resume from its save at map 21 and walk the Ossuary to Marrowleech's.

---

## Tickets

### P12-S79-T01 — The balance: the driver's sweeps of strata 2 and 3

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 1.5 |
| Depends on | every ticket of sprints 72 to 78 |
| Owner | The game engineer |
| Status | planned |

**Build:** the map-agnostic driver walks a seed sweep of each stratum from a save written at its first map's arrival, the Undercroft from map 11 and the Ossuary from map 21, clearing most of each map, taking drops, and using the town, to each stratum boss's kill with no panel help. The variants' numbers and experience are tuned as content until the hero stands at about level 17 at map 20 and about 21 at map 30 ([the descent](../../../../docs/product/specs/the-descent.md#2-the-shape)). Two logs are recorded, each beginning from its save: `balance-undercroft.json` and `balance-ossuary.json`.

**Acceptance:**
- On the sweep, the hero's level at maps 20 and 30, the deaths per stratum, the minutes per map, and the item level of the best worn piece at map 30, written in the sprint exit.
- Both bosses killed by the driver on every seed of the sweep, or the seeds that fail named with their cause.
- The long road's and the Nave's stored logs unchanged by any tuning here; a tuning that would move them is refused and goes to the designer.
- It plays: this is the driver's play.
- The bar: not applicable; the gate reads the densest maps.

**Tests:** `tests/simulation/replays/balance-undercroft.spec.ts` and `tests/simulation/replays/balance-ossuary.spec.ts`: each log replays from its save, the kill, and the level at the kill printed.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), any row the tuning moved.

**Definition of done:** Every change · A documentation change.

---

### P12-S79-T02 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the maintainer plays the published build across at least two sittings, each resumed from a save the driver wrote: the Undercroft from map 11 through the Hollow Abbess's kill, and the Ossuary from map 21 through Marrowleech's. The panel stays closed. F9 for each note; **Save input log** at the end of each sitting. A box under Waiting on a person in STATUS.md holds the steps, the two saves, and the design outline's open questions: whether each variant reads as its family with its own name and tint, whether fifteen families are told apart by their silhouettes, and whether the aspects' numbers are right against the Undercroft's hero.

An agent stores each session as `tests/simulation/replays/undercroft-playtest.json` and `tests/simulation/replays/ossuary-playtest.json`, and each feedback file under `notes/`, and a spec replays each from its save. The triage is held with the maintainer by the phase 6 method in `notes/<date>-descent-strata-2-and-3-triage.md`: each note one outcome, a bug, a tuning change, a screen fix, or no change, with a new system to Deferred. Accepted items are written as P12-S80-T02 onward, in the bucket's order until three days are spent; a design answer the triage needs is the game designer's.

**Acceptance:**
- Each session holds no panel command, begins from its save, and ends at its boss's kill.
- Two replays of each agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/undercroft-playtest.spec.ts` and `tests/simulation/replays/ossuary-playtest.spec.ts`: each skips until its log exists; then the replay from its save, no panel command, the kill, and the level at the kill printed.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P12-S79-T03 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01, and every ticket of sprints 72 to 78 |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 12 touched read against the build as it stands, and corrected, beside the playtest ([R17](../02-risks-and-hidden-work.md)): the ability pipeline, entities and pools, content and registries, simulation loop, presentation, and the generator's page under `docs/architecture/`; ADRs 0019 and 0020 against the code; the descent, the enemy catalogue, the item catalogue, status effects, the disable matrix, enemies, map and camera, and the developer panel under `docs/product/`; the where-to-look pointers for aspects, the periodic list, the on-death hook, and the reflected hit; the vocabulary for **aspect**, **family**, **variant**, and each stratum's and boss's name, if missing. Each correction is a line in the ticket's closing note.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 12 added is in its page's quick reference.
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
| The sweeps: level at maps 20 and 30, deaths, minutes per map, best item level | |
| Both balance logs replaying from their saves | |
| The maintainer's two sittings | |
| Triage and the bucket | |
| The docs read against the build | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Two strata are two sittings of about ninety minutes each; sprint 80 waits on the triage, and phase 13 does not start while two phases' playtests are outstanding.
- **The balance tunes the Nave by accident.** Every row tuned here is a stratum 2 or 3 row; the Nave's and the long road's logs are the check.
