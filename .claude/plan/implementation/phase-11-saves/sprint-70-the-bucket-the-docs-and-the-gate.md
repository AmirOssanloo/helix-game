# Sprint 70 — The bucket, the docs, and the gate

**Phase:** 11 · **Sized days:** 1.5 in tickets, 2 of bucket appetite · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phase 10 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10's bucket runs first.** If the maintainer's phase 10 run is triaged while this sprint is open, its accepted tickets take the unallocated half day first; past it, T02 moves to the top of the next sprint, and phase 11 closes a sprint later, in the next free sprint number.

## Goal

What the maintainer's sittings accepted is built within its two days, the pages match the build, and the phase 11 gate is walked with its numbers recorded.

## Playable outcome

The first stratum with saves as the triage left it: the same run as sprint 69's, across sittings, with every accepted note answered.

---

## Tickets

### The bucket — 2 days of appetite

Tickets P11-S70-T03 onward are what P11-S69-T03 accepts, in the triage note's order, until two sized days are spent. They run before T01 and T02. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or a later phase's bucket, never into this sprint.

---

### P11-S70-T01 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 66 to 69, and the bucket's |
| Owner | The game engineer |
| Status | planned |

**Build:** every page phase 11 touched is read against the build as it stands, and corrected.
- **Under `docs/architecture/`:** simulation loop, entities and pools, commands and events, layers and the dependency rule, content and registries, presentation, and devtools and instrumentation.
- **Under `docs/`:** the testing standard; ADR 0017's table against `save-fields.ts`, and ADR 0014's revisit line.
- **Under `docs/product/`:** hero, items and loot, map and camera, HUD, the developer panel, and the vocabulary for **stash**, **save**, **resume**, and **new run**.
- **The where-to-look pointers** for the save module, the storage adapter, the stash, and the start screen.

Each correction is a line in the ticket's closing note.

**Acceptance:**
- No page states a rule the build breaks, and every rule phase 11 added is in its page's quick reference.
- No page under `docs/` gains a phase number outside the roadmap, and no page says a sound is heard.
- It plays: not applicable.
- The bar: not applicable.

**Tests:** `tests/docs-links.spec.ts` green.

**Pages:** as the build lists.

**Definition of done:** Every change · A documentation change.

---

### P11-S70-T02 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 11 gate](../04-phase-exit-gates.md#phase-11-gate) is walked and recorded with numbers in the phase README's exit record.
- **The bar, as phase 10's,** at 200 enemies on the densest map of the Nave's sweep, with a screen open and the kept map standing.
- **Where each part is read:** the tick headless from the Nave's stress case. Frame rate, sync, render, world draw calls, and heap are read in Chrome on the development machine by an agent, and the render benchmark the same way.
- **The save's frames beside them:** the frame that writes a save at a waypoint, and a resume's time.
- **A row with no session yet.** A row that reads the maintainer's sittings and has no sitting yet is deferred with a box, as phase 8's were, only if the maintainer's standing instruction in force allows it. Otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M18, and the phase README's status line say so.
- It plays: each of the maintainer's logs replays from its save into two worlds agreeing at every tick.
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
| The phase 11 gate, every row | |
| Milestone M18 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system goes to Deferred. A note asking for sound goes to phase 16, whose audio adapter it waits on.
- **Two playtests outstanding** ([R41](../02-risks-and-hidden-work.md)): if the maintainer's sittings have not come in by this gate, phase 12's sprints are not started until one of the outstanding runs has.
