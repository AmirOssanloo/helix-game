# Status

**Updated:** 2026-09-21 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [1 — Hero mechanics, camera, and the arena](./phase-1-hero-mechanics/README.md) |
| **Active sprint** | [05 — Input mapper, views, camera, and HUD](./phase-1-hero-mechanics/sprint-05-hud-input-and-camera.md) |
| **Next ticket** | P1-S06-T01 — The debug command union, hero death and respawn, the channel stub, once sprint 05's exit table is filled |
| **In progress** | none |
| **Last closed ticket** | P1-S05-T03 — HudScene: bars, orbs, six slots, wedges, level, targeting preview |
| **Last closed sprint** | [04 — Hero definition, orbs, Invoke, slots, and cooldowns](./phase-1-hero-mechanics/sprint-04-orbs-invoke-and-slots.md), 2026-09-21 |
| **Last closed phase** | [0 — Foundation](./phase-0-foundation/README.md), 2026-09-20: every gate row holds and CI is green on the final commit; the exit record is in the phase README |
| **Last milestone reached** | M0, the toolchain gate, 2026-09-20: `pnpm check` is green on an empty world and a wrong-direction import fails lint and the architecture test |

---

## Blocked or waiting

- Sprint 05's exit waits on a person: the section 15 feel walk-through by hand, thirteen bullets, each pass or fail, written into the sprint's exit table. Every ticket of the sprint is done; the sprint closes when that row is filled.
- Milestone M1 waits on a person: `pnpm bench` on the reference laptop in Chrome and Safari, once as configured and once with `?textures=default`, with the numbers written into the sprint 02 exit table and the phase 1 README. It holds in Chrome on an Apple M1 laptop and blocks nothing in sprint 05.

---

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something blocks: write it under **Blocked or waiting** with the ticket it blocks and what would unblock it. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
