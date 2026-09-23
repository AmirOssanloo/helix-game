# ADR 0006 — The view is isometric: a projection in presentation over a square world

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                     |
| ----------------- | ----------------------------------------- |
| **Status**        | Proposed                                  |
| **Date**          | 2026-09-23                                |
| **Deciders**      | The maintainer                            |
| **Supersedes**    | none                                      |
| **Superseded by** | none                                      |

## Context

The game is meant to look like the classic loot-driven action RPGs, which draw their floor as a 2:1 diamond grid. The simulation already works in a square world: square walkability cells of 32 units, a spatial hash, ranges and cones measured in world units, and replays that depend on every one of them. Redrawing the world must not reopen any of that, and the maintainer wants to see the diamonds at a few sizes before one is chosen.

## Decision

The world stays a square plane. The presentation draws it through one projection, for a scale `k` of screen pixels per world unit:

screen x = (x − y) · k, screen y = (x + y) · k / 2

so a 32-unit cell is a diamond `64k` pixels across and half that down. Everything that lies on the ground, the obstacles, zones, units and their facing, projectiles, orbs, the targeting preview, and the debug overlays, is written in world coordinates inside a ground layer of two nested containers that applies the projection. What stands up off the ground, the status icons, the damage numbers, and the labels, is placed where its point is drawn. The camera follows the hero's projected point at zoom 1, and a click is unprojected back to the world point under it. The floor is a diamond grid baked into the atlas, one frame per scale, laid in screen space under the ground layer.

The scale is one of three candidates, a diamond 48, 44, or 40 pixels across (`k` 0.75, 0.6875, 0.625), switched live on the developer panel's **View scale**. The walk that picks one is recorded in open question Q27; this record is accepted at that scale.

## Consequences

### What this makes easy

- The simulation, the content, and every replay are untouched: a session recorded before the change replays the same after it.
- Placeholder geometry needs no new art. A circle lies flat as a 2:1 ellipse and a rectangle as a parallelogram, because the ground layer draws them that way.
- The floor costs no draw call: its frame is in the one atlas, so it joins the batch. The world draws in one call with the floor and without it.

### What this makes hard

- Nothing is tall yet, so the fixed depth bands still order the world. Tall sprite art needs sorting by projected depth inside the units band, which the bands forbid today.
- The world box the camera shows is the box around a rotated rectangle, so views bind for units just off the corners of the screen. The pools are sized to allow for it.
- A container draws its children in list order, not by depth, so the ground layer keeps its list sorted by band.

## Alternatives considered

**An isometric world.** Store positions in screen space, or on a diamond grid. It would change the walkability grid, the hash, every range, and every replay, for a difference the player never sees.

**Each view projected by hand.** Every view writes projected positions and uses frames baked as diamonds and ellipses. It avoids containers, but costs about a day and a half more and puts the projection in every view. It is the fallback if a Phaser release breaks the batch inside containers.

**The scale in the camera's zoom.** A zoom that is not a whole-pixel fit blurs the one-pixel floor lines. Putting the scale in the projection keeps the camera at zoom 1 and the diamonds on whole pixels.

## Revisit when

- Sprite art arrives with tall units or walls that must sort by position.
- A Phaser release changes how containers batch or compose transforms.
- A map needs a floor that is not one repeated tile.

## References

- `src/presentation/camera/projection.ts`: the projection, and `tests/presentation/projection.spec.ts` for it.
- `src/presentation/camera/ground-layer.ts`: the two containers.
- `src/presentation/views/floor.view.ts`: the floor tiles and the void around the bounds.
- The layer rule keeps the projection out of `src/domain/` and `src/simulation/`; the architecture test enforces it.

---

## Related documentation

- [ADR 0001 — Phaser renderer and quad atlas](./0001-phaser-renderer-and-quad-atlas.md) — the one atlas the floor frames join
- [Presentation](../architecture/presentation.md) — the scenes, views, and bands the ground layer holds
- [Map and camera](../product/features/map-and-camera.md) — what the player sees
