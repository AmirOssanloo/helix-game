# Sprint 65 — The bucket and the gate

**Phase:** 10 · **Sized days:** 1 in tickets, 3 of bucket appetite · **Buffer:** 1 · **Milestone:** M17, the phase 10 gate
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket. Here they share the three days with phase 10's bucket, phase 9's first; what neither holds goes to [Deferred](../backlog/deferred.md) or phase 11's bucket, and phase 10 closes a sprint later only if the gate's rows need it.

## Goal

What the maintainer's playtest accepted is built within its three days, and the phase 10 gate is walked with its numbers recorded.

## Playable outcome

The Nave as the triage left it: the same run as sprint 64's, with every accepted note answered, from the town to the Gaolmaster's kill.

---

## Tickets

### The bucket — 3 days of appetite

Tickets P10-S65-T02 onward are what P10-S64-T03 accepts, in the triage note's order, until three sized days are spent. They run before T01. A generator finding is fixed as recipe content, never as new generator code ([R42](../02-risks-and-hidden-work.md)). What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint.

---

### P10-S65-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P10-S64-T04, and the bucket's tickets |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 10 gate](../04-phase-exit-gates.md#phase-10-gate) walked and recorded with numbers in the phase README's exit record:
- **Travel and the kept map:** the travel specs green, the fixture replay's kept-map checksum unchanged, and a one-field change to the kept scope moving it.
- **Purity:** draw isolation and the golden hash green.
- **The sweep:** a 1000-seed sweep of the Nave rerun on the gate commit, its figures in their bands.
- **The walk:** the driver's ten walks to the Gaolmaster's kill.
- **The live cap:** the stress case under `pnpm test:budget`.
- **The roster:** the families' content tests, and the long road's stored logs unchanged.
- **The heap:** the heap with two scopes on the transition to town, in Chrome after a collection, against ADR 0015's revisit point.
- **The bar:** at 200 enemies on the densest map of the Nave's sweep, with the waypoint screen open and a kept map standing. The tick headless from the stress case; frame rate, sync, render, world draw calls, and heap at that map's densest point in Chrome on the development machine, by an agent; the transition's frame read in Chrome; the render benchmark the same way.

The gate commit is tagged `playtest-phase-10`, so the pinned build serves it. A row that reads the maintainer's session and has no session yet is deferred with a box, as phase 8's were, only if the maintainer's standing instruction in force allows it and [R41](../02-risks-and-hidden-work.md)'s limit holds; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M17, and the phase README's status line say so.
- It plays: the maintainer's session, if in, replays into two worlds agreeing at every tick; the driver's balance walk does in any case.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The bucket: tickets, days committed and unspent | |
| The 1000-seed sweep on the gate commit | |
| The phase 10 gate, every row | |
| The heap with two scopes, and the bar on the densest map | |
| `playtest-phase-10` served at its own address | |
| Milestone M17 | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |
| The phase's ratio of actual to sized, against the README's band | |

## Risks in this sprint

- **The bucket fills with generator code.** A note that asks for a new layout rule is the game designer's answer first; a new generator capability goes to Deferred, and the recipe is tuned instead ([R42](../02-risks-and-hidden-work.md)).
- **Two playtests outstanding** ([R41](../02-risks-and-hidden-work.md)): if phase 9's run has not come in by this gate, phase 11's sprint files are not started until one of the two runs has.
