# Sprint 80 — The bucket and the gate

**Phase:** 12 · **Sized days:** 1 in tickets, 3 of bucket appetite · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

What the maintainer's playtest accepted is built within its three days, and the phase 12 gate is walked with its numbers recorded. Milestone M19.

## Playable outcome

Strata 2 and 3 as the triage left them: the same two sittings as sprint 79's, with every accepted note answered.

---

## Tickets

### The bucket — 3 days of appetite

Tickets P12-S80-T02 onward are what P12-S79-T02 accepts, in the triage note's order, until three sized days are spent. They run before T01. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint. A page a bucket ticket changes is corrected in that ticket, since the docs sync has run.

---

### P12-S80-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P12-S79-T03, and the bucket's tickets |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 12 gate](../04-phase-exit-gates.md#phase-12-gate) walked and recorded with numbers in the phase README's exit record. The bar at 200 enemies on the densest map of each new recipe's sweep, with the ground-item pool full, the kept map standing, and a screen open: the tick headless from each recipe's stress case; frame rate, sync, render, world draw calls, and heap at the densest choke in Chrome on the development machine by an agent; the render benchmark the same way. A row that reads the maintainer's session and has no session yet is deferred with a box only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M19, and the phase README's status line say so.
- It plays: each of the maintainer's sessions replays from its save into two worlds agreeing at every tick.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The bucket: tickets, days committed and unspent | |
| The phase 12 gate, every row | |
| Milestone M19 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system goes to Deferred.
- **A bucket ticket moves a stored log.** It is traced to its rule before anything is recorded again ([R36](../02-risks-and-hidden-work.md)), and the gate reads the logs as the bucket left them.
