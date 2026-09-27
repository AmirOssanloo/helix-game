# Estimation and capacity

**Written:** 2026-09-20 · **For:** anyone questioning a number, and the engineer recording actuals

How the sizes were derived, what they assume, and what would change them. Sizes are honest guesses by someone who has built these pieces before; they are not commitments to the day, and the plan's buffers are where the guessing error goes.

---

## The unit

An **engineer-day** is one full day of one engineer working with the architect and game-engineer roles delegated for drafts, alternatives, and review. It includes writing the tests the ticket names and walking the definition-of-done rows. It does not include the gate work, which has its own tickets.

The scale is **0.5, 1, 1.5, 2, 3**. A ticket that would be larger than 3 is two tickets, because a three-day ticket that is wrong is a week lost and a five-day one is a sprint lost.

---

## How the numbers were made

Three anchors, then judgment.

1. **ADR 0002's own estimate.** It sizes the simulation core at eleven to twelve days: two for locomotion and the state machine, half for constant-speed path following, one for push-out, two for the grid and A*, one for the spatial hash, half for sweeps, and the rest for the loop, the random source, pools, debug hooks, and tests. The plan uses those numbers directly in sprints 01 to 03 and 09 and adds nothing to them.
2. **Per-layer test counts in `docs/standards/testing.md`.** The table there says how many tests each kind of thing gets. A ticket's size includes writing them; a pool is five or six tests, a behaviour is one per transition, a spell is one per effect at two orb levels.
3. **The rule that a definition is a file and a bespoke behaviour is one function.** A spell built from primitives is half a day including its tests and its preview. A spell with a named effect that has its own per-tick state is a day or more.

Then judgment: anything touching Phaser gets a half-day added for the things the API does not say, and anything that is the first of its kind (the first view, the first behaviour, the first named effect) gets a half-day added because the second one copies the first.

---

## Totals

| Phase | Sized days | Sprints | Sized days per sprint |
| --- | --- | --- | --- |
| 0 | 8 | 2 | 4.0 |
| 1 | 20 | 5 | 4.0 |
| 2 | 20 | 5 | 4.0 |
| 3 | 22.5 | 6 | 3.75 |
| 4 | 12 | 3 | 4.0 |
| 5 | 16 | 4 | 4.0 |
| 6 | 23: 19 in tickets, 4 of bucket appetite | 6 | 3.8 |
| 7 | 23.5: 22.5 in tickets, 1 of bucket appetite; was 24 until the architect review of 2026-09-27 | 6 | 3.9 |
| 8 | 34: 27 planned in tickets, 6 added on 2026-09-27, 1 moved to phase 7 the same day, 2 of bucket appetite | 10 | 3.4 |
| 9, sketched | 14.5 | 4 | 3.6 |
| **Total** | **193.5** | **51** | |

Ninety-two sized days in twenty-three sprints of five days is 115 calendar days, of which 23 are buffer. That is a 25% contingency held inside the sprints rather than as a block at the end, so it is spent where the slip happens and is visible per sprint.

---

## Where the uncertainty concentrates

Not every ticket is equally uncertain. These are the ones whose size could be off by a factor of two, and what happens if they are.

| Ticket | Why uncertain | If it doubles |
| --- | --- | --- |
| P1-S02-T04 · Render benchmark | The first contact with Phaser 4's batcher on the reference laptop | The sprint buffer absorbs one failure; a second reopens ADR 0001 and stops the plan |
| P1-S03-T04 · Grid A* with smoothing, inflation, budget | Four sub-problems, each with a corner case | Sprint 03 loses its buffer; sprint 04 starts a day late |
| P1-S05-T02 · PlayScene views and camera | The first pooled view, the first sync, the first interpolation; everything after copies it | Sprint 05 slips into 06; the gate absorbs it |
| P2-S07-T03 · Pipeline generalisation | Replaces the phase-1 stub cast with the real stage machine while every phase-1 test stays green | Sprint 07 loses its buffer |
| P2-S11-T01 · Glacier and Updraft | The two hardest named effects; Updraft carries units and suspends their orders | Sprint 11 slips; the phase 2 gate moves a week |
| P3-S12-T03 · AI state machine, three behaviours, packs, leash | The largest single ticket in the plan | Sprint 12 slips into 13 |
| P3-S15-T01 · Profile and fix at 200 enemies | Unknown until measured; could be nothing or could be R2 | Phase 3 gate moves a week; if it is the object layout, two sprints |
| P4-S17-T01 · Generic tuning surface | The key format for definition fields is undesigned | Half the phase 4 gate; scoped to numeric fields to bound it |

