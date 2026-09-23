# Sprint 23 — The isometric view and its scale

**Phase:** 3 · **Sized days:** 3.5 · **Buffer:** 1.5

> Added 2026-09-23 at the maintainer's request, after the phase 2 close. It runs after sprint 13 and before sprint 14, and takes the next free sprint number because sprint numbers are never reused or renumbered. Nothing in it touches `src/domain/` or `src/simulation/`, so it can also run beside sprints 12 and 13; T01 can be pulled forward to give the floor tile time to be made. The working-out is in the session that sized it: the world stays a square plane on a square grid, as Diablo's did, and the diamonds are a projection the presentation draws.

## Goal

The arena is drawn as a classic 2:1 diamond grid. The simulation keeps its square world, its 32-unit walkability cells, its ranges, and its replays unchanged; the projection lives in presentation alone. The maintainer walks three candidate scales and picks one, and that scale is the only view the game has: no zoom.

## Playable outcome

Walk the arena on a 2:1 diamond floor, throw every spell, and see the hero, the obstacles, the zones, and the previews lie flat on the diamonds, at the one scale that felt right.

## Decisions this sprint is built on

Settled with the maintainer, 2026-09-23:

- **The projection:** screen x = (x − y) · k, screen y = (x + y) · k / 2, for a scale k the walk picks. The world model, the walkability grid, the spatial hash, and every system are unchanged.
- **Flat until sprite art.** The placeholder geometry lies on the ground: a circle becomes a 2:1 ellipse, a rectangle a parallelogram. Nothing is tall, so the fixed depth bands stand and nothing sorts by position.
- **One zoom.** The camera stays at zoom 1. The scale is baked into the projection so the floor's diamonds are whole pixels; the walk chooses between three candidates that show slightly less than, a little more than, and clearly more than today's 1920 world units across.
- **The floor is the maintainer's PNG, painted into the atlas at boot,** at the size the chosen scale implies. Until it exists, the grid is painted by code.
- **The three candidates:**

| Diamond per 32-unit cell | k | World units across at 1920 px (today 1920) | World units down at 1080 px (today 1080) | Floor PNG, 4 by 4 diamonds |
| --- | --- | --- | --- | --- |
| 48 by 24 | 0.75 | about 1810 | about 2036 | 192 by 96 |
| 44 by 22 | 0.6875 | about 1975 | about 2221 | 176 by 88 |
| 40 by 20 | 0.625 | about 2172 | about 2443 | 160 by 80 |

The proposed answer is 44 by 22, the one slightly wider than today; [Q27](../backlog/open-questions.md) records it until the walk settles it.

---

## Tickets

### P3-S23-T01 — The three scales, painted by code, in a walkable isometric arena

| Field | Value |
| --- | --- |
| Layer | presentation, devtools, tests, docs |
| Size | 2 |
| Depends on | none |
| Status | planned |

**Build:** A projection module under `src/presentation/camera/`: world to screen and screen to world for a scale k, and a world angle to its screen angle, each writing into an `out` argument so nothing allocates per frame. A ground layer in `PlayScene`: two nested containers, the outer scaled by (k√2, k√2 / 2) and the inner turned 45 degrees, so a child placed at a world position lands at its projected one. Every world view lies flat and goes inside it unchanged: obstacles, zones, units and their facing, projectiles, orbs, the targeting preview, and the debug overlays. The camera follows the hero's projected position and clamps to the box around the projected bounds; `worldRect` returns the world box around the four unprojected corners of the view, so culling and view binding still read a world rectangle. The camera lens unprojects, so a click resolves to the same world point it did before. The floor is a 2:1 diamond grid painted by the shape painter into the atlas, one frame per candidate scale, one diamond per walkability cell, drawn in screen space and aligned to the projected world origin; the void outside the bounds is four quads in the ground layer over it. A **View scale** selector on the panel switches between the three candidates live. It is presentation state like the overlay toggles, so it is not a command and is not in the log. ADR 0006 is added as `Proposed` with the three candidates, and the lines that say the view is never isometric (the product overview, the roadmap, the map and camera page) point at it.

