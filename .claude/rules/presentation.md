---
paths:
  - "src/presentation/**"
---

# Presentation code

The one layer that imports Phaser. It draws and reads input; it decides nothing.

- Quads only. No Shape, no Graphics, no `Text` updated during sync. A new shape is a new atlas frame; a colour is a tint.
- No game object is created or destroyed during play. Views are bound from a pool and never grow it on a miss.
- The sync reads the `Readonly` world view and writes sprites. It never reads a sprite back and never holds a rule.
- Depth is one of the fixed bands.
- Imports enter other layers only through `@simulation/public`, `@domain/public`, `@domain/queries`, and `@shared/public`. Never `@domain/rules`; a verdict is asked of a query, never worked out here.
- Every pointer and key event is asked of the input claim before the mapper. No scene stops propagation to protect another.
- A debug overlay is added only in the composition root's panel-build branch.
- The render benchmark is rerun if the atlas or any view changed, with before and after numbers in the change description.

The rules and their reasons: [Presentation coding standards](../../docs/standards/presentation-coding.md#quick-reference) · [Presentation](../../docs/architecture/presentation.md#quick-reference) · [Performance standards](../../docs/standards/performance.md#quick-reference)

Before offering the change: the "Anything under `src/presentation`" rows of the [definition of done](../../docs/workflows/definition-of-done.md).
