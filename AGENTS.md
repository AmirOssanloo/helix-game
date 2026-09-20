# Helix

A 2D hero-combat game for the browser. TypeScript, Phaser 4, Vite, Vitest, one package. The product is **Helix**; the repository folder is named `Skein` after the hero's kit, and the [vocabulary](./docs/product/vocabulary.md) says never to call the game that.

**The repository has no source code yet.** The pages under `docs/` describe the target and code is held to them. The folder under `.claude/plan/implementation/` describes the order and cost of reaching it. [STATUS.md](./.claude/plan/implementation/STATUS.md) says which sprint is active and which ticket is next. A pointer in the docs to a file under `src/` returns nothing until the ticket that creates it is done; that is expected, not a broken link.

This file is a map. It links; it does not restate. When a sentence here disagrees with a page it links, the page wins and this file gets fixed.

---

## Start here

Read these three, in order, before any change:

1. [docs/README.md](./docs/README.md) — the index, and the table of what to load for each kind of task
2. [Layers and the dependency rule](./docs/architecture/layers-and-dependency-rule.md#quick-reference) — where code goes and what it may import
3. [Definition of done](./docs/workflows/definition-of-done.md) — the checklist every change passes

If the task is a ticket, also read [the plan README](./.claude/plan/implementation/README.md) for the ticket shape and status rules.

---

## Where things live

```text
/
├── AGENTS.md          # This map. CLAUDE.md imports it
├── README.md          # The human entry point
├── docs/              # The target: architecture, standards, decisions, runbooks, product
├── .claude/
│   ├── plan/          # Dated plans. implementation/ holds the sprints and STATUS.md
│   ├── agents/        # Subagents work is delegated to, one file each
│   ├── skills/        # Phaser reference skills, one per subsystem, plus project procedures
│   ├── rules/         # Constraints loaded automatically when matching files are edited
│   └── tags/          # Prompts a person pastes into a chat by hand. Never loaded by tooling
├── src/               # The game, in eight layers (from sprint 00)
├── tests/             # Every test, outside src/, mirroring it (from sprint 00)
└── bench/             # The render benchmark scene (from sprint 02)
```

The eight layers under `src/` and what each holds are in [Layers and the dependency rule](./docs/architecture/layers-and-dependency-rule.md). For any question of the form "which X exist", run the pointer in [Where to look](./docs/architecture/where-to-look.md) instead of reading a page.

---

## What to load for a task

Use the table in [docs/README.md](./docs/README.md#for-agents-what-to-load-for-a-task). It names the quick-reference anchors for each kind of change. Load the anchors; read the prose only when you need the reason.

---

## Rules that always apply

Each is owned by the page it links. The link is the rule; this list only says which ones bite most often.

- **Imports run one way, and lint enforces it.** Phaser only under `src/presentation/`. No clock, DOM, or `Math.random` under `src/domain/` or `src/simulation/`. [Layers](./docs/architecture/layers-and-dependency-rule.md#quick-reference)
- **Time in the simulation is a tick count.** Seconds live in content and are converted once. [Simulation loop](./docs/architecture/simulation-loop.md#quick-reference)
- **Every change to world state is a command.** The developer panel included. [ADR 0004](./docs/adr/0004-all-mutation-enters-as-commands.md)
- **Content references effects and behaviours by string key.** Never by function. [ADR 0005](./docs/adr/0005-content-references-by-string-key.md)
- **No optional properties, no non-null assertions, no ticket or sprint references in code.** [Coding standards](./docs/standards/coding.md#quick-reference)
- **Nothing allocates inside a system in steady state.** [Simulation coding](./docs/standards/simulation-coding.md#quick-reference)
- **One word per concept.** Hero, unit, enemy, spell, ability, order, command, event, tick. [Vocabulary](./docs/product/vocabulary.md)
- **A page that states a rule the change affects is updated in the same change.** [Documentation standards](./docs/documentation-standards.md#quick-reference)

---

## Commands and the gate

`pnpm check` is the gate: lint, typecheck, every test tier, build. Run it before offering a change. The full list, the test tiers, and how to run one spec are in [Development workflow](./docs/workflows/development.md). The scripts block of the root `package.json` is the authority once it exists.

---

## How work is planned and tracked

- The plan is [.claude/plan/implementation](./.claude/plan/implementation/README.md). Sprint files are the work items; each ticket block is self-contained.
- Ticket IDs are `P{phase}-S{sprint}-T{ticket}`. A ticket's `Status` row is updated in the same commit as the work where possible.
- [STATUS.md](./.claude/plan/implementation/STATUS.md) names the active sprint and the next ticket. Update it when a ticket changes status.
- Unplanned work gets a new ticket in the current sprint with a note. Cut work goes to [Deferred](./.claude/plan/implementation/backlog/deferred.md). Undecided things go to [Open questions](./.claude/plan/implementation/backlog/open-questions.md).
- A phase closes only when every row of its gate in [Phase exit gates](./.claude/plan/implementation/04-phase-exit-gates.md) holds.

The `pick-up-a-ticket` skill walks the steps.

---

## Agents, skills, rules, and tags

[Agents and skills standards](./docs/standards/agents-and-skills.md) owns the rules for everything under `.claude/`. In one line each:

- **Agents** (`.claude/agents/`) are delegation targets with a scope: the engineering architect decides structure, the game engineer implements inside it, the delivery strategist decides order and cost. Delegation is flat; an agent reports back rather than delegating on.
- **Skills** (`.claude/skills/`) are procedures or references. The Phaser skills describe Phaser, not this game. The project skills wrap a runbook: `pick-up-a-ticket`, `add-a-spell`, `add-an-enemy`, `write-a-docs-page`.
- **Rules** (`.claude/rules/`) load when a matching file is edited and link a quick-reference anchor. They restate nothing.
- **Tags** (`.claude/tags/`) are prompts a person pastes by hand. Tooling never loads them and nothing links them as a delegation target.

---

## Reading and changing the documentation

- Architecture and standards pages use placeholders for our own things: any identifier containing `foo`, `bar`, or `baz`. [The legend](./docs/documentation-standards.md#reading-a-placeholder) decodes them. Runbooks and product pages use real names.
- Every page is written in the present tense as the target. No history, no phase numbers outside the roadmap, no facts the code owns.
- Before adding or editing a page, read [Documentation standards](./docs/documentation-standards.md). The `write-a-docs-page` skill walks the shape.
- Plans, notes, and reviews are dated and live under `.claude/`. Pages under `docs/` are not.

---

## What belongs in this file

A link and one sentence. A rule belongs in a standards page, a placement in an architecture page, a reason in a decision record, a step in a runbook. If this file needs a second sentence about something, the something needs a page.
