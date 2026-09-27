# Overview

**Written:** 2026-09-20 · **For:** leadership and the engineer running the plan

One engineer, fifty-one one-week sprints, ten phases, one playable build at the end of every phase. The phases were added in steps:
- Phase 6 on 2026-09-26, after phase 5 closed.
- Loot and active items the same day, after phase 6 closed, with active items sketched.
- On 2026-09-27, loot was re-cut twice, with sprint 39, the long road grown, run first, and sprint 40, the pick-up order, run after 33.
- The same day, the maintainer inserted phase 7, the foundation, before loot, which renumbered loot to phase 8 and active items to phase 9. Sprint numbers are global and did not move: the foundation takes 45 to 50 and runs before loot's 39.

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
| 9 · Active items, sketched | 41–44 | 4 | Eight active items, sold only in the store's Misc tab; six keys in a grid beside the kit use them through the ability pipeline |
| **Total** | **51** | **51** | |

Twenty-five sprints was planned as about six calendar months for one engineer at full allocation; phases 0 to 5 closed in six calendar days (the [retrospective](../2026-09-25-retrospective-and-account.md)). The calendar of phases 6, 8, and 9 is set by the maintainer's playtests and approvals, not by engineering days; phase 7 has no playtest, and its calendar is its engineering days and the maintainer's reading of two decision records. The confidence band and what moves it are in [Estimation and capacity](./03-estimation-and-capacity.md).

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
| M14 · Phase 9 gate | end of 44 | Every active item cast through the pipeline from its key; the maintainer has played with them. Was M13 |

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
- **Phase 9** adds the eight active items, bought only in the store, and their keys. No rebinding, no potions on a belt, no second kit, no descent.

Not in any phase: multiplayer, hero selection, quick-cast, order queues, mobile, crafting.

---

## Capacity assumptions

- One engineer, full time, working with the architect and game-engineer roles for drafting and review.
- Sprints are one week. A sprint holds at most four days of sized work and one day of buffer.
- The bar is measured by an agent in Chrome on the development machine, an Apple M1 laptop, and headless in Node, by the maintainer's standing instruction of 2026-09-27. There is no reference laptop, and Firefox, Safari, and Edge are not measured. Was: the reference laptop exists with the four browsers, because four gates need it.
- Design decisions inside the plan (spell numbers, archetype numbers, the disable matrix) are made by the same person, in sized tickets, not by a separate designer on a separate timeline.

---

## What would change this plan

- **The render benchmark fails in sprint 02.** Everything after it waits until the cause is found. ADR 0001 says the fix is inside Phaser; the plan holds one buffer day for it and a second failure reopens the ADR.
- **The stress test fails in sprint 06 and the cause is the object layout.** ADR 0003 names typed arrays as the fallback. That is a rewrite of every system that touches units, estimated at two sprints, and it would be scheduled before phase 2 begins.
- **A second engineer joins.** The dependency map shows where the plan parallelises: presentation and domain diverge from sprint 02, and content authoring diverges from pipeline work in sprint 10. Two engineers shorten phases 2 and 3 by roughly a third, not a half.
- **The team wants a playable fight sooner.** The honest answer is that sprint 13 is the first fight, and moving it earlier means cutting spells from phase 2 to a minimum of three (one per damage type) and returning for the rest after phase 3. That is a legitimate re-cut and is described in [Deferred](./backlog/deferred.md).
