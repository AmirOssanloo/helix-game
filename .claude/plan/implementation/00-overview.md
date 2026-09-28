# Overview

**Written:** 2026-09-20 · **For:** leadership and the engineer running the plan

One engineer, a hundred and eleven one-week sprints, seventeen phases, one playable build at the end of every phase. The phases were added in steps:
- Phase 6 on 2026-09-26, after phase 5 closed.
- Loot and active items the same day, after phase 6 closed, with active items sketched.
- On 2026-09-27, loot was re-cut twice, with sprint 39, the long road grown, run first, and sprint 40, the pick-up order, run after 33.
- The same day, the maintainer inserted phase 7, the foundation, before loot, which renumbered loot to phase 8 and active items to phase 9. Sprint numbers are global and did not move: the foundation takes 45 to 50 and runs before loot's 39.
- On 2026-09-28, after phase 8 closed, the delivery strategist outlined phases 10 to 16, the descent, its saves, and its art. They come from [the design outline](../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../2026-09-28-architecture-outline-next-phases.md). Phase 9 was re-sized from 14.5 to 27.5 the same day and takes sprints 51 to 53 after its 41 to 44.
- **The maintainer approved that outline, phases 9 to 16, on 2026-09-28.** The same day the delivery strategist cut phase 9's sprint files, 41 to 44 and 51 to 53, at the approved 27.5. Phases 10 to 16 stayed sketches in their READMEs.
- **Later on 2026-09-28, at the maintainer's request, phases 10 to 16 were cut into sprint files ahead of their turn,** each to be re-read at its phase's start against what the phase before left. The same day **the maintainer moved all sound and all sourced art to phase 16**: the audio adapter and the enemy cast tells left phase 11, and ADR 0021 left phase 12. Nothing before phase 16 plays a sound or uses a drawn, bought, or commissioned asset; silhouettes and icons are painted in code. When each is needed and the list to order is [the art and audio asset list](../2026-09-28-art-and-audio-asset-list.md). Phase 11 shrank to sprints 66 to 70, sprint 71 is unused, and phase 16 runs 104 to 111.

This page is the whole plan at one screen's altitude. The sprint files hold the detail.

---

## The shape of the work

Helix is built inside out. The simulation comes first because everything else reads it; the hero's feel comes before any spell does damage because the roadmap says so and because a wrong turn rate poisons every fight tuned on top of it; enemies come after spells because a spell is tested against a training dummy and an enemy is tested against spells. Combat feel and tuning get their own phase because the roster that follows multiplies whatever feel exists at that point.

Every phase ends with a build the person at the keyboard can play, tests that are green in Node, and a frame-time check against the bar. The bar is in `docs/product/roadmap.md` and repeated in [Phase exit gates](./04-phase-exit-gates.md).

---

## Phases and sprints