| P6-S26-T03 · Packs sleep again | The one new behaviour in phase 6 with subtle state: a pack mid-Return, a summoner's adds, a pack woken on the tick it would sleep | Sprint 26 loses its buffer; the map moves a day |
| P6-S28-T01 · The long road as a map definition | 150 rectangles and fifty packs typed by coordinate; errors are caught by content tests, but each one caught is a round trip | Sprint 28's buffer; T02 runs first |
| P6-S27-T04 · The feedback file | A key reaching two listeners, a build-time stamp, and a load that stops at a tick | Sprint 27 loses its buffer |
| The phase 6 bucket | Sized after triage by definition; sprint 11's precedent is 5.75 days from one walk | Nothing: the appetite is fixed at four and the surplus is deferred |
| P8-S31-T02 · Where the inventory, the ground item, loot, and the store live | Placement on top of phase 7's two records; the uncertainty of the first-screen decision moved to P7-S48-T04 on 2026-09-27 | Sprint 31's buffer; the schema starts a day late |
| P8-S33-T03 · Ground views, labels, and Alt | Label overlap placed with no allocation in the sync | The overlap pass goes to Deferred rather than the sprint slipping |
| P8-S35-T01 · Rarity and affixes | The largest ticket in the phase: seven tiers, pools per slot, ranges by item level, all on the loot draw's sequence | T04, moving an item on the grid, moves to sprint 36's buffer |
| P8-S39-T01 · The long road at Diablo II density | About a hundred more enemies typed by coordinate, a budget to land in a band, and a near-point bound to argue again | Sprint 39's buffer takes it; sprint 31 starts a day late |
| P8-S39-T03 · The crowd's push at 0.1 | Option (b), a crowd that stops pressing into the enemies ahead, is new collision behaviour with a tick cost | The architect falls back to (a), a looser bar, rather than the ticket running over |
| P8-S40-T01 · The pick-up order | A new order kind: the mapper's right click, the walk, the take, and a disable-matrix column | Sprint 40's own buffer and its 2.5 unspent days take it |
| P8-S37-T01 · The drop-rate balance | A recording driver and tuning against one route on the new road; the rates may not cover the sustain at values that still read as rare | The rates read generous, and the playtest's bucket takes the rest |
| The phase 8 bucket | Sized after triage; phase 6's ran 5.25 against 4 | Nothing: the appetite is fixed at two and the surplus is deferred |
| P7-S45-T02 · The full-state comparison and checksum | Every field of every record listed and walked; a list that misses one is the phase's blind spot | Sprint 45's buffer; nothing after it starts until it holds |
| P7-S47-T02 · The registry validator by descriptor | A descriptor can grow into a framework (R37) | Its acceptance is the toy kind in three files and nothing more general; a descriptor feature no kind uses is cut |
| P7-S49-T02 · A map change as a command | Replay through a map change, and session orchestration decided mid-ticket | Sprint 49's buffer; what the orchestration decision adds past it goes to Deferred |
| P7-S50-T01 · The capture layer | The first screen of the game; DOM, if chosen, claims across two input sources | Sprint 50's buffer, then the bucket |

If every one of phases 0 to 5's rows doubles, the plan is 29 sprints. If none does, it is 21, because some gate buffers go unused. The honest band is **21 to 29 sprints**, with 23 as the plan.

---

## What would change the numbers

