# Agents and skills standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Documentation standards](../documentation-standards.md) · [Documentation index](../README.md)

How automated tooling is configured: the roles work is delegated to, the reusable skills they load, and the rules that apply automatically when certain files are edited. Read this before adding or changing anything under `.claude/`.

---

## The three kinds

| Kind | Loaded | Use for |
| --- | --- | --- |
| **Role** | When work is delegated to it | A discipline with a scope — architecture, game engineering, delivery planning |
| **Skill** | On request, or preloaded by a role | A procedure or a body of knowledge — a Phaser subsystem, a repository workflow |
| **Rule** | Automatically, when matching files are edited | Constraints that must always apply to those files |

The distinction is **when it loads**: a rule holds what must never be forgotten, a skill holds depth that would be wasteful to carry everywhere, a role is a worker with a scope.

Something the model already does well gets nothing written for it: every added instruction competes with every other one for attention.

---

## Where they live

```text
.claude/
├── roles/     # One file per role: a discipline, its references, and what it is trusted to decide
├── skills/    # One folder per skill: the Phaser reference set, one per subsystem, plus project procedures
└── rules/     # One file per rule: a constraint, the files it matches, and the page it links
```

---

## Roles

Three roles exist, each a principal-level discipline: the **engineering architect** decides structure and boundaries, the **game engineer** implements systems inside those boundaries, and the **delivery strategist** decides what is built in which order and at what cost. A role's file says what it knows, what it is trusted to decide, and what it hands back.

**The description is the most important line.** It is what gets matched when work is delegated, so it says *when to use this role*, not what the role is like.

**Roles preload the skills they always need**, rather than relying on a decision they might make differently each run. The game engineer preloads the Phaser skills for the subsystems it touches most; the architect preloads the layer pages.

**Delegation is flat.** A role doesn't delegate to another role; if it needs work outside its scope, it reports back and the top delegates the next piece. Independent pieces of work are delegated together so they run at once.

---

## Skills

A skill is a procedure or a reference. Its description decides whether it gets loaded at the right moment, so it is written with the trigger words someone would actually use — "camera follow", "tilemap layer", "add a spell". Keep skills to one topic.

**The Phaser reference skills are one folder per subsystem** — cameras, input, scenes, tweens, and the rest — and they describe Phaser, not this game. A project procedure that touches Phaser links the reference skill rather than copying from it.

**A project skill for a repeated procedure links the runbook** that owns the steps, such as [Adding a spell](../workflows/adding-a-spell.md), and adds only what an automated worker needs beyond the page.

---

## Rules

**Rules hold constraints, not knowledge**, and they **link to documentation rather than restating it** — a rule links a page's `#quick-reference` anchor, so the page stays the one owner and the rule can't drift from it.

A rule matching `src/domain/**` and `src/simulation/**` links [Simulation coding standards](./simulation-coding.md#quick-reference); one matching `src/presentation/**` links [Presentation coding standards](./presentation-coding.md#quick-reference); one matching `src/content/**` links [Content authoring standards](./content-authoring.md#quick-reference); one matching `docs/**` links [Documentation standards](../documentation-standards.md#quick-reference).

**Keep a rule under a screen**; it costs attention on every matching edit. **Check the file patterns**: a rule matching nothing looks identical to a rule that works.

---

## Mechanics

- Everything is kebab-case, and everything has a description — it is how the thing gets found.
- Frontmatter uses only the fields the tooling recognizes. Anything else is ignored silently.
- A role's tool list is the narrowest that lets it finish; a role that only reviews cannot write.
- A role's tool list never includes a delegation tool.

---

## Anti-patterns

### A rule that restates a document

Two copies, one of which is stale, and the stale one loads automatically on every edit.

### A rule matching nothing

A pattern typo looks exactly like a working rule. There's no failure, just silence, and the constraint it was meant to hold is not held.

### A role that delegates

The chain loses context at each hop and nobody can see what's running.

---

## Quick reference

| Rule | Do |
| --- | --- |
| A constraint that must never be broken / a procedure or deep knowledge / a discipline with a scope | A rule / a skill / a role |
| Something the model already does well | Write nothing |
| A role | Description says when to pick it; the narrowest tools that let it finish, never a delegation tool; always-needed skills preloaded |
| The three roles | Engineering architect decides structure; game engineer implements inside it; delivery strategist decides order and cost |
| Delegation | Flat. A role reports back; independent work is delegated together |
| A skill | One topic; description written with the trigger words someone would actually use |
| Phaser reference skills | One folder per subsystem, describing Phaser, not this game; project skills link them |
| A project skill | Links the runbook that owns the steps |
| A rule | Constraints only; links `#quick-reference` anchors and restates nothing; under a screen; file patterns checked |
| Where things live | `.claude/roles/`, `.claude/skills/`, `.claude/rules/` at the repository root |
| Frontmatter | Only the recognized fields; unknown fields are ignored silently |
| Naming and descriptions | kebab-case; a description on everything |

---

## Related documentation

- [Documentation standards](../documentation-standards.md) — the pages rules link to
- [Documentation index](../README.md) — the "what to load for a task" table automated tooling starts from
- [Adding a spell](../workflows/adding-a-spell.md) — a runbook a project skill would wrap
- [Simulation coding standards](./simulation-coding.md) — the anchor the domain rule links
