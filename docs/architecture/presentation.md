# Presentation

> **Entry point:** [Architecture](./README.md)
> **See also:** [Commands and events](./commands-and-events.md) · [Developer tools and instrumentation](./devtools-and-instrumentation.md) · [Presentation coding standards](../standards/presentation-coding.md)

The one layer that imports Phaser: what it draws, how it draws it cheaply, and how it stays a view of the simulation rather than a second copy of it. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**Everything on screen is a tinted white quad from one atlas, positioned by a pooled view that reads the world and never writes it.**

One texture means one batch. Pooled views mean no allocation. Reading and never writing means the screen can be wrong without the game being wrong.

---

## Scenes

Three scenes, each with an explicit job and nothing else:

| Scene | Job |
| --- | --- |
| `BootScene` | Bakes the shape atlas and the bitmap font, checks the renderer, starts the other two |
| `PlayScene` | Owns the world camera, runs the sync each frame, maps input to commands, and draws the debug band |
| `HudScene` | Runs in parallel with its own camera, reads the world view, draws bars, orbs, ability squares, and numbers |

A scene composes; it holds no rules and no entity state. There is no debug scene: overlays are a depth band inside `PlayScene`, because a parallel scene would need the play camera copied every frame.

---

## The shape atlas

`ShapeAtlas` draws every shape the game needs into one canvas at boot — discs, rings, a square and its outline, a triangle, a single pixel, one cone per angle content declares, a wedge sheet for cooldown sweeps, status icons, and the glyphs of the bitmap font — and registers it as one Phaser texture with named frames. Every frame is white with alpha. Colour is always a runtime tint.

The frame list lives in content, not here: the bake reads it, the views read it, a definition names its frame by it. When drawn art arrives, a file replaces the bake and the list stays.

**No `Shape` game objects and no `Graphics` game objects, anywhere, including debug overlays.** A line is a stretched pixel frame. A ring at a radius is the ring frame scaled. A cone is its baked frame rotated. A cooldown sweep is one of the wedge frames. Rotation, scale, alpha, and tint are free properties of a quad; a `Graphics` object rebuilds geometry every frame and breaks the batch.

---

## Views

A view is the pooled Phaser object that draws one entity. There is one view kind per entity kind under `presentation/views/`, and each view kind has its own pool of game objects created once at scene start.

Each render frame, after the driver's ticks, the sync:

