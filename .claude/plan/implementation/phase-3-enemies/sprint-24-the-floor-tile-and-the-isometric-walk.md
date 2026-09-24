# Sprint 24 — The floor tile and the isometric walk

**Phase:** 3 · **Sized days:** 3 · **Buffer:** 2

> Added 2026-09-23 with [sprint 23](./sprint-23-the-isometric-view-and-its-scale.md), and runs straight after it, before sprint 14. Sprint 14's readability work and sprint 15's two hundred enemies are then built and measured in the view the game keeps.

## Goal

What sprint 23 left in the flat ground layer that should stand upright is projected, the code-painted grid gives way to the maintainer's floor tile, and every spell is walked again in the new view with the bench numbers recorded.

## Playable outcome

The arena as it will stay: the maintainer's floor, numbers and icons standing over the units they belong to, all ten spells thrown at the dummy on the diamonds.

---

## Tickets

### P3-S24-T01 — Numbers, labels, and icons placed by projection

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 1 |
| Depends on | P3-S23-T03 |
| Status | done |

**Build:** Text and icons stay outside the ground layer, so they read upright and are not squashed: the floating numbers, the status icons over a unit, and every debug label (state labels, cell counts, the readouts an overlay prints). Each is placed at the projection of its world anchor, with its screen offset added after projecting, so "above the unit" means up the screen. The pools and bands are unchanged.

**Acceptance:**
- A hit on the dummy raises its number straight up the screen from the dummy's drawn position, at every point of the arena.
- A unit wearing two statuses shows two icons side by side above it, level with the screen, not along a diamond edge.
- No label anywhere is skewed.

**Tests:**
- `tests/presentation/floating-number.spec.ts`, `status-icon-view.spec.ts`, and `overlays.spec.ts` extended: a label's position is the projection of its anchor plus its screen offset.

**Definition of done:** Every change · Anything under `src/presentation`.

> Closed 2026-09-23: sprint 23's T01 had already moved the numbers, the icons, and the labels out of the ground layer and onto the projection, so nothing under `src/` changed. The three specs now run the real projection across the arena as well as the flat one.

---

### P3-S24-T02 — The maintainer's floor tile, painted into the atlas at boot

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1 |
| Depends on | P3-S23-T03, the floor PNG in `assets/` |
| Status | done |

**Build:** One art diamond covers four by four walkability cells, 128 world units a side, drawn 160 by 80 pixels at the chosen scale ([Q29](../backlog/open-questions.md)). The PNG is a whole number of art diamonds in each direction, 160 by 80 at the least and at most 960 wide to fit the atlas, and a diamond centred in it touches the midpoints of its edges; its corners are quarters of the neighbouring diamonds. The boot scene loads it and paints it into the generated atlas as the floor frame, so the world still draws from one texture and `maxTextures` stays one. The code-painted grid goes, and with it the floor's tint, so the tile shows in the colours it was painted. The floor view lays tiles half a tile off the projected origin, so each art diamond's corners fall on the corner of a four-by-four block of cells. A PNG that is not a whole number of art diamonds in each direction fails the boot with a message naming the rule, rather than drawing a floor that drifts off the cells. `presentation.md`, ADR 0006's floor paragraph, ADR 0001's atlas paragraph, the map and camera page, and the vocabulary's **Floor** row say an art diamond covers four by four cells and where the frame comes from.

**Acceptance:**
- The floor is the maintainer's tile, seamless in both directions, and with the walkability overlay on, every art diamond's edges run along cell edges, four cells to a side.
- The world draw count is what sprint 23's exit recorded.
- A PNG that is not a whole number of 160 by 80 art diamonds stops the boot with the rule in the message.

**Tests:**
- `tests/presentation/shape-atlas.spec.ts` extended: the atlas carries the floor frame at the PNG's size; a floor image of another size is refused with the message.
- `tests/presentation/floor-view.spec.ts` extended: a tile's centre projects back to the centre of a four-by-four block of cells, and its corners to a block's corners.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun) · A documentation page.

> Edited 2026-09-23: the art diamond covers four by four cells rather than one, chosen by the maintainer as Q29 when the one-cell diamond, 40 by 20, left no room for detail. The scale does not change.

> Closed 2026-09-23: the floor frame is a `tile` shape naming the image `floor`; the composition root hands the atlas `assets/floor.png`, the boot scene loads it, and the bake sizes the frame from it, copies it in untinted, and drops the loaded texture. The floor view lays the grid half an art diamond right of the projected origin. The frame list is part of the content version, so the recorded phase 1 session is re-stamped. In Chrome: the tile shows seamless, the world draws in 1 and the frame in 2, as sprint 23 recorded. Bench on this branch: 60 fps, 0.4 ms, 1 draw, 1 texture, heap a flat sawtooth of 116 to 124 MB. The tile has no drawn lines, so the art-diamond edges against cell edges are proven by `floor-view.spec.ts` through the real projection and left to the maintainer's eye. The walk found the walkability overlay's pool short of the isometric view, T04.

> Reopened and fixed the same day: the maintainer saw a thin dark line between tiles while moving. The follow leaves the floor at fractional screen positions, and the filter sampled the transparent gutter at a tile's edge. The bake now continues the tile one pixel past each edge, into half the gutter, with the opposite edge's pixels; in Chrome the seams are gone while the hero walks. Spec in `tests/presentation/shape-atlas.spec.ts`.

---

