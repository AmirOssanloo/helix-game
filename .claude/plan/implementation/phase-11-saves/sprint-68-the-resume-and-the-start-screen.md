# Sprint 68 — The resume and the start screen

**Phase:** 11 · **Sized days:** 3 · **Buffer:** 2
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phase 10 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10's bucket runs first.** If the maintainer's phase 10 run is triaged while this sprint is open, its accepted tickets take this sprint's spare day first; past it, this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

The run survives the tab. A session begins from a save, in town, as Q126 and Q127 say; a log begun from a save replays; and the player chooses to resume or to start again, with a confirmation before the saved run is given up.

## Playable outcome

Walk from the town to map 2's waypoint and close the tab. Open the build again: the start screen offers Resume, with the hero's level, gold, and deepest waypoint. Resume: the hero stands in town with everything it carried, its health and mana as they were, and no portal standing. Take the waypoint back to map 2. Then reload, choose New run, cancel, and find the save still offered; choose it again, confirm, and start at level 1.

---

## Tickets

### P11-S68-T01 — Resume as a session operation, and a log that begins from a save

| Field | Value |
| --- | --- |
| Layer | simulation, devtools, tests, docs |
| Size | 2 |
| Depends on | P11-S67-T01, P11-S67-T02, P11-S67-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`session.resume(text)` in `src/simulation/session.ts`:** it decodes and migrates the save, makes both map scopes again, and writes the saved fields into run scope. Then it loads the town with the kept scope empty and no portal standing (Q126). The hero stands at the town's arrival with health and mana as saved, no statuses, and every clock ready, the hidden clocks of evicted prepared spells included (Q127), at tick zero. It returns the decoder's list of lost items.
- **The log's header in `src/simulation/replay/input-log-file.ts`** gains the save it began from, or none for a run begun fresh. The log's format version moves, with a step that reads an older log as begun fresh, so every stored log still loads. A replay of a log with a save resumes from it before tick zero.
- **A feedback file** taken after a resume carries the same header, and `src/devtools/feedback-note.ts` loads it by resuming first.
- **The replay spec:** a session saves; plays, with a walk, a purchase, a stash move, and a death; saves again; resumes from the second save. It finds the resumed run scope equal to the second save's by the state checksum's run-scope lists. Clocks read as ticks remaining at the save, and ready at the resume.

**Acceptance:**
- After a resume: the town loaded, no portal, the kept scope empty, statuses cleared, every clock ready, health and mana as saved, tick zero.
- The round trip is equal by the run-scope lists.
- Every stored log loads through the format step and replays to its recorded checksums, with no re-record.
- A log and a feedback file begun from a save replay into two worlds agreeing at every tick.
- It plays: in Chrome by an agent, a walk to map 1's waypoint, a reload, a resume through the dev API. The hero is in town with its gold, items, and level, and a feedback note taken then loads and stops at its tick.
- The bar: a resume is a map load, outside the tick window; its time headless on the M1 is recorded in the sprint exit.

**Tests:**
- `tests/simulation/save/resume.spec.ts`: each rule of Q126 and Q127.
- `tests/simulation/replays/save-round-trip.spec.ts`: the replay spec above.
- `tests/simulation/replay-format.spec.ts`: the header with and without a save; an older log read as begun fresh.
- `tests/devtools/feedback.spec.ts`: a feedback file after a resume replays.

**Pages:** [simulation loop](../../../../docs/architecture/simulation-loop.md), a run begun from a save beside "a new run"; [devtools and instrumentation](../../../../docs/architecture/devtools-and-instrumentation.md), the log's header and feedback; [map and camera](../../../../docs/product/features/map-and-camera.md#a-run-resumed), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P11-S68-T02 — The start screen

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1 |
| Depends on | T01, P11-S66-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`src/presentation/screens/start.screen.ts`** on the input claim, drawn in the HUD scene's batch and shown at boot before the first tick.
- **With a save stored,** it offers Resume, showing the hero's level, gold, and deepest waypoint, and New run.
- **With none,** it shows what P11-S66-T02 wrote; proposed, New run only.
- **New run with a save** asks for a confirmation. Only a confirmation clears the stored key and begins a run under a new seed in town; a cancel leaves the save.
- **Resume** calls the session's resume through the composition root in `src/app/main.ts` and says, once, any item the content no longer has.
- **A save that is refused** (a newer format, not a save) is said, and only New run is offered. The refused text is kept under a second key until a new run's first save, so nothing is destroyed without a word.
- Every string is within the font's characters.

**Acceptance:**
- Each branch above, by the screen's spec and the storage spec.
- The confirmation's cancel leaves the stored key byte for byte.
- It plays: in Chrome by an agent, the sprint's playable outcome, from the walk to the new run at level 1.
- The bar: the screen adds no draw call to the HUD scene's batch, and nothing allocates per frame; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/start-screen.spec.ts`: each branch, the confirmation, the lost-item line.
- `tests/app/save-storage.spec.ts`: the confirmation clears the key, a cancel does not, a refused save is kept.
- `tests/presentation/shape-atlas.spec.ts` green on the new strings.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the start screen on the claim; [map and camera](../../../../docs/product/features/map-and-camera.md#a-run-resumed) and [developer panel](../../../../docs/product/features/developer-panel.md), whose Seed row says what a new run from the panel does to the save.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The resume's rules, each by its spec | |
| The round trip equal by the run-scope lists | |
| Every stored log through the format step, unchanged | |
| A feedback file after a resume replays | |
| Resume time headless | |
| The start screen's branches in Chrome, by an agent | |
| Phase 10's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The log's format step moves a stored log.** The step only adds a header field read as none; a log whose checksum moves is a bug in the step, fixed, never re-recorded ([R36](../02-risks-and-hidden-work.md)).
- **Resume leaves something behind from the session before.** Both scopes are made again, never cleared in place; the round-trip spec compares against a fresh world's resume as well as the playing one's.
- **The panel's new run and the save.** A run begun from the panel's Seed is a live session, so by P11-S66-T01's list it writes over the save at its first save point unless the architect rules otherwise. T02 writes whichever it is on the developer panel page, and the maintainer's box for the playtest says to leave the panel's Seed alone.
