# Sprint 28 — The long road and its cap

**Phase:** 6 · **Sized days:** 4 · **Buffer:** 1

## Goal

The long road exists as a map definition written from the approved spec, every pack places, the obstacles draw by the camera, and a full walk from the spawn to the last boss holds the cap and the tick budget headless.

## Playable outcome

Choose the long road from the panel and walk it from level 1: grunts and runners first, harder regions after, a boss-tier pack at every choke, the live count rising ahead and falling behind. Milestone M9.

---

## Tickets

### P6-S28-T01 — The long road as a map definition

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 2 |
| Depends on | P6-S25-T01 approved, P6-S25-T03, P6-S25-T04, P6-S26-T01, P6-S26-T02, P6-S26-T03 |
| Status | done |

**Build:** `src/content/maps/long-road.def.ts`, id `long_road`, written from the spec, `docs/product/specs/the-long-road.md`, as approved: bounds, about 150 obstacles, the spawn point, every pack dormant, the checkpoints in order. Registered in the maps index so the panel lists it. Adding it moves the content version, so the six stored logs are re-stamped ([testing standards](../../../../docs/standards/testing.md)). The walkability grid is about 125 by 750 cells a radius class, and A* at this size is expected to hold; P6-S28-T03 measures it.

**Acceptance:**
- The registry takes the map; every pack places on the empty map within the placement radius; every checkpoint is walkable.
- A path exists for the hero's radius class from the spawn through every checkpoint in order to the last boss's pack.
- No point on the road has more enemies within the sleep radius than the spec's bound.
- The experience of every pack, at its tier's multiplier, adds to the spec's budget: level 10 at the last boss's kill, under 6520.
- The spec's pack table and budget match the file.

**Tests:**
- `tests/content/maps.spec.ts`: placement, the path through the checkpoints, live near any point, all over the long road.
- `tests/content/catalogues.spec.ts`: the spec's pack rows and budget against the file.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-26:** P6-S26-T03 built the live-near-any-point check in `tests/content/maps.spec.ts` for every registered map, at the tuned `pack_sleep_radius`, reading each map's bound from a table keyed by map id; a map with no row fails. This ticket adds `long_road: 40`, the spec's section 8.

> **Note, 2026-09-26:** Done. The ticket's "about 150 obstacles" is the planning estimate; the spec as written holds 137, two walls at each of five chokes and 127 blocks, and the file follows the spec. `src/content/maps/long-road.def.ts` holds the spec's bounds, obstacles, spawn point, six checkpoints, and 32 dormant packs in its order, and the maps index lists it after the arena. The content version moved from `ea0a5f07` to `1dd59515`; the six stored logs run on the arena and assert nothing the new map decides, so they are re-stamped. `tests/content/maps.spec.ts` places every pack on the empty road, reaches every checkpoint and every pack from the spawn on all three radius classes' layers, stands each pack 256 from every obstacle and 1080 from every checkpoint, and holds the live-near bound at 40, with the spec's peaks of 14 within 2000 and 22 within 3200. `tests/content/catalogues.spec.ts` holds the spec's pack table, each pack's experience, section 7.2 row by row, and the checks of section 7.3 to the file. `tests/content/abilities.spec.ts` builds its registries on the arena alone, since the road's packs name the shipped roster those registries replace. `pnpm check` green, 3583 tests, the stress tier included. The spec's approval by the maintainer is still a box under Waiting on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24; a change named there is made in the page and the file together, and the content tests fail until both agree.

---

### P6-S28-T02 — Obstacle views bound by the camera

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | none |
| Status | done |

**Build:** `OBSTACLE_VIEW_COUNT` in `src/presentation/views/view-counts.ts` is 64 and binds every obstacle at map load, which the long road's 150 would overrun. The obstacle views bind by the camera rectangle as the unit views do, from a pool sized to the screen. The walkability overlay and the floor are checked for the same: neither may draw or bind per cell of a 94 000-cell grid when only a screen of it is visible. The [presentation](../../../../docs/architecture/presentation.md) page's view-pool rule already asks for this; its table row for obstacles follows.

**Acceptance:**
- On the long road, only the obstacles on screen are bound, with no view miss walking the whole road.
- The arena draws as it did.
- `pnpm bench` in Chrome on this commit and the one before, and the panel's frame rate, render ms, and world draw calls standing at the densest choke of the long road, written under this ticket: a box under Waiting on a person.

**Tests:**
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: extended with obstacles.
- The obstacle view spec under `tests/presentation/`: binding by rectangle, no miss on a map with more obstacles than the pool.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-26:** Done. `ObstacleViews` no longer binds a map at load: each frame the play scene hands it the map's obstacles and the camera's world rectangle, and it walks them by index as the checkpoint markers do, putting a quad centred and sized to each rectangle that reaches inside, and hiding the rest; one on screen with no quad free is a miss. `OBSTACLE_VIEW_COUNT` stays 64, now a screen's worth: a sweep of the camera over every centre 100 apart on the long road, framed as the scene frames the 1920 by 1080 canvas, reaches at most 28 of the road's 137. The floor already laid its tiles over the screen, and the walkability overlay already walked only the cells inside the camera's rectangle, so neither changed. The presentation page's binding step, its **Binding** row, and its **View pool size** row name obstacles. `tests/presentation/obstacle-view.spec.ts` holds the bind by rectangle, the edge, the release and rebind, the writes, the miss, the arena drawn whole as before, and the long-road sweep with no miss and the bound count equal to the rectangles inside on every frame; `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts` adds 400 obstacles drawn from a pool of 8. `pnpm check` green, 3593 tests, the stress tier included. The bench in Chrome on this commit and the one before, and the panel's readouts at the densest choke, are a box under Waiting on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24.