| Phase | Sprints | Weeks | Playable build at the end |
| --- | --- | --- | --- |
| 0 · Foundation | 00–01 | 2 | A blank Phaser canvas boots, the layers exist, lint and the architecture test enforce the import table, a world ticks in Node with pools, a command buffer, and an event ring |
| 1 · Hero mechanics, camera, arena | 02–06 | 5 | The hero moves, turns, paths around obstacles, composes orbs, invokes, and throws stubs on the arena with the HUD, the developer panel, replay, the stress test, and the render benchmark all in place |
| 2 · Spells and attack | 07–11 | 5 | All ten spells and the auto-attack cast against a training dummy with previews, projectiles, zones, summons, statuses, damage numbers, and hit flashes |
| 3 · Enemies | 12–15, 23–24 | 6 | Four archetypes spawn in packs from the panel, aggro, chase, attack, leash, die, and give experience, in a 2:1 isometric view at one fixed scale; two hundred of them chase the hero within budget |
| 4 · Combat feel and tuning | 16–18 | 3 | Fighting reads clearly, every exposed number retunes from the panel with no code change, and the profile shows headroom on every row of the bar |
| 5 · Full enemy roster | 19–22 | 4 | A long roster with abilities, elites, bosses, and the disable matrix; a boss encounter runs within budget |
| 6 · The long road | 25–30 | 6 | A hand-authored map 4000 by 24000 the hero walks from level 1 to about level 10 through five regions of rising difficulty, with checkpoints, packs that wake and sleep, the hero's smaller share of push-out, and a feedback key; the maintainer has played it and the feedback is triaged |
| 7 · The foundation | 45–50 | 6 | The build plays exactly as phase 6 left it, proved by every stored log replaying to the same state checksum at every tick, with a pause screen on Esc as the one new thing; underneath, no module loot must grow is a god object, each layer's door exports only what is used, a map change keeps the hero's run, and the seams loot and active items name are in place |
| 8 · Loot and the store | 39, 31–33, 40, 34–38 | 10 | The long road grown to Diablo II density, about 100 to 130 enemies, pressing the hero far less; enemies on it drop gold and health and mana globes, taken by walking past them, and equipment in seven rarities, picked up by a right click into a 10 by 4 inventory of sized items; ten armory slots worn from the first UI screen change the hero's stats; a store at each checkpoint buys and sells; the road is finished from level 1 to the last boss with no heal or mana from the panel, and the maintainer has played it |
| 9 · Active items, with their answers | 41–44, 51–53 | 7 | Eight active items, sold only in the store's Misc tab, in a bank of six keys beside the kit, each cast through the ability pipeline. The self-lift sheds a silence and lets the hero invoke in the air; a blink or a lift disjoints a `stun_bolt` the long road now throws; the maintainer has played them |
| 10 · The first stratum | 54–65 | 12 | The town, and the Nave's ten generated maps walked portal to portal, with a waypoint on each and a town portal home to the store and back to a map kept frozen; six families and a map boss on every map; the Gaolmaster on map 10, killed by the driver at about level 12; the maintainer has played the town and the first maps |
| 11 · Saves | 66–70 | 5 | The run saved on entering town, at a waypoint, and through a portal, and resumed in town; a stash; 10% of gold lost on death; the maintainer has played the whole first stratum across sittings. Sprint 71 unused |
| 12 · The Undercroft and the Ossuary | 72–80 | 9 | Maps 11 to 30: the long road's disablers as families, the Nave's at variants II and III, ten aspects on elites and bosses, mana burn and a stun in flight, two stratum bosses, a silhouette for every family painted in code, items to level 30 |
| 13 · Loot at depth | 81–85 | 5 | Bases and affixes to level 100, a 40% cap on cooldown reduction from items, a Legendary piece for every stratum boss, and a store stocking Epic from the fourth stratum |
| 14 · Strata 4 to 7 | 86–95 | 10 | Maps 31 to 70: the hook, the burst, the healer, fear, the raiser, the nest, the flicker, and burning ground, with four stratum bosses |
| 15 · Strata 8 to 10 and the last boss | 96–103 | 8 | Maps 71 to 100: mute, thorns, the tether, the silence field, splits, and shields, the Choirmaster, the Binder Below, and the Unwound; the run won and saved |
| 16 · Art and audio | 104–111 | 8 | Isometric sprite art with animation for the hero, every family, and every boss, a floor per stratum, sorting and occlusion, and every sound: the enemy cast tells, the hero, the active items, the interface, and ambience |
| **Total** | **111** | **111** | |

Twenty-five sprints was planned as about six calendar months for one engineer at full allocation; phases 0 to 5 closed in six calendar days (the [retrospective](../2026-09-25-retrospective-and-account.md)). Phases 0 to 8 ran at 0.53 of their sized days. The calendar of every phase with a playtest is set by the maintainer's playtests and approvals, not by engineering days; phase 7 had none. From phase 9 on that is the plan's governing constraint: eight more playtests, and phase 8's still outstanding. [R41](./02-risks-and-hidden-work.md) holds the rules that keep them from piling up. The confidence band and what moves it are in [Estimation and capacity](./03-estimation-and-capacity.md).

---

