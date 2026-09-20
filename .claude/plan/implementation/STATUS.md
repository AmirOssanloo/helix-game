# Status

**Updated:** 2026-09-20 · **By:** the engineer running the plan

Where the plan is right now. One screen. Update it in the same commit as the ticket whose status changed, and move the date.

---

| | |
| --- | --- |
| **Active phase** | [0 — Foundation](./phase-0-foundation/README.md) |
| **Active sprint** | [00 — Repository and toolchain](./phase-0-foundation/sprint-00-repository-and-toolchain.md) |
| **Next ticket** | P0-S00-T01 — Package, TypeScript, and path aliases |
| **In progress** | none |
| **Last closed ticket** | P0-S00-T00 — Entry points, rules, agents, and the plan's status |
| **Last closed sprint** | none |
| **Last milestone reached** | none. M0 is the toolchain gate at the end of sprint 01 |

---

## Blocked or waiting

Nothing. The plan starts from a repository with documentation, agent configuration, and the plan itself discoverable from the root, and no source code.

---

## How to update this page

- A ticket starts: put its ID in **In progress**, and its successor in **Next ticket**.
- A ticket closes: move it to **Last closed ticket**, clear it from **In progress**, and set its `Status` row to `done` in the sprint file.
- A sprint closes: fill the sprint file's **Sprint exit** table, then move the row here and point **Active sprint** at the next one.
- A phase closes: record the gate rows in the phase `README.md`, then move **Active phase**.
- Something blocks: write it under **Blocked or waiting** with the ticket it blocks and what would unblock it. If it is a decision, it also goes to [Open questions](./backlog/open-questions.md).
