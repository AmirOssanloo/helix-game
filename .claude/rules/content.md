---
paths:
  - "src/content/**"
---

# Content

Typed data. One file per definition; the registry validates it at startup.

- A definition is data: no formulas, no functions, no `extends` of another definition.
- Effects and behaviours are named by string key, never imported as functions. Content imports domain types only.
- Every number is a field. Time is in seconds here; the pipeline converts to ticks once.
- Every field is required. A missing one is a validation failure, not a default.
- Every atlas frame a definition names exists in the frame list.
- A new definition is added to its registry index, and the content tier is run.

The rules and their reasons: [Content authoring standards](../../docs/standards/content-authoring.md#quick-reference) · [Content and registries](../../docs/architecture/content-and-registries.md#quick-reference) · [ADR 0005](../../docs/adr/0005-content-references-by-string-key.md)

Before offering the change: the "A new spell, effect, or enemy ability" or "A new enemy or behaviour" rows of the [definition of done](../../docs/workflows/definition-of-done.md).
