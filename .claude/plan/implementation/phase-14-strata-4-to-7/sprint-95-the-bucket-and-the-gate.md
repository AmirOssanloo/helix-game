# Sprint 95 — The bucket and the gate

**Phase:** 14 · **Sized days:** 1 in tickets, 3 of bucket appetite · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

## Goal

What the maintainer's playtest accepted is built within its three days, and the phase 14 gate is walked with its numbers recorded. **M22, the phase 14 gate.**

## Playable outcome

Strata 4 to 7 from the saves at maps 31, 41, 51, and 61, as the triage left them: the same four sittings as sprint 94's, with every accepted note answered.

---

## Tickets

### The bucket — 3 days of appetite

Tickets P14-S95-T02 onward are what P14-S94-T04 accepts, in the triage note's order, until three sized days are spent. They run before T01. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint.

---

### P14-S95-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P14-S94-T05, and the bucket's |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 14 gate](../04-phase-exit-gates.md#phase-14-gate) walked and recorded with numbers in the phase README's exit record:
- each family's ability by its spec, and fear's matrix row cell by cell;
- each recipe's stress case with no refusal, and the zone pool with no miss on the worst Mirrorhalls map;
- the four stratum bosses and their pieces;
- the driver's four sweeps, the hero's level at maps 40, 50, 60, and 70;
- the maintainer's sessions replaying from their saves, and the triage.

The bar on the densest map of each new recipe's sweep: the tick headless from each stress case; frame rate, sync, render, world draw calls, and heap in Chrome on the development machine by an agent, with a screen open and the kept map standing; the render benchmark the same way. A row that reads the maintainer's sessions and has none yet is deferred with a box, as earlier phases' were, only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M22, and the phase README's status line say so.
- The seams P14-S86-T02 listed each have their consumer; one without goes to Deferred ([R37](../02-risks-and-hidden-work.md)).
- It plays: each stored session replays into two worlds agreeing at every tick.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The bucket: tickets, days committed and unspent | |
| The phase 14 gate, every row | |
| Milestone M22 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system goes to Deferred.
- **A note asks for art or sound.** Sprite art and every sound are phase 16's; a note that a family does not read goes to its silhouette, painted in code, or to phase 16's list.
- **Two playtests outstanding** ([R41](../02-risks-and-hidden-work.md)): if phase 13's reading has not come in by this gate, phase 15's work does not start until one of the two runs has.
