# Status

**Updated:** 2026-09-21 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [1 — Hero mechanics, camera, and the arena](./phase-1-hero-mechanics/README.md) |
| **Active sprint** | [06 — Developer panel, replay, stress test, and the phase gate](./phase-1-hero-mechanics/sprint-06-developer-panel-replay-and-phase-gate.md) |
| **Next ticket** | P1-S06-T04 — The phase 1 gate |
| **In progress** | none |
| **Last closed ticket** | P1-S06-T03 — Replay in Node, the determinism test, the stress test |
| **Last closed sprint** | [05 — Input mapper, views, camera, and HUD](./phase-1-hero-mechanics/sprint-05-hud-input-and-camera.md), 2026-09-21: all thirteen section 15 rows pass, the bench holds one draw call, every ticket done |
| **Last closed phase** | [0 — Foundation](./phase-0-foundation/README.md), 2026-09-20: every gate row holds and CI is green on the final commit; the exit record is in the phase README |
| **Last milestone reached** | M0, the toolchain gate, 2026-09-20: `pnpm check` is green on an empty world and a wrong-direction import fails lint and the architecture test |

---

## Waiting on a person

Nothing an agent can do moves these rows. Each one says what to do, where the result goes, and what it unblocks.

- [ ] **Sprint 06 exit: the draw-call readout against the WebGL inspector.** Run `pnpm bench` in Chrome with a WebGL inspector extension, capture one frame, and compare its draw-call count with the DRAWS row of the bench readout; then open `pnpm dev`, and compare one frame with the panel's "Draw calls total / world" row. Write both pairs into the draw-call row of the sprint 06 [exit table](./phase-1-hero-mechanics/sprint-06-developer-panel-replay-and-phase-gate.md#sprint-exit). Unblocks: that row of the sprint 06 exit. Blocks no ticket.
- [ ] **Milestone M1: the bench on the reference laptop.** Run `pnpm bench` on the reference laptop in Chrome, then in Safari, each twice: once as configured, once with `?textures=default` on the address. Record fps, render ms, draw calls, and heap for each of the four runs in the bench row of the sprint 02 [exit table](./phase-1-hero-mechanics/sprint-02-locomotion-turn-rate-and-the-render-benchmark.md#sprint-exit) and in the bench row of the phase 1 [exit record](./phase-1-hero-mechanics/README.md#exit-record). Unblocks: M1 and one row of the phase 1 gate. Blocks no ticket.

Coming up in sprint 06 on T04, the phase gate: a five-minute session recorded with the panel open and replayed, the stress test's mean tick on the reference laptop, and the four-browser run at 300 units with the walk-through repeated in the arena.

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something waits on a person: write it under **Waiting on a person** as a checkbox with the steps, where the result is written, and what it unblocks. The agent that closes a ticket repeats the open boxes in its report. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
