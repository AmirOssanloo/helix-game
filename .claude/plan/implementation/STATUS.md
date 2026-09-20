# Status

**Updated:** 2026-09-20 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [0 — Foundation](./phase-0-foundation/README.md) |
| **Active sprint** | [02 — Locomotion, turn rate, and the render benchmark](./phase-1-hero-mechanics/sprint-02-locomotion-turn-rate-and-the-render-benchmark.md) |
| **Next ticket** | P1-S02-T01 — Order state machine and the command union |
| **In progress** | none |
| **Last closed ticket** | P0-S01-T04 — Instrumentation rings, the fixed-step driver, the game config, and BootScene |
| **Last closed sprint** | [01 — Simulation skeleton and instrumentation](./phase-0-foundation/sprint-01-simulation-skeleton-and-instrumentation.md), 2026-09-20 |
| **Last milestone reached** | M0, the toolchain gate, 2026-09-20: `pnpm check` is green on an empty world and a wrong-direction import fails lint and the architecture test |

---

## Blocked or waiting

Sprint 00's exit waits on one row: CI green on its final commit, which needs that commit pushed. Phase 0's exit record waits on that row too, since every phase 0 gate row already holds locally. Nothing blocks sprint 02.

---

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something blocks: write it under **Blocked or waiting** with the ticket it blocks and what would unblock it. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
