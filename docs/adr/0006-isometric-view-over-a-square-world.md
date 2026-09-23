# ADR 0006 — The view is isometric: a projection in presentation over a square world

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                     |
| ----------------- | ----------------------------------------- |
| **Status**        | Accepted                                  |
| **Date**          | 2026-09-23                                |
| **Deciders**      | The maintainer                            |
| **Supersedes**    | none                                      |
| **Superseded by** | none                                      |

## Context

The game is meant to look like the classic loot-driven action RPGs, which draw their floor as a 2:1 diamond grid. The simulation already works in a square world: square walkability cells of 32 units, a spatial hash, ranges and cones measured in world units, and replays that depend on every one of them. Redrawing the world must not reopen any of that.

Until sprite art arrives, everything is flat-colour geometry: discs, squares, rings, cones, and rectangles. None of it has a height, so none of it needs to stand up off the floor to read.

The player feels the scale directly: it decides how much of the arena is on screen and how far ahead a route can be planned. The maintainer walked three scales, a diamond 48, 44, and 40 pixels across per cell, and chose the last.

## Decision

The world stays a square plane. The presentation draws it through one projection, at a scale `k` of screen pixels per world unit along each screen diagonal:

screen x = (x − y) · k, screen y = (x + y) · k / 2

`k` is 0.625, so a 32-unit walkability cell is a diamond 40 pixels across and 20 down, and the 1920-pixel canvas shows about 2172 world units across. The scale lives in the projection, not in the camera: the camera stays at zoom 1, so the diamonds fall on whole pixels.

Everything that lies on the ground, the obstacles, zones, units and their facing, projectiles, orbs, the targeting preview, and the debug overlays, is written in world coordinates inside a ground layer of two nested containers: the inner turned an eighth of a turn, the outer scaled by `k√2` across and half that down. The placeholder geometry lies flat under it: a disc becomes a 2:1 ellipse, a rectangle a parallelogram, a heading its screen angle. What stands up off the ground, the status icons, the damage numbers, and the labels, is placed in screen pixels at the point the projection gives. The camera follows the hero's projected point, clamps to the box around the projected bounds, and a click is unprojected back to the world point under it.

The floor is a tile a person painted, copied into the atlas at boot and tiled in screen space under the ground layer. One art diamond of it, 160 by 80, covers four by four walkability cells, so there is room for detail a 40 by 20 diamond would not hold; the tiles are laid so each art diamond's corners fall on the corners of a four-by-four block of cells. The void outside the bounds is covered by four quads on the ground.

## Consequences

### What this makes easy

- The simulation, the content, and every replay are untouched: a session recorded before the change replays the same after it, and a range in the mechanics spec means the same distance it did.
- Placeholder geometry needs no new art. The ground layer draws each shape flat, so no frame is baked as a diamond or an ellipse and no view knows the projection.
- The floor costs no draw call. Its frame is in the one atlas, so it joins the batch: the world draws in one call with the floor and without it.
- One constant sets the scale. Nothing else in the presentation names a pixel size for the ground.

### What this makes hard

- **Tall art needs sorting.** Nothing is tall yet, so the fixed depth bands still order the world. A sprite that stands up, a unit with a head or a wall with a face, must be drawn in front of what is behind it on the floor, which means sorting by projected depth inside the units band. That is a per-frame cost the bands forbid today, and it is a new decision when the art arrives.
- **Standing things are placed by hand.** Anything that stands up is outside the ground layer and asks the projection where its point is drawn, once per frame per view.
- **The camera sees a rotated rectangle.** The world box the spatial hash is asked for is the box around the screen's four unprojected corners, larger than what is on screen, so views bind for units just off its corners. The pools are sized to allow for it.
- **A container ignores depth.** It draws its children in list order, so the ground layer keeps its list sorted by band.
- **No zoom.** With the scale in the projection, a zoomed camera would blur the floor art, which is drawn pixel for pixel. The game has one view.

## Alternatives considered

**An isometric world.** Store positions in screen space, or walk a diamond grid. It would change the walkability grid, the hash, every range, and every replay, for a difference the player never sees.

**Each view projected by hand.** Every view writes projected positions and uses frames baked as diamonds and ellipses. It avoids containers, but costs about a day and a half more and puts the projection in every view. It is the fallback if a Phaser release breaks the batch inside containers.

**The scale in the camera's zoom.** A zoom that is not a whole-pixel fit blurs the floor art. Putting the scale in the projection keeps the camera at zoom 1 and the diamonds on whole pixels.

**A larger diamond, 44 or 48 pixels.** Both were walked. They show less of the arena, about 1975 and 1810 world units across, and 44 was the proposed answer; 40 won on the overview and on how far ahead a route can be planned.

## Revisit when

- Sprite art arrives with tall units or walls that must sort by position.
- A Phaser release changes how containers batch or compose transforms.
- A map needs a floor that is not one repeated tile.
- A later map is large enough that the player asks to see more than 40 by 20 shows.

## References

- `src/presentation/camera/projection.ts`: the projection, and `tests/presentation/projection.spec.ts` for it.
- `src/presentation/camera/ground-layer.ts`: the two containers.
- `src/presentation/views/floor.view.ts`: the floor tiles and the void around the bounds.
- The layer rule keeps the projection out of `src/domain/` and `src/simulation/`; the architecture test enforces it.

---

## Related documentation

- [ADR 0001 — Phaser renderer and quad atlas](./0001-phaser-renderer-and-quad-atlas.md) — the one atlas the floor frame joins
- [Presentation](../architecture/presentation.md) — the projection, the ground layer, and the bands
- [Presentation coding standards](../standards/presentation-coding.md) — where a view writes world coordinates and where it projects
- [Map and camera](../product/features/map-and-camera.md) — what the player sees