1. Asks the spatial hash for the entities inside the camera's world rectangle, plus a margin.
2. Binds a view to each — a view already bound stays bound; an entity that entered gets a free view; an entity that left releases its view.
3. Writes `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, and `visible` on each bound view from the entity's state, interpolating position between the entity's previous and current position by the driver's fraction.
4. Drains the event ring and reacts: a floating number, a flash, a HUD wedge.

A view never creates or destroys a game object during play. A view never reads a game object back to learn where a unit is. The view pool is sized to what fits on screen plus a margin, not to the simulation's capacity, so the pool is a presentation number and a large map costs the screen nothing.

```typescript
// one view kind, one pool, one sync
export const syncFooViews = (world: WorldView, alpha: number): void => { /* bind, write, release */ }
```

---

## Depth

Fixed bands, no per-frame sorting:

| Band | Depth |
| --- | --- |
| Ground effects and zones | 0 |
| Obstacles | 10 |
| Units | 20 |
| Projectiles | 30 |
| Air effects | 40 |
| Floating text | 50 |
| Debug overlays | 90 |

The HUD is in its own scene and needs no band. Within a band, draw order is pool order.

**The HUD draws the active kit, not a fixed layout.** Its six ability squares are filled from slot descriptors the world view exposes for the hero's active form — which ability sits in each slot, its clock, its cost, and whether it is a composer or a prepared spell — and the orb display appears only when the active kit has orbs. `HudScene` never names a spell or a kit.

---

## Colour, flashes, and marks

- **Archetype colour** is a tint on the unit's quad.
- **A hit flash** is a fill-mode tint for a few frames, then the archetype tint again.
- **An elite outline** is a second quad from the outline frame, bound to the same entity.
- **A status icon** is a baked icon frame drawn above the unit.
- **Damage numbers and every HUD number** are `BitmapText` with the atlas font. `Text` is for a static label that changes rarely — a warning banner, a menu — and is never updated inside the sync.

No filters, no post-processing, no masks, no blend modes. Each one breaks the batch.

---

## Camera and canvas

The world camera follows the hero with a lerp and clamps to the map bounds. Zoom exists for debugging. The logical canvas is 1920 by 1080, scaled to fit and centred, with no device-pixel-ratio scaling.

The game boots with `Phaser.AUTO`. If the renderer that comes up is Canvas, `BootScene` shows a warning banner; Canvas is unsupported and untested, and no code path depends on it.

Static map geometry drawn as a tile layer is a view kind like any other when a map needs it; the domain map is a grid and never learns how it is drawn.

---

## Input

`presentation/input/` owns the keyboard, the pointer, and the targeting cursor. It turns events into commands with the rules in [Commands and events](./commands-and-events.md), and it draws the cursor's range ring and preview from the atlas. It holds the only piece of state that is not in the world: which slot's cursor is open.

---

## Anti-patterns

### A `Graphics` object for a debug circle

"It's only debug." It rebuilds its geometry every frame, sits in its own batch family, and the frame-time overlay now measures the overlay. The ring frame, scaled, from the debug pool.

### A view that owns state

A view that counts down its own flash timer and decides when to stop. Pause the simulation and the flash keeps going; replay and it never happened. The flash's end is an event or a field on the entity; the view reads it.

### A texture per colour

Baking a red square and a blue square. Two textures, two batches, and the third colour is a third bake. One white frame, one tint.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Phaser | Imported here and nowhere else |
| Scenes | `BootScene` bakes and checks; `PlayScene` syncs, cameras, inputs, and draws debug; `HudScene` runs in parallel with its own camera |
| A scene | Composes; holds no rules and no entity state |
| The atlas | One white texture baked at boot by `ShapeAtlas`; frame names from the content frame list |
| Colour | Always a runtime tint on a white frame |
| `Shape` and `Graphics` objects | Never, including debug |
| Lines, rings, cones, sweeps | A stretched pixel, a scaled ring, a rotated cone frame, a wedge frame |
| Views | One kind per entity kind, one pool per kind, created at scene start |
| HUD ability squares | Filled from the active kit's slot descriptors in the world view; never a fixed layout |
| Binding | By the camera rectangle through the spatial hash, each frame |
| Sync writes | `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, `visible`; never reads a game object back |
| Creating or destroying game objects during play | Never |
| View pool size | What fits on screen plus a margin; a presentation number |
| Interpolation | Previous to current entity position by the driver's fraction |
| Depth | Fixed bands: ground 0, obstacles 10, units 20, projectiles 30, air 40, text 50, debug 90 |
| Hit flash | Fill-mode tint for a few frames |
| Elite outline, status icon | A second quad bound to the entity |
| Numbers | `BitmapText` with the atlas font; `Text` only for rare static labels, never in the sync |
| Filters, post-processing, masks, blend modes | None |
| Camera | Locked follow with lerp, clamped to map bounds; zoom for debugging |
| Canvas | Logical 1920 by 1080, fit and centred, no device-pixel-ratio scaling |
| Renderer | `Phaser.AUTO`; a Canvas renderer shows a warning and is unsupported |
| Map geometry | A tile-layer view kind when needed; the domain never knows |
| Input | `presentation/input/` owns keys, pointer, and the targeting cursor, and emits commands |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — how the sync reads the view and drains the ring
- [Presentation coding standards](../standards/presentation-coding.md) — the rules a view body follows
- [Developer tools and instrumentation](./devtools-and-instrumentation.md) — the debug band and the render-time ring
- [ADR 0001 — Phaser renderer and quad atlas](../adr/0001-phaser-renderer-and-quad-atlas.md) — why one atlas of quads and no `Graphics`
- [HUD](../product/features/hud.md) — what `HudScene` shows the player
