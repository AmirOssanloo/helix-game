# Status

**Updated:** 2026-09-22 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [1 — Hero mechanics, camera, and the arena](./phase-1-hero-mechanics/README.md): the gate was walked 2026-09-21 and closes when the person rows below hold; work goes on into phase 2 meanwhile |
| **Active sprint** | [07 — The spell catalogue and the ability pipeline](./phase-2-spells-and-attack/sprint-07-spell-catalogue-and-the-ability-pipeline.md) |
| **Next ticket** | P2-S07-T04 — Damage types, mitigation, and death resolution |
| **In progress** | none |
| **Last closed ticket** | P2-S07-T03 — The pipeline: stages, targeting kinds, the effect runner, refusals, 2026-09-22: the effect runner and the cast context built over the phase 1 skeleton, which was already the rest of the pipeline; a named effect now takes its own validated fields; the primitive table is in place and empty until sprint 08; the pipeline suite lives under `tests/simulation/pipeline/` |
| **Last closed sprint** | [06 — Developer panel, replay, stress test, and the phase gate](./phase-1-hero-mechanics/sprint-06-developer-panel-replay-and-phase-gate.md), 2026-09-21: the phase 1 gate walked row by row in Chrome on the Apple M1 laptop, every row holding there, M2 reached; the bar on the reference laptop waits on a person |
| **Last closed phase** | [0 — Foundation](./phase-0-foundation/README.md), 2026-09-20: every gate row holds and CI is green on the final commit; the exit record is in the phase README |
| **Last milestone reached** | M2, the phase 1 gate, 2026-09-21: 38 acceptance tests green by name, a five-minute session replays identically in the browser and in Node, and 300 units hold the tick budget at a 1.7 ms mean on the Apple M1 laptop. M1 still waits on the reference laptop |

---

## Waiting on a person

Nothing an agent can do moves these rows. Each one says what to do, where the result goes, and what it unblocks.

- [x] **Sprint 07: the product owner approves the spell catalogue's shape.** Approved as written by the product owner, 2026-09-21: sections 3, 4, and 7 of `docs/product/specs/spell-catalogue.md`, including the three flagged calls. Recorded in a note under P2-S07-T01 in the sprint 07 file. P2-S07-T02 was built against this shape and stands; T03 to sprint 11 build on it.

- [x] **Sprint 06 exit: the draw-call readout against the WebGL inspector.** Done by the maintainer with Spector.js in Chrome, 2026-09-21: the bench at one draw per frame and the game at two, the world's then the HUD's, both matching the readouts. Recorded in the draw-call row of the sprint 06 [exit table](./phase-1-hero-mechanics/sprint-06-developer-panel-replay-and-phase-gate.md#sprint-exit).
- [ ] **Milestone M1: the bench on the reference laptop.** Run by the maintainer on 2026-09-21 and passing by eye; the numbers were not written down, so the box stays open until they are, and the rest of this row says how. Run `pnpm bench` on the reference laptop in Chrome, then in Safari, each twice: once as configured, once with `?textures=default` on the address. Record fps, render ms, draw calls, and heap for each of the four runs in the bench row of the sprint 02 [exit table](./phase-1-hero-mechanics/sprint-02-locomotion-turn-rate-and-the-render-benchmark.md#sprint-exit) and in the bench row of the phase 1 [exit record](./phase-1-hero-mechanics/README.md#exit-record). Unblocks: M1 and one row of the phase 1 gate. Blocks no ticket.

- [ ] **Phase 1 gate: the bar in four browsers on the reference laptop.** Run by the maintainer on 2026-09-21 and passing by eye; the numbers were not written down, so the box stays open until they are, and the rest of this row says how. Open `pnpm dev` on the reference laptop in Chrome, then Firefox, Safari, and Edge; in each, open the panel, spawn 300 units, turn the collision and bound overlays on, walk the hero about for 30 seconds, and take a screenshot of the Readouts group. Record frame rate, tick mean and max, render mean and max, draw calls, pool misses, and view misses per browser in the bar row of the sprint 06 [gate walk](./phase-1-hero-mechanics/sprint-06-developer-panel-replay-and-phase-gate.md#phase-1-gate-walk). In Chrome, also record a 30-second allocation sampler in the performance panel with the 300 units live and note whether the heap is flat. Then run `pnpm test -t "stress"` there and record green, or the failure's mean, in the stress row of the same table and the phase 1 [exit record](./phase-1-hero-mechanics/README.md#exit-record). Unblocks: the bar row, and with it the phase 1 close. Blocks no ticket.

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something waits on a person: write it under **Waiting on a person** as a checkbox with the steps, where the result is written, and what it unblocks. The agent that closes a ticket repeats the open boxes in its report. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
