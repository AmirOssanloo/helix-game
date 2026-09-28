# Sprint 69 — The stash screen, the driver's saves, and the playtest

**Phase:** 11 · **Sized days:** 3 · **Buffer:** 2
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phase 10 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10's bucket runs first.** If the maintainer's phase 10 run is triaged while this sprint is open, its accepted tickets take this sprint's spare days first; past them, the playtest, T03, moves to the top of sprint 70, and sprint 70's bucket waits with it ([Q118](../backlog/open-questions.md)'s rule).

## Goal

The stash is used on screen, the driver starts and stops a run by saves so every later playtest can begin deep, and the maintainer plays the whole first stratum across sittings.

## Playable outcome

In town, open the stash beside the inventory and put the Gaolmaster's Legendary piece away. Close the tab, come back, resume, and find it there. From the panel, load the driver's save at map 9's arrival and resume in town with waypoints to map 9.

---

## Tickets

### P11-S69-T01 — The stash screen

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | P11-S66-T03, P11-S67-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/presentation/screens/stash.screen.ts` on the input claim, opened by the gesture P11-S66-T02 sets. It stands on the left of the screen with the inventory on the right, as the store does, and draws the stash through the grid view of P11-S66-T03 at 10 by 8. An item is lifted and placed between the stash and the inventory through the existing lift in `inventory-lift.ts`, and each placement submits the move command. The tooltip is the inventory's, and a refusal flashes as the inventory's does. The screen closes on Esc, on leaving the ring, and on death, as the store does: Esc closes the stash first and a second Esc the inventory. Its title is within the font's characters.

**Acceptance:**
- Every move P11-S66-T02 allows works by pointer; a refused move flashes and sends nothing twice.
- The stash and the store never stand open together, by the claim's order.
- It plays: in Chrome by an agent, the sprint's playable outcome from putting the piece away to finding it after a resume.
- The bar: the stash and the inventory open together, with the HUD scene's draw calls and the frame read in Chrome by an agent; the render benchmark unchanged.

**Tests:**
- `tests/presentation/stash-screen.spec.ts`: opening, each move, the flashes, each way it closes.
- `tests/presentation/screen.spec.ts`: the claim with the stash, the store, and the waypoint screen.
- `tests/presentation/shape-atlas.spec.ts` green on the new string.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the stash on the claim; [items and loot](../../../../docs/product/features/items-and-loot.md) and [HUD](../../../../docs/product/features/hud.md), checked against the build.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P11-S69-T02 — The driver saves and resumes

| Field | Value |
| --- | --- |
| Layer | tests, devtools, docs |
| Size | 1 |
| Depends on | P11-S68-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **Two new driver steps.** The map-agnostic recording driver phase 10 built gains a step that saves at a point it names and writes the text to a file, and a step that begins its walk from a save.
- **Stored saves at each arrival.** It walks the Nave's reference seed and stores a save at the arrival of every map, 1 to 10, under `tests/simulation/save/saves/`, which the stored-saves spec already loads. These are the saves the playtests of phase 12 on begin from, so a sitting reaches the deep maps without the walk down ([R41](../02-risks-and-hidden-work.md)).
- **The panel's Load file takes a save** as it takes a log or a feedback file, and resumes from it as a session operation.

**Acceptance:**
- The driver walks the stratum in two halves, from the town to map 5's arrival, then from that save to the Gaolmaster's kill, with no panel help.
- Each of the ten saves loads, and resumes in town with the waypoints reached before it.
- It plays: in Chrome by an agent, the panel's Load file with the save at map 9's arrival, then a waypoint to map 9.
- The bar: not applicable; the driver runs headless.

**Tests:**
- `tests/simulation/replays/descent-from-save.spec.ts`: the two-half walk, the kill, and the level at the kill printed.
- `tests/simulation/save/stored-saves.spec.ts` green on the ten files.
- `tests/devtools/panel.spec.ts`: Load file with a save resumes.

**Pages:** [developer panel](../../../../docs/product/features/developer-panel.md), Load file; [testing standard](../../../../docs/standards/testing.md), the driver's saves.

**Definition of done:** Every change · A developer-panel control · A documentation change.

---

### P11-S69-T03 — The maintainer's playtest and the triage, across sittings

| Field | Value |
| --- | --- |
| Layer | tests, tooling, docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 66 to 68, T01, and T02 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the build is tagged `playtest-phase-11`, so it stands at its own address by P9-S41-T03's workflow.

**The run:** the maintainer plays it from a new run in town to the Gaolmaster's kill, across at least two sittings, with the tab closed and the run resumed from the start screen between them.
- The panel stays closed. No grant, no jump, and no Seed.
- F9 for each note.
- **Save input log** at the end of each sitting. Each sitting is one log, and every log after the first carries in its header the save it began from.

**The box:** one under Waiting on a person in STATUS.md holds the steps and asks the design outline's questions:
- whether 10% of gold is toothless or punishing;
- whether the stash's 80 cells are enough for one stratum;
- whether the Gaolmaster's `stun_bolt` reads by its cast point's pose alone, since no enemy cast is heard until phase 16.

**Storing and triage:** an agent stores the sessions as `tests/simulation/replays/nave-saves-playtest-1.json` onward, with each feedback file under `notes/`, and a spec replays each. The triage is held with the maintainer by the phase 6 method in `notes/<date>-saves-triage.md`. Each note gets one outcome: a bug, a tuning change, a screen fix, or no change; a new system goes to Deferred. Accepted items are written as P11-S70-T03 onward, in the bucket's order, until two days are spent. A design answer the triage needs is the game designer's.

**Acceptance:**
- At least two logs, every one after the first begun from a save; the last holds the Gaolmaster's kill.
- No log holds a panel command.
- Each log replays into two worlds agreeing at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/nave-saves-playtest.spec.ts`: it skips until the logs exist. Then it replays each log from its header's save, checks that no log holds a panel command, finds the kill in the last, and prints the level at the kill.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The stash on screen, in Chrome, by an agent | |
| The driver's two-half walk; ten stored saves | |
| The pinned build at `playtest-phase-11` | |
| The maintainer's sittings, each log replayed from its save | |
| Triage and the bucket | |
| The render benchmark, by an agent | |
| Phase 10's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Two sittings are two days of the maintainer's, not the team's; sprint 70 waits on them, and the phase 12 sprints are not started while two playtests are outstanding.
- **A sitting's save is lost.** The pinned build and the storage adapter's failed-write line make a loss visible. If one happens, that sitting's log still replays from the save before it, and the next sitting starts from the driver's save nearest the map reached.
- **The Gaolmaster's bolt without a sound.** Its cast is read by the cast point's pose as on the long road. If the maintainer cannot read it, the answer is a visual tell as a bucket ticket, and the sound stays phase 16's.
