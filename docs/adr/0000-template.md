# ADR NNNN — Short title in plain words

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                          |
| ----------------- | ---------------------------------------------- |
| **Status**        | Proposed / Accepted / Superseded / Deprecated  |
| **Date**          | YYYY-MM-DD                                     |
| **Deciders**      | Who agreed                                     |
| **Supersedes**    | ADR number, or none                            |
| **Superseded by** | ADR number, or none                            |

## Context

What's true today that makes this a question. The constraint, the pressure, or the repeated argument. No options yet, and no decision — just the situation a reader needs to understand before the choice makes sense.

Say who feels the problem. The player whose spell fires a frame late, the designer retuning a number, the engineer on the hot path, the next engineer to touch this.

## Decision

The commitment, in one or two short paragraphs. Present tense. Plain words.

State it so someone can hold code against it without reading the rest of the page.

## Consequences

### What this makes easy

The things that get simpler, faster, or safer. Be concrete — name what a person can now do that they couldn't before.

### What this makes hard

The real cost. Every decision has one. A record with an empty second half hasn't been thought through, and the reader will notice.

## Alternatives considered

**The option we didn't take.** One short paragraph: what it was, and the specific reason it lost. Be fair — if it was close, say so.

Repeat for each serious alternative. Skip the ones nobody actually proposed.

## Revisit when

The condition that should reopen this. A benchmark that fails, a second consumer of the simulation, a profile crossing the tick budget, a library closing the gap, a scale we don't hit yet.

Without this section a decision becomes permanent by accident.

## References

Where the rule is enforced in code — a lint rule, an architecture test, a type. If nothing enforces it, say that plainly, because a rule that lives only in a document will be broken.

---

## Related documentation

- [Architecture decision records](./README.md) — the index and the rules for writing one
- [Documentation standards](../documentation-standards.md) — when a choice earns a record