### P3-S24-T03 — All ten spells walked in the isometric view, and the bench

| Field | Value |
| --- | --- |
| Layer | tests, bench, docs |
| Size | 1 |
| Depends on | T01, and T02 if the floor tile has arrived |
| Status | done |

**Build:** The bench scene draws its quads through the same ground layer and floor, so its figures measure the view the game has. The maintainer walks all ten spells and the auto-attack at the dummy, previews included, and says what feels different now that screen-vertical distances are half their screen-horizontal ones: Clarion's push, Glacier's press and drag, the range rings. A change to a number goes through the panel and, if kept, into a definition in a ticket of its own; this ticket does not retune. The phase 2 gate session in `notes/` is replayed in Node to show the simulation did not move.

**Acceptance:**
- Render benchmark on this branch and on the commit before P3-S23-T01: fps, render ms, draws, heap, recorded in the sprint exit, within the bar.
- The phase 2 gate session replays identically.
- The maintainer's walk is recorded, with each change it asks for as a new ticket or a note that nothing changes.

**Tests:** the replay of `notes/2026-09-23-phase-2-gate-session.json` in Node.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun).

> 2026-09-23: the bench now draws the way the play scene does. Units, projectiles, effects, obstacles, and the target lie in the ground layer in world coordinates; the floor tile is laid under the camera from a pool of 320; the numbers and wedges stand at the projection of their world points; the world camera follows the target through the projection. The bench and the replay are recorded in the exit table. The maintainer walked all ten spells and the auto-attack in the view and approved them: the spells and the ranges feel right, and nothing changes.

> Closed 2026-09-23.

---

### P3-S24-T04 — The walkability overlay covers what the isometric view shows

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.25 |
| Depends on | P3-S23-T01 |
| Status | done |

**Build:** The blocked-cell overlay binds from a pool of 1024 quads over the camera's world rectangle. Since the view is isometric, that rectangle is the box around the screen's unprojected corners, about twice the area the screen shows, and with the arena's obstacles in it the pool runs out: in Chrome, with **Walkability grid** on at the spawn point, view misses rise every frame and part of an obstacle is left unshaded. Size the pool for the box, or bind only the cells whose diamonds fall on screen, whichever keeps the overlay free of misses without a per-frame cost.

**Acceptance:**
- With **Walkability grid** on anywhere in the arena, view misses stay flat and every blocked cell on screen is shaded.

**Tests:**
- `tests/presentation/overlays.spec.ts` extended: the blocked cells under a camera rectangle the size of the isometric view's box over the arena's densest corner bind with no miss.

**Definition of done:** Every change · Anything under `src/presentation`.

> Unplanned, 2026-09-23: found walking P3-S24-T02. It dates from sprint 23's view, not from the floor tile, and is its own ticket so the floor change stays one thing.

> Closed 2026-09-23: the overlay still reads the blocked cells from the camera's world box, and now shades one only when its centre is drawn inside the screen rectangle the floor is laid over, 64 pixels past the canvas. Across every camera position over the arena, the box holds up to 2743 blocked cells of the hero's radius class and the screen at most 1531, by the corridor and the east post, so the pool is 2048. The per-cell cost is one projection of a blocked cell's centre, nothing allocated. In Chrome at the spawn point with **Walkability grid** on, view misses stay at 0 and every obstacle on screen is shaded to the screen's edge. The developer tools page says the cell overlays keep to the screen.

---

## Sprint exit

| Check | Result |
| --- | --- |
| All ten spells walked in the view by the maintainer | The maintainer, 2026-09-23: the spells and the ranges feel good; approved, no change asked for |
| Render benchmark: fps, render ms, draws, heap, on this branch and before P3-S23-T01 | Chrome on the Apple M1, 30 s each, heap sampled every second. This branch, bench through the ground layer and floor: 60 fps, render 0.9 to 1.5 ms, 1 draw, heap a flat sawtooth 111 to 118 MB; with `?textures=default`, 16 texture units: 60 fps, 1.3 ms, 1 draw, heap 132 to 144 MB. `09dbd91`, the commit before P3-S23-T01, top-down: 60 fps, 0.6 to 0.9 ms, 1 draw, heap 192 to 215 MB; with `?textures=default`: 60 fps, 0.9 ms, 1 draw, heap 226 to 250 MB. Render time is up about half a millisecond for the floor's tiles and the two containers, well under the 6 ms bar |
| The phase 2 gate session replays identically | Yes. `notes/2026-09-23-phase-2-gate-session.json` replayed in Node on this tree and on `09dbd91`, stamped with each tree's content version, since the only content change between them is the atlas frame list: 2020 ticks each, and a SHA-256 of run scope and every unit, projectile, effect, and zone slot at every tick matches, `61f36e1e…` |
| The floor tile in the arena, by eye | The maintainer, 2026-09-23: approved after the seam fix |
| Actual days per ticket | T01 0.1 · T02 0.5 · T03 0.3 · T04 0.2. Sized 3.25 with T04, done in 1.1 |

## Risks in this sprint

- **R20.** The view changes how the spells feel even though no number moved: a range reads longer across the screen than down it. The walk in T03 is where it shows; retunes are tickets of their own, so the view and the numbers are never changed in one commit.
- **The floor tile arrives late.** T02 waits on a person. T01 and T03 do not need it, and the code-painted grid is a correct floor in the meantime, so the sprint can close with T02 moved to sprint 14 if the tile is not in `assets/` by the time T03 is done.
