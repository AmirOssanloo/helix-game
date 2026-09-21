# Status

**Updated:** 2026-09-21 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [1 — Hero mechanics, camera, and the arena](./phase-1-hero-mechanics/README.md) |
| **Active sprint** | [05 — Input mapper, views, camera, and HUD](./phase-1-hero-mechanics/sprint-05-hud-input-and-camera.md) |
| **Next ticket** | P1-S06-T02 — DevApi, the HTML panel, readouts, sliders, overlays |
| **In progress** | none |
| **Last closed ticket** | P1-S06-T01 — The debug command union, hero death and respawn, the channel stub |
| **Last closed sprint** | [04 — Hero definition, orbs, Invoke, slots, and cooldowns](./phase-1-hero-mechanics/sprint-04-orbs-invoke-and-slots.md), 2026-09-21 |
| **Last closed phase** | [0 — Foundation](./phase-0-foundation/README.md), 2026-09-20: every gate row holds and CI is green on the final commit; the exit record is in the phase README |
| **Last milestone reached** | M0, the toolchain gate, 2026-09-20: `pnpm check` is green on an empty world and a wrong-direction import fails lint and the architecture test |

---

## Waiting on a person

Nothing an agent can do moves these rows. Each one says what to do, where the result goes, and what it unblocks.

- [ ] **Sprint 05 exit: the section 15 feel walk-through, six rows left.** Seven rows are recorded in the sprint 05 [exit table](./phase-1-hero-mechanics/sprint-05-hud-input-and-camera.md#sprint-exit), all pass. Rows 3, 8, 9, 10, 11, and 12 of [section 15](../../../docs/product/specs/character-movement-and-mechanics.md#15-player-facing-feel-requirements) need the developer panel, which P1-S06-T02 builds. When T02 closes: run `pnpm dev`, use the panel to set every orb to level 1 and to spawn a unit, walk those six rows as each says, and write each as pass or fail into the same cell. Unblocks: closing sprint 05 and moving **Last closed sprint** here. Any fail becomes a new ticket in sprint 06.
- [ ] **Milestone M1: the bench on the reference laptop.** Run `pnpm bench` on the reference laptop in Chrome, then in Safari, each twice: once as configured, once with `?textures=default` on the address. Record fps, render ms, draw calls, and heap for each of the four runs in the bench row of the sprint 02 [exit table](./phase-1-hero-mechanics/sprint-02-locomotion-turn-rate-and-the-render-benchmark.md#sprint-exit) and in the bench row of the phase 1 [exit record](./phase-1-hero-mechanics/README.md#exit-record). Unblocks: M1 and one row of the phase 1 gate. Blocks no ticket.

Coming up in sprint 06, each on the ticket that names it: the draw-call readout checked against the browser's WebGL inspector on one bench frame (T02), a five-minute session recorded with the panel open (T03), and the phase gate's four-browser run at 300 units with the walk-through repeated in the arena (T04).

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something waits on a person: write it under **Waiting on a person** as a checkbox with the steps, where the result is written, and what it unblocks. The agent that closes a ticket repeats the open boxes in its report. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
