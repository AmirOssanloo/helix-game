# Sprint 53 — The bucket, the docs, and the gate

**Phase:** 9 · **Sized days:** 1.5 in tickets, 2 of bucket appetite · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket. Here they take the unallocated half day first; past it, T02 moves to the top of the next sprint, and phase 9 closes a sprint later.

## Goal

What the maintainer's playtest accepted is built within its two days, the pages match the build, and the phase 9 gate is walked with its numbers recorded.

## Playable outcome

The long road with the bank as the triage left it: the same run as sprint 52's, with every accepted note answered.

---

## Tickets

### The bucket — 2 days of appetite

Tickets P9-S53-T03 onward are what P9-S52-T04 accepts, in the triage note's order, until two sized days are spent. They run before T01 and T02. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint.

---

### P9-S53-T01 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 41 to 44, 51, and 52, and the bucket's |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 9 touched read against the build as it stands, and corrected: the ability pipeline, entities and pools, commands and events, presentation, and content and registries under `docs/architecture/`; the item catalogue, the disable matrix, the enemy catalogue, the long road, status effects, enemies, controls and orders, HUD, items and loot, and the developer panel under `docs/product/`; the where-to-look pointers; the vocabulary for **active item**, **activating**, **bank**, **self-lift**, **dispel**, **disjoint**, and **ethereal**. Each correction is a line in the ticket's closing note.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 9 added is in its page's quick reference.
- No page under `docs/` gains a phase number outside the roadmap.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** `tests/docs-links.spec.ts` green.

**Pages:** as the build lists.

**Definition of done:** Every change · A documentation change.

---

### P9-S53-T02 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 9 gate](../04-phase-exit-gates.md#phase-9-gate) walked and recorded with numbers in the phase README's exit record. The bar at 200 enemies on the long road with the ground-item pool full, six items in the bank, and a screen open: the tick headless from the long-road stress case; frame rate, sync, render, world draw calls, and heap at the densest choke in Chrome on the development machine by an agent; the render benchmark the same way. A row that reads the maintainer's session and has no session yet is deferred with a box, as phase 8's were, only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M14, and the phase README's status line say so.
- It plays: the maintainer's session replays into two worlds agreeing at every tick.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The bucket: tickets, days committed and unspent | |
| The docs read against the build | |
| The phase 9 gate, every row | |
| Milestone M14 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system goes to Deferred.
- **Two playtests outstanding** ([R41](../02-risks-and-hidden-work.md)): if phase 8's run has not come in by this gate, phase 10's sprint files are not cut until one of the two runs has.