---

### P6-S28-T03 — The cap on the long road

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** A long-road case in `tests/simulation/stress.spec.ts`: the hero, every orb at 7 and healed every ten ticks, walks the road checkpoint to checkpoint on move orders, fighting what wakes with the attack and the projectile spells, from the spawn to the last boss. The case asserts the live count at or under 200 at every tick, no `enemy_cap_reached` on the whole walk, the packs behind the hero asleep, and the mean tick under 4 ms; it prints the heaviest tick and the most A* expansions in one tick. Measured as the phase 4 headroom table was, in a production build in plain Node, and written under this ticket. The [performance standard](../../../../docs/standards/performance.md) and the development workflow name the case among the stress cases.

**Acceptance:**
- Green under `pnpm test:budget`: the cap never passed, no pack refused, the mean under budget.
- The production-build reading written here: mean, worst, heaviest tick's events, most A* expansions in a tick.
- If A* at map size is what the worst tick reads, an A* expansion cap is an unplanned ticket in this sprint's buffer, handed to the engineering architect first. It is not built unless the profile says so.

**Tests:**
- `tests/simulation/stress.spec.ts`: the long-road case.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-26:** The Layer row is short by one line of `src/domain/`: the search had no count of what it expands, so the case could not print one. `PathSearch` gains `expanded`, a running count of cells taken off the heap that only grows, and the case reads its difference over each tick. One increment per expanded cell; the four arena cases in the production build read the same before and after, mean 0.47 to 0.64 ms either way. `tests/domain/pathing/astar.spec.ts` holds the count. The kit has no projectile spell, so "the projectile spells" is read as the spells that throw damage at a target, Bolide, Zenith, and Updraft, committed through the effect runner at every orb 7 as the other stress cases commit theirs; the attack goes through the pipeline as an `attack_target` order.

> **Note, 2026-09-26:** Done. The long-road case in `tests/simulation/stress.spec.ts`: the hero on `long_road`, every orb at 7 and healed every ten ticks, attacks the nearest enemy within 800 and throws one of the three spells at it every twenty ticks, and with none near walks to the next checkpoint and last to the last boss's pack, until that pack has no member standing. It asserts the last boss beaten, the live count at every tick at or under the cap less the six a boss's adds bring, so no cast and no placement could meet `enemy_cap_reached`; no pack ever waiting; no pack awake more than the sleep radius behind the hero at the end; the mean tick under 4 ms; and no unit or projectile miss. It prints the slowest tick with its events and expansions, the heaviest tick's events, and the most A* expansions in a tick. Green under `pnpm test:budget`.
>
> **The production-build reading.** Built with Vite, production defines, `__DEV__` false, minified, run in plain Node v24.21.0 on an Apple M1, load 2.4 to 3.2, twenty walks in four processes of five. The harness is not committed; it is this case with a stand-in for Vitest's `expect`. Every walk is the same 8524 ticks, about 4 minutes 44 seconds of play: the hero reaches the last boss at level 9 with no death, at most 10 enemies live and 13 events in the heaviest tick. Mean 0.019 to 0.026 ms. Worst 0.62 to 3.49 ms, median 1.43. The slowest tick of each process's first walk is tick 2, the hero's first path across region 1, 989 expansions on a cold engine, 3.2 to 3.5 ms; on a warm quiet walk it is tick 4562, the most A* expansions in any tick at 1576, 0.62 to 0.65 ms; every other slowest tick expands nothing, 1.3 to 1.9 ms, the collector or the scheduler. Under Vitest's development build the mean is 0.087 to 0.090 ms. The walk never comes near the cap: packs sleep behind the hero faster than it wakes them ahead, and at most one pack stood awake more than 2000 behind it on any tick, walking home. The scripted hero fights only what comes within 800 of its line, so packs off it stay asleep and it reaches level 9, not the spec's 10, which counts every pack.
>
> **A* at map size.** A search is the slowest tick on a warm quiet walk, at 16 percent of the budget, and on the cold first path, under it. On the most conservative reading of the third acceptance row, that the cap is for a tick A* takes past the budget, no expansion cap ticket is added; it is [Q66](../backlog/open-questions.md), decided provisionally and awaiting the maintainer. The performance standard, the testing standard, and the development workflow name the case among the stress cases. `pnpm check` green.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The long road walked by hand from the spawn to the last boss | Waiting on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24: a box in STATUS.md. Headless, the long-road stress case walks it from the spawn to the last boss's kill in 8524 ticks |
| The long-road stress case: mean, worst, heaviest tick, A* expansions | Production build in plain Node, twenty walks: mean 0.019 to 0.026 ms, worst 0.62 to 3.49 ms (median 1.43), heaviest tick 13 events, most A* expansions in a tick 1576 at 0.62 to 0.65 ms warm; at most 10 enemies live, no pack refused, none awake behind at the end. No A* cap, Q66 |
| The bench and the densest choke's readouts in Chrome | Waiting on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24: the P6-S28-T02 box in STATUS.md |
| Milestone M9 | Reached 2026-09-26 on the rows an agent can verify: the long road in the panel's map list, every pack placing on the empty road (T01), and the cap holding on a full walk headless (T03). The walk chosen from the panel by hand waits on a person, deferred |
| Actual days per ticket | T01: 0.5 · T02: 0.5 · T03: 0.5. Sized 4, done in 1.5 |

## Risks in this sprint

- Authoring 150 rectangles and fifty packs by coordinate is slow and easy to get wrong. The content tests catch every error that matters, a walled pack, a broken path, too many near one point, a budget off; lean on them and do not hand-check. A map editor is out.
- T01 waits on the maintainer's approval of the spec. If it has not come by the sprint's start, T02 runs first and T01 moves a day.
