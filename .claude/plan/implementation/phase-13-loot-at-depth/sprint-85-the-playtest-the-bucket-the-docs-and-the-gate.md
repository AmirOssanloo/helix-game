# Sprint 85 — The playtest, the bucket, the docs, and the gate

**Phase:** 13 · **Sized days:** 2 in tickets, 2 of bucket appetite, or 3.5 if P13-S82-T03 was cut · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 12 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12's bucket runs first.** If the maintainer's phase 12 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket; past this sprint's buffer, T03 moves to the top of the next sprint, and phase 13 closes a sprint later ([R41](../02-risks-and-hidden-work.md)).

## Goal

The maintainer reads deep drops and the town store in the build, the notes are triaged, what the playtest accepted is built within its appetite, the pages match the build, and the phase 13 gate is walked with its numbers recorded: milestone **M20**.

## Playable outcome

From the save at map 21, set the panel's map level to 90 and kill a map boss: its drops are bases and tiers no drop at level 20 could be. The same run, with every accepted note answered.

---

## Tickets

### P13-S85-T01 — The maintainer's playtest and its triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 81 to 84 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the maintainer plays the published build from the driver-written save at map 21's arrival, resumed in town. The driver writes it again on this build if the content moved since phase 12 wrote it.
- **In town:** the maintainer reads what the town store stocks at that depth.
- **Down by waypoint:** the maintainer goes into the Ossuary and plays a map with the panel's map level set to 50, killing packs and the map boss and reading every drop's label and tooltip, Alt held.
- **Deeper:** the maintainer sets the map level to 90 on the next map and does the same.

The panel stays closed but for those two `set_map_level` commands, recorded in the log, and **Jump to checkpoint**. F9 for each note; **Save input log** at the end. A box under Waiting on a person in STATUS.md holds the steps and asks three questions:
- whether a drop at 90 reads as something no drop at 20 could be;
- whether a deep item's tooltip is read at a glance;
- whether comparing with the worn item is now wanted ([Deferred](../backlog/deferred.md)'s row, which waits on this playtest).

The store's tables below the third stratum cannot be played before phase 14 and are read by spec. The maintainer's session is sized to about thirty minutes, one sitting.

An agent stores the session as `tests/simulation/replays/deep-loot-playtest.json`, and each feedback file under `notes/`. A spec replays it from the save its header carries. The triage is held with the maintainer by the phase 6 method in `notes/<date>-deep-loot-triage.md`, in [R24](../02-risks-and-hidden-work.md)'s order. Each note gets one outcome: a bug, a tuning change, a screen fix, or no change. A new system goes to Deferred. Accepted items are written as P13-S85-T04 onward, in the bucket's order, until its days are spent. A design answer the triage needs is the game designer's.

**Acceptance:**
- The session begins from the save, and holds the two map-level commands at 50 and 90 and no other panel command but the jump. It holds at least one map boss's drops at each level.
- Two replays agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/deep-loot-playtest.spec.ts`: skips until the log exists; then the replay from its save, the two map levels, the commands it must not hold, and the boss drops at each level printed by rarity.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

### P13-S85-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 81 to 84; runs beside T01, before the bucket ([R17](../02-risks-and-hidden-work.md)) |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 13 touched read against the build as it stands, and corrected:
- **Under `docs/product/`:** the item catalogue (its bases, rarities, affixes, Legendary pieces, drops, store, and economy at depth); the descent's sections 7 and 8.1; items and loot; hero, for the cap; the developer panel, if the loot group changed.
- **Under `docs/architecture/`:** the ability pipeline's cooldown formula; content and registries, for treasure classes and the store's tables; entities and pools, if the line count moved.
- **The rest:** the where-to-look pointers, and the vocabulary for **treasure class**, **quality level**, and **affix level**, where the build uses them.

Each correction is a line in the ticket's closing note. Each bucket ticket keeps its own pages by the definition of done, and the gate reads what is left.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 13 added is in its page's quick reference.
- No page under `docs/` gains a phase number outside the roadmap.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** `tests/docs-links.spec.ts` and `tests/content/catalogues.spec.ts` green.

**Pages:** as the build lists.

**Definition of done:** Every change · A documentation change.

---

### The bucket — 2 days of appetite

Tickets P13-S85-T04 onward are what T01 accepts, in the triage note's order, until two sized days are spent, or three and a half if P13-S82-T03 was cut. They run after T01 and T02 and before T03. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint.

---

### P13-S85-T03 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01, T02, and the bucket's tickets |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 13 gate](../04-phase-exit-gates.md#phase-13-gate) walked and recorded with numbers in the phase README's exit record:
- **The catalogue:** the content test green on every table; every rarity at its weight over rolls at item levels 10 to 100.
- **The cap:** by its spec, and its tunable.
- **The index:** the figures from P13-S84-T03 at 30, 50, 70, and 100.
- **The saves:** every stored save loading.
- **The maintainer's session:** replayed and triaged.
- **The docs:** T02's checklist.
- **The bar,** as phase 12's, at 200 enemies on the densest map of the Ossuary's sweep, with the ground-item pool full of items rolled at item level 100 and a deep item's tooltip open. The tick is read headless from that map's stress case. Frame rate, sync, render, world draw calls, and heap are read at its densest point in Chrome on the development machine by an agent, and the render benchmark the same way.

A row that reads the maintainer's session and has no session yet is deferred with a box, as phase 8's were, only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M20, and the phase README's status line say so.
- It plays: the maintainer's session replays from its save into two worlds agreeing at every tick.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The maintainer's run, from the save at map 21 | |
| Triage and the bucket: tickets, days committed and unspent | |
| The docs read against the build | |
| The phase 13 gate, every row | |
| Milestone M20 | |
| Phase 12's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). The bucket and the gate wait on it. Phase 14 does not start while phase 12's and phase 13's runs are both outstanding.
- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system, item comparison included unless the triage accepts it as a screen fix within the bucket, goes to Deferred.
- **Deep drops read on a shallow map.** The maintainer reads level 90 items on an Ossuary map with a level-21 hero who cannot wear most of them. The verdict is on reading them, not on wearing them; wearing them is judged when the strata exist.
