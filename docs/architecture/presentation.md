# Presentation

> **Entry point:** [Architecture](./README.md)
> **See also:** [Commands and events](./commands-and-events.md) · [Developer tools and instrumentation](./devtools-and-instrumentation.md) · [Presentation coding standards](../standards/presentation-coding.md)

The layer that uses Phaser: what it draws, how it draws it cheaply, and how it stays a view of the simulation rather than a second copy of it. The composition root imports Phaser too, only to construct the game; [Layers and the dependency rule](./layers-and-dependency-rule.md#the-dependency-rule) draws that line. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

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

1. Drains the event ring and reacts: a floating number, a flash, a HUD wedge. It comes first, so a hit the ticks just landed is drawn on the frame that follows them rather than the one after.
2. Asks the spatial hash for the entities inside the camera's world rectangle, plus a margin.
3. Binds a view to each — a view already bound stays bound; an entity that entered gets a free view; an entity that left releases its view.
4. Writes `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, and `visible` on each bound view from the entity's state, interpolating position between the entity's previous and current position by the driver's fraction.

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

**The HUD draws the active kit, not a fixed layout.** Its six ability squares are filled from slot descriptors the active form's kit writes for the world view — which ability sits in each slot, whether it is an orb, the composer, or a prepared spell, its clock and the whole length of that clock, its cost, its level, and the disable that blocks its key right now — and the orb display appears only while a descriptor is an orb. A prepared spell's colour comes from the spell table by id. `HudScene` never names a spell or a kit; a kit resolver is a port it is handed, so a second kit is a door test.

**The HUD's elements are not entity views.** They are laid out once at `create` and each frame write what they show: a bar's fill stretches by its horizontal scale, a wedge changes frame once per step of the sweep, and a label is rewritten only when its text changes. The bars, the level, and the experience bar read the world view; nothing on the HUD sums events.

**A refusal is a flash, and a flash ends at a tick.** One record of the six squares' flashes is shared by the two scenes: the play scene's input mapper writes one for a cursor it would not open, which never reaches the buffer to be refused there, and the HUD writes one for every refused-command event that names a slot. Red for mana, grey for a clock, striped for a disable, white for anything else. The end is a tick, so a flash pauses with the simulation.

**A pointer that goes down on the bar is the HUD's.** The HUD scene sits above the play scene and stops the event before the play scene sees it, so a right click on the bar is never a move. A left click on an orb square while a skill point is unspent becomes a spend-skill-point command naming the slot; the kit decides which orb that is.

---

## Colour, flashes, and marks

- **Archetype colour** is a tint on the unit's quad.
- **A hit flash** is a fill-mode tint over the whole of a unit's view, body and marker, then the archetype tint again. One record holds which units were hit and the tick each one's flash stops, beside the views rather than on them, so a view bound halfway through a flash picks it up where it stands and a view released mid-flash loses nothing. The end is a tick, so a flash pauses with the simulation, and the id is kept beside the tick so a unit taking a released unit's slot inherits no flash.
- **An elite outline** is a second quad from the outline frame, bound to the same entity.
- **A status icon** is a baked icon frame — an outlined square with one glyph, one frame per status — drawn above the unit. A unit's icons are their own view kind: one row of quads per unit at the text band, bound while the unit is on screen and wearing anything, one icon per row of its status table in table order. The row holds no clock; a status is on the table or it is not.
- **Damage numbers and every HUD number** are `BitmapText` with the atlas font. `Text` is for a static label that changes rarely — a warning banner, a menu — and is never updated inside the sync.
- **A floating number** is one of a fixed set of those texts at the text band, parked where a hit landed and rising and fading over its whole life. Its rise is the tick count plus the driver's fraction against the tick it was spawned on, so it freezes with a paused simulation and replays the same. Spawning walks the set in order, so more hits at once than the set holds recycles the number whose rise began longest ago and counts it, rather than dropping the newest or making a text mid-play. The set is emptied when a map loads.

No filters, no post-processing, no masks, no blend modes. Each one breaks the batch.

---

## Camera and canvas

The world camera follows the hero with a lerp and clamps to the map bounds. Zoom exists for debugging. The logical canvas is 1920 by 1080, scaled to fit and centred, with no device-pixel-ratio scaling.

The game boots with `Phaser.AUTO`. If the renderer that comes up is Canvas, `BootScene` shows a warning banner; Canvas is unsupported and untested, and no code path depends on it.

Static map geometry drawn as a tile layer is a view kind like any other when a map needs it; the domain map is a grid and never learns how it is drawn.

---

## Input

`presentation/input/` owns the keyboard, the pointer, and the targeting cursor. It turns events into commands with the rules in [Commands and events](./commands-and-events.md), and it draws the cursor's range ring and preview from the atlas: two quads at the ground band in `PlayScene`'s world coordinates, the ring at the spell's range around where the hero is drawn this frame, and the definition's frame under the pointer, or on the hero turned toward the pointer for a direction spell. Both turn red once the pointer is past the range; a direction spell never is. It holds the only piece of state that is not in the world: which slot's cursor is open. Each frame it reads the hero's disable flags and closes a cursor the hero may no longer commit — a slot cursor on a stun or a silence, the attack-move cursor on a stun — at no cost and with no flash.

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
| Phaser | Used here; the composition root imports it only to construct the game |
| Scenes | `BootScene` bakes and checks; `PlayScene` syncs, cameras, inputs, and draws debug; `HudScene` runs in parallel with its own camera |
| A scene | Composes; holds no rules and no entity state |
| The atlas | One white texture baked at boot by `ShapeAtlas`; frame names from the content frame list |
| Colour | Always a runtime tint on a white frame |
| `Shape` and `Graphics` objects | Never, including debug |
| Lines, rings, cones, sweeps | A stretched pixel, a scaled ring, a rotated cone frame, a wedge frame |
| Views | One kind per entity kind, one pool per kind, created at scene start |
| HUD ability squares | Filled from the active kit's slot descriptors: kind, ability, clock and its whole length, cost, level, and the disable blocking it; never a fixed layout; the kit is a resolver port |
| HUD elements | Not entity views: laid out once, then a bar's fill by horizontal scale, a wedge by frame once per step, a label only when its text changes |
| HUD state | Bars and the level read the world view; nothing sums events |
| Refusal flashes | One record of six, shared by the mapper and the HUD; red mana, grey clock, striped disable, white otherwise; ends at a tick |
| HUD input | A pointer down on the bar stops at the HUD scene; a left click on an orb square with a point unspent is a spend-skill-point command naming the slot |
| Targeting preview | Two quads at the ground band in world coordinates: the range ring on the hero, the definition's frame under the pointer; red past the range |
| Binding | By the camera rectangle through the spatial hash, each frame |
| Sync writes | `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, `visible`; never reads a game object back |
| Creating or destroying game objects during play | Never |
| View pool size | What fits on screen plus a margin; a presentation number |
| Interpolation | Previous to current entity position by the driver's fraction |
| The event drain | First of the frame, before the views, so a hit the ticks just landed shows on that frame |
| Depth | Fixed bands: ground 0, obstacles 10, units 20, projectiles 30, air 40, text 50, debug 90 |
| Hit flash | Fill-mode tint over the whole view, from one record of which units were hit and until which tick; never a clock on a view |
| Damage numbers | A fixed set of `BitmapText` at the text band, spawned where a hit landed, rising and fading by the tick count and the fraction; the oldest recycled when the set is full, and counted |
| Elite outline | A second quad bound to the entity |
| Status icons | Their own view kind bound to the unit: a row of quads at the text band, one per status on its table, the frame the definition names |
| Numbers | `BitmapText` with the atlas font; `Text` only for rare static labels, never in the sync |
| Filters, post-processing, masks, blend modes | None |
| Camera | Locked follow with lerp, clamped to map bounds; zoom for debugging |
| Canvas | Logical 1920 by 1080, fit and centred, no device-pixel-ratio scaling |
| Renderer | `Phaser.AUTO`; a Canvas renderer shows a warning and is unsupported |
| Map geometry | A tile-layer view kind when needed; the domain never knows |
| Input | `presentation/input/` owns keys, pointer, and the targeting cursor, and emits commands |
| An open cursor | Closed each frame when the hero's flags refuse what it would send: a slot cursor on stun or silence, the attack-move cursor on stun |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — how the sync reads the view and drains the ring
- [Presentation coding standards](../standards/presentation-coding.md) — the rules a view body follows
- [Developer tools and instrumentation](./devtools-and-instrumentation.md) — the debug band and the render-time ring
- [ADR 0001 — Phaser renderer and quad atlas](../adr/0001-phaser-renderer-and-quad-atlas.md) — why one atlas of quads and no `Graphics`
- [HUD](../product/features/hud.md) — what `HudScene` shows the player
