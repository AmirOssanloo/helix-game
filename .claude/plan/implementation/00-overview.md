# Overview

**Written:** 2026-09-20 · **For:** leadership and the engineer running the plan

One engineer, twenty-five one-week sprints, six phases, one playable build at the end of every phase. This page is the whole plan at one screen's altitude. The sprint files hold the detail.

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
| **Total** | **25** | **25** | |

Twenty-five sprints is about six calendar months for one engineer at full allocation. The confidence band and what moves it are in [Estimation and capacity](./03-estimation-and-capacity.md).

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

---

## Cut-lines

What each phase deliberately does not include, so that nobody adds it by habit. The full list with reasons is in [Deferred](./backlog/deferred.md).

- **Phase 0** builds no gameplay. Not even a moving square.
- **Phase 1** casts nothing. D and F throw stubs that spend mana, run a cast point, start a cooldown, and log. No effects, no damage.
- **Phase 2** has no enemy that moves. The training dummy is the only unit that is not the hero or a summon.
- **Phase 3** ships four archetypes and the dummy, and the isometric view with flat geometry. No enemy abilities, no tiers beyond the field existing, no loot, nothing tall to sort.
- **Phase 4** adds no new content. It tunes what exists and proves headroom.
- **Phase 5** adds no items, no dungeons, no save, no art, no audio.

Not in any phase: multiplayer, hero selection, quick-cast, order queues, mobile.

---

## Capacity assumptions

- One engineer, full time, working with the architect and game-engineer roles for drafting and review.
- Sprints are one week. A sprint holds at most four days of sized work and one day of buffer.
- The reference laptop exists and has Chrome, Firefox, Safari, and Edge installed, because four gates need it.
- Design decisions inside the plan (spell numbers, archetype numbers, the disable matrix) are made by the same person, in sized tickets, not by a separate designer on a separate timeline.

---

## What would change this plan

- **The render benchmark fails in sprint 02.** Everything after it waits until the cause is found. ADR 0001 says the fix is inside Phaser; the plan holds one buffer day for it and a second failure reopens the ADR.
- **The stress test fails in sprint 06 and the cause is the object layout.** ADR 0003 names typed arrays as the fallback. That is a rewrite of every system that touches units, estimated at two sprints, and it would be scheduled before phase 2 begins.
- **A second engineer joins.** The dependency map shows where the plan parallelises: presentation and domain diverge from sprint 02, and content authoring diverges from pipeline work in sprint 10. Two engineers shorten phases 2 and 3 by roughly a third, not a half.
- **The team wants a playable fight sooner.** The honest answer is that sprint 13 is the first fight, and moving it earlier means cutting spells from phase 2 to a minimum of three (one per damage type) and returning for the rest after phase 3. That is a legitimate re-cut and is described in [Deferred](./backlog/deferred.md).
