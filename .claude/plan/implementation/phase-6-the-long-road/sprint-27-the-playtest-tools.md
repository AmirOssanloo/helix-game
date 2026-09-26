# Sprint 27 — The playtest tools

**Phase:** 6 · **Sized days:** 4 · **Buffer:** 1

## Goal

Everything the maintainer needs to play a long map and say what they think of it: enemies that go home rather than cross the map while the hero is dead, a jump to any checkpoint and a marker to see it by, a feedback key that saves a note with the session and the build it was played on, and a runbook for swapping a spell the feedback asks to change.

## Playable outcome

Press the feedback key mid-fight, type a note while the world stands paused, save it, reload the page, load the file, and land paused on the tick the note was written, on the build's commit.

---

## Tickets

### P6-S27-T01 — Enemies go home while the hero is dead

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | none |
| Status | done |

**Build:** In `src/domain/ai/machine.ts`, while the hero is dead an enemy in Chase or Attack returns home as a leashed enemy does, instead of chasing the hero's respawn point. On a long map the respawn point can be a map-length path away, which is R4's cost for every chaser at once. After the respawn, aggro is read as it always is. The [enemies](../../../../docs/product/features/enemies.md) page's edge cases state it.

**Acceptance:**
- A pack chasing the hero when it dies turns for home on the next tick and none of it paths toward the respawn point.
- After the respawn, a pack within aggro takes the hero up again.

**Tests:**
- `tests/simulation/ai/transitions.spec.ts`: Chase and Attack to Return on the hero's death, under every behaviour.
- `tests/simulation/feel/death.spec.ts`: no enemy path toward the respawn point.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P6-S27-T02 — Jump to a checkpoint from the panel

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | P6-S26-T02 |
| Status | done |

**Build:** A debug command that stands the hero at checkpoint N of the current map; it is a command (ADR 0004) and replays. The checkpoint rule reads the jump as reaching it on the next tick if it is further than the furthest. The panel's hero group lists the current map's checkpoints. The [developer panel](../../../../docs/product/features/developer-panel.md) page lists the control and the debug command.

**Acceptance:**
- Jumping to checkpoint 3 stands the hero there, makes it the furthest, and lands in the log; the log replays.
- Jumping back to checkpoint 1 moves the hero and leaves the furthest at 3.

**Tests:**
- `tests/simulation/dev-api.spec.ts`: the jump, the furthest, and the log line.
- `tests/devtools/panel.spec.ts`: the list follows the map.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

### P6-S27-T03 — Checkpoints on the floor, and a word when one is reached

| Field | Value |
| --- | --- |
| Layer | presentation, content, tests, docs |
| Size | 1 |
| Depends on | P6-S26-T02 |
| Status | done |

**Build:** A checkpoint marker drawn flat on the floor from an existing atlas frame, a small pool bound by the camera rectangle as the unit views are, and a line on `checkpoint_reached` through the floating-text pool. A reached checkpoint and one not yet reached read apart by tint. No Shape or Graphics, no new texture.

**Acceptance:**
- Markers draw where the map's checkpoints are, only on screen, with no miss.
- Reaching a new checkpoint shows the line once; walking back past an earlier one shows nothing.
- `pnpm bench` in Chrome on this commit and the one before it, fps, render ms, draw calls, and heap written under this ticket: a box under Waiting on a person.

**Tests:**
- `tests/presentation/checkpoint-view.spec.ts`: bound by camera, the tint, the line on the event.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

Closed 2026-09-26 on what an agent can verify: the markers bound by the camera rectangle with no miss, the tint, and the word on the event, in the spec, with `pnpm check` green. The bench before and after, and a look by eye, wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24; the look is Q64.

---

### P6-S27-T04 — The feedback key, its file, and the build's commit

| Field | Value |
| --- | --- |
| Layer | devtools, app, tests, docs |
| Size | 1.5 |
| Depends on | P6-S26-T01 |
| Status | planned |

**Build:** Feedback is not a command: it changes no world state. A **Feedback** button in the panel and a hotkey (proposed F9), both handled under `src/devtools/`, never the input mapper. Opening it pauses the driver and opens a note field; while the field has focus the mapper ignores keys, so typing Q is not an orb. Saving writes one file through `downloadText` in `src/devtools/files.ts`: the note, the tick, the build's commit, the content version, and the `InputLogFile` up to that tick. The build's commit is stamped in the app layer at build time, since a log replays only on its commit (ADR 0009); a development build stamps the commit and whether the tree was dirty. **Load input log** takes a feedback file, unwraps its log, recreates the world on its map (P6-S26-T01), replays, and stops paused at the note's tick with the note shown in the panel. The [developer panel](../../../../docs/product/features/developer-panel.md) page and the [development workflow](../../../../docs/workflows/development.md) say how feedback is filed and read.

**Acceptance:**
- The hotkey opens the note and pauses the world; typing any game key into it does nothing to the hero; closing without saving resumes.
- The saved file names the note, the tick, the commit, and the content version, and holds the log.
- Loading it on the same commit stops paused at the note's tick in the same state the note was written in; on another commit the panel says the commit differs.

**Tests:**
- `tests/devtools/feedback.spec.ts`: the file's shape, the pause, the keys ignored while typing, the unwrap, the stop at the tick, the commit mismatch message.
- `tests/app/build-stamp.spec.ts`: the stamp is present in a build and marks a dirty tree.

**Definition of done:** Every change · A developer-panel control · A documentation change.

---

### P6-S27-T05 — Replacing a spell: the runbook section and the recipe check

| Field | Value |
| --- | --- |
| Layer | docs, tests |
| Size | 0.5 |
| Depends on | none |
| Status | planned |

**Build:** A "Replacing a spell" section in the [adding-a-spell runbook](../../../../docs/workflows/adding-a-spell.md). Three orbs give exactly ten recipes, so a new spell takes over the recipe of the one it replaces; an eleventh is a kit redesign for the engineering architect. The section's steps: the definition files, the form's ability list, the spell's row of the disable matrix in `src/content/statuses/disable-matrix.ts`, the spell catalogue, the shared specs that use the replaced spell as a fixture moved onto test-only fixture spells, and `balance-spells.json` recorded again. A content test: each of the ten recipes is used by exactly one spell. No domain code, and no spec is refactored ahead of feedback.

**Acceptance:**
- The section walks a swap end to end with the files named.
- Two spells on one recipe, or a recipe with none, fail the content tier.

**Tests:**
- `tests/content/spells.spec.ts`: each recipe exactly once.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A feedback file saved, reloaded, and stopped at its tick, by hand | |
| Enemies home while the hero is dead; the checkpoint jump and marker by hand | |
| Actual days per ticket | T01: 0.25 · T02: 0.25 · T03: 0.25 |

## Risks in this sprint

- T04 touches the one place where a key can reach two listeners, the note field and the mapper. Test the ignore with a real key event on a focused field, not a flag.
- The commit stamp needs git at build time; the Pages workflow checks out with history. If it does not, the stamp reads the workflow's commit variable instead.
