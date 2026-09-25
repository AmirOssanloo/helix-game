# Documentation

> **Entry point:** you are here. Every other page is reachable from this one.

How Helix is built, the rules code follows, why it's shaped this way, what the game is, and how to run it. These pages describe the game we are building towards. Code is held to them, not the other way round.

---

## New here?

Start with [Onboarding](./onboarding/README.md) and follow it in order. It takes you from a fresh clone to the game running with the developer panel open.

Then read [Product overview](./product/overview.md) to know what you're building, the [mechanics spec](./product/specs/character-movement-and-mechanics.md) to know how the hero must feel, and the [architecture overview](./architecture/README.md) to know where code goes.

---

## How this is organized

Five kinds of page, in six folders. Knowing which kind you want is usually enough to find it.

| Folder | Answers | Reach for it when |
| --- | --- | --- |
| [architecture/](./architecture/README.md) | What exists, and how it connects | You need to place something |
| [standards/](./standards/README.md) | What rule must my code follow | You're writing or reviewing code |
| [adr/](./adr/README.md) | Why is it this way | You want to change a rule, or argue with one |
| [onboarding/](./onboarding/README.md) | How do I get set up | You're new, or setting up a new machine |
| [workflows/](./workflows/README.md) | What do I type, and when am I done | You're building, testing, adding content |
| [product/](./product/README.md) | What are we building, and how does it behave | You need to know what the player sees |

Onboarding and workflows are both runbooks; product pages are the fifth kind.

---

## For agents: what to load for a task

Automated tooling starts from [AGENTS.md](../AGENTS.md) at the repository root, which points here. This table is what it points at.

Every architecture and standards page ends with a `## Quick reference` table holding every rule the page states. Load the table; read the prose only when you need the reason. Two pages are themselves one table — [Where to look](./architecture/where-to-look.md) and [World model](./architecture/world-model.md). [Where to look](./architecture/where-to-look.md) tells you where the real game's facts live, because these pages don't hold them. Every identifier containing `foo`, `bar`, or `baz` is a placeholder; the [placeholder legend](./documentation-standards.md#reading-a-placeholder) decodes each one.

| Task | Load these anchors first |
| --- | --- |
| Any change under `src/domain` or `src/simulation` | [Layers](./architecture/layers-and-dependency-rule.md#quick-reference) · [Simulation loop](./architecture/simulation-loop.md#quick-reference) · [Simulation coding](./standards/simulation-coding.md#quick-reference) |
| A new per-tick system or rule | [Simulation loop](./architecture/simulation-loop.md#quick-reference) · [Entities and pools](./architecture/entities-and-pools.md#quick-reference) · [Commands and events](./architecture/commands-and-events.md#quick-reference) |
| A new spell, effect, or enemy ability | [Ability pipeline](./architecture/ability-pipeline.md#quick-reference) · [Content and registries](./architecture/content-and-registries.md#quick-reference) · [Adding a spell](./workflows/adding-a-spell.md) · [Spell catalogue](./product/specs/spell-catalogue.md) |
| A new enemy or behaviour | [Content and registries](./architecture/content-and-registries.md#quick-reference) · [Movement, collision, and pathing](./architecture/movement-collision-pathing.md#quick-reference) · [Adding an enemy](./workflows/adding-an-enemy.md) · [Enemy catalogue](./product/specs/enemy-catalogue.md) |
| Anything that draws, or reads input | [Presentation](./architecture/presentation.md#quick-reference) · [Presentation coding](./standards/presentation-coding.md#quick-reference) |
| A developer-panel control or overlay | [Developer tools and instrumentation](./architecture/devtools-and-instrumentation.md#quick-reference) · [Commands and events](./architecture/commands-and-events.md#quick-reference) |
| Anything on the hot path | [Performance standards](./standards/performance.md#quick-reference) · [Entities and pools](./architecture/entities-and-pools.md#quick-reference) |
| Writing tests | [Testing standards](./standards/testing.md#quick-reference) |
| Changing how the hero controls or feels | [Mechanics spec](./product/specs/character-movement-and-mechanics.md) · [Controls and orders](./product/features/controls-and-orders.md) |
| Before offering a change for review | [Definition of done](./workflows/definition-of-done.md) |
| Changing a rule | The [decision record](./adr/README.md) that owns it, then the page that states it |

---

## Index

**Architecture** — [overview](./architecture/README.md) · [where to look](./architecture/where-to-look.md) · [world model](./architecture/world-model.md) · [layers](./architecture/layers-and-dependency-rule.md) · [simulation loop](./architecture/simulation-loop.md) · [commands and events](./architecture/commands-and-events.md) · [entities and pools](./architecture/entities-and-pools.md) · [content and registries](./architecture/content-and-registries.md) · [ability pipeline](./architecture/ability-pipeline.md) · [movement, collision, and pathing](./architecture/movement-collision-pathing.md) · [presentation](./architecture/presentation.md) · [developer tools and instrumentation](./architecture/devtools-and-instrumentation.md) · [casting a spell](./architecture/casting-a-spell-flow.md)

**Standards** — [overview](./standards/README.md) · [coding](./standards/coding.md) · [simulation coding](./standards/simulation-coding.md) · [presentation coding](./standards/presentation-coding.md) · [content authoring](./standards/content-authoring.md) · [performance](./standards/performance.md) · [testing](./standards/testing.md) · [agents and skills](./standards/agents-and-skills.md)

**Decisions** — [the index, and when to write one](./adr/README.md)

**Getting set up and shipping** — [onboarding](./onboarding/README.md) · [development workflow](./workflows/development.md) · [definition of done](./workflows/definition-of-done.md) · [adding a spell](./workflows/adding-a-spell.md) · [adding an enemy](./workflows/adding-an-enemy.md)

**Product** — [overview](./product/overview.md) · [roadmap](./product/roadmap.md) · [vocabulary](./product/vocabulary.md) · [features](./product/features/README.md) · [mechanics spec](./product/specs/character-movement-and-mechanics.md) · [spell catalogue](./product/specs/spell-catalogue.md) · [enemy catalogue](./product/specs/enemy-catalogue.md) · [disable matrix](./product/specs/disable-matrix.md)

---

## Writing documentation

Before you add or change a page, read [Documentation standards](./documentation-standards.md). The three rules that catch people:

- **Write the target, in the present tense.** No history, no migration notes, no phase numbers outside the roadmap.
- **Architecture and standards pages use placeholder names.** Runbooks, product pages, and the mechanics spec use real ones.
- **Never write a fact the code owns.** Write the pointer to where it lives, in [Where to look](./architecture/where-to-look.md).

Working notes, plans, and reviews live under `.claude/` — they're dated and capture a moment; these pages describe how things work.

---

## Related documentation

- [Documentation standards](./documentation-standards.md) — the rules every page here follows
- [Architecture](./architecture/README.md) — how the game is built
- [Standards](./standards/README.md) — the rules code follows
- [Architecture decision records](./adr/README.md) — why it's shaped this way
- [Product](./product/README.md) — what we're building
