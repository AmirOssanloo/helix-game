# Status

**Updated:** 2026-09-20 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [1 — Hero mechanics, camera, and the arena](./phase-1-hero-mechanics/README.md) |
| **Active sprint** | [03 — Collision, pathing, the spatial hash, and the arena](./phase-1-hero-mechanics/sprint-03-collision-pathing-and-the-arena.md) |
| **Next ticket** | P1-S03-T01 — The spatial hash |
| **In progress** | none |
| **Last closed ticket** | P1-S02-T04 — The render benchmark |
| **Last closed sprint** | [02 — Locomotion, turn rate, and the render benchmark](./phase-1-hero-mechanics/sprint-02-locomotion-turn-rate-and-the-render-benchmark.md), 2026-09-20 |
| **Last closed phase** | [0 — Foundation](./phase-0-foundation/README.md), 2026-09-20: every gate row holds and CI is green on the final commit; the exit record is in the phase README |
| **Last milestone reached** | M0, the toolchain gate, 2026-09-20: `pnpm check` is green on an empty world and a wrong-direction import fails lint and the architecture test |

---

## Blocked or waiting

- Milestone M1 waits on a person: `pnpm bench` on the reference laptop in Chrome and Safari, once as configured and once with `?textures=default`, with the numbers written into the sprint 02 exit table and the phase 1 README. It holds in Chrome on an Apple M1 laptop and blocks nothing in sprint 03.

---

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something blocks: write it under **Blocked or waiting** with the ticket it blocks and what would unblock it. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