**Acceptance:**
- The arena draws as diamonds at each of the three scales; switching on the panel changes the view in the same frame, with the hero where it was.
- A right click on a floor diamond moves the hero to that cell. A cast at a point lands where the pointer was. Glacier's 16-pixel drag still reads in screen pixels.
- The corridor east of the centre reads as a corridor, and the walkability overlay's cells sit exactly on the floor's diamonds.
- Draw calls in the world are recorded with and without the floor. If the floor adds a draw, the number is written in the sprint exit and ADR 0006 says why.
- The maintainer walks the three scales and names one. It is recorded in [Q27](../backlog/open-questions.md) and the waiting row in [Status](../STATUS.md).

**Tests:**
- `tests/presentation/projection.spec.ts`: world to screen and back is the identity at each candidate k; the four corners of a cell land on a diamond of the expected pixel size; a world angle of 0, a quarter turn, and a half turn project to their screen angles.
- `tests/presentation/sync.spec.ts` extended: the world rectangle returned for a view centred on the hero contains every unit whose projection is on screen.
- `tests/presentation/input-mapper.spec.ts` extended: a canvas point resolves through the lens to the unprojected world point.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun) · A developer-panel control · A new decision record.

> The ground layer is the first use of containers in the game. If Phaser 4.2.1 breaks the batch inside one, or composes the transforms wrongly, stop and hand it to the engineering architect before working around it. The fallback, each view projected by hand with rectangles baked as diamond frames, is about 1.5 days more and is R19.

---

### P3-S23-T02 — ADR 0006 accepted at the chosen scale, and the pages it changes

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01, and the scale named in Q27 |
| Status | planned |

**Build:** ADR 0006, *The view is isometric: a projection in presentation over a square world*, accepted with the chosen k. It says why the simulation stays square, why the placeholder geometry lies flat, why the scale lives in the projection and not the camera, and what tall art would add. ADR 0001 is amended where it changes: the floor frame in the atlas, and whether the floor costs a draw. The pages are rewritten as the target: the product overview and roadmap lose isometric from the non-goals; the map and camera page describes the diamond view and drops "a circle is a circle"; the HUD page's bands keep their no-sorting rule with the new reason; `presentation.md` gains the projection module, the ground layer, and the floor; the presentation coding standard says where a view writes world coordinates and where it projects; where-to-look names the projection module.

**Acceptance:**
- No page under `docs/` says the view is top-down orthographic or that isometric is never.
- `pnpm check` is green, including the docs-links spec.

**Tests:** none beyond `tests/docs-links.spec.ts`.

**Definition of done:** Every change · A new decision record · A documentation page.

---

### P3-S23-T03 — Zoom removed at the chosen scale

| Field | Value |
| --- | --- |
| Layer | presentation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Status | planned |

**Build:** The game has one view. The wheel does nothing: the mapper's zoom intent, the `zoom` port, `WorldCamera.zoomBy`, and the zoom limits go. The camera is zoom 1 at the chosen k, a named presentation constant. The two unchosen candidates, their floor frames, and the panel's **View scale** selector go with them. The controls and orders page, the map and camera page, the mechanics spec, and `presentation.md` stop describing zoom.

**Acceptance:**
- A wheel turn over the canvas changes nothing and sends nothing.
- `grep -rni zoom src/` finds only the fixed camera zoom and the HUD scene's comment about its own camera.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: the zoom cases go; a wheel event produces no intent and no command.
- `tests/helpers/doubles/intent-recorder.ts` loses the zoom intent.

**Definition of done:** Every change · Anything under `src/presentation` · A developer-panel control.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The scale the maintainer chose, and the date | |
| World draw calls with and without the floor | |
| Render benchmark: fps, render ms, draws, heap, on this branch and on the commit before T01 | |
| No page under `docs/` describes a top-down or zoomable view | |
| Actual days per ticket | T01 · T02 · T03 |

## Risks in this sprint

- **R19.** Nested containers in Phaser 4.2.1 either break the quad batch or compose rotation and non-uniform scale in the wrong order. T01 finds out on its first day by counting draws and checking a projected cell's corners against the projection module's.
- **The walk does not settle.** If none of the three feels right, the next candidate is any even diamond width: k is the width divided by 64. Pick one more and walk again before T02; do not write the ADR around a scale nobody chose.
