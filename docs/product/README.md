# Product

> **Entry point:** [Documentation](../README.md)

What we're building, who it's for, and how each surface behaves.

These pages use **real names and real numbers** — Quartz, Hoarfrost, 280 units per second, the words a player would recognise. That is the opposite of the architecture and standards pages, and it is deliberate: a product page that says "an orb" instead of naming one is useless. A number quoted here is the design's starting value; the file that owns it is named beside it, and the file wins when they disagree.

---

## Start here

- [Product overview](./overview.md) — what Helix is, who plays it, and how a fight goes
- [Product vocabulary](./vocabulary.md) — the words we use, and the ones we don't
- [Roadmap](./roadmap.md) — the five phases, what each ships, and the bar every phase is held to

## The specification

- [Character movement and mechanics](./specs/character-movement-and-mechanics.md) — the control model with every number: pointer and keys, locomotion, turn rate, the orb buffer, Invoke, the D and F slots, cooldowns, the tick model, and the acceptance tests. Authoritative on all of those; every feature page defers to it
- [Spell catalogue](./specs/spell-catalogue.md) — the ten spells as data: recipe, targeting, cast point, range, cooldown and mana by level, effect lists, statuses, shapes, frames, and the pieces the pipeline needs to cast them. Authoritative on the shape; the definition files own the numbers

## The surfaces

- [Features](./features/README.md) — one page per surface: how it behaves, what happens at the edges, and what it deliberately doesn't do

---

## Related documentation

- [Architecture](../architecture/README.md) — how these surfaces are built
- [Casting a spell](../architecture/casting-a-spell-flow.md) — the reference flow from key press to damage number, in product words
- [World model](../architecture/world-model.md) — which module owns each thing named on these pages
- [Definition of done](../workflows/definition-of-done.md) — what a change to any surface passes before review
