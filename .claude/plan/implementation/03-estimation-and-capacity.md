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
| 3 | 16 | 4 | 4.0 |
| 4 | 12 | 3 | 4.0 |
| 5 | 16 | 4 | 4.0 |
| **Total** | **92** | **23** | |

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

If every one of these doubles, the plan is 29 sprints. If none does, it is 21, because some gate buffers go unused. The honest band is **21 to 29 sprints**, with 23 as the plan.

---

## What would change the numbers

- **A second engineer.** The [dependency map](./01-dependency-map.md) shows where work splits. Expect phases 2 and 3 to shorten by about a third, phase 1 by less, and phases 0, 4, and gates not at all. Two engineers also add review and merge cost that this plan does not count.
- **Less than full allocation.** Sprints stretch proportionally. Do not shrink the sized days; stretch the calendar.
- **Design decisions taking longer than their tickets.** The spell catalogue (1 day), the enemy catalogue (0.5 day plus 2 days in phase 5), and the disable matrix (0.5 day) are sized as writing tasks. If they become discussions, they become calendar time outside the sprint.
- **Actuals.** Sprint 00 gained an unplanned one-day ticket, T00, before it opened: the entry points and agent configuration the plan assumed were there. The table above keeps the original sizing; the sprint file carries the total of 5. The engineer records the actual days beside each ticket's size when the sprint closes. After sprint 06, compare. If actuals run more than 30% over sized days, re-cut phases 2 to 5 before starting phase 2, not after.

---

## Recording actuals

Add an `Actual` row to the ticket table when the ticket is done. At the end of each phase, fill in this table in the phase `README.md`:

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |

The ratio after phase 1 is the number that decides whether phases 2 to 5 are re-cut.
