# Sprint 111 — The bucket and the gate

**Phase:** 16 · **Sized days:** 1 in tickets, 3 of bucket appetite · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **A sheet or sound sent back by the triage is not bucket work.** It waits on its maker. The bucket holds only what an engineer does: a presentation fix, a list row, a gain, an anchor the record allows renaming. A redraw not landed by the gate goes to [Deferred](../backlog/deferred.md) with its maker's date.

## Goal

What the maintainer's playtest accepted is built within its three days. The phase 16 gate is walked with its numbers recorded, and milestone M24 is reached: the descent drawn in sprite art and heard, with the simulation unchanged.

## Playable outcome

The descent from the town to the Unwound in its own art and sound, as the triage left it: the same saves as sprint 110's, with every accepted note answered.

---

## Tickets

### The bucket — 3 days of appetite

Tickets P16-S111-T02 onward are what P16-S110-T03 accepts, in the triage note's order, until three sized days are spent. They run before T01. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md), never into this sprint. Each bucket ticket keeps the phase's rule: no change under `src/domain/` or `src/simulation/`, and every stored log's checksum unchanged.

---

### P16-S111-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P16-S110-T04, and the bucket's |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 16 gate](../04-phase-exit-gates.md#phase-16-gate) walked and recorded with numbers in the phase README's exit record:
- **The assets.** The content test green, with no placeholder left, art or sound.
- **Tall art.** Sorting, fading, and picking by their specs.
- **The simulation.** `git diff --stat` from the phase's first commit to its last, under `src/domain/` and `src/simulation/`, is empty. Every stored log replays to its recorded content version and checksums.
- **The pages.** The render benchmark on each, with ADR 0021's criteria.
- **Sound.** Every sound on the list played with nothing allocated beyond the record's bound. Every enemy cast heard as its cast point begins, by the content test and the adapter's spec.
- **The play.** The maintainer's sessions, one per stratum, replaying from their saves, and the triage note.
- **The docs.**
- **The bar,** at 200 enemies on each stratum's densest map with its page loaded and sound on: the tick headless from each recipe's stress case; frame rate, sync, render, world draw calls, and heap at the densest choke in Chrome on the development machine, by an agent; the render benchmark the same way.

A row that reads the maintainer's session and has no session yet is deferred with a box only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- STATUS.md, the overview's milestone M24, and the phase README's status line say so.
- It plays: each stratum's session replays into two worlds agreeing at every tick.
- The bar: every row, as above.

**Tests:** every spec the gate rows name, green in one `pnpm check` and `pnpm test:budget`.

**Pages:** the phase README's exit record; STATUS.md; the overview.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The bucket: tickets, days committed and unspent | |
| Sheets or sounds sent back and not landed, deferred with their makers' dates | |
| The phase 16 gate, every row | |
| No diff under `src/domain/` or `src/simulation/` across the phase | |
| Milestone M24 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with redraws.** A redraw is a delivery, not an engineer's day. It waits on its maker and never takes the bucket's days.
- **A bucket fix reaches into the simulation.** A note that asks how the game plays is the game designer's answer first, and a later phase's ticket second. This phase changes nothing under `src/domain/` or `src/simulation/`.
