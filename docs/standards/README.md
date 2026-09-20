# Standards

> **Entry point:** [Documentation](../README.md)

Standards are the rules code must follow. Where an architecture page tells you *where* something goes, a standards page tells you *how to write it*.

Use these when you're about to write code and want to check a convention, or when you're reviewing and want to point at something.

---

## How they're organized

One cross-cutting page holds what is true everywhere. Then one page per layer family: the simulation (`domain/` and `simulation/`), the screen (`presentation/`), and the data (`content/`). Then the rules that cut across layers in a different direction: performance, testing, and the automated tooling.

The cross-cutting page owns the rule. The layer page owns the application of it. If you find the same rule stated in both, one of them is wrong — and it's usually the layer page, because it drifted.

---

## Cross-cutting

- [Coding standards](./coding.md) — naming, file suffixes, exports, function style, comments, imports, composition

## By layer

- [Simulation coding standards](./simulation-coding.md) — determinism, tick time, allocation, iteration order, failures as values
- [Presentation coding standards](./presentation-coding.md) — the one Phaser layer: quads only, pooled views, the batch
- [Content authoring standards](./content-authoring.md) — one file per definition, string keys, every number a field

## Across layers

- [Performance standards](./performance.md) — the budgets as rules, and how to measure before and after
- [Testing standards](./testing.md) — what to test, at which tier, how big

## Tooling

- [Agents and skills standards](./agents-and-skills.md) — how `.claude/` is organized and what a rule may say

---

## Standards or architecture?

| The question | The page |
| --- | --- |
| "Where does this file go?" | [Architecture](../architecture/README.md) |
| "What may this import?" | [Architecture](../architecture/README.md) |
| "What do I call it?" | Standards |
| "How do I write this bit?" | Standards |
| "How fast must it be?" | Standards |
| "Why is it like this?" | [A decision record](../adr/README.md) |

---

## Related documentation

- [Architecture](../architecture/README.md) — the structures these rules apply to
- [Architecture decision records](../adr/README.md) — the reasoning behind the load-bearing rules
- [Definition of done](../workflows/definition-of-done.md) — the checklist that points at these rules
- [Documentation standards](../documentation-standards.md) — where a rule belongs
