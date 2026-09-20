# Roadmap

> **Entry point:** [Product](./README.md)

What arrives when. This is the one page in the documentation that says "phase"; every other page describes the finished target, and this one says the order we reach it in.

Five phases, all played on [the arena](./features/map-and-camera.md#the-arena). Each phase ends with a playable build, domain tests green, and a frame-time check against [the bar](#the-bar-every-phase-is-held-to). A phase does not close on a promise to fix performance later.

---

## The bar every phase is held to

| Item | Bar |
| --- | --- |
| Frame rate | 60 fps stable on the reference laptop (mid-range, integrated graphics) in Chrome, Firefox, Safari, and Edge |
| Live enemies | 200 on screen |
| Live projectiles | 100 |
| Simulation tick | under 4 ms worst case |
| Presentation sync | under 1 ms |
| Phaser render | under 6 ms, target 2 to 3 ms, under 5 world draw calls |
| Allocations | zero in the tick hot path and the render sync in steady state; units, projectiles, zones, effects, and views are pooled |
| Determinism | the same seed and input log produce the same state; a replay test runs in CI |
| Testing | domain, simulation, and content tests run in Node with no canvas; the acceptance tests in the [mechanics spec](./specs/character-movement-and-mechanics.md) section 16 are Vitest tests; a 300-unit stress test and the render benchmark under `bench/` exist from phase 1 |

The rules behind each row are in [Performance standards](../standards/performance.md) and [Testing standards](../standards/testing.md). Instrumentation is built in from phase 1 and shown in the [developer panel](./features/developer-panel.md).

---

## Phase 1: hero mechanics, camera, and the arena

**Goal:** movement and the Skein kit feel exactly right before any spell does damage.

- The hero moves, turns, stops, and attack-moves in the arena. The camera follows.
- Q, W, E add orb instances; R invokes; D and F hold prepared spells as identities only. No casting, no attacking.
- Health, mana, regeneration, level, and experience exist. The developer panel can damage, drain, heal, level up, and tune.
- The fixed-step loop, command buffer, pools, input-log recording, instrumentation, HUD, and the shape atlas exist.

**Done when** every acceptance test in the mechanics spec section 16 passes, no feel requirement in its section 15 fails, the 300-unit stress test holds the tick budget, the render benchmark passes, and a recorded session replays identically.

## Phase 2: spells and attack

**Goal:** every spell and the auto-attack are castable in an empty arena.

- All ten spells with targeting mode, range and area previews, projectiles, zones, summons, and self buffs.
- Auto-attack and attack-move.
- Statuses on the hero, applied from the developer panel.
- Domain events drive hit and cast feedback.

**Done when** each spell has a definition file, a unit test for its effect, and casts correctly at every orb level, and the tick budget holds with 20 concurrent zones and effects.

## Phase 3: enemies

**Goal:** fight groups.

- Four archetypes plus the training dummy, spawned in packs from the developer panel dropdown.
- Aggro, chase, attack, leash, pack behaviour, death, experience.
- Damage numbers, hit flashes, status icons, and overlays for ranges and paths.

**Done when** 200 live enemies chase and attack the hero within budget, spells kill them correctly by damage type, and experience levels the hero.

## Phase 4: combat feel and tuning

**Goal:** fighting is readable and satisfying before the roster grows.

- Hit feedback, knockback and displacement, death handling, experience flow.
- A balance pass on hero stats, spell numbers, and archetype stats using the tuning panel.
- Profile under load and fix hot spots.

**Done when** a designer can retune any exposed number without a code change and the profile shows headroom against every row of the bar.

## Phase 5: the full enemy roster

**Goal:** enemies use abilities and tiers.

- A long enemy list with stun, slow, silence, root, ranged, area slam, summon adds, self-heal, and charge or leap.
- Elite and boss tiers.
- The disable matrix and the interactions it specifies.

**Done when** every enemy ability reuses the hero's ability pipeline, the disable matrix tests pass, and a boss encounter runs within budget.

---

## Beyond phase 5

Items and inventory, equipment as modifier sources, loot tables and drops on death, procedural dungeons with acts and biomes, a town with vendors, difficulty tiers, top-down sprite art with animation, audio, and a save system. This list is a direction, not a commitment. The intent is a game as rich as the genre standard.

Not at any point: multiplayer, isometric view, hero selection, quick-cast, order queues, mobile.

---

## Doors kept open

Recorded so that no decision inside the five phases closes them. Each page named owns the rule.

- **Run scope and map scope are separate lifetimes**, so a map transition never recreates the hero — [Entities and pools](../architecture/entities-and-pools.md)
- **View pools are sized to the screen** and bound by camera rectangle, not to simulation capacity — [Presentation](../architecture/presentation.md)
- **Static map geometry is drawn by a tile layer**; the domain map is already a grid and never learns how it is drawn — [Presentation](../architecture/presentation.md)
- **Simulation cost is bounded by a live cap**; dormant packs activate by proximity — [Movement, collision, and pathing](../architecture/movement-collision-pathing.md)
- **Stats are modifier-driven**, so items become one more source, and usable items are abilities cast through the same pipeline — [Ability pipeline](../architecture/ability-pipeline.md)
- **Later modules land in layers that already exist** — progression, items, loot, map generation, an inventory adapter — [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md)
- **The Phaser-free layers move to a workspace package** on the day a second consumer of the simulation appears — [ADR 0003](../adr/0003-layered-single-package-architecture.md)

---

## Later documents

| Document | What it holds | Arrives with |
| --- | --- | --- |
| Spell catalogue | The ten spells, adapted numbers, effect definitions | Phase 2 |
| Enemy catalogue | Archetypes, the roster, tiers, abilities | Phases 3 and 5 |
| Disable matrix | Every status against Q, W, E, R, D, F, movement, and attack | Phase 5 |

---

## Resolved clarifications

The brief raised 47 questions. Four went to discussion and became decision records; the rest were approved as suggested and are folded into the product and architecture pages.

| Question | Resolution | Owned by |
| --- | --- | --- |
| Rendering backend | Phaser 4 WebGL renderer, one generated atlas of white shapes drawn as tinted quads, `BitmapText` numbers, no `Shape` or `Graphics` objects, Canvas unsupported | [ADR 0001](../adr/0001-phaser-renderer-and-quad-atlas.md) |
| Physics engine | Custom 30 Hz fixed-step simulation, no Phaser physics, no third-party engine, Phaser renders only | [ADR 0002](../adr/0002-custom-fixed-step-simulation.md) |
| Architecture boundary | Domain decides, simulation orchestrates, presentation adapts; no Phaser, DOM, or clock in the first two | [ADR 0003](../adr/0003-layered-single-package-architecture.md) |
| Repository layout | Single package, one `src/` with eight layers, enforced by lint and an architecture test | [ADR 0003](../adr/0003-layered-single-package-architecture.md), [Architecture](../architecture/README.md) |
| How state changes | All mutation, including developer-panel operations, enters as commands | [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) |
| How content names behaviour | Definitions reference effects and behaviours by string key | [ADR 0005](../adr/0005-content-references-by-string-key.md) |
| Phase numbering | Five phases, with phase 4 as combat feel and tuning | This page |
| Working title | Helix | [Product overview](./overview.md) |

---

## Related documentation

- [Product overview](./overview.md) — what the phases add up to
- [Features](./features/README.md) — how each surface behaves once its phase lands
- [Character movement and mechanics](./specs/character-movement-and-mechanics.md) — the acceptance tests phase 1 closes on
- [Definition of done](../workflows/definition-of-done.md) — the per-change checklist inside every phase
- [Architecture decision records](../adr/README.md) — the decisions the phases build on
