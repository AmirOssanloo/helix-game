---
paths:
  - "src/domain/**"
  - "src/simulation/**"
---

# Simulation code

Files here decide and orchestrate. They run in Node with no screen.

- No Phaser, DOM, `window`, `Math.random`, `Date.now`, or `performance.now`. Lint bans them; the architecture test catches what lint misses.
- Time is a tick count. No seconds or milliseconds inside these folders.
- No allocation inside a system in steady state. Acquire from a pool, release to it.
- Iteration order is fixed. No `Map` keyed by object on a path that affects state; every sort has a tie-break.
- A refusal is a value with a reason, never a throw.
- Every number comes from a definition or a tunable, never a literal in a system.
- State changes enter only as commands, and a new system is registered once in `src/simulation/systems.ts`.

The rules and their reasons: [Simulation coding standards](../../docs/standards/simulation-coding.md#quick-reference) · [Layers and the dependency rule](../../docs/architecture/layers-and-dependency-rule.md#quick-reference) · [Simulation loop](../../docs/architecture/simulation-loop.md#quick-reference) · [Commands and events](../../docs/architecture/commands-and-events.md#quick-reference)

Before offering the change: the "A change under `src/domain` or `src/simulation`" rows of the [definition of done](../../docs/workflows/definition-of-done.md).