## The order after phase 8

Decided by the delivery strategist on 2026-09-28 and approved by the maintainer the same day. The phases run in the game designer's order, 9 to 16, with five changes:

| Change | Why |
| --- | --- |
| Phase 9 starts on phase 8's gate as it stands; phase 8's run is played on a build pinned at phase 8's close | Nothing in phase 9's design is set against the loot playtest (Q118). `stun_bolt` changes how the long road plays, so a phase 8 log recorded after it could not replay; the pinned build lets the run come late, and both runs can be played in one sitting |
| No phase starts while two phases' playtests are outstanding | The maintainer's playtests are the calendar; a phase tuned on a verdict nobody has given is tuned twice ([R41](./02-risks-and-hidden-work.md)) |
| Saves stay after the first stratum. Phase 10's playtest is the town and the first maps in one sitting, and the whole stratum is played in phase 11 across sittings | Saves resume in town, which phase 10 builds, so they cannot come first. The engineer's point stands in its other half: a person should not be asked for a ninety-minute session in one tab with no reload. The driver judges the Gaolmaster in phase 10, and the maintainer judges it once a run survives the tab |
| ~~The audio adapter and the enemy cast tells move from phase 16 to phase 11~~ **Reversed by the maintainer later on 2026-09-28: all sound and sourced art are phase 16's** | The adapter costs no more by waiting, and every tell is already shown on screen, so the playtests of phases 11 to 15 lose a second channel, not a rule. Nothing before phase 16 waits on a person to source an asset; the order dates are in the [asset list](../2026-09-28-art-and-audio-asset-list.md) |
| The architect's moves inside phases are all taken | The file splits first in each phase; ADR 0017 on paper and ADR 0018, the pack member list, and the driver in phase 10; travel on authored maps before the generator; ADRs 0019 to 0021's paper in phase 12; the damage function's source point first in phase 15. [The architecture outline](../2026-09-28-architecture-outline-next-phases.md), section 5 |

Phase 13, loot at depth, stays before the middle strata: those strata are tuned against a hero whose power is flat below map 30 without it.

---

## Milestones leadership can hold us to

