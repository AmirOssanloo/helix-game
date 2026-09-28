# Sprint 103 — The bucket and the gate

**Phase:** 15 · **Sized days:** 1 in tickets, 3 of bucket appetite · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket and take this sprint's buffer; past it, T01 moves to the top of the next sprint, and phase 15 closes a sprint later. If sprint 102's documentation sync moved here, it runs after the bucket and before T01.

## Goal

What the maintainer's sittings accepted is built within three days, and the phase 15 gate is walked with its numbers recorded: the descent has a bottom, the run can be won, and the roster phase 16 draws is frozen and listed.

## Playable outcome

The descent from the town to the Unwound's kill as the triage left it: the same sittings as sprint 102's, from the same saves, with every accepted note answered.

---

## Tickets

### The bucket — 3 days of appetite

Tickets P15-S103-T02 onward are what P15-S102-T03 accepts, in the triage note's order, until three sized days are spent. They run before T01. What the bucket cannot hold goes to [Deferred](../backlog/deferred.md) or phase 16's bucket if it is presentation only, never into this sprint. A note asking for a new family, variant, or boss goes to Deferred whatever its size: the roster is frozen for phase 16.

---

### P15-S103-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, tooling, docs |
| Size | 1 |
| Depends on | P15-S102-T04, and the bucket's tickets |
| Owner | The game engineer |
| Status | planned |

**Build:** every row of the [phase 15 gate](../04-phase-exit-gates.md#phase-15-gate) walked and recorded with numbers in the phase README's exit record:
- **The source point:** `git log` on the stored logs shows no checksum moved by P15-S96-T01.
- **The six families, mute's and the tether's rows, splits and the cap, the Unwound and the run won:** by the specs the rows name.
- **The descent walked to its bottom:** the driver's sweep from the town to the Unwound's kill, the hero's level near map 100, and the one full walk's time.
- **The bar:** on the densest map of each new recipe's sweep and in the Unwound's chamber at its worst quarter. The tick headless from each stress case, and frame rate, sync, render, world draw calls, and heap in Chrome on the development machine by an agent, with the render benchmark the same way.
- **The roster frozen for phase 16's art list:** `pnpm roster` (P15-S99-T04) run on the gate commit, and its output recorded in the phase README. It lists every family, variant, boss, and ability id with its frame, so the asset list at `.claude/plan/2026-09-28-art-and-audio-asset-list.md` can be checked against content before any art is ordered. The check itself is a line per mismatch in the exit record, handed to phase 16's first ticket; it corrects nothing here.
- **A person row with no session yet:** deferred with a box only if the maintainer's standing instruction in force allows it; otherwise the phase does not close.

**Acceptance:**
- Every gate row holds with its number, or is named with the reason it cannot yet.
- The roster list is in the README, with its line count and the commit it was printed on, and every mismatch with the asset list named.
- STATUS.md, the overview's milestone M23, and the phase README's status line say so.
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
| The phase 15 gate, every row | |
| The roster frozen: line count, commit, mismatches with the asset list | |
| Milestone M23 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The bucket fills with design.** A note that asks for a new rule is the game designer's answer first and a ticket second; a new system goes to Deferred ([R24](../02-risks-and-hidden-work.md)).
- **The roster moves after it is frozen.** A tint or a number may move in phase 16's bucket; a new id may not. A change to an id after the gate is a line in phase 16's asset list before it is a change in content.
- **Two playtests outstanding** ([R41](../02-risks-and-hidden-work.md)): if phase 14's run has not come in by this gate, phase 16's sprint files are not cut until one of the two runs has.
