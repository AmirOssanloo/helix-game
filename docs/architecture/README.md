# Architecture

> **Entry point:** [Documentation](../README.md)

How the game is built: what the parts are, how they connect, and what has to stay true as content and systems grow.

Use these pages when you need to place something, or when you need to understand how a change ripples. For the rules code must follow, see [Standards](../standards/README.md). For why a structure is the way it is, see [the decision records](../adr/README.md).

---

## The repository

One package. One `src/`. The folder a file sits in is the contract.

```text
helix/
├── src/          # The game, in eight layers
├── tests/        # Every test, outside src/, mirroring it
├── bench/        # The render benchmark scene
├── docs/         # This documentation
└── .claude/      # Automated tooling configuration
```

---

## The idea in one line

**Code that decides is kept apart from code that orchestrates, and both are kept apart from code that draws.**

Rules — whether a fourth orb evicts the oldest, whether a stunned unit may turn — need nothing but plain state, so they run in a Node test in a millisecond. Orchestration — run the systems in order, hand out ids, count ticks — needs a world but still no screen. Drawing needs Phaser, a canvas, and a GPU. Mixed together, the rules inherit the canvas. Kept apart, a bug report comes with an input log and the engineer replays the exact tick.

---

## The eight layers

```text
src/
├── shared/           # Pure helpers with no game knowledge
├── domain/           # Decides. Rules over plain state
├── simulation/       # Orchestrates. The world, the tick, the system order
├── content/          # Typed data: every spell, enemy, status, and map
├── instrumentation/  # Preallocated sample rings for timing and counts
├── presentation/     # Adapts. Where Phaser is used
├── devtools/         # The developer panel and its API
└── app/              # The composition root and the fixed-step driver
```

Imports run one way, and lint enforces it. [Layers and the dependency rule](./layers-and-dependency-rule.md) holds the table.

---

## Finding your way

Two pages answer "what is actually there?" — everything else here answers "how must it be shaped?".

- [Where to look](./where-to-look.md) — for each question about the running game, the file that answers it
- [World model](./world-model.md) — which entity kinds and definition kinds exist and which module owns each

---

## The simulation

- [Layers and the dependency rule](./layers-and-dependency-rule.md) — the eight layers, the import table, the public doors
- [Simulation loop](./simulation-loop.md) — the fixed step, the accumulator, the tick, the system order, time as a tick count
- [Commands and events](./commands-and-events.md) — input becomes commands, the tick emits events, the developer panel uses the same door
- [Entities and pools](./entities-and-pools.md) — pooled objects, generational ids, run scope and map scope
- [Content and registries](./content-and-registries.md) — definitions as data, effects and behaviours by string key, validation at startup
- [Ability pipeline](./ability-pipeline.md) — targeting, cast point, cooldowns, effect primitives, and why Invoke is a separate module
- [Movement, collision, and pathing](./movement-collision-pathing.md) — locomotion, push-out, the spatial hash, grid A*
- [Casting a spell](./casting-a-spell-flow.md) — the reference flow, in product words

## The screen

- [Presentation](./presentation.md) — scenes, the shape atlas, pooled views, depth bands, the HUD scene
- [Developer tools and instrumentation](./devtools-and-instrumentation.md) — the panel API, debug commands, sample rings

---

## Where architecture stops

An architecture page says what exists and how it connects. It doesn't hold the rules for writing code, and it doesn't argue for itself.

| The question | The page |
| --- | --- |
| "Where does this go?" | Architecture |
| "What may it import?" | Architecture |
| "What do I name it?" | [Standards](../standards/README.md) |
| "Why is it like this?" | [A decision record](../adr/README.md) |
| "What does the player see?" | [Product](../product/README.md) |

If an architecture page starts explaining why we chose something over the alternative, that reasoning belongs in a decision record.

---

## Related documentation

- [Standards](../standards/README.md) — the rules these structures are written against
- [Testing standards](../standards/testing.md) — what to test in these structures, and at which tier
- [Architecture decision records](../adr/README.md) — the reasoning behind the structures
- [Product overview](../product/overview.md) — what the game is for
- [Product vocabulary](../product/vocabulary.md) — the terms used throughout
