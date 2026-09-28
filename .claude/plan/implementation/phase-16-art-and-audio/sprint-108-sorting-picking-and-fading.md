# Sprint 108 — Sorting, picking, and fading

**Phase:** 16 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 15 left, and edit a ticket in place with a one-line note if it moved.

> **Nothing here waits on a delivery.** The placeholder frames are drawn at their final heights and bounds, so depth, picking, and fading are measured as the delivered art will be. This is the last sprint of engineering that needs no delivery. Sprint 109 opens on the labels whether or not a delivery has landed.

## Goal

What the view needs once art is tall: units and tall obstacles drawn in depth order, a unit picked by its sprite rather than its footprint, and a tall obstacle fading over the hero. These answer ADR 0006's and ADR 0012's revisit points as ADR 0021 decided.

## Playable outcome

On a stratum with pillars, walk the hero behind one: the pillar fades so the hero shows, and comes back when the hero leaves. Two enemies in a line draw the nearer one in front. Right-click an enemy's head where it stands over another's feet: the one whose sprite is in front is attacked.

---

## Tickets

### P16-S108-T01 — Sorting by projected depth inside the units band

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | P16-S107-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the standing views, units and tall obstacles, drawn in order of projected depth inside the units band each frame, as ADR 0021 decides: `src/presentation/views/depth-bands.ts` keeps its bands, and the units band gains an order of its own. The sort runs over a preallocated list of the views bound this frame, is allocation-free, and breaks ties by id, so two units at one depth never flicker. The other bands keep their fixed order.

**Acceptance:**
- A unit whose feet are nearer the camera draws in front, at every pair of facings and at every corner of the map.
- Two units at one depth keep one order across frames.
- A tall obstacle sorts with the units: a unit behind it is drawn behind it.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, a pack of twelve pulled round a pillar: no unit is drawn over one in front of it, and none flickers.
- The bar: the sort's time per frame at 200 units, read by the panel; no allocation, by its spec; the render benchmark on the densest page, by an agent, under 5 world draw calls.

**Tests:**
- `tests/presentation/views/depth-sort.spec.ts`: the order by depth, the tie-break, obstacles sorted with units, and no allocation across a thousand frames at 200 views.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the units band's order, checked against the code; [performance standards](../../../../docs/standards/performance.md), the sort's share of the frame.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P16-S108-T02 — Picking by the sprite's bounds through the pick port

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/presentation/input/pick-unit.ts` resolves a click against each bound unit's drawn bounds, as ADR 0021 decides, rather than its footprint. Where two sprites overlap, the one drawn in front by T01's order wins. The unit keeps its place in the order `src/presentation/input/pick-order.ts` holds, so Alt still puts a label first (ADR 0012, Q98). The bounds reach the mapper the way the labels' rectangles do: through a fixed record in `src/presentation/input/input-ports.ts`, rewritten each frame, which the mapper reads without asking a view.

**Acceptance:**
- A click on a head standing over another unit's feet picks the one drawn in front.
- A click on the ground between a sprite's feet and its bounds' edge picks the unit.
- With Alt held, a label over a sprite still wins.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, the brute's tall frame over a skirmisher: right clicks on each head attack the unit whose head it is.
- The bar: the mapper allocates nothing per click, by its spec; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/pick-unit.spec.ts`: bounds, overlap by draw order, and a miss outside every bound.
- `tests/presentation/pick-order.spec.ts`: green, the order unchanged, with and without Alt.
- `tests/presentation/input-mapper.spec.ts`: green.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the pick by the sprite, checked against the code; [controls and orders](../../../../docs/product/features/controls-and-orders.md#the-pointer), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P16-S108-T03 — A tall obstacle fades over the hero

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** a tall obstacle whose drawn bounds cover the hero, and which T01's order draws in front of it, fades to the alpha ADR 0021 sets, and returns when it no longer covers. The obstacle view's pool, `src/presentation/views/obstacle.view.ts`, carries the fade over a few frames, set by presentation, never by a tween that allocates. An enemy behind an obstacle does not fade it. A pick through a faded obstacle reaches the unit behind it.

**Acceptance:**
- The fade starts on the first frame the obstacle covers the hero and ends on the first it does not, eased over the frames the record sets.
- Only the hero fades an obstacle.
- A faded obstacle does not take a pick meant for a unit behind it.
- Nothing under `src/domain/` or `src/simulation/` changes; every stored log's checksum is unchanged.
- It plays: in Chrome by an agent, the hero walked behind a pillar and a wall on stratum 7: each fades, and each returns.
- The bar: no allocation, by its spec; alpha changes no batch, so the render benchmark keeps under 5 world draw calls, by an agent.

**Tests:**
- `tests/presentation/obstacle-view.spec.ts`: the fade by cover, its frames, only the hero, and no allocation.
- `tests/presentation/pick-unit.spec.ts`: a pick through a faded obstacle.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), fading, checked against the code; [map and camera](../../../../docs/product/features/map-and-camera.md), what the player sees behind a wall.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Depth order at every corner and facing; no flicker | |
| The sort's time per frame at 200 units | |
| Picking by the sprite, with and without Alt | |
| A tall obstacle fading over the hero, and only the hero | |
| The render benchmark on the densest page, by an agent | |
| Every stored log's checksum unchanged | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The sort costs more than the frame has.** It is read at 200 units by the panel, not assumed. A sort over its share goes back to the architect, and bucketed depth is weighed, before any band is added.
- **A container draws in list order** (ADR 0006). If the record kept standing views in a container, the sort reorders its list and does not set a depth the container ignores. The spec checks the drawn order, not a depth field.
