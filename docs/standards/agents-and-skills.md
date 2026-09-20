# Agents and skills standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Documentation standards](../documentation-standards.md) · [Documentation index](../README.md)

How automated tooling is configured: the agents work is delegated to, the reusable skills they load, the rules that apply automatically when certain files are edited, and the one file every automated worker starts from. Read this before adding or changing anything under `.claude/` or the root `AGENTS.md`.

---

## The entry point

Every automated worker starts from `AGENTS.md` at the repository root. `CLAUDE.md` beside it holds one line that imports it, so tooling that reads either file reads the same map.

`AGENTS.md` is a map, not a manual. It links the [documentation index](../README.md), the table of what to load for a task, the plan, and the folders below, and it restates nothing. A rule belongs in a standards page; a placement in an architecture page; a reason in a decision record; a step in a runbook. If `AGENTS.md` needs a second sentence about something, the something needs a page.

---

## The three kinds

| Kind | Loaded | Use for |
| --- | --- | --- |
| **Agent** | When work is delegated to it | A discipline with a scope — architecture, game engineering, delivery planning |
| **Skill** | On request, or preloaded by an agent | A procedure or a body of knowledge — a Phaser subsystem, a repository workflow |
| **Rule** | Automatically, when matching files are edited | Constraints that must always apply to those files |

The distinction is **when it loads**: a rule holds what must never be forgotten, a skill holds depth that would be wasteful to carry everywhere, an agent is a worker with a scope.

Something the model already does well gets nothing written for it: every added instruction competes with every other one for attention.

---

## Where they live

```text
.claude/
├── agents/    # One file per agent: when to pick it, its tools, the skills it preloads, what it decides
├── skills/    # One folder per skill: the Phaser reference set, one per subsystem, plus project procedures
├── rules/     # One file per rule: a constraint, the files it matches, and the page it links
├── tags/      # Prompts a person pastes into a chat by hand. Never loaded by tooling
└── plan/      # Dated plans and notes. They capture a moment; docs/ describes the target
```

---

## Agents

Three agents exist, each a principal-level discipline: the **engineering architect** decides structure and boundaries, the **game engineer** implements systems inside those boundaries, and the **delivery strategist** decides what is built in which order and at what cost. An agent's file says what it loads first, what it is trusted to decide, and what it hands back.

**The description is the most important line.** It is what gets matched when work is delegated, so it says *when to use this agent*, not what the agent is like.

**Agents preload the skills they always need**, rather than relying on a decision they might make differently each run. The game engineer preloads the ticket procedure; the architect preloads the docs-page procedure. A Phaser reference skill is loaded on demand for the subsystem touched, because most tickets never touch Phaser and a preloaded reference costs attention on every one.

**Delegation is flat.** An agent doesn't delegate to another agent; if it needs work outside its scope, it reports back and the top delegates the next piece. Independent pieces of work are delegated together so they run at once.

---

## Skills

A skill is a procedure or a reference. Its description decides whether it gets loaded at the right moment, so it is written with the trigger words someone would actually use — "camera follow", "tilemap layer", "add a spell". Keep skills to one topic.

**The Phaser reference skills are one folder per subsystem** — cameras, input, scenes, tweens, and the rest — and they describe Phaser, not this game. A project procedure that touches Phaser links the reference skill rather than copying from it.

**A project skill for a repeated procedure links the runbook** that owns the steps, such as [Adding a spell](../workflows/adding-a-spell.md), and adds only what an automated worker needs beyond the page: what to load first, what the page assumes a person will do, and what to report back.

---

## Rules

**Rules hold constraints, not knowledge**, and they **link to documentation rather than restating it** — a rule links a page's `#quick-reference` anchor, so the page stays the one owner and the rule can't drift from it.

A rule matching `src/domain/**` and `src/simulation/**` links [Simulation coding standards](./simulation-coding.md#quick-reference); one matching `src/presentation/**` links [Presentation coding standards](./presentation-coding.md#quick-reference); one matching `src/content/**` links [Content authoring standards](./content-authoring.md#quick-reference); one matching `docs/**` links [Documentation standards](../documentation-standards.md#quick-reference).

**Keep a rule under a screen**; it costs attention on every matching edit. **Check the file patterns**: a rule matching nothing looks identical to a rule that works. A rule with no patterns loads on every edit, which is almost never what was meant.

---

## Tags

A tag is a prompt a person pastes into a chat by hand, for working with a model outside this tooling. Tags live under `.claude/tags/`, carry no frontmatter, and are never loaded automatically, preloaded by an agent, or named as a delegation target. A tag may describe the same discipline as an agent in different words; the agent file is the one tooling reads, and the two are not kept in step by any check.

---

## Mechanics

- Everything is kebab-case, and everything has a description — it is how the thing gets found.
- Frontmatter uses only the fields the tooling recognizes. Anything else is ignored silently. An agent uses `name`, `description`, `tools`, and `skills`; a rule uses `paths`, a list of globs from the repository root; a skill uses `name` and `description`.
- An agent's tool list is the narrowest that lets it finish; an agent that only reviews cannot write.
- An agent's tool list never includes a delegation tool.

---

## Anti-patterns

### A rule that restates a document

Two copies, one of which is stale, and the stale one loads automatically on every edit.

### A rule matching nothing

A pattern typo looks exactly like a working rule. There's no failure, just silence, and the constraint it was meant to hold is not held.

### An agent that delegates

The chain loses context at each hop and nobody can see what's running.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The entry point | `AGENTS.md` at the repository root, imported by `CLAUDE.md`; a map of links that restates nothing |
| A constraint that must never be broken / a procedure or deep knowledge / a discipline with a scope | A rule / a skill / an agent |
| Something the model already does well | Write nothing |
| An agent | Description says when to pick it; the narrowest tools that let it finish, never a delegation tool; always-needed skills preloaded, Phaser references on demand |
| The three agents | Engineering architect decides structure; game engineer implements inside it; delivery strategist decides order and cost |
| Delegation | Flat. An agent reports back; independent work is delegated together |
| A skill | One topic; description written with the trigger words someone would actually use |
| Phaser reference skills | One folder per subsystem, describing Phaser, not this game; project skills link them |
| A project skill | Links the runbook that owns the steps; adds what to load, what a person must do, and what to report |
| A rule | Constraints only; links `#quick-reference` anchors and restates nothing; under a screen; file patterns checked |
| A tag | A prompt for a person under `.claude/tags/`; never loaded, preloaded, or delegated to |
| Where things live | `.claude/agents/`, `.claude/skills/`, `.claude/rules/`, `.claude/tags/`, `.claude/plan/` at the repository root |
| Frontmatter | Only the recognized fields; unknown fields are ignored silently |
| Naming and descriptions | kebab-case; a description on everything |

---

## Related documentation

- [Documentation standards](../documentation-standards.md) — the pages rules link to
- [Documentation index](../README.md) — the "what to load for a task" table automated tooling starts from
- [Adding a spell](../workflows/adding-a-spell.md) — a runbook a project skill wraps
- [Simulation coding standards](./simulation-coding.md) — the anchor the domain rule links
- [Where to look](../architecture/where-to-look.md) — the pointers to every folder this page names
