---
paths:
  - "docs/**"
---

# Documentation

Every page is the target, in the present tense. Read [Documentation standards](../../docs/documentation-standards.md) before adding or changing one.

- One page, one of the five types: architecture, standards, decision record, runbook, product.
- No history, no phase numbers outside the roadmap, no tickets, no sprints, no branch names.
- Never write a fact the code owns. Write the pointer, in [Where to look](../../docs/architecture/where-to-look.md).
- Architecture and standards pages use placeholders (`foo`, `bar`, `baz`) for our own things. Runbooks and product pages use real names.
- Architecture and standards pages end with `## Anti-patterns`, `## Quick reference`, `## Related documentation`, in that order. The Quick reference holds every rule the body states.
- Links are relative and resolve. A new term goes in the [vocabulary](../../docs/product/vocabulary.md).
- A decision record is never deleted; it is superseded by a new one.

The rules and their reasons: [Documentation standards](../../docs/documentation-standards.md#quick-reference) · [Decision records](../../docs/adr/README.md)

Before offering the change: the "A documentation change" rows of the [definition of done](../../docs/workflows/definition-of-done.md).
