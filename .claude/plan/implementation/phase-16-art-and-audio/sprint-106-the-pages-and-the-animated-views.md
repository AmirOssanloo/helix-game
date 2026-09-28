# Sprint 106 — The pages and the animated views

**Phase:** 16 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Nothing here waits on a delivery.** Both tickets draw the placeholder pages of sprint 105, at their final size and frame count.

## Goal

A map load swaps in its stratum's page, and the world draws from it: units stand up at their projected point, face where they head, and walk, attack, and idle by what the world view says, in the placeholder frames the delivery will replace one for one.

## Playable outcome

From the town, take a waypoint to stratum 4 and back. Each map draws from its own page, and the draw calls stay where they were. On stratum 4, the hero and a pack stand up off the floor as painted silhouettes, face their heading in each of the record's facings, walk when they move and stop when they stop, and swing when they attack. A slowed enemy walks slower.

---

## Tickets

### P16-S106-T01 — A stratum's page loaded on a map load, and the bench

| Field | Value |
| --- | --- |
| Layer | presentation, app, bench, tests, docs |
| Size | 2 |
| Depends on | P16-S105-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the page a map needs, loaded as the map loads, by ADR 0021.
- **The swap.** On a transition, the page of the stratum the new map belongs to is made current, and the previous one is dropped from the texture manager, unless the record keeps the town's resident. The load runs on the transition, outside the tick budget's window as a map load already is, and the first frame of the new map draws from its page.
- **What every page holds.** The hero, the items, the icons, the HUD's frames, and the font sit on every page or on a second texture, as the record decides. So the HUD, the screens, and the ground items draw unchanged on every page.
- **One source of frames.** The shape atlas's frames the views still use keep their names. Views look frames up by name, never by page, and a frame missing from the current page is a content test failure, not a blank quad.
- **The bench** draws each placeholder page in turn at its stratum's densest map.

**Acceptance:**
- A transition swaps the page. The heap after ten round trips between the town and stratum 10 is within the record's bound of the heap after one.
- A frame looked up that the current page lacks fails the content test at build time, never at play.
- Draw calls in the world and in the HUD are unchanged from before the swap.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, the town to stratum 1 by waypoint, then 4, then 10, and back to town, with each map drawn from its page and the HUD and a screen unchanged.
- The bar: the render benchmark on each placeholder page, by an agent, under 5 world draw calls; the map load's time against its own budget.

**Tests:**
- `tests/presentation/atlas/stratum-pages.spec.ts`: the page chosen for each map kind and stratum, the previous one dropped, and a frame looked up by name on each.
- `tests/content/art-and-audio-assets.spec.ts`: every frame a view names is on every page that view is drawn on.
- `tests/presentation/shape-atlas.spec.ts`: green, the shape atlas's frames unchanged.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the pages and the swap, checked against the code; [performance standards](../../../../docs/standards/performance.md), the map load's budget if it moves; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P16-S106-T02 — Animated unit views from the pool, standing, facing, and driven by the order state

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 2 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/presentation/views/unit.view.ts` and its pool draw a unit from its family's frames on the current page, as ADR 0021 decides.
- **Standing.** A unit's view leaves the ground layer and stands at its projected point, placed once per frame, with its anchor at the feet. The disc footprint stays in the ground layer where the debug overlays read it.
- **Facing.** The frame's facing is the one nearest the unit's heading, projected to the screen.
- **Animations.** The frame is chosen by the record's rule from the world view's order state: idle, walk, attack windup, and attack backswing, and the ticks the state has run. The walk is paced by the unit's move speed, so a slowed unit walks slower. The cast point and death are sprint 107's.
- **Variants, elites, and bosses.** A variant draws its palette and its detail as the record places them. An elite's and a boss's outline is drawn by the record's rule with no shader. A hit flash stays a fill tint.
- **The hero** is drawn the same way from its own frames on every page.

No allocation in steady state; the pool is unchanged in size.

**Acceptance:**
- Each order state the world view shows draws its animation, at each facing, for a unit of each size class.
- A variant is its family's frames with its palette and detail; an elite keeps its outline; a boss its own.
- The view writes nothing back and reads nothing but the world view.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, on stratum 4, a pack pulled and fought: each unit faces the hero, walks, swings, and stands idle between swings; a slowed unit walks slower.
- The bar: the unit view's allocation count; the render benchmark on stratum 4's page, by an agent, under 5 world draw calls.

**Tests:**
- `tests/presentation/unit-view.spec.ts`: extended to cover the frame for each order state, facing, and tick count; the walk's pace under a slow; a variant's palette and detail; an elite's outline; no allocation across a thousand frames.
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: green, the pools unchanged.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), standing views and how a frame is chosen, checked against the code; [presentation coding standards](../../../../docs/standards/presentation-coding.md), a standing view places itself once a frame.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A page per stratum swapped on a map load; the heap after ten round trips | |
| The render benchmark on each placeholder page, by an agent | |
| Every order state animated, at each facing | |
| Every stored log's checksum unchanged | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Standing views and the ground layer disagree about a point.** A standing view asks the projection for its point, as ADR 0006 says, and the spec checks the feet against the footprint's projected centre at each corner of the map.
- **Texture memory grows with each swap.** The heap is read after ten round trips, not one, and a page is dropped from the texture manager, not only hidden.