- **A second engineer.** The [dependency map](./01-dependency-map.md) shows where work splits. Expect phases 2 and 3 to shorten by about a third, phase 1 by less, and phases 0, 4, and gates not at all. Two engineers also add review and merge cost that this plan does not count.
- **Less than full allocation.** Sprints stretch proportionally. Do not shrink the sized days; stretch the calendar.
- **Design decisions taking longer than their tickets.** The spell catalogue (1 day), the enemy catalogue (0.5 day plus 2 days in phase 5), and the disable matrix (0.5 day) are sized as writing tasks. If they become discussions, they become calendar time outside the sprint.
- **Sprints 23 and 24.** The isometric view was added to phase 3 on 2026-09-23 at 6.5 sized days in two sprints, after the phase 2 close. The totals above include them; the prose above this list still counts the original 92 days in 23 sprints.
- **Phase 6.** Added on 2026-09-26 at 23 sized days in six sprints: 19 in tickets on the same anchors, and 4 held as an appetite for what the playtest's triage accepts, written as tickets only after the triage. Most of the phase extends shapes that exist (a map field, a tunable, an activation rule, a stress case), which ran at about 0.35 in phases 3 to 5; the feedback file, the obstacle views, and the map's authoring are closer to new ground, which ran at about 0.8. Read the 19 as roughly 8 to 14 engineer-days of effort. The calendar is set by the maintainer's approval of the spec and the playtest, not by these days. The re-cut rule applies both ways, as the [retrospective](../2026-09-25-retrospective-and-account.md) asks: a ratio under 0.6 for two sprints re-cuts the remaining calendar, as one over 1.3 does.
- **Phases 8 and 9.** Added on 2026-09-26, after phase 6 closed, on the same anchors. The brief the maintainer saw sized phase 8 at 24.5 in about six sprints; that does not fit six sprints of at most four, and the plan's rules add 4.5: the first screen's decision split from the placement brief (0.5 more, the ticket at 1.5), the item level on every pack split out (0.5), the +1 to an orb as a ticket of its own since it reaches the kit (1, against the brief's optional 0.5), the maintainer's playtest and triage (0.5), and a bucket of two days for what it finds. The brief's 2.5-day inventory screen and store are each split in two to stay on the scale, at the same total. Phase 8 is 29 in eight sprints. Most of it is new ground, a new entity kind, the first screen, an economy, so expect nearer phase 1 and 2's ratio of about 0.8 than phase 3 to 5's 0.35: read the 27 in tickets as roughly 12 to 22 engineer-days. Phase 9 is sketched at 14.5 against the brief's 12: the architect's decision at 1, a catalogue section before any active, the drops turned on, and the playtest and docs sync; its eight actives extend the pipeline and should run nearer 0.35. The calendar of both is set by the catalogue's approval and the maintainer's playtests.
- **Phase 8's re-cut, 2026-09-27.** Before the phase started, the answers of that day added 3 unplanned days: the checkpoint reach, 0.5 (Q60), and sprint 39, 2.5, the long road at Diablo II density (Q58, 2) and regions with area levels on the map (Q89, 0.5). Sprint 31 was full, so the road took the next free sprint number and runs first, as sprints 23 and 24 ran inside phase 3; phase 9's sketch moved from 39–42 to 40–43. Phase 8 is 32 sized days in nine sprints. The road is content on shapes that exist, so read it near 0.35.
- **Phase 8's second re-cut, 2026-09-27.** The later answers of that day added 3 more: the crowd's push at 0.1 with the overlap-bar decision (P8-S39-T03, 1.5, from sprint 25's walk) and the right-click pick-up order (P8-S40-T01, 1.5, Q87), in a new sprint 40 run after 33, since sprints 33 and 34 were full; phase 9's sketch moved to 41–44. Inside the planned 27 the total held: the sized inventory added 0.5 to P8-S33-T01 and a new 1-day P8-S35-T04 (Q88); walk-over pickup of gold and globes alone fell from 1 to 0.5 (Q87); the +1 to an orb, 1, was cut (Q92); the map level replaced regions at the same 0.5 (Q89). Phase 8 is 35 sized days in ten sprints, 33 in tickets and 2 of bucket appetite. The push-share ticket's option (b) is the one new-ground risk; the rest extends shapes that exist.
- **Phase 7, the foundation, inserted 2026-09-27.** The maintainer approved a foundation phase before loot, proposed at about 20 sized days in five sprints, 45 to 49.
  - **The honest size.** On this page's anchors its approved scope is 23 days in tickets. The doors and the map change are 2 each; the full-state comparison, the modifier table, and the registry descriptors 1.5 each; the other seventeen tickets are 0.5 or 1 each.
  - **Six sprints.** At most four days fit a sprint, so 23 do not fit five. The plan keeps the scope and takes a sixth sprint, 50, with a one-day bucket in its spare day: 24 sized days.
  - **The architect's review, the same day.** P7-S46-T02 went from 1.5 to 1: the modifier row's source identity has no consumer but items, whose rows the item-placement record (P7-S48-T04 (a)) places, and P8-S34-T01 builds. The phase is 23.5, 22.5 in tickets, sprint 46 at 3.5, and its net cost after phase 8's return is 22.5.
  - **The cut, if 20 holds.** [Q96](./backlog/open-questions.md) asks whether to hold 20 instead, and names the cut that would: the map-change command, the event record's decision, and the play scene's syncers. Answered 2026-09-27: the maintainer holds the scope, 23.5.
  - **What phase 8 gives back.** Phase 8 returns 1 day: P8-S31-T02 from 1.5 to 1, since both of its decision records and the modifier model arrive done, and P8-S34-T02 from 1 to 0.5, since the capture layer arrives built. The net cost of the phase is 23.
  - **Expected ratio.** Almost all of it reshapes code that exists against a strong test net, which ran at about 0.35 in phases 3 to 5, so read the 23 as roughly 8 to 12 engineer-days. The exceptions are the checksum and the capture layer, which are new ground.
  - **Calendar.** No playtest; the calendar is its engineering days plus the maintainer's reading of two Proposed decision records, which does not stop the sprints after them.
- **The bar's cost.** By the standing instruction of 2026-09-27 every bar row and bench is an agent's in Chrome on the development machine, so no gate waits on the maintainer's calendar for a browser sitting; that sitting was the longest wait of phases 3 to 6.
- **Actuals.** Sprint 00 gained an unplanned one-day ticket, T00, before it opened: the entry points and agent configuration the plan assumed were there. The table above keeps the original sizing; the sprint file carries the total of 5. The engineer records the actual days beside each ticket's size when the sprint closes. After sprint 06, compare. If actuals run more than 30% over sized days, re-cut phases 2 to 5 before starting phase 2, not after.

---

## Recording actuals

Add an `Actual` row to the ticket table when the ticket is done. At the end of each phase, fill in this table in the phase `README.md`:

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |

The ratio after phase 1 is the number that decides whether phases 2 to 5 are re-cut.
