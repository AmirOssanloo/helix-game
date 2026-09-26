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
| Status | planned |

**Build:** `OBSTACLE_VIEW_COUNT` in `src/presentation/views/view-counts.ts` is 64 and binds every obstacle at map load, which the long road's 150 would overrun. The obstacle views bind by the camera rectangle as the unit views do, from a pool sized to the screen. The walkability overlay and the floor are checked for the same: neither may draw or bind per cell of a 94 000-cell grid when only a screen of it is visible. The [presentation](../../../../docs/architecture/presentation.md) page's view-pool rule already asks for this; its table row for obstacles follows.

**Acceptance:**
- On the long road, only the obstacles on screen are bound, with no view miss walking the whole road.
- The arena draws as it did.
- `pnpm bench` in Chrome on this commit and the one before, and the panel's frame rate, render ms, and world draw calls standing at the densest choke of the long road, written under this ticket: a box under Waiting on a person.

**Tests:**
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: extended with obstacles.
- The obstacle view spec under `tests/presentation/`: binding by rectangle, no miss on a map with more obstacles than the pool.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P6-S28-T03 — The cap on the long road

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** A long-road case in `tests/simulation/stress.spec.ts`: the hero, every orb at 7 and healed every ten ticks, walks the road checkpoint to checkpoint on move orders, fighting what wakes with the attack and the projectile spells, from the spawn to the last boss. The case asserts the live count at or under 200 at every tick, no `enemy_cap_reached` on the whole walk, the packs behind the hero asleep, and the mean tick under 4 ms; it prints the heaviest tick and the most A* expansions in one tick. Measured as the phase 4 headroom table was, in a production build in plain Node, and written under this ticket. The [performance standard](../../../../docs/standards/performance.md) and the development workflow name the case among the stress cases.

**Acceptance:**
- Green under `pnpm test:budget`: the cap never passed, no pack refused, the mean under budget.
- The production-build reading written here: mean, worst, heaviest tick's events, most A* expansions in a tick.
- If A* at map size is what the worst tick reads, an A* expansion cap is an unplanned ticket in this sprint's buffer, handed to the engineering architect first. It is not built unless the profile says so.

**Tests:**
- `tests/simulation/stress.spec.ts`: the long-road case.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The long road walked by hand from the spawn to the last boss | |
| The long-road stress case: mean, worst, heaviest tick, A* expansions | |
| The bench and the densest choke's readouts in Chrome | |
| Milestone M9 | |
| Actual days per ticket | T01: 0.5 |

## Risks in this sprint

- Authoring 150 rectangles and fifty packs by coordinate is slow and easy to get wrong. The content tests catch every error that matters, a walled pack, a broken path, too many near one point, a budget off; lean on them and do not hand-check. A map editor is out.
- T01 waits on the maintainer's approval of the spec. If it has not come by the sprint's start, T02 runs first and T01 moves a day.
