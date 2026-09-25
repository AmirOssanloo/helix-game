# Features

> **Entry point:** [Product](../README.md)

One page per surface, describing how it behaves — what it's for, what the player can do, what happens at the edges, and what it deliberately doesn't do.

These pages describe behaviour, not implementation. Numbers are quoted once as the design's starting value, and the definition file that owns each number is named beside it under `src/content/`. Where a page and the [mechanics spec](../specs/character-movement-and-mechanics.md) disagree, the spec wins and the page gets fixed.

---

## The shape every feature page follows

- **Overview** — what it is and what the player uses it for
- **Topic sections** — how it behaves, one section per part
- **States and edge cases** — the empty, blocked, interrupted, and awkward ones, as a table
- **Deferred** — what it deliberately doesn't do

**Deferred** matters as much as the rest. A missing capability that's a decision reads very differently from one that's an oversight, and without saying so, every gap looks like an oversight.

---

## The hero

- [Hero](./hero.md) — attributes, resources, levels, orb passives, death
- [Controls and orders](./controls-and-orders.md) — pointer and keys, one order at a time, normal cast
- [Orbs and Invoke](./orbs-and-invoke.md) — the three-instance buffer, the composer, slots D and F
- [Spells and attack](./spells-and-attack.md) — the ten spells, the attack, damage types
- [Status effects](./status-effects.md) — what each status does, and what it blocks

## The world

- [Enemies](./enemies.md) — archetypes, packs, aggro and leash, tiers, enemy abilities
- [Map and camera](./map-and-camera.md) — the map as data, the arena, the locked camera

## The screen

- [HUD](./hud.md) — bars, orbs, ability squares, floating numbers, placeholder art
- [Developer panel](./developer-panel.md) — spawning, tuning, overlays, instrumentation

---

## Related documentation

- [Product overview](../overview.md) — what these surfaces add up to
- [Product vocabulary](../vocabulary.md) — the terms every page here uses
- [Roadmap](../roadmap.md) — which phase each surface lands in
- [Casting a spell](../../architecture/casting-a-spell-flow.md) — the reference flow through several of these surfaces at once
