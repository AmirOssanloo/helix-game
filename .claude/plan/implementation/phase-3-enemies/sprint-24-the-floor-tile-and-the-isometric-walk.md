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
| Status | planned |

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

---

### P3-S24-T03 — All ten spells walked in the isometric view, and the bench

| Field | Value |
| --- | --- |
| Layer | tests, bench, docs |
| Size | 1 |
| Depends on | T01, and T02 if the floor tile has arrived |
| Status | planned |

**Build:** The bench scene draws its quads through the same ground layer and floor, so its figures measure the view the game has. The maintainer walks all ten spells and the auto-attack at the dummy, previews included, and says what feels different now that screen-vertical distances are half their screen-horizontal ones: Clarion's push, Glacier's press and drag, the range rings. A change to a number goes through the panel and, if kept, into a definition in a ticket of its own; this ticket does not retune. The phase 2 gate session in `notes/` is replayed in Node to show the simulation did not move.

**Acceptance:**
- Render benchmark on this branch and on the commit before P3-S23-T01: fps, render ms, draws, heap, recorded in the sprint exit, within the bar.
- The phase 2 gate session replays identically.
- The maintainer's walk is recorded, with each change it asks for as a new ticket or a note that nothing changes.

**Tests:** the replay of `notes/2026-09-23-phase-2-gate-session.json` in Node.

**Definition of done:** Every change · Anything under `src/presentation` (bench rerun).

---

## Sprint exit

| Check | Result |
| --- | --- |
| All ten spells walked in the view by the maintainer | |
| Render benchmark: fps, render ms, draws, heap, on this branch and before P3-S23-T01 | |
| The phase 2 gate session replays identically | |
| Actual days per ticket | T01 0.1 · T02 · T03 |

## Risks in this sprint

- **R20.** The view changes how the spells feel even though no number moved: a range reads longer across the screen than down it. The walk in T03 is where it shows; retunes are tickets of their own, so the view and the numbers are never changed in one commit.
- **The floor tile arrives late.** T02 waits on a person. T01 and T03 do not need it, and the code-painted grid is a correct floor in the meantime, so the sprint can close with T02 moved to sprint 14 if the tile is not in `assets/` by the time T03 is done.
