# Sprint 102 — The Unwound, the bottom, and the playtest

**Phase:** 15 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and the documentation sync, T04, moves to the top of sprint 103, ahead of its bucket ([R41](../02-risks-and-hidden-work.md)). The playtest does not move: it is the calendar.

## Goal

The descent has a bottom: the Unwound casts a different set of the descent's disables at each quarter of its health, its death wins the run, and the driver walks from the town to that kill. The maintainer plays the last three strata and the Unwound from saves.

## Playable outcome

From a save with map 100's waypoint reached: go down, walk to the chamber, and fight the Unwound through its four quarters, answering each with the kit, an item, or the walk. It dies; RUN WON shows; the hero stands in town with the run saved as won.

---

## Tickets

### P15-S102-T01 — The Unwound

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 2 |
| Depends on | P15-S98-T01, P15-S98-T04, P15-S99-T01, P15-S100-T04, P15-S101-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The Unwound,** as the designer's table sets it: an archetype written once, with four ability sets, one for each quarter of its health, by the ability condition on the caster's health that exists. Every ability it casts is one the descent already built (the stratum bosses' and the families'), referenced by key ([ADR 0005](../../../../docs/adr/0005-content-references-by-string-key.md)); no ability is written for it alone unless the table names one.
- **Its chamber on map 100,** in the Pit's recipe, with the crowd the designer decided or none, under the bound of 60 near any point.
- **Its death** sets the run-won flag of P15-S98-T04 through map 100's boss pack record, so the fixture that stood in for it is retired from the build and kept only in that ticket's spec.
- **Its piece,** phase 13's, dropped at the named-boss rate.
- **A silhouette frame of its own,** painted by the shape painter into the one atlas page, the last frame the roster adds.

**Acceptance:**
- Each quarter casts only its set, at its clocks; a set changes on the tick the health fraction crosses, and never back.
- Its death wins the run once, saves it, and shows the screen.
- The piece drops only from it, at its rate over 10 000 rolls.
- It plays: in Chrome by an agent, the Unwound fought from a driver-written save at map 100's waypoint, through all four quarters to the win.
- The bar: the tick and the frame in the chamber at its worst quarter, recorded; world draw calls unchanged; the render benchmark by an agent after the frame.

**Tests:** `tests/simulation/bosses/unwound.spec.ts`: each quarter's set by health fraction, the crossings, the win, the piece; `tests/simulation/stress.spec.ts`: a chamber case at the worst quarter under `pnpm test:budget`.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md) and [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S102-T02 — The Pit balanced, and the descent walked to its bottom

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver from the town to the Unwound's kill, with no panel help, on a sampled sweep: each seed walked stratum by stratum, the driver's own saves at each stratum's waypoint chaining one sitting's worth of walk to the next, so no step is skipped and no run is a single hundred-map tick loop. Rows of the Pit retuned with the designer's approval, and recipes fixed as content ([R42](../02-risks-and-hidden-work.md)).

**Acceptance:**
- On every seed of the sample, the driver kills the Unwound and the run is won; the hero's level near map 100 printed, about 30.
- Deaths and minutes per map printed for maps 91 to 100, and the total walk's minutes at the driver's pace.
- It plays: one seed's walk of the Pit stored as its balance log and replayed by a spec; the whole walk's checksum at each stratum's save recorded.
- The bar: the Pit's stress case and the chamber case green on the tuned numbers.

**Tests:** `tests/simulation/replays/balance-pit.spec.ts`: the stored walk replays to the Unwound's kill and the win.

**Pages:** the enemy catalogue, if a number moved.

**Definition of done:** Every change · A documentation change.

---

### P15-S102-T03 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01, T02, P15-S99-T02, P15-S100-T05 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the driver writes four saves, as it reaches the waypoints of maps 71, 81, 91, and 100, and the commit they are written on is tagged `playtest-phase-15`, so the saves and the build stay together after main moves ([R41](../02-risks-and-hidden-work.md)). A box under Waiting on a person in STATUS.md holds the steps: across sittings, resume each save in town, go down by waypoint, and play its stratum to its boss's kill, the Choirmaster, the Binder Below, and then the Unwound from the fourth save, to the run won. The panel stays closed. F9 for each note; **Save input log** at the end of each sitting, each log beginning from its save. The box asks the design outline's open question: whether the Unwound's four quarters ask for every answer, each at the right moment, and whether any quarter asked for one the hero did not have.

An agent stores each session under `tests/simulation/replays/` and each feedback file under `notes/`. The triage is held with the maintainer and, for any note that says a pillar is bent, the game designer, in `notes/<date>-descent-bottom-triage.md` ([R24](../02-risks-and-hidden-work.md)). Each note gets one outcome; accepted items are written as P15-S103-T02 onward, in the bucket's order until three days are spent. A note asking for a new unit goes to Deferred, since the roster is frozen for phase 16.

**Acceptance:**
- The four sessions hold no panel command, and between them each boss's kill and the run won.
- Each log replays from its save into two worlds agreeing at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/descent-bottom-playtest.spec.ts`: skips until the logs exist; then each replay from its save, no panel command, each kill and the win.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P15-S102-T04 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | every ticket of sprints 96 to 101, and T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 15 touched read against the build as it stands, and corrected, beside the playtest:
- **Under `docs/architecture/`:** the ability pipeline (the source point, `front_shield`'s filter, the zones bound to a target), entities and pools (split children as members, the run-won flag), commands and events (the win), and content and registries (the recipe's fields for aspect counts).
- **Under `docs/product/`:** the disable matrix (mute's and the tether's rows), status effects (mute, the tether, the null field, the shield, and the Deferred line about the descent's statuses, now written), the enemy catalogue, enemies, the descent's section 9 open numbers that files now own, map and camera (the won run), and HUD (the bank greyed by mute, the won screen).
- **Pointers and terms:** the where-to-look pointers, and the vocabulary for **mute**, **tether**, **split**, **thorns**, **front shield**, and **run won** if the designer named it a term.

Each correction is a line in the ticket's closing note. A correction found after the bucket is the gate's.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 15 added is in its page's quick reference.
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
| The Unwound by its spec, in Chrome by an agent to the win | |
| The driver from the town to the Unwound's kill: seeds, level near map 100, total minutes | |
| The chamber's tick and frame at the worst quarter | |
| The four saves written, the build pinned, the box raised | |
| The maintainer's sittings; triage and the bucket | |
| The docs read against the build | |
| The render benchmark, by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The Unwound is the one fight that reads every answer.** Its numbers came from the designer in sprint 98; a quarter the driver cannot pass is retuned in its row in this ticket, not in the bucket, and a quarter with no answer is a pillar bent, the designer's first.
- **The driver's whole walk is slow.** A hundred maps at the driver's pace on a sweep is long even headless; the sweep is sampled for the test tiers and walked in full once, for the gate, with its time recorded.
- **The playtest is the calendar** (R41). Sprint 103 waits on it; with phase 14's run also outstanding, phase 16 does not start until one of the two is played.
