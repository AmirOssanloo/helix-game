# Implementation plan

**Written:** 2026-09-20 · **Author:** delivery strategist role · **Covers:** repository bootstrap through the end of roadmap phase 5
**Status of this document:** a dated plan. It captures a moment. The `docs/` pages describe the target; this folder describes the order and cost of reaching it.

---

## What this folder is

The roadmap in `docs/product/roadmap.md` says what each phase ships and what bar it is held to. This folder turns that into sprints an engineer can execute and a milestone table leadership can govern. It starts from the repository as it is on the date above: documentation and agent configuration, no source code.

The sprint files **are the work items**. Each ticket block is self-contained: layer, size, dependencies, what to build, acceptance criteria, tests to add by path, and the definition-of-done rows it triggers. A ticket can be handed to an engineer or to a delegated role verbatim. No issue tracker is required. If one is adopted, each ticket maps one to one, with the ticket ID as the issue title and the block as the body.

---

## How to read it

| Reader | Start with |
| --- | --- |
| Anyone asking where we are | [Status](./STATUS.md) |
| Leadership deciding whether and when | [Overview](./00-overview.md), then [Risks and hidden work](./02-risks-and-hidden-work.md) |
| An engineer starting a sprint | The phase `README.md`, then the sprint file, top to bottom |
| Someone re-cutting scope | [Dependency map](./01-dependency-map.md), then [Deferred](./backlog/deferred.md) |
| Someone questioning a number | [Estimation and capacity](./03-estimation-and-capacity.md) |
| Someone closing a phase | [Phase exit gates](./04-phase-exit-gates.md) |

---

## Conventions

### Ticket IDs

`P{phase}-S{sprint}-T{ticket}`, zero-padded to two digits for sprint and ticket: `P1-S04-T03` is phase 1, sprint 4, ticket 3. Sprints are numbered once across the whole plan, so a sprint number is unambiguous without its phase. IDs are never reused; a cut ticket keeps its ID with status `cut`.

### Sizes

Sizes are engineer-days for one engineer working with the architect and game-engineer roles delegated for drafting and review. The scale is **0.5, 1, 1.5, 2, 3**. Anything that would be larger is split. A normal sprint holds **at most 4 days of sized work**; the fifth day is buffer for review, a slipped ticket, or a bug found by the gate.

### Status

Each ticket has a `Status` row: `planned`, `in progress`, `done`, `cut`. The engineer running the sprint updates it when the ticket's state changes, in the same commit as the work where possible. A sprint file is closed by filling in its **Sprint exit** section with the numbers the gate asked for.

### Ticket shape

```markdown
### P1-S02-T01 — Title in plain words

| Field | Value |
| --- | --- |
| Layer | the folders it touches |
| Size | days |
| Depends on | ticket IDs, or none |
| Status | planned |

**Build:** what exists when this is done.
**Acceptance:** the observable outcome, as bullets an engineer can check.
**Tests:** the specs to add, by path, and what each asserts.
**Definition of done:** which sections of `docs/workflows/definition-of-done.md` apply.
```

### Layers

Layer names follow `docs/architecture/layers-and-dependency-rule.md`: `shared`, `domain`, `simulation`, `content`, `instrumentation`, `presentation`, `devtools`, `app`, plus `tests`, `bench`, `docs`, and `tooling` for the repository root.

### Phase gates

A phase closes only when every row of its gate in [Phase exit gates](./04-phase-exit-gates.md) holds, with numbers recorded in the phase `README.md`. A phase does not close on a promise.

---

## Keeping it current

- [Status](./STATUS.md) names the active sprint, the ticket in progress, and the next one. It is updated in the same commit as the ticket whose status changed.
- A ticket that turns out to be wrong is edited in place; the edit says why in a one-line note under the ticket.
- Work that appears mid-sprint and was not planned gets a new ticket in that sprint with the next free number and a note saying it was unplanned. The sprint's sized total is allowed to exceed 4 days only this way, and the overrun is a data point for [Estimation and capacity](./03-estimation-and-capacity.md).
- Anything cut goes to [Deferred](./backlog/deferred.md) with the phase it was cut from and what it waits on.
- Anything undecided goes to [Open questions](./backlog/open-questions.md) with a proposed answer and the ticket it blocks.
- Re-cutting a sprint keeps the sprint number and updates its file; ticket IDs already assigned are not renumbered.

---

## Folder map

```text
implementation/
├── README.md                          # This page
├── STATUS.md                          # Active phase, sprint, ticket in progress, next ticket
├── 00-overview.md                     # Phase and sprint table, milestones, cut-lines, capacity assumptions
├── 01-dependency-map.md               # What must exist before what, across all phases
├── 02-risks-and-hidden-work.md        # Risk register, each with trigger, owning sprint, and mitigation ticket
├── 03-estimation-and-capacity.md      # How sizes were derived and what would change them
├── 04-phase-exit-gates.md             # Each phase's "done when" as a checklist with named tests and numbers
├── notes/                             # Dated notes a ticket links: a decision's working-out, a reference read
├── phase-0-foundation/                # Sprints 00–01
├── phase-1-hero-mechanics/            # Sprints 02–06
├── phase-2-spells-and-attack/         # Sprints 07–11
├── phase-3-enemies/                   # Sprints 12–15
├── phase-4-combat-feel-and-tuning/    # Sprints 16–18
├── phase-5-full-enemy-roster/         # Sprints 19–22
└── backlog/
    ├── deferred.md                    # Cut items, the phase they were cut from, the door they wait behind
    └── open-questions.md              # Decisions still needed, each with a proposed answer
```