| Milestone | Sprint | What you can see |
| --- | --- | --- |
| M0 · Toolchain gate | end of 01 | `pnpm check` is green on an empty world; a wrong-direction import fails the build |
| M1 · Render bet proven | end of 02 | The benchmark scene holds 60 fps with under 5 draw calls on the reference laptop; the hero turns and walks |
| M2 · Phase 1 gate | end of 06 | Every acceptance test in the mechanics spec is green by name; a recorded session replays identically; 300 units hold the tick budget |
| M3 · First spell lands | end of 10 | Five spells cast against the dummy with damage numbers |
| M4 · Phase 2 gate | end of 11 | All ten spells, twenty concurrent zones within budget |
| M5 · First fight | end of 13 | A pack aggroes, chases, is killed, and levels the hero |
| M6 · Phase 3 gate | end of 15 | Two hundred enemies chasing within budget, in four browsers, in the isometric view |
| M7 · Phase 4 gate | end of 18 | A designer retunes a spell with no code change; headroom table recorded |
| M8 · Phase 5 gate | end of 22 | Boss encounter within budget; disable matrix green; roster complete |
| M9 · The long road playable | end of 28 | The long road chosen from the panel and walked from the spawn to the last boss; every pack places; the cap holds on a full walk headless |
| M10 · Phase 6 gate | end of 30 | The maintainer has played the long road and filed feedback; the triage is built or deferred; the playtest session replays identically |
| M11 · Phase 7 gate | end of 50, before loot's 39 | Every stored log replays to the same state checksum at every tick with no re-stamp since the stamp was narrowed; `pnpm check` green with no file over about 500 lines but listed exceptions; a new definition kind costs three files; the bar holds with allocations at zero and draw calls unchanged |
| M12 · Loot worn | end of 34 | A pack killed on the long road drops an item, the hero picks it up with a right click, opens the inventory, wears it, and a derived stat moves; no click on the screen walks the hero. Was M11 until 2026-09-27, when phase 7 took it; the walk-over wording was also corrected, since Q87 made items a right click |
| M13 · Phase 8 gate | end of 38 | The long road finished from level 1 to the last boss with no heal or mana from the panel; the store used; the session replays identically; the feedback triaged. Was M12 |
| M14 · Phase 9 gate | end of 53 | Every active item cast through the pipeline from its key. A silenced hero lifts itself free and invokes in the air; a `stun_bolt` on the long road is disjointed by a blink. The maintainer has played with them. Was M13; was the end of 44 until the re-size of 2026-09-28 |
| M15 · Travel on authored maps | end of 59 | The hero opens a town portal on B, goes to town, and comes back to the same spot on a map kept frozen; takes a portal down and a waypoint across; a replay through town and back finds the kept map's checksum unchanged |
| M16 · A generated map walked | end of 62 | The driver walks a seed sweep of generated maps from arrival to waypoint to portal; every map passes its checks or falls back and is counted |
| M17 · Phase 10 gate | end of 65 | The driver walks the Nave from the town to the Gaolmaster's kill at about level 12; the maintainer has played the town and the first maps |
| M18 · Phase 11 gate | end of 70 | Close the tab, come back, and the hero is in town with everything it carried; the maintainer has played the whole first stratum across sittings |
| M19 · Phase 12 gate | end of 80 | Maps 11 to 30 played from saves: fifteen families told apart by their silhouettes, elites with aspects, mana burn, and two stratum bosses |
| M20 · Phase 13 gate | end of 85 | A drop at map 90's level reads as something no drop at map 20 could be; the hero's power index at depth is inside the designer's band |
| M21 · The Cisterns playable | end of 89 | Maps 31 to 40 walked by the driver and the Drowned Hook killed |
| M22 · Phase 14 gate | end of 95 | Strata 4 to 7 played from saves: fear, nests, raises, and burning ground, with four stratum bosses |
| M23 · Phase 15 gate | end of 103 | The Unwound killed and the run won, by the driver from the town and by the maintainer from a save |
| M24 · Phase 16 gate | end of 111 | The descent drawn in sprite art and heard, every enemy cast heard as it begins, with the simulation unchanged |

---

## Cut-lines

What each phase deliberately does not include, so that nobody adds it by habit. The full list with reasons is in [Deferred](./backlog/deferred.md).

