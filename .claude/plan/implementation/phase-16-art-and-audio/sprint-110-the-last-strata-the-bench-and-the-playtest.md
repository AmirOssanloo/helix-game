# Sprint 110 — The last strata, the bench, and the playtest

**Phase:** 16 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **T01 waits on a delivery, and T02 and T03 wait on every delivery.** The bench and the playtest are read on the final art and sounds, never on a placeholder. T04 runs beside the playtest. The unallocated half day takes a second pass at a refused sheet, if one came back.

## Goal

The last pages are dropped in. Every stratum's page holds the bar at its densest map with sound on. The maintainer plays the descent from saves, looking and listening, and the notes are triaged. The pages match the build.

## Playable outcome

From a save at stratum 10's arrival, the last stratum in its own art, and the Unwound's casts heard as their poses begin. From a save at each stratum's arrival, a map that looks and sounds unlike the one above it.

---

## Tickets

### P16-S110-T01 — The art of strata 8 to 10

| Field | Value |
| --- | --- |
| Layer | assets, content, tests |
| Size | 1 |
| Depends on | P16-S109-T02; **the delivery of strata 8 to 10, ordered by the maintainer from the asset list (Q133)** |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched at 1.5. Now 1, a drop-in after P16-S109-T02 has met the format once.

**Build:** as P16-S109-T02, for strata 8 to 10 and the Unwound.

**Acceptance:**
- `pnpm assets` imports every sheet with no refusal; the content test shows no placeholder left anywhere, art or sound.
- No code under `src/` changes but generated frame lists; every stored log's content version and checksums are unchanged.
- It plays: in Chrome by an agent, from a save at each of maps 71, 81, and 91: each family at each order state, its pose, and its death; each boss; the Unwound.
- The bar: the render benchmark on each of the three pages, by an agent, under 5 world draw calls.

**Tests:** `tests/content/art-and-audio-assets.spec.ts`: green, the placeholder count at zero.

**Pages:** none.

**Definition of done:** Every change.

---

### P16-S110-T02 — The bench and the bar on each stratum's page at its densest map

| Field | Value |
| --- | --- |
| Layer | bench, tests, docs |
| Size | 1 |
| Depends on | T01, P16-S109-T03, P16-S109-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the bar walked on each of the eleven pages, the town and ten strata, with its final art and sound on, in Chrome on the development machine by an agent. It reads the render benchmark on the page, then the densest map of each stratum's sweep at its choke: frame rate, sync, render, world draw calls, and heap. The tick is read headless from each recipe's stress case, as before. The figures are a table in the phase README, one row a page.

**Acceptance:**
- Every page: 60 fps, render under 6 ms, under 5 world draw calls, and a flat heap after warm-up on the bench, by ADR 0021's criteria.
- Every stratum's densest map holds the bar with sound on.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's content version and checksums are unchanged.
- It plays: the eleven maps loaded and fought by an agent in Chrome.
- The bar: this ticket reads it; a page that fails goes back to its maker with its figures, or is a bucket ticket if the fault is ours.

**Tests:** every stress case green under `pnpm test:budget`; `tests/simulation/replay-determinism.spec.ts` green on every stored log.

**Pages:** the phase README's table; [performance standards](../../../../docs/standards/performance.md), if a figure the page states moved.

**Definition of done:** Every change · A documentation change.

---

### P16-S110-T03 — The maintainer's playtest and its triage, looking and listening

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the maintainer plays the published build from the saves the driver writes at each stratum's arrival, ten of them, with sound on, across as many sittings as they like. Each sitting takes a stratum through its boss, or as far as the sitting goes. F9 for each note; **Save input log** at the end of each. A box under Waiting on a person in STATUS.md holds the steps, the ten save files, and three questions:
- whether each family reads by its silhouette before its colour, and a variant at a second look (Q133);
- whether a cast is heard as early as it is seen, and whether any confirmation masks a tell (Q132);
- whether each stratum looks and sounds unlike the one above it.

An agent stores each session under `tests/simulation/replays/` as `art-and-audio-playtest-<stratum>.json`, each beginning from its save, and a spec replays each. The triage is held with the maintainer by the phase 6 method in `notes/<date>-art-and-audio-triage.md`. Each note gets one outcome: a sheet or sound back to its maker, a presentation fix, a list row, or no change. A new system goes to Deferred. Accepted items are written as P16-S111-T02 onward, in the bucket's order, until three days are spent. A design answer the triage needs is the game designer's.

**Acceptance:**
- At least one session per stratum, each replaying from its save to the same checksums twice.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/art-and-audio-playtest.spec.ts`: skips a stratum whose log does not exist yet; then each replay from its save, and the maps reached printed.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P16-S110-T04 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | every ticket of sprints 104 to 109, and T01 and T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 16 touched is read against the build and corrected:
- under `docs/architecture/`: presentation, content and registries, where to look, and layers, for `presentation/audio/`;
- under `docs/standards/`: presentation coding and performance;
- under `docs/adr/`: ADRs 0001, 0006, 0012, 0021, the sound record, and the index;
- under `docs/workflows/`: importing art and sound, adding an enemy, and development;
- under `docs/product/`: map and camera, enemies, HUD, spells and attack, orbs and Invoke, controls and orders, and items and loot;
- the [vocabulary](../../../../docs/product/vocabulary.md), for **tell**, **page**, and **placeholder**, if they are used.

Each correction is a line in the ticket's closing note. The roadmap's phase 16 section is checked against what shipped.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 16 added is in its page's quick reference.
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
| Strata 8 to 10 imported; no placeholder left anywhere | |
| The bar on each of the eleven pages, with sound on | |
| The maintainer's sessions, one a stratum, replaying from their saves | |
| Triage and the bucket | |
| The docs read against the build | |
| Every stored log's content version and checksums unchanged | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Ten strata from saves is the longest sitting the plan has asked for. The saves let the maintainer take them in any order and any number of sittings, and the gate needs one session per stratum, not one run.
- **A note asks for a sheet redrawn.** That waits on its maker, not on an engineer. A redraw that has not landed by the gate goes to Deferred with the maker's date, and the gate reads the art as delivered.
