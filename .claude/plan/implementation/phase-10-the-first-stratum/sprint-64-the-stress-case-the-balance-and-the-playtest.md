# Sprint 64 — The stress case, the balance, and the playtest

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule). Here that is the docs sync, T04; the playtest, T03, does not move, since the calendar is the maintainer's.

## Goal

The Nave holds the live cap and the pathing budget on a sweep; the driver walks the whole stratum from the town to the Gaolmaster's kill at about level 12 with no panel help; the maintainer plays the town and the first maps; and the pages match the build.

## Playable outcome

A fresh session in town at level 1, walked down the Nave by the portal, with a town portal home to sell and a waypoint back, to the Gaolmaster's kill on map 10 at about level 12: the driver's recording, replayed in Chrome, and the maintainer's own first forty minutes of it.

---

## Tickets

### P10-S64-T01 — The stress case per recipe

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P10-S63-T02, P10-S63-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Nave's stress case in `tests/simulation/stress.spec.ts`, under `pnpm test:budget`, as the long road's is. On a sampled sweep of 20 seeds at every level, each map is loaded and every pack woken, region by region, at the stress case's engage pace. It reads:
- `enemy_cap_reached`, which must never fire;
- the most enemies near any point, against 60;
- the most A* expansions in a tick, printed against the re-path budget ([R23](../02-risks-and-hidden-work.md));
- the tick's mean and p99.

The densest map of the sweep, by the most enemies near a point, is named for the gate's bar.

**Acceptance:**
- No `enemy_cap_reached` on the sample; the bound of 60 holds; the most A* expansions a tick is under the re-path budget, or R23's first two steps are taken in this ticket and the figure written.
- The densest map's seed and level written in the sprint exit.
- It plays: not applicable; headless.
- The bar: the tick's mean and p99 on the densest map, headless, against the budget.

**Tests:** `tests/simulation/stress.spec.ts`: the Nave's case, its figures printed and its bounds asserted.

**Pages:** [performance](../../../../docs/standards/performance.md), the stress case per recipe, if it lists the cases.

**Definition of done:** Every change · A documentation change.

---

### P10-S64-T02 — The balance: the stratum walked from the town to the Gaolmaster's kill

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P10-S62-T01, P10-S63-T03 |
| Owner | The game engineer, with the game designer for the numbers |
| Status | planned |

**Build:** the driver walks the whole Nave on a sweep of 10 seeds with no panel command. It starts from a fresh session in town at level 1, goes down by the portal, uses the town portal at least once and a waypoint at least once, and ends at the Gaolmaster's kill. The Nave's numbers are tuned as content until the walk lands the hero at about level 12 on map 10. The numbers are the variants' experience, the pack budget, map size, and the Gaolmaster's; each tuning is written with its reason. A new rule is the game designer's and goes to the bucket or Deferred ([R42](../02-risks-and-hidden-work.md)). One walk is stored as `tests/simulation/replays/balance-nave.json`.

The R42 figures are recorded in the phase README from the 1000-seed sweep and this walk:
- enemies per map;
- the waypoint's fraction;
- minutes per map at the driver's pace;
- the most A* expansions a tick;
- generation time of the largest map;
- the fallback rate.

**Acceptance:**
- Every walk of the ten kills the Gaolmaster; the hero's level on map 10 is 11 to 13 on each, the mean written; deaths per walk written.
- The stored walk replays identically; the balance margin, as the long road's catalogue writes it, in the sprint exit.
- Every tuning is content; no file under `src/domain` or `src/simulation` changes in this ticket.
- It plays: the stored walk replayed in Chrome by an agent, from the town to the kill.
- The bar: each R42 figure against its band; a miss is written with the tuning that answered it.

**Tests:**
- `tests/simulation/replays/balance-nave.spec.ts`: the replay; no panel command; the town portal and a waypoint used; the kill; the level on map 10 printed.
- `tests/simulation/replays/record-balance.spec.ts`: a `HELIX_RECORD=nave` case that records it again.

**Pages:** the Nave's spec and [the enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), the tuned numbers; [the descent](../../../../docs/product/specs/the-descent.md#2-the-shape), the level at map 10, checked.

**Definition of done:** Every change · A documentation change.

---

### P10-S64-T03 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T02, every ticket of sprints 54 to 63 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the maintainer plays the published build from a fresh session in town, in one tab with no reload, for about forty minutes ([R41](../02-risks-and-hidden-work.md)'s sitting): down the Nave's first maps by the portal, with the town portal used once and a waypoint used once. The panel stays closed. F9 for each note; **Save input log** at the end. The Gaolmaster is judged by the driver here and by the maintainer in phase 11, once a run survives the tab. A box under Waiting on a person in STATUS.md holds the steps and asks:
- whether a map's rooms read as the Nave and not the long road;
- whether a map's length feels right against its eight to twelve minutes;
- whether the three seconds of B's channel read as a decision;
- whether the waypoint midway saves the right part of the walk.

If phase 9's run is still outstanding, the box offers both in one sitting: phase 9's pinned build first, then this one ([R41](../02-risks-and-hidden-work.md)'s fourth rule). If the run comes after the gate, it is played on `playtest-phase-10`.

An agent stores the session as `tests/simulation/replays/nave-playtest.json` and each feedback file under `notes/`, and a spec replays it. The triage is held with the maintainer by the phase 6 method in `notes/<date>-nave-triage.md`: each note one outcome, a bug, a tuning change, a screen fix, or no change, with a new system to Deferred. Accepted items are written as P10-S65-T02 onward, in the bucket's order until three days are spent. A design answer the triage needs is the game designer's.

**Acceptance:**
- The session starts in town, holds no panel command, a `town_portal` whose portal is taken and returned by, and one travel command.
- Two replays agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/nave-playtest.spec.ts`: skips until the log exists; then the replay, the commands it must hold and must not, and the deepest map reached printed.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P10-S64-T04 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | every ticket of sprints 54 to 63, and T01 and T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 10 touched read against the build as it stands, and corrected, beside the playtest rather than after it ([R17](../02-risks-and-hidden-work.md)):
- **Architecture:** ADRs 0015, 0016, and 0018 against the code, and ADR 0017's list against run scope as it stands; entities and pools, world model, simulation loop, commands and events, content and registries, presentation, devtools and instrumentation, and movement, collision, and pathing.
- **Standards:** performance.
- **Product:** map and camera, the descent, the Nave's spec, the enemy catalogue, the item catalogue, the disable matrix, hero, items and loot, controls and orders, HUD, and developer panel.
- **Workflows:** development and adding an enemy.
- **Pointers and words:** the where-to-look pointers, and the vocabulary for **town**, **town portal**, **channel**, **waypoint**, **portal**, **arrival point**, **map boss**, **stratum boss**, **family**, **variant**, and **recipe**.

Each correction is a line in the ticket's closing note.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 10 added is in its page's quick reference.
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
| The Nave's stress case: no `enemy_cap_reached`, the bound, the A* expansions against the budget | |
| The densest map of the sweep, by seed and level | |
| The balance: ten walks to the kill, the level on map 10, deaths, the margin | |
| The R42 figures, in the phase README | |
| The maintainer's run | |
| Triage and the bucket | |
| The docs read against the build | |
| The render benchmark, by an agent | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The balance ticket doubles** ([R42](../02-risks-and-hidden-work.md)). Tuning is content only and each change is one sweep; past 1.5 days, the rest of the tuning is the bucket's first ticket and the gate's band row says what was not reached.
- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). The gate's agent rows close the phase, with the person rows as boxes; phase 11 does not start while phase 9's and phase 10's runs are both outstanding.
