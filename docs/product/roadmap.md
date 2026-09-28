# Roadmap

> **Entry point:** [Product](./README.md)

What arrives when. This is the one page in the documentation that says "phase"; every other page describes the finished target, and this one says the order we reach it in.

Sixteen phases. The first five are played on [the arena](./features/map-and-camera.md#the-arena), the sixth to the ninth on the long road, a hand-authored map for playtesting. The seventh adds almost nothing a player sees; it readies the game for items. The tenth to the fifteenth build the game's structure, Diablo I's: [the descent](./specs/the-descent.md), a hundred generated maps below a town, walked a stratum at a time, with saves after the first stratum and loot at depth before the middle ones. The sixteenth draws and sounds it. Each phase ends with a playable build, domain tests green, and a frame-time check against [the bar](#the-bar-every-phase-is-held-to). A phase does not close on a promise to fix performance later.

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
- Enemies drop gold, health globes, mana globes, and items on the ground; an elite drops more and a boss something Rare or better, never at a higher item level. Drops roll on a draw of their own, so a drop never changes a fight's outcome and a replay drops the same things.
- The hero takes gold and globes by walking over or past them, and picks up an item by right-clicking it. Ground items carry labels in their rarity's colour; Alt shows every label.
- Ten armory slots, about twenty one-handed bases, seven rarities from Common to Legendary with rolled affixes, Legendary pieces dropped only by named bosses, a level requirement from an item's parts, and magic damage %, which amplifies all magical damage the hero deals.
- An inventory of ten by four cells in which an item takes as many cells as its size, and an armory screen, the game's first, and tooltips.
- A store at each checkpoint, opened by standing on its ring and clicking it, laid out as the classic games' store with Armour, Weapons, and Misc tabs, that sells items at the hero's level and buys items for gold.

**Done when** the hero walks the long road from level 1 to the last boss's kill with no heal or mana from the panel, every kind of drop appears and is taken, gold and globes by walking and items by a right click, a worn item changes the hero's derived stats, the store buys and sells at a checkpoint, a recorded session with loot replays identically, the frame budget holds with drops on the ground, and the maintainer has played it and filed feedback.

## Phase 9: active items

**Goal:** items the hero uses, each an ability cast through the same pipeline as a spell, and each an answer to a disable.

- Eight active items: Gyre Sceptre, Scorchglass, Slipknife, Rimeward, Skyfall Maul, Mainspring, Fetter Bolas, and Veilblade, as the [item catalogue](./specs/item-catalogue.md#7-the-active-items) sets them. They have no rarity, never drop, wear an emerald label, and are bought only in the store's Misc tab, at a steep price. The three that deal damage grow with the hero's level at the moment of activation.
- A bank of six places beside the Skein kit, on T, X, V above and C, G, Space below, with a row on the HUD. A bought item goes to the first free place, the hero holds one of each, an item's clock follows it, and the player moves an item between the bank and the inventory as any item is moved.
- The answers to the game's disables. Silence leaves the six keys alone; a stun or a lift refuses them. Gyre Sceptre cast on the hero is the self-lift: 2.5 seconds untargetable and invulnerable, shedding on the tick it rises every status an enemy put on the hero, with Q, W, E, and R still working in the air, while enemies hold, facing it, and take it up again when it lands. A blink or a lift makes a projectile aimed at the unit miss. Slipknife is refused under root and for 3 seconds after an elite or a boss deals the hero damage. Veilblade makes its target ethereal: untouched by physical damage, unable to attack, and taking more magical damage.
- The disable matrix gains the six keys, the self-lift, and ethereal.
- The long road gains a stun in flight: its boss skirmisher and its last boss throw `stun_bolt`, a slow, visible projectile a blink or a lift sends past the hero.
- A right click picks an enemy before an item lying under it; while Alt is held, the item.

**Done when** each active item is bought in the store and cast through the ability pipeline with nothing item-specific added to it, each answer to a disable holds by its test, the disable matrix covers the six keys and the self-lift, the long road with its stun bolts is still finished without the panel's help, a recorded session replays identically, the frame budget holds with the bank on the HUD, and the maintainer has played the long road with the items and filed feedback.

## Phase 10: the first stratum, the town, and travel

**Goal:** the descent begins. The hero leaves the town and walks the Nave, the first ten generated maps, portal to portal.

- The town above map 1: no enemies and nothing to drop, the store, and its waypoint. The town's store stocks again at the hero's level the first time it opens after the hero reaches a new waypoint.
- Maps generated from the run's seed and the map's level, so the same run always walks the same map at the same depth. The Nave's maps are rooms and corridors: an arrival point, two or three regions harder toward the portal, a waypoint a third to a half of the way along, and a map boss with its guard before the portal, with 90 to 110 enemies and no point with more than 60 near it. A generated map is checked before it is played; one that fails is made again, and a plain layout stands behind the last attempt.
- [Travel](./features/map-and-camera.md#travel): the portal down by a right click; waypoints reached by walking to them, with a screen that travels between them; the town portal on B, a 3-second channel and a 60-second clock no cooldown reduction shortens, keeping its map frozen while it stands. Every other way into a map makes it fresh.
- The Nave's six families at their first variant: grunt, runner, archer, tank, frost raider, and lancer, each variant a row of its family. A pack can hold more than one kind of enemy, so a map boss stands with its guard.
- The level table changes only above level 12. The descent reaches about level 12 by map 10 on its variants' own experience, and the long road still reaches 12 at its last boss.
- The Gaolmaster on map 10 throws `stun_bolt` every six seconds among grunt adds; the portal down opens only once it is dead, and it drops a Legendary piece of its own.
- A recording driver walks any generated map from its arrival point to its waypoint and its portal. The long road stays a playtest map outside the descent, chosen from the panel, and the panel jumps to any map of the descent by its level.

**Done when** the driver walks the Nave from the town to the Gaolmaster's kill at about level 12 on a sweep of seeds, using a town portal and a waypoint; every map of the sweep passes its checks or falls back and is counted; the same seed and level make the same map before and after a session is played; a walk to town and back finds the kept map as it was left; the live cap holds on every generated map; the long road's recorded sessions still replay; the frame budget holds on the densest map with the kept map standing; and the maintainer has played the town and the Nave's first maps and filed feedback.

## Phase 11: saves

**Goal:** the run survives the tab.

- One run saved: the seed, the hero with its level and orbs, the inventory, the armory, the bank, gold, the waypoints reached, the town store's stock, and the stash. It is saved on entering town, on reaching a waypoint, and on stepping through a portal, and it resumes in town, never mid-map. A town portal that stood at the save is closed on resume; health and mana come back as saved, with no statuses and every clock ready.
- A save written by an earlier build loads in a later one. An item the content no longer has is lost, and the game says so.
- A stash in town of 10 by 8 cells, holding items across sessions.
- A death costs 10% of the gold the hero carries, and nothing else.
- A start screen resumes the run or begins a new one, which gives up the saved run after a confirmation.

**Done when** everything a run keeps survives a save and a resume, a save from each earlier build loads, the stash, the start screen, and the penalty work as their pages say, a session begun from a save replays identically, the frame budget holds, and the maintainer has played the whole first stratum across at least two sittings and filed feedback.

## Phase 12: the Undercroft and the Ossuary

**Goal:** the roster widens: maps 11 to 30, the first variants and aspects, and the first two problems the long road never posed.

- The Undercroft, maps 11 to 20: the long road's hexer, trapper, skirmisher, crusher, summoner, troll, and brute return as families at their first variant, beside the Nave's six at their second.
- The Ossuary, maps 21 to 30: the leech, which drains the hero's mana, and the bolter, which throws `stun_bolt`, beside the families above at their next variant. Every variant has its own name, tint, and numbers; a third variant adds one ability.
- Aspects: ten named modifiers an elite pack or a map boss rolls, one on an elite and two on a map boss, shown as an icon over each member. An aspect changes numbers or adds a carried status; it never makes a unit immune to a disable.
- Mana burn: mana drained every tick, and a tick that finds too little deals the rest as magical damage.
- The Hollow Abbess on map 20 and Marrowleech on map 30, each with a Legendary piece.
- A silhouette for every family, drawn flat in the game's current style from the shapes the game paints itself, so fifteen families are told apart before their colour.
- Items to level 30: bases and affix tiers deep enough for these strata.

**Done when** every family and variant matches [the descent](./specs/the-descent.md#3-families-and-variants)'s table, aspects are data with no rule written for one, the driver walks maps 11 to 30 and kills both stratum bosses with the hero at about level 21 by map 30, every family is told apart by its silhouette with the draw calls unchanged, items to level 30 roll at their weights, recorded sessions replay identically, the frame budget holds, and the maintainer has played both strata from saves and filed feedback.

## Phase 13: loot at depth

**Goal:** items stay worth reading all the way down, so the hero's power keeps growing after its level and orbs top out.

- The catalogue at the descent's scale, from research into how Diablo II builds its items first: bases to quality level 100 and affix tiers to affix level 100, so a hero at the bottom wears about +100% magic damage and +25% cooldown reduction in all.
- Cooldown reduction from items capped at 40%, so Mainspring and the kit's clocks stay decisions.
- A Legendary piece for every stratum boss.
- Base values that rise with quality level, so gold keeps buying something; the town's store stocks up to Epic from the fourth stratum.

**Done when** the catalogue's tables match its files, every rarity drops at its weight at depth over many rolls, the cap holds, the hero's offence and defence at item levels up to 100 land inside [the descent](./specs/the-descent.md#81-what-the-hero-brings)'s band, saves from earlier builds still load, the frame budget holds, and the maintainer has read what drops deep down and filed feedback.

## Phase 14: strata 4 to 7

**Goal:** the middle of the descent, maps 31 to 70, a stratum at a time, each a new pair of problems.

- The Cisterns: the dragger's hook, a homing projectile a blink or a lift sends past; the bloater, which bursts on death, harming every unit near it, and sets off the next bloater one link a tick.
- The Warrens: the mender, which heals its pack's most hurt; the dreadcaller's fear, which runs the hero from its caster for 1.5 seconds with no order, spell, or throw, while the six active-item keys still work.
- The Furnace: the raiser, which stands its pack's dead up once; the nest, which brings runners until it is broken.
- The Mirrorhalls: the flicker, which blinks away; the kindler, which leaves burning ground.
- The Drowned Hook, the Brood Queen, the Kindled King, and the Glass Twins, whose damage is shared so that they die together.
- The families above step down a variant, and a family in its fifth stratum stands as the crowd; field packs of 4 to 7, elites about 15% of a map.

**Done when** each family's abilities hold by their tests, fear's row of the disable matrix leaves the active-item keys working, the live cap holds with nests and raises at their worst, the driver walks each stratum and kills its boss with the hero at about level 25 by map 50, recorded sessions replay identically, the frame budget holds, and the maintainer has played each stratum from saves and filed feedback.

## Phase 15: strata 8 to 10 and the last boss

**Goal:** the descent's end takes the hero's tools away one at a time, then asks for all of them.

- The Hushed Choir: the hush's mute, the six active-item keys refused for a few seconds while the kit works; the thornback, which turns damage back.
- The Rift: the binder's tether, which stuns a hero that leaves its circle; the nullifier's field of silence.
- The Pit: the splitter, which splits in two on death, twice; the bulwark, whose shield turns away what comes at its front.
- A few variants of strata 9 and 10 with a magic resistance of 1, asking for pure damage and the attack.
- Two aspects on an elite pack and three on a map boss; field packs of 5 to 8, elites about 20% of a map.
- The Choirmaster, the Binder Below, and the Unwound on map 100, which changes what it casts at each quarter of its health, drawn from every disable the descent teaches.
- When the Unwound dies the run is won: the game says so, and the hero stays in town with its run saved.

**Done when** each family's abilities hold by their tests, the disable matrix covers mute and the tether, splits and the live cap hold at their worst, the driver walks from the town to the Unwound's kill with the hero near level 30, the won run is saved, recorded sessions replay identically, the frame budget holds, and the maintainer has played each stratum and the Unwound from saves and filed feedback.

## Phase 16: art and audio

**Goal:** the strata look like themselves, and the whole game is heard.

- Isometric sprite art with animation for the hero, every family, and every boss; each variant its family's sprite with a palette and one detail of its own; a floor for each stratum, and obstacle art.
- What the view needs once art is tall: units drawn in depth order, a tall obstacle fading over the hero, and a unit picked by its sprite.
- Every sound the game makes: a tell for every enemy cast, heard as its cast point begins, one sound for each kind of cast, a stratum boss's lower and louder, a projectile's sounding while it flies, and nothing heard that the screen does not also show; the hero's spells, the active items, the interface, and an ambience for each stratum.
- How the game plays does not change.

**Done when** every family, boss, floor, and obstacle has its art, depth order, fading, and picking hold by their tests, every recorded session replays unchanged, the render benchmark passes on each stratum's art under five world draw calls, every enemy ability is heard at its cast point, every sound plays with nothing allocated, the frame budget holds with sound on, and the maintainer has played and filed feedback.

---

## Undecided: difficulty tiers

Whether the descent is walked again at a harder tier, as Diablo II's Normal, Nightmare, and Hell, is an open decision for the maintainer, since either answer reads the vision's second pillar. The proposed answer is none: the descent is the game's one difficulty curve, and what a player who reaches the bottom does next is answered by depth. If tiers come, they come after the fifteenth phase, and a tier changes the roster and the aspects rather than multiplying an enemy's stats.

## Not at any point

Multiplayer, hero selection, quick-cast, order queues, mobile, crafting.

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
| [Disable matrix](./specs/disable-matrix.md) | Every status against Q, W, E, R, D, F, the six active-item keys, movement, and attack | Phase 5; the active-item keys, the self-lift, and ethereal in phase 9; fear, mute, and the tether with their families |
| [The long road](./specs/the-long-road.md) | Its regions, packs, checkpoints, and experience budget | Phase 6 |
| [Item catalogue](./specs/item-catalogue.md) | Armory slots, bases, rarities, affixes, loot tables, the store, and the economy on the long road; the active items and the bank; the catalogue at depth | Phases 8 and 9; to level 30 in phase 12 and to level 100 in phase 13 |
| [The descent](./specs/the-descent.md) | The ten strata, the families and variants of the roster, aspects, bosses, density, and why no enemy is scaled by level | Phase 10, then each stratum's numbers with the phase that builds it |

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
| Phase numbering | Sixteen phases, with phase 4 as combat feel and tuning, phase 6 as the long road, phase 7 as the foundation, phase 8 as loot and the store, phase 9 as active items, phase 10 as the first stratum, the town, and travel, phase 11 as saves, phase 12 as the Undercroft and the Ossuary, phase 13 as loot at depth, phase 14 as strata 4 to 7, phase 15 as strata 8 to 10 and the last boss, and phase 16 as art and audio | This page |
| Working title | Helix | [Product overview](./overview.md) |

---

## Related documentation

- [Product overview](./overview.md) — what the phases add up to
- [Features](./features/README.md) — how each surface behaves once its phase lands
- [Character movement and mechanics](./specs/character-movement-and-mechanics.md) — the acceptance tests phase 1 closes on
- [Definition of done](../workflows/definition-of-done.md) — the per-change checklist inside every phase
- [Architecture decision records](../adr/README.md) — the decisions the phases build on
