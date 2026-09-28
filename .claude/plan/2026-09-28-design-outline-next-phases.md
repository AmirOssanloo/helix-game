# Design outline: the phases after phase 8

**Written:** 2026-09-28 · **Author:** the game designer, on the maintainer's delegation · **For:** the delivery strategist, who sizes and orders; the engineering architect, who places

What the design needs from each phase after loot and the store, in the order the design wants them. It does not size or schedule anything. Where order matters for a design reason, the phase says why; where it does not, the delivery strategist is free to move it.

The rules behind every phase are on the product pages, which are the target: [the descent](../../docs/product/specs/the-descent.md), [travel](../../docs/product/features/map-and-camera.md#travel), the [item catalogue's active items](../../docs/product/specs/item-catalogue.md#7-the-active-items), the [status effects](../../docs/product/features/status-effects.md) page, and the [disable matrix](../../docs/product/specs/disable-matrix.md). The decisions are Q98 to Q121 in [Answered](./implementation/backlog/open-questions.md#answered). Q122, difficulty tiers, is open for the maintainer.

The architect's outline of the same day moves some work earlier: the variant-as-row decision and a pack's member list into phase 10, the on-death capability into phase 12, the recording driver for generated maps into phase 10, and file splits at the start of phases 9, 10, and 11. None of these harms the design, and the first three help it; this outline is written with them.

## The order at a glance

| Phase | Title | Why here |
|---|---|---|
| 9 | Active items, with their answers | The hands come first: every boss below is designed around what these eight let the player do |
| 10 | The first stratum: the town, travel, and the generator | A waypoint and a town portal mean nothing on one map, and a generator means nothing without a way between its maps |
| 11 | Saves: the run survives the tab | One stratum is the most a person can playtest in a sitting; nothing deeper can be judged without saves |
| 12 | The Undercroft and the Ossuary: variants, aspects, and the first new problems | The first widening of the roster; family silhouettes come with it, since fifteen families do not read as tinted squares |
| 13 | Loot at depth | Below map 30 the hero's power is flat without deeper affixes, and every stratum after would be tuned against a plateau |
| 14 | Strata 4 to 7: the middle of the descent | Eight families and four stratum bosses, a stratum at a time |
| 15 | Strata 8 to 10 and the last boss | The problems that take the hero's tools away, and the Unwound |
| 16 | Art and audio | The roster is stable enough to draw; the enemy cast tells come earlier, in phase 11, with the audio adapter |

---

## Phase 9 — Active items, with their answers

**The player experience.** Six more keys beside the Skein kit, each a Dota item's decision: lift the hero out of a silence and invoke in the air, blink a net or a stun bolt away, lift an enemy for a Zenith timed to its landing, refresh a whole combo. The hands get busier and the ceiling rises.

**What it adds** (numbers in the item catalogue's section 7.1, all starting values):

- The eight active items: Gyre Sceptre (600, 23 s, 100 mana, 2.5 s lift; on an enemy 60 + 5 × L on landing), Scorchglass (700, 30 s, 120 + 12 × L), Slipknife (1200, 15 s, no mana, locked 3 s after elite or boss damage and under root), Rimeward (ring to 900 over 1.5 s, 30 s, 90 + 9 × L and 40% slow, +4 armour in the bank), Skyfall Maul (2 s cast point, 300 radius, 100 + 10 × L and a 3 s burn), Mainspring (180 s, 250 mana, every clock the hero holds but its own), Fetter Bolas (1100, 18 s, 2 s root in 250), Veilblade (800, 20 s, 3 s ethereal). `L` is the hero's level at commit, so the damaging three stay worth a key a hundred maps down.
- The bank: six places on T, X, V, C, G, Space; a bought item to the first free place, else the inventory; one copy of each; the clock follows the item.
- The rules of Q121: silence leaves the active items alone and stun and lift do not; the self-lift dispels what enemies put on the hero and lets Q, W, E, R through; a blink or a lift disjoints projectiles aimed at the unit; enemies hold under a self-lifted hero; `ethereal` and `invulnerable`. The disable matrix's active-item column and self-lift row, notes 17 to 20.
- Q98's right-click order: a unit before a label, a label first while Alt is held.
- **One stun in flight on the long road**, so Slipknife's answer can be played: the enemy ability `stun_bolt`, a homing projectile at 700 a second, range 900, cast point 0.6 s, 1.5 s stun and 30 physical damage, 8 s cooldown, added to the boss abilities of the skirmisher and the brute, so pack 21 and the last boss throw it. The trapper's net is the other disable in flight the road already has.
- The long road's playtest of the actives starts with a panel grant of 12 000 gold at the spawn, recorded in its log, the one grant it allows: enough for six of the eight but not the dearest six, so the bank is a choice (Q103).

**What it leaves out.** The town portal and the town. Mana burn, mute, and fear, which arrive with the families that cast them. Any active beyond the eight, upgrades, charges, and passives other than Rimeward's armour. Rebinding, so G stays the maintainer's provisional key (Q82).

**Open design questions.** Whether the self-lift's Q, W, E, R window is too strong at 2.5 s, read in the playtest. Whether Slipknife's 1200 reads right on the isometric view (R20). Whether the 3 s lockout from elite and boss damage makes it a tool or a trap in the last boss's chamber.

---

## Phase 10 — The first stratum: the town, travel, and the generator

**The player experience.** The hero leaves the town, walks down ten generated maps of the Nave portal to portal, finds each map's waypoint midway, goes home by town portal to sell and comes back to the same spot, and kills the Gaolmaster to open the way down. Walking a map is the game; the waypoint and the portal save the walk back, never the walk down.

**What it adds:**

- The generator, with the Nave's recipe: two or three regions per map, an arrival point, a waypoint a third to a half along the walk, a portal behind the map boss, 90 to 110 enemies, the long road's bound of 60 near any point, and a floor that reads as the Nave.
- The town: no enemies, the store, its waypoint, the town's end of a portal. The store restocks at the hero's level the first time it opens after a new waypoint.
- Travel, as the [map and camera page](../../docs/product/features/map-and-camera.md#travel) says: the portal down by right click; waypoints reached within 256 and a waypoint screen on the left; the town portal on B, a 3 s channel, a 60 s clock that no cooldown reduction shortens; the map it opens on kept, frozen, and only that one; every other entry making a map fresh from the run's seed and its level.
- Checkpoints on a descent map: the arrival point and the waypoint.
- The Nave's six families at variant I: grunt, runner, archer, tank, frost raider, lancer, their numbers set by the enemy catalogue's method against the hero at the Nave, and a map boss before every portal. A variant is a row of its family (the architect's ADR 0018), so the long road's archetypes stay as they are beside them, and a pack is a list of members, so a map boss's guard can be mixed.
- The level table changes only above level 12, and each Nave variant carries its own, smaller experience, so the descent reaches about level 12 at map 10 while the long road still reaches 12 at its last boss and its stored logs do not move (Q128).
- A recording driver that walks any generated map from its arrival point to its waypoint and portal: the generator's playability check, and what every later balance pass of the descent runs on.
- The Gaolmaster on map 10: `stun_bolt` every six seconds, grunt adds, a slam; its own Legendary piece.
- The long road stays, a playtest map outside the descent, reached from the panel.

**What it leaves out.** Saves: the stratum is a one-sitting playtest, about ninety minutes, with the panel's jump to a map for shorter sessions. Aspects, which come with the second stratum. The stash. A way up by portal.

**Decided since (Q131):** the Nave is rooms and corridors, as Diablo I's Cathedral. The strategist's fallback, open ground if the phase runs over, is accepted only with every region still closed by a choke, and rooms then come with the next stratum built.

**Open design questions.** A map's size in world units against the eight to twelve minutes it should take. The town's layout, small enough to cross in a few seconds.

**Why here.** Travel and the generator are one experience: a waypoint on a single map is a checkpoint, and a hundred maps with no way back is a corridor. Both are needed before the roster grows, since the new families are placed by the generator's recipes.

---

## Phase 11 — Saves: the run survives the tab

**The player experience.** The player closes the tab after a stratum and comes back to the same hero, carrying what it carried, able to go back down by waypoint. Dying costs something now.

**What it adds:**

- One run saved: the seed, the hero, its level and orbs, the inventory, the armory, the bank, gold, the waypoints reached, the town store's stock, and the stash. Saved on entering town, on reaching a waypoint, and on stepping through a portal; resumed in town, never mid-map.
- The stash: a grid in town, 10 by 8 cells, holding items across sessions.
- A death penalty, now that a run lasts: a dead hero loses 10% of the gold it carries, and nothing else; it still comes back at the furthest checkpoint with the map as it was. Starting value; a playtest that finds it toothless or punishing moves it.
- Starting a new run, which gives up the saved one after a confirmation.
- The audio adapter and a placeholder tell for every enemy cast, moved here from phase 16: heard as the cast point begins, one sound per kind of cast, a projectile's tell sounding while it flies (Q132).
- Resuming (Q126, Q127): in town, with a town portal that stood at the save closed, since a save holds no map; health and mana as saved, statuses cleared, every clock ready.

**What it leaves out.** More than one run at a time, since there is one hero and no selection. A corpse run, and losing items on death. Hardcore modes. Saving mid-map.

**Open design questions.** Whether the penalty should also cost experience toward the next level, as Diablo II's did; the design leans no, since gold is the one number a death should touch and experience lost is time lost twice. The stash's size once the catalogue is deep.

**Why here.** A stratum is ten maps at eight to twelve minutes; the second stratum cannot be judged in the same sitting as the first. Every later phase's playtest needs a run that outlives a session (R30).

---

## Phase 12 — The Undercroft and the Ossuary: variants, aspects, and the first new problems

**The player experience.** The long road's disablers return as the Undercroft, the Nave's families come back sharper and differently named, elites wear aspects that make a familiar family read new, and in the Ossuary two things the hero has never met: a leech draining its mana and a bolter's stun in flight.

**What it adds:**

- Families and variants as [the descent](../../docs/product/specs/the-descent.md#3-families-and-variants) sets them: the Undercroft's seven families at I, the Nave's at II and III, the Ossuary's two new ones at I. Each variant its own name, tint, and numbers, with one ability more at III.
- The leech (`mana_burn`, a kiter: 10 mana a second for 5 s, cast point 0.5 s, range 700, 12 s) and the bolter (`stun_bolt`, a holder). Mana burn's rows on the status effects page and the matrix already exist.
- Aspects, the ten of the descent's section 4, one on elite packs and two on map bosses in these strata. Burning needs a status that acts on its holder's death, so that capability arrives here, three phases before the bloater and the splitter reuse it.
- The Hollow Abbess and Marrowleech, each with its Legendary piece.
- **A silhouette for every family**, as atlas frames: fifteen families cannot be told apart as tinted squares, and the fifth pillar's "a map deep in the descent does not look like one near the top" starts failing here without them.
- The catalogue's first step down: bases and affix tiers to item level 30.

**What it leaves out.** Families below the Ossuary. Full sprite art, which waits for the roster to settle.

**Open design questions.** Variant names, one per variant, and whether a variant keeps its family's silhouette with a tint and one detail or needs its own. The aspects' exact numbers against the Undercroft's hero.

---

## Phase 13 — Loot at depth

**The player experience.** Items keep being worth reading all the way down: a drop at map 60 can be something no drop at map 20 could be, and the hero's power keeps growing after its level and orbs top out.

**What it adds:**

- The catalogue at the descent's scale, from research into how Diablo II builds its items (treasure classes, quality levels, affix levels, the quality roll) first, as every catalogue here came before its schema: bases to quality level 100, affix tiers to affix level 100, so a hero at the bottom wears about +100% magic damage and +25% cooldown reduction in all ([the descent](../../docs/product/specs/the-descent.md#7-loot-at-depth)).
- A cap on cooldown reduction from items, 40%, so Mainspring and the kit's clocks stay decisions.
- A Legendary piece for every stratum boss, and the Mythical and Imperial weights read against three hundred items a stratum rather than one road's thirty.
- The economy at depth: base values that rise with quality level, so gold, which rises with the map's level, keeps buying something; the town store stocking up to Epic from the fourth stratum.

**What it leaves out.** Sets, sockets, runewords, lifesteal, and crafting, which is never built. Item comparison in the tooltip, unless the playtest asks.

**Open design questions.** How many bases, and whether any new stat enters, such as mana cost reduction. Whether the upper rarities' weights rise with depth or only the affixes do.

**Why here.** The descent's curve assumes the hero's offence reaches about 7 times its start by map 100, and after level 30 and orb level 7, near map 30, only items move it. Strata tuned before this phase would be tuned against a hero whose power has stopped, and would have to be tuned again.

---

## Phase 14 — Strata 4 to 7: the middle of the descent

**The player experience.** Each stratum a new pair of problems: pulled into a pack of bursting bodies in the Cisterns, a healer and a fear in the Warrens, a dead pack that stands again and a nest that must be broken in the Furnace, a caster that blinks away and burning ground in the Mirrorhalls.

**What it adds:**

- The dragger (`drag_hook`, homing, so it is disjointed), the bloater (`death_burst`), the mender (`mend`), the dreadcaller (`fear`), the raiser (`raise`), the nest (`spawn_brood`, stationary), the flicker (`blink_away`), and the kindler (`ember_trail`), each with its variants as the strata go down.
- Fear: the hero runs from its caster for 1.5 s and takes no order, spell, or throw, and the six active-item keys still work, so Gyre Sceptre sheds it. Its disable-matrix row.
- The Drowned Hook, the Brood Queen, the Kindled King, and the Glass Twins.
- Density to 4 to 7 a field pack and elites to 15% of a map.

**What it leaves out.** The deepest families, and the last boss.

Decided since: death bursts chain, one link a tick, and hit enemies too (Q129); the Glass Twins are two units whose damage mirrors, so their health stays equal and they die together (Q130).

**Open design questions.** The hook's pull: to the dragger's side, or a fixed distance. How many nests a map holds against the live cap.

---

## Phase 15 — Strata 8 to 10 and the last boss

**The player experience.** The descent's end takes the hero's tools away one at a time and asks for the rest: the items muted, damage turned back, a tether that punishes leaving, a field of silence, bodies that split, shields that face the hero. Then the Unwound, which casts everything the descent taught.

**What it adds:**

- The hush (`mute`: the six active-item keys refused for 3 s, answered by the kit), the thornback (`thorns`, carried), the binder (`tether`), the nullifier (`null_field`), the splitter (`split`), and the bulwark (`front_shield`). Mute's and the tether's matrix rows.
- A magic resistance of 1 on a few variants of strata 9 and 10, asking the hero for pure damage and the attack.
- Two aspects on elites and three on map bosses; field packs of 5 to 8 and elites at 20%.
- The Choirmaster, the Binder Below, and the Unwound: four sets of abilities, one per quarter of its health, drawn from every disable the descent teaches.
- What happens after the Unwound dies: the run is won, the game says so, and the hero stays in town with its run saved.

**What it leaves out.** Anything after the bottom, which waits on Q122.

**Open design questions.** The Unwound's kit in numbers, and whether it is fought alone or with the crowd around it. Q122, whether difficulty tiers exist, which is the maintainer's since it reads the second pillar.

---

## Phase 16 — Art and audio

**The player experience.** The strata look like themselves and every cast is heard before it lands.

**What it adds:**

- Isometric sprite art with animation for the hero, every family, and every boss, a floor per stratum, and obstacle art, with what the view needs once art is tall (sorting, occlusion, picking by sprite), as Deferred already lists.
- A sound for every enemy cast, heard as its cast point begins, so a stun bolt or a curse can be answered by ear as well as by eye; the hero's spells, the active items, the interface.

**What it leaves out.** Voice, music beyond ambience, and cutscenes.

**Moved earlier, and the design's verdict.** The strategist moves the audio adapter and a placeholder tell for every enemy cast from here to phase 11. **No design objection; it helps.** The fifth pillar is won by the player who saw the cast coming, and a tell heard as the cast point begins serves it from the first stratum's second playtest on, before the Ossuary's stun bolts and mana burns arrive. The condition is Q132's: a tell per kind of cast, a projectile's tell sounding while it flies, and nothing the screen does not also show. This phase keeps the final sounds, the hero's, the items', the interface, and ambience. Art: each variant is its family's sprite with its own palette and one detail (Q133); the sourcing of sounds and art is the maintainer's (Q132, Q133).

---

## Work this creates

**For the engineering architect to place:** the self-lift as a status of its own with a dispel on rising; `invulnerable` and `ethereal`; the disjoint in the projectile rule; Slipknife's lockout reading the attacker's tier; the enemies' hold under a self-lifted hero; the pick port reading Alt (ADR 0012's paragraph); a kept map beside the town while a portal stands, which ADR 0013 must not read as the map made again; the channel as an order state; the waypoint screen on the input claim; the generator and its recipes; families and variants, where a variant is ideally a row of its family's table rather than a file of its own; aspects as data; the save and what it holds.

**For the delivery strategist to size and order:** everything above, with phase 9's sprint files cut from its sketch as amended here, and the roster sized a stratum at a time as its own line (R34).