- **Phase 0** builds no gameplay. Not even a moving square.
- **Phase 1** casts nothing. D and F throw stubs that spend mana, run a cast point, start a cooldown, and log. No effects, no damage.
- **Phase 2** has no enemy that moves. The training dummy is the only unit that is not the hero or a summon.
- **Phase 3** ships four archetypes and the dummy, and the isometric view with flat geometry. No enemy abilities, no tiers beyond the field existing, no loot, nothing tall to sort.
- **Phase 4** adds no new content. It tunes what exists and proves headroom.
- **Phase 5** adds no items, no dungeons, no save, no art, no audio.
- **Phase 6** adds one hand-authored map and what playing it needs. No loot, no minimap, no generator or *one floor*, no per-level or per-pack enemy scaling, no art, no audio, no saves, no eleventh spell. What the playtest asks for is built only inside a bucket of four sized days; the rest is deferred.
- **Phase 7** changes no behaviour but the pause screen. It does not rewrite to an ECS or split into packages, replace AI flags with behaviour trees, build the inventory screen, port the generator the descent needs, or tune performance beyond the debug overlays. A ticket enters only if it fixes a verified violation, removes a documented drift, or builds a seam a phase 8 or 9 ticket names. What the refactors uncover is built only inside a bucket of one sized day.
- **Phase 8** grows the long road to Diablo II density, then adds loot, the inventory and armory, and a store on it. No active item in the drops or the store, no +1 to an orb, no catalogue at Diablo II's scale, no two-handed weapon, no stash, no restock, no death penalty, no saves, no descent, no town, no art, no audio. What the playtest asks for is built only inside a bucket of two sized days.
- **Phase 9** adds the eight active items, bought only in the store, their keys, Q121's answers (the dispel, `invulnerable`, `ethereal`, the disjoint, Slipknife's lockout, the hold), `stun_bolt` on the long road, and Q98's pick order. No rebinding, no potions on a belt, no second kit, no active item beyond the eight, no mana burn, mute, or fear, no town portal, no descent, no sound. What the playtest asks for is built only inside a bucket of two sized days.
- **Phase 10** adds the town, travel, the generator, and the Nave. No saves, stash, or death penalty, no aspects or variants past I, no stratum but the Nave, no way up by portal, no minimap, no silhouettes, no sound or sourced art. Rooms and corridors are the fallback cut to open ground if the phase runs over. Bucket of three.
- **Phase 11** adds one saved run, the stash, the death penalty, and the start screen. No second run, hardcore, corpse run, item or experience loss, mid-map save, settings screen, music, or any sound. Bucket of two.
- **Phase 12** adds strata 2 and 3, the aspects, mana burn, silhouettes, and items to level 30. No stratum below the Ossuary, no variant IV, no sprite art, no ADR 0021, no sound. Silhouettes are painted in code. Bucket of three.
- **Phase 13** adds the catalogue to level 100. No sets, sockets, runewords, lifesteal, crafting, or item comparison. Bucket of two.
- **Phase 14** adds strata 4 to 7. Nothing from strata 8 to 10. If it runs over, it is cut after the Warrens and the last two strata become a phase of their own. Bucket of three.
- **Phase 15** adds strata 8 to 10 and the Unwound. Nothing after the bottom, which waits on Q122. Bucket of three.
- **Phase 16** adds ADR 0021, sprite art, the audio adapter, and every sound, and changes nothing under the domain or the simulation. No voice, music beyond ambience, or cutscenes. Its engineering runs on placeholders in the final format; only four integration tickets wait on delivered assets, whose source is the maintainer's decision. Bucket of three.

Not in any phase: multiplayer, hero selection, quick-cast, order queues, mobile, crafting. Not yet in any phase: difficulty tiers, which wait on the maintainer's answer to Q122 (proposed: none), and key rebinding, which waits on a settings menu.

---

## Capacity assumptions

- One engineer, full time, working with the architect and game-engineer roles for drafting and review.
- Sprints are one week. A sprint holds at most four days of sized work and one day of buffer.
- The bar is measured by an agent in Chrome on the development machine, an Apple M1 laptop, and headless in Node, by the maintainer's standing instruction of 2026-09-27. There is no reference laptop, and Firefox, Safari, and Edge are not measured. Was: the reference laptop exists with the four browsers, because four gates need it.
- Design decisions inside the plan (spell numbers, archetype numbers, the disable matrix) are made by the same person, in sized tickets, not by a separate designer on a separate timeline.

---

## What would change this plan

- **The maintainer's playtests fall further behind.** Engineering stops at R41's limit, two phases outstanding, rather than building on unplayed ground; the sprints wait, not the scope.
- **The render benchmark fails in sprint 02.** Everything after it waits until the cause is found. ADR 0001 says the fix is inside Phaser; the plan holds one buffer day for it and a second failure reopens the ADR.
- **The stress test fails in sprint 06 and the cause is the object layout.** ADR 0003 names typed arrays as the fallback. That is a rewrite of every system that touches units, estimated at two sprints, and it would be scheduled before phase 2 begins.
- **A second engineer joins.** The dependency map shows where the plan parallelises: presentation and domain diverge from sprint 02, and content authoring diverges from pipeline work in sprint 10. Two engineers shorten phases 2 and 3 by roughly a third, not a half.
- **The team wants a playable fight sooner.** The honest answer is that sprint 13 is the first fight, and moving it earlier means cutting spells from phase 2 to a minimum of three (one per damage type) and returning for the rest after phase 3. That is a legitimate re-cut and is described in [Deferred](./backlog/deferred.md).
