# Roadmap

> **Entry point:** [Product](./README.md)

What arrives when. This is the one page in the documentation that says "phase"; every other page describes the finished target, and this one says the order we reach it in.

Nine phases: the first five played on [the arena](./features/map-and-camera.md#the-arena), the sixth to the ninth on the long road, a hand-authored map for playtesting. The seventh adds almost nothing a player sees; it readies the game for items. The game's structure after them is Diablo I's: a descent through generated levels. Each phase ends with a playable build, domain tests green, and a frame-time check against [the bar](#the-bar-every-phase-is-held-to). A phase does not close on a promise to fix performance later.

---

## The bar every phase is held to

| Item | Bar |
| --- | --- |
| Frame rate | 60 fps stable, measured by an agent in Chrome on the development machine, an Apple M1 laptop. Firefox, Safari, Edge, and a separate reference laptop are not measured |
| Live enemies | 200 on screen |
| Live projectiles | 100 |
| Simulation tick | under 4 ms worst case |
| Presentation sync | under 1 ms |
| Phaser render | under 6 ms, target 2 to 3 ms, under 5 world draw calls |
| Allocations | zero in the tick hot path and the render sync in steady state; units, projectiles, zones, effects, and views are pooled |
| Determinism | the same seed and input log produce the same state; a replay test runs in CI |
| Testing | domain, simulation, and content tests run in Node with no canvas; the acceptance tests in the [mechanics spec](./specs/character-movement-and-mechanics.md) section 16 are Vitest tests; a 300-unit stress test and the render benchmark under `bench/` exist from phase 1 |

Every row is measured by an agent: the tick, the stress tests, and determinism headless in Node, and frame rate, sync, render, draw calls, and heap in Chrome on the development machine, the render benchmark included, through browser automation. No row waits on a person at a browser. The rules behind each row are in [Performance standards](../standards/performance.md) and [Testing standards](../standards/testing.md). Instrumentation is built in from phase 1 and shown in the [developer panel](./features/developer-panel.md).

---

## Phase 1: hero mechanics, camera, and the arena

**Goal:** movement and the Skein kit feel exactly right before any spell does damage.

- The hero moves, turns, stops, and attack-moves in the arena. The camera follows.
- Q, W, E add orb instances; R invokes; D and F hold prepared spells as identities only. No casting, no attacking.
- Health, mana, regeneration, level, and experience exist. The developer panel can damage, drain, heal, level up, and tune.
- The fixed-step loop, command buffer, pools, input-log recording, instrumentation, HUD, and the shape atlas exist.

**Done when** every acceptance test in the mechanics spec section 16 passes, no feel requirement in its section 15 fails, the 300-unit stress test holds the tick budget, the render benchmark passes, and a recorded session replays identically.

## Phase 2: spells and attack

**Goal:** every spell is castable, and the attack swings, in an empty arena.

- All ten spells with targeting mode, range and area previews, projectiles, zones, summons, and self buffs.
- Attack and attack-move.
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

## Phase 6: the long road

**Goal:** a real map to play from level 1 to about level 10, so the hero, the enemies, and the early game can be playtested and judged.

- The long road: one hand-authored rectangle, 4000 by 24000, in five regions of rising difficulty built from the existing archetypes, simple enemies first, elite packs through each region and a boss-tier pack closing it.
- Checkpoints along the road; a hero who dies comes back at the furthest one reached.
- Packs wake as the hero nears and sleep again once left behind, so the live cap holds on a map holding more enemies than the cap.
- Elites and bosses pay more experience, so the road reaches about level 10 at its last boss.
- The hero takes a smaller push share than the unit pressing it, so a crowd cannot carry it out of a choke.
- A feedback key in the developer panel saves a note with the session and the build it was played on.
- Spells that do not suit the game may be swapped for others on the same recipe, from the playtest's feedback.

**Done when** the hero can walk the long road from level 1 and reach about level 10, every pack on it places, live enemies never pass the cap and no pack is refused unseen, a crowd no longer carries the hero out of a choke, a recorded playtest replays identically, and the maintainer has played the road and filed feedback.

## Phase 7: the foundation

**Goal:** the game is ready to grow items, a store, and screens without anything already built bending under them, and it plays exactly as before.

- Every recorded session replays to the same state at every tick, checked against a fingerprint of the whole world, so a change that means to alter nothing is proved to alter nothing.
- The rules that keep the game deterministic and its layers apart are enforced in full, not only in their most common form.
- Each rule is decided in one place: stats for every unit from the same modifiers, orders changed only by the order machine, and the targeting preview and the HUD asking the rules rather than guessing.
- No part of the game that items, loot, or the store must extend is a single oversized module. A new kind of definition costs a handful of files, not a dozen edits.
- The seams items need are in place: modifiers that know their source, ids that cannot be mistaken for another kind of thing, many random draws at one moment, and a map change that keeps the hero's run.
- A pause screen on Esc, the first screen of the game, whose clicks and keys never reach the world beneath.

**Done when** every recorded session replays unchanged against its fingerprint, the checks all pass with no oversized module left unexplained, a new kind of definition is added in three files or fewer, every problem found in the review before the phase is fixed or deferred with a reason, and the frame budget holds as before.

## Phase 8: loot and the store

**Goal:** enemies on the long road drop what the hero needs, so the road is finished without the developer panel's heal and mana.

- The long road grows to the density of the classic loot-driven games: normal packs of three to six, elite packs of two or three, about a hundred to a hundred and thirty enemies, most of the hero's experience from normal enemies, and the last boss's kill at about level 11 to 13. A crowd presses the hero far less than before. Every map has a level, the long road one level for its whole length, and an item dropped on it takes that level.
- Enemies drop gold, health globes, mana globes, and equipment on the ground; an elite drops more and a boss something Rare or better, never at a higher item level. Drops roll on a draw of their own, so a drop never changes a fight's outcome and a replay drops the same things.
- The hero takes gold and globes by walking over or past them, and picks up an item by right-clicking it. Ground items carry labels in their rarity's colour; Alt shows every label.
- Ten armory slots, about twenty one-handed bases, seven rarities from Common to Legendary with rolled affixes, Legendary pieces dropped only by named bosses, a level requirement from an item's parts, and magic damage %, which amplifies all magical damage the hero deals.
- An inventory of ten by four cells in which an item takes as many cells as its size, and an armory screen, the game's first, and tooltips.
- A store at each checkpoint, opened by standing on its ring and clicking it, laid out as a classic vendor with Armour, Weapons, and Misc tabs, that sells equipment at the hero's level and buys items for gold.

**Done when** the hero walks the long road from level 1 to the last boss's kill with no heal or mana from the panel, every kind of drop appears and is taken, gold and globes by walking and items by a right click, a worn item changes the hero's derived stats, the store buys and sells at a checkpoint, a recorded session with loot replays identically, the frame budget holds with drops on the ground, and the maintainer has played it and filed feedback.

## Phase 9: active items

**Goal:** items the hero uses, each an ability cast through the same pipeline as a spell.

- Eight active items: Gyre Sceptre, Scorchglass, Slipknife, Rimeward, Skyfall Maul, Mainspring, Fetter Bolas, and Veilblade. They have no rarity, never drop, and are bought only in the store's Misc tab, at a steep price.
- Six keys in a 3 by 2 grid beside the Skein kit: T, X, V above, C, G, Space below, with a row on the HUD.
- The disable matrix gains the six keys.

**Done when** each active item is bought in the store and cast through the ability pipeline with nothing item-specific added to it, the disable matrix covers the six keys, and the maintainer has played the long road with them and filed feedback.

---

## Beyond phase 9

**The descent**, first: about a hundred generated levels in Diablo I's style, each its own map reached by stairs down, with a checkpoint at each level's start. The difficulty rises with depth through deeper and different enemy types, tiers, and density, never through scaling an enemy's stats by level; a level's number drives only its loot. Then a town with vendors, difficulty tiers, isometric sprite art with animation, audio, and a save system. This list is a direction, not a commitment. The intent is a game as rich as the classic loot-driven action RPGs.

Not at any point: multiplayer, hero selection, quick-cast, order queues, mobile, crafting.

---

## Doors kept open

Recorded so that no decision inside the phases closes them. Each page named owns the rule.

- **Run scope and map scope are separate lifetimes**, so a map transition never recreates the hero — [Entities and pools](../architecture/entities-and-pools.md)
- **View pools are sized to the screen** and bound by camera rectangle, not to simulation capacity — [Presentation](../architecture/presentation.md)
- **Static map geometry is drawn by a tile layer**; the domain map is already a grid and never learns how it is drawn — [Presentation](../architecture/presentation.md)
- **Simulation cost is bounded by a live cap**; dormant packs wake by proximity — [Entities and pools](../architecture/entities-and-pools.md#dormant-packs)
- **Stats are modifier-driven**, so items become one more source, and usable items are abilities cast through the same pipeline — [Ability pipeline](../architecture/ability-pipeline.md)
- **Later modules land in layers that already exist** — progression, items, loot, map generation, and screens drawn in the HUD scene — [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md)
- **The Phaser-free layers move to a workspace package** on the day a second consumer of the simulation appears — [ADR 0003](../adr/0003-layered-single-package-architecture.md)

---

## Later documents

| Document | What it holds | Arrives with |
| --- | --- | --- |
| [Spell catalogue](./specs/spell-catalogue.md) | The ten spells, adapted numbers, effect definitions | Phase 2 |
| [Enemy catalogue](./specs/enemy-catalogue.md) | Archetypes, the roster, tiers, abilities | Phases 3 and 5 |
| Disable matrix | Every status against Q, W, E, R, D, F, movement, and attack | Phase 5 |
| The long road | Its regions, packs, checkpoints, and experience budget | Phase 6 |
| Item catalogue | Armory slots, bases, rarities, affixes, drop tables, the store, and the economy on the long road; later the active items | Phases 8 and 9 |

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
| Phase numbering | Nine phases, with phase 4 as combat feel and tuning, phase 6 as the long road, phase 7 as the foundation, phase 8 as loot and the store, and phase 9 as active items | This page |
| Working title | Helix | [Product overview](./overview.md) |

---

## Related documentation

- [Product overview](./overview.md) — what the phases add up to
- [Features](./features/README.md) — how each surface behaves once its phase lands
- [Character movement and mechanics](./specs/character-movement-and-mechanics.md) — the acceptance tests phase 1 closes on
- [Definition of done](../workflows/definition-of-done.md) — the per-change checklist inside every phase
- [Architecture decision records](../adr/README.md) — the decisions the phases build on
