# Architecture decision records

> **Entry point:** [Documentation](../README.md)

A decision record captures one choice we've locked in: what we decided, why, and what would make us think again. It's for the engineer who's about to work against a rule and wants to know whether it's load-bearing or just habit.

This page explains when to write one and what shape it takes. The decisions themselves are indexed at the bottom.

---

## When to write one

Write a decision record when the choice is **hard to undo**, **crosses more than one layer's work**, or **will be asked again**.

That last one is the most common. If you've explained something twice in review, the third person is coming. A record turns that conversation into a link.

Don't write one for a choice you could reverse in an afternoon. A record makes a decision feel permanent, and a folder full of small ones makes the big ones harder to find. A tunable's default, a frame name in the atlas, the order of two systems that don't depend on each other — those are edits, not records.

**One decision per record.** If your title needs "and", you have two.

---

## When it isn't an ADR

| You want to say | Write it in |
| --- | --- |
| "Here's where this kind of code goes" | An architecture page |
| "Always name it this way" | A standards page |
| "Here are three options we might take" | A design note under `.claude/`, not a record — a record is the commitment, not the conversation |
| "Here's how to run it" | A runbook |
| "The hero turns at this rate" | The [mechanics spec](../product/specs/character-movement-and-mechanics.md) or a product page |

Keep the exploring separate from the deciding. Sketches and options are useful while a choice is open, and confusing afterwards.

---

## The shape

Copy [the template](./0000-template.md). Every record has the same sections in the same order, so a reader can skip to the part they need.

- **Metadata table** — status, date, who decided, what it supersedes.
- **Context** — what's true that makes this a question at all. No options yet.
- **Decision** — the commitment, in plain words. Present tense.
- **Consequences** — what this makes easy, and what it makes hard. Both halves, honestly.
- **Alternatives considered** — what we didn't pick, and the reason. One short paragraph each.
- **Revisit when** — the condition that should reopen this.
- **References** — where the rule is enforced in code.

**"Revisit when" is the section people skip and shouldn't.** A decision without a reopening condition quietly becomes permanent, and two years later nobody can tell whether it's still right or just old. Name the thing that would change your mind: a benchmark that fails, a second consumer of the simulation, a profile that crosses the tick budget, a Phaser release that changes the batching model.

---

## Writing a good one

Write it while the reasons are still fresh. A record written a month later records what you remember, which is usually the conclusion without the doubt.

**Name consequences in human terms.** Not "improves determinism" but "a bug report arrives with an input log, and the engineer replays it to the exact tick instead of guessing."

**Say why now.** What does deciding this unlock? What gets more expensive if we wait? If nothing is broken today, say so — then say what the record prevents later.

**Be fair to the alternatives.** A record that makes the rejected options look stupid is a record nobody trusts. If an option was close, say it was close. Several of the records below rejected a library that would have saved days; they say so.

---

## Numbering and status

Numbers are assigned in order and **never reused or changed**. Lint messages and test suite names point at these numbers, so renumbering breaks real references.

A record is `Proposed`, `Accepted`, `Superseded`, or `Deprecated`.

**Never delete a record.** When a decision changes, write a new one and mark the old one `Superseded by ADR NNNN`. The old reasoning is how a future reader understands why the new decision was needed. Deleting it leaves them guessing.

Correcting a small detail in an accepted record is fine — edit it. Changing what was decided is a new record.

---

## Index

| # | Decision | What it settles |
| --- | --- | --- |
| [0001](./0001-phaser-renderer-and-quad-atlas.md) | Phaser 4 draws everything as tinted quads from one generated atlas | Which renderer draws the game, and why nothing is drawn with Shape or Graphics objects |
| [0002](./0002-custom-fixed-step-simulation.md) | The simulation is our own fixed-step tick, not a physics engine | Why Phaser never owns a position, and what the simulation builds itself |
| [0003](./0003-layered-single-package-architecture.md) | Domain decides, simulation orchestrates, presentation adapts — in one package | The eight layers, the import rule, and why it is one package and not a workspace |
| [0004](./0004-all-mutation-enters-as-commands.md) | Every change to world state is a command in one buffer, the developer panel included | Why there is no debug back door, and how a panel session replays |
| [0005](./0005-content-references-by-string-key.md) | Content references effects and behaviours by string key, never by function | How a spell definition names its behaviour, and why a typo fails at startup |
| [0006](./0006-isometric-view-over-a-square-world.md) | The view is isometric: a projection in presentation over a square world | Why the floor is diamonds while the simulation stays square, and where the scale lives |
| [0007](./0007-a-spawned-unit-ends-with-its-owner.md) | A unit an ability spawns ends on the tick its owner dies | Why killing a summoner clears its adds, why they grant nothing, and why the death system runs a second pass |
| [0008](./0008-damage-hooks-are-status-capabilities.md) | Doing something on damage is a hook on a status, written as an effect list | Where a bash or a mark lives, why a hook has no key of its own, and why hook damage runs no hooks |
| [0009](./0009-definition-tuning-key-is-the-field-path.md) | A definition number's tuning key is its field path, verbatim | How a slider, a log, and a test name one number on a definition, and what a rename costs |

---

## Related documentation

- [ADR template](./0000-template.md) — copy this to start a new record
- [Documentation standards](../documentation-standards.md) — how a record differs from an architecture or standards page
- [Architecture](../architecture/README.md) — the structures these decisions shaped
- [Standards](../standards/README.md) — the rules these decisions produced
