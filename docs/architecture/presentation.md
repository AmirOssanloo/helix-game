# Presentation

> **Entry point:** [Architecture](./README.md)
> **See also:** [Commands and events](./commands-and-events.md) · [Developer tools and instrumentation](./devtools-and-instrumentation.md) · [Presentation coding standards](../standards/presentation-coding.md)

The layer that uses Phaser: what it draws, how it draws it cheaply, and how it stays a view of the simulation rather than a second copy of it. The composition root imports Phaser too, only to construct the game; [Layers and the dependency rule](./layers-and-dependency-rule.md#the-dependency-rule) draws that line. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**Everything on screen is a tinted white quad from one atlas, positioned by a pooled view that reads the world and never writes it. The floor is the one frame in its own colours.**

One texture means one batch. Pooled views mean no allocation. Reading and never writing means the screen can be wrong without the game being wrong.

---

## Scenes

Three scenes, each with an explicit job and nothing else:

| Scene | Job |
| --- | --- |
| `BootScene` | Loads the floor tile, bakes the shape atlas and the bitmap font, checks the renderer, starts the other two |
| `PlayScene` | Owns the world camera, runs the sync each frame, maps input to commands, and draws the debug band |
| `HudScene` | Runs in parallel with its own camera, reads the world view, draws bars, orbs, ability squares, and numbers |

A scene composes; it holds no rules and no entity state. There is no debug scene: overlays are a depth band inside `PlayScene`, because a parallel scene would need the play camera copied every frame.

---

## The shape atlas

`ShapeAtlas` draws every shape the game needs into one canvas at boot — discs, rings, a square and its outline, a triangle, a single pixel, one cone per angle content declares, a wedge sheet for cooldown sweeps, status icons, and the glyphs of the bitmap font — and registers it as one Phaser texture with named frames. Every one of those frames is white with alpha, and colour is always a runtime tint.

The floor frame is the exception: a tile a person painted, `assets/floor.png`, which the boot scene loads and the bake copies into the same canvas pixel for pixel, in its own colours, and never tints. Its frame in the content list is one art diamond, 160 by 80, the diamond four by four walkability cells make at the view's scale; the image is a whole number of art diamonds in each direction, at most 960 wide to fit the atlas, and the frame is baked at the image's size. An image of any other size stops the boot with that rule in the message, because a floor laid from it would drift off the cells. The bake also continues the tile one pixel past each edge of its frame, into half the gutter, with the pixels of the opposite edge: the camera's follow leaves the floor at fractional screen positions, and a sample there that reached a transparent gutter would draw a dark seam between tiles. Once copied, the loaded image is dropped, so the world still draws from one texture.

The frame list lives in content, not here: the bake reads it, the views read it, a definition names its frame by it. When drawn art arrives, a file replaces the bake and the list stays.

**No `Shape` game objects and no `Graphics` game objects, anywhere, including debug overlays.** A line is a stretched pixel frame. A ring at a radius is the ring frame scaled. A cone is its baked frame rotated. A cooldown sweep is one of the wedge frames. Rotation, scale, alpha, and tint are free properties of a quad; a `Graphics` object rebuilds geometry every frame and breaks the batch.

---

## The projection and the ground

The view is isometric and the world is not. The world is a square plane and stays one; the presentation draws it through one projection, for a scale `k`:

```text
screen x = (x − y) · k
screen y = (x + y) · k / 2
```

so a square walkability cell is a 2:1 diamond. The projection module under `presentation/camera/` is the one place this is worked out: world to screen, screen to world, a world heading to its screen angle, and the box one rectangle becomes in the other space, each writing into an `out` it is handed. The scale is a presentation constant beside it; the camera stays at zoom 1, so the floor's lines fall on whole pixels. [ADR 0006](../adr/0006-isometric-view-over-a-square-world.md) holds why.

**What lies on the ground is written in world coordinates.** `PlayScene` holds a ground layer of two nested containers, the inner turned an eighth of a turn and the outer scaled by `k√2` across and half that down, so a child placed at a world point is drawn at its projected one. Obstacles, checkpoint markers, zones, units and their facing, projectiles, orbs, outlines, the targeting preview, and the debug overlays are its children. None of them knows the projection: a disc frame is drawn as an ellipse, a rectangle as a parallelogram, a rotation as its screen angle.

**What stands up off the ground is placed in screen pixels.** Status icons, floating numbers, and text labels stay outside the ground layer and ask the projection where their world point is drawn, so they stay upright and unsquashed. A view that stands above a unit asks how far above its centre the top of that unit's disc is drawn.

**The floor is tiled in screen space.** One atlas frame holds the painted tile. The floor view lays copies of it edge to edge over the screen rectangle the camera shows, unscaled and untinted, half an art diamond to the right of the projected world origin: a tile's corner is then the centre of an art diamond, and each art diamond's corners fall on the corners of a four-by-four block of walkability cells. The void outside the map's bounds is four black quads on the ground, over the floor. The floor frame joins the world's batch, so it costs no draw.

---

## Views

A view is the pooled Phaser object that draws one entity. There is one view kind per entity kind under `presentation/views/`, and each view kind has its own pool of game objects created once at scene start.

Each render frame, after the driver's ticks, the sync:

1. Drains the event ring and reacts: a floating number, a flash, a HUD wedge. It comes first, so a hit the ticks just landed is drawn on the frame that follows them rather than the one after.
2. Asks the spatial hash for the entities inside the camera's world rectangle. The camera shows a screen rectangle, widened by a margin past the reach of the widest body, its outline, and its icons; its world rectangle is the box around that widened rectangle's four corners unprojected.
3. Keeps each entity whose interpolated position is drawn inside the widened screen rectangle, and binds a view to it — a view already bound stays bound; an entity that entered gets a free view; an entity that left releases its view. The world rectangle is about twice what the screen shows, so binding by it alone would bind entities in its corners that no pixel of the screen shows. The margin means a view is bound before any part of its entity shows, so nothing pops in. Zones are the exception: their pool holds every zone alive and a zone's shape reaches far past its centre, so they bind by the world rectangle alone. Checkpoint markers are the other: a map holds a handful, each a ring as wide as the reach that takes it, tinted by whether it has been reached, so every frame walks them by index and puts a quad from a small set on each whose ring reaches inside the world rectangle; one with no quad left is a miss.
4. Writes `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, and `visible` on each bound view from the entity's state, interpolating position between the entity's previous and current position by the driver's fraction. A view on the ground writes the world position; a view that stands up writes the projected one.

A view never creates or destroys a game object during play. A view never reads a game object back to learn where a unit is. The view pool is sized to what fits on screen plus a margin, not to the simulation's capacity, so the pool is a presentation number and a large map costs the screen nothing. For units and projectiles what fits on screen is the live cap the performance standards set; every pool's size is a named number in one presentation module.

```typescript
// one view kind, one pool, one sync
export const syncFooViews = (world: WorldView, alpha: number): void => { /* bind, write, release */ }
```

---

## Depth

Fixed bands, no per-frame sorting:

| Band | Depth |
| --- | --- |
| Floor | −10 |
| Ground effects and zones | 0 |
| Obstacles | 10 |
| Units | 20 |
| Projectiles | 30 |
| Air effects | 40 |
| Floating text | 50 |
| Debug overlays | 90 |

The HUD is in its own scene and needs no band. Within a band, draw order is pool order. The floor sits in the scene under the ground layer; everything from the ground band to the debug band inside the ground layer is ordered by the layer's list, because a container draws its children in list order whatever their depth says. The layer keeps its list sorted by band, which sorts only when a pool first binds a quad. Nothing sorts by position: everything on the ground lies flat, so nothing stands in front of what is behind it.

**The HUD draws the active kit, not a fixed layout.** Its six ability squares are filled from slot descriptors the active form's kit writes for the world view — which ability sits in each slot, whether it is an orb, the composer, or a prepared spell, its clock and the whole length of that clock, its cost, its level, and the disable that blocks its key right now — and the orb display appears only while a descriptor is an orb. A prepared spell's colour comes from the spell table by id. `HudScene` never names a spell or a kit; a kit resolver is a port it is handed, so a second kit is a door test.

**The HUD's elements are not entity views.** They are laid out once at `create` and each frame write what they show: a bar's fill stretches by its horizontal scale, a wedge changes frame once per step of the sweep, and a label is rewritten only when its text changes. The bars, the level, and the experience bar read the world view; nothing on the HUD sums events.

**A refusal is a flash, and a flash ends at a tick.** One record of the six squares' flashes is shared by the two scenes: the play scene's input mapper writes one for a cursor it would not open, which never reaches the buffer to be refused there, and the HUD writes one for every refused-command event that names a slot. Red for mana, grey for a clock, striped for a disable, white for anything else. The end is a tick, so a flash pauses with the simulation.

**A pointer that goes down on the bar is the HUD's.** The HUD scene sits above the play scene and stops the event before the play scene sees it, so a right click on the bar is never a move. A left click on an orb square while a skill point is unspent becomes a spend-skill-point command naming the slot; the kit decides which orb that is.

---

## Colour, flashes, and marks

- **Archetype colour** is a tint on the unit's quad, and the quad's frame is the one its definition names; both are read once, when the view is bound. The hero, which has no definition, is a white disc.
- **A hit flash** is a fill-mode tint over the whole of a unit's view, body and marker, then the archetype tint again. One record holds which units were hit and the tick each one's flash stops, beside the views rather than on them, so a view bound halfway through a flash picks it up where it stands and a view released mid-flash loses nothing. The end is a tick, so a flash pauses with the simulation, and the id is kept beside the tick so a unit taking a released unit's slot inherits no flash.
- **An elite outline** is a quad from the thick outline frame in the archetype's colour, its own view kind with its own pool, bound while an elite or a boss is on screen and released with it. It follows the unit's position each frame at the units band, wider than the body, and a boss's wider than an elite's so its line reads thicker.
- **A status icon** is a baked icon frame — an outlined square with one glyph, one frame per status — drawn above the unit. A unit's icons are their own view kind: one row of quads per unit at the text band, bound while the unit is on screen and wearing anything, one icon per row of its status table in table order. The row holds no clock; a status is on the table or it is not.
- **Damage numbers and every HUD number** are `BitmapText` with the atlas font. `Text` is for a static label that changes rarely — a warning banner, a menu — and is never updated inside the sync.
- **A floating number** is one of a fixed set of those texts at the text band, parked where a hit landed, tinted when it is spawned with its damage type's colour from one small table beside the set, and rising and fading over its whole life. Its rise is the tick count plus the driver's fraction against the tick it was spawned on, so it freezes with a paused simulation and replays the same. Spawning walks the set in order, so more hits at once than the set holds recycles the number whose rise began longest ago and counts it, rather than dropping the newest or making a text mid-play. The set is sized from a hit rate rather than the screen: every hit the busiest fight it is built for lands inside one number's rise, each on a unit of its own, plus a margin, so a recycle means the fight was busier than that. The set is emptied when a map loads. A word, such as the one a reached checkpoint raises over the hero, rises through the same set the same way, in a tint of its own, and no hit joins it.
- **A hit inside the window joins the number of its damage type already rising for that unit** rather than raising a second one beside it: it adds what it landed for to the number and rewrites it where it stands, and the number keeps the rise and the fade its first hit began, so it leaves on that schedule and the hit after it starts a fresh one. Damage taken every tick would otherwise be a number a tick, overlapping into a block and emptying the set on top of that. Which unit has a number rising, of which type, where, and since when is one record per slot of the unit pool per damage type, the flashes' shape, keyed by the id so a reused slot joins nothing; the set holds the spawn running on each label and refuses a join naming one it has since recycled, faded, or released.

- **Every feedback timing is a tunable, read through the world view.** How long a hit flash and a refusal flash show, how far a floating number rises and over how long it fades, how many steps a cooldown wedge sweeps in, and the camera's lerp live in the tuning table like any other tunable, so a slider moves them, the change is a tuning command in the input log, and a replay shows it again. Presentation reads them from the run scope's tuning state on the world view, never from the content module. A flash and a number take their length when they start, from the event that raised them, so one already showing keeps the length it began with and a change shows from the next one; a rise, a wedge's steps, and the lerp are read each frame. The wedge sweeps in the tuned count of steps, drawn with the sheet's nearest frame and never more steps than the sheet holds. A number's set stays sized for the default life, so a life tuned longer recycles sooner and counts it.

No filters, no post-processing, no masks, no blend modes. Each one breaks the batch.

---

## Camera and canvas

The world camera follows the point the hero is drawn at, with a lerp from the tuning table, and clamps to the screen box around the projected map bounds. A pointer's canvas point goes through the camera's scroll and then the projection back to the world point under it, so a click on a diamond names the square cell it covers. The camera never zooms and the wheel is not bound. The logical canvas is 1920 by 1080, scaled to fit and centred, with no device-pixel-ratio scaling.

The game boots with `Phaser.AUTO`. If the renderer that comes up is Canvas, `BootScene` shows a warning banner; Canvas is unsupported and untested, and no code path depends on it.

Static map geometry drawn as a tile layer is a view kind like any other when a map needs it; the domain map is a grid and never learns how it is drawn.

---

## Input

`presentation/input/` owns the keyboard, the pointer, and the targeting cursor. It turns events into commands with the rules in [Commands and events](./commands-and-events.md), and it draws the cursor's range ring and preview from the atlas: three quads at the ground band in `PlayScene`'s world coordinates, made once — the ring at the spell's range around where the hero is drawn this frame, the shape the definition previews, and a drag line. The definition says which shape and how big: a reticle or a circle sits under the pointer, a rectangle is placed its offset in front of the hero and a cone on the hero, both turned toward the pointer, and a line or a definition that previews nothing draws no shape. A line preview is the ring alone until a held press is dragged, and the ring and the drag line after. A rectangle's length and offset may be level tables, read at the hero's orb levels as the cast would read them. The ring and the shape wear the ability's own tint and turn red once the aim is past the range; a direction spell never is. The aim is the pointer, or the press while one is held.

A vector cursor is aimed with the button held. The button going down on it holds the press — its world point and its canvas point — and sends nothing; the button coming up, over the canvas or off it, sends the cast. Whether the pointer has dragged is one test in `presentation/input/`, a distance in logical canvas pixels from the press, asked by the mapper on the release and by the preview every frame, so what the player sees while holding is what the release sends. While the pointer is dragged, the drag line is a stretched copy of a filled frame from the press to the pointer, in the ability's tint.

The cursor is the only piece of state the layer holds that is not in the world: which slot's cursor is open, and a press held on it. Each frame it reads the hero's state and disable flags and closes a cursor the hero may no longer commit — every cursor on death, and any cursor whose column in the disable matrix says closed under a status the hero wears: a slot cursor on a stun, a silence, or a lift, the attack-move cursor on a stun or a lift — at no cost and with no flash. While a press is held, Escape, a right click, a slot key, and the window losing focus each close the cursor with nothing sent, and S closes it and stops; the right click is the one time a right click is not a move.

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
| The atlas | One texture baked at boot by `ShapeAtlas`; frame names from the content frame list; every frame white but the floor tile, copied in from its image |
| Colour | Always a runtime tint on a white frame; the floor tile is its own colours, untinted |
| `Shape` and `Graphics` objects | Never, including debug |
| Lines, rings, cones, sweeps | A stretched pixel, a scaled ring, a rotated cone frame baked per angle with its apex at the frame's centre, a wedge frame |
| Projection | One module under `presentation/camera/`: world to screen, screen to world, heading to screen angle, rectangle to box, each into an `out`; the scale is a presentation constant, never the camera's zoom |
| On the ground | Obstacles, checkpoint markers, zones, units, projectiles, orbs, outlines, the preview, and debug overlays are children of the ground layer and write world coordinates |
| Standing up | Status icons, floating numbers, and labels stay outside the ground layer and write the projected point |
| The floor | The painted tile, a whole number of 160 by 80 art diamonds, each over four by four cells; tiled unscaled and untinted in screen space over what the camera shows, half an art diamond right of the projected origin; any other size stops the boot; continued a pixel past its frame into the gutter with its opposite edge, so no seam shows; the void is four quads on the ground; no extra draw |
| Views | One kind per entity kind, one pool per kind, created at scene start |
| HUD ability squares | Filled from the active kit's slot descriptors: kind, ability, clock and its whole length, cost, level, and the disable blocking it; never a fixed layout; the kit is a resolver port |
| HUD elements | Not entity views: laid out once, then a bar's fill by horizontal scale, a wedge by frame once per step, a label only when its text changes |
| HUD state | Bars and the level read the world view; nothing sums events |
| Refusal flashes | One record of six, shared by the mapper and the HUD; red mana, grey clock, striped disable, white otherwise; ends at a tick |
| HUD input | A pointer down on the bar stops at the HUD scene; a left click on an orb square with a point unspent is a spend-skill-point command naming the slot |
| Targeting preview | Three quads at the ground band in world coordinates, made once: the range ring on the hero; the shape the definition previews — a reticle or a circle under the pointer, a rectangle its offset in front of the hero or a cone on it, both turned toward the pointer, nothing for a line or a definition that previews none; and the drag line from a held press to the pointer while it is dragged. The ability's tint; the ring and the shape red past the range, judged at the press while one is held |
| Binding | Each frame, the spatial hash asked for the camera's world rectangle, the box around the widened screen's unprojected corners; an entity kept only when its interpolated position is drawn inside the widened screen; zones and checkpoint markers by the world rectangle alone |
| Sync writes | `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, `visible`; never reads a game object back |
| Creating or destroying game objects during play | Never |
| View pool size | What fits on screen plus a margin, the live caps for units and projectiles; a named presentation number, one place for all of them |
| Interpolation | Previous to current entity position by the driver's fraction |
| The event drain | First of the frame, before the views, so a hit the ticks just landed shows on that frame |
| Depth | Fixed bands: floor −10, ground 0, obstacles 10, units 20, projectiles 30, air 40, text 50, debug 90. Inside the ground layer, the list kept sorted by band. Never by position |
| Hit flash | Fill-mode tint over the whole view, from one record of which units were hit and until which tick; never a clock on a view |
| Damage numbers | A fixed set of `BitmapText` at the text band, sized for the busiest fight's hits inside one rise plus a margin, spawned where a hit landed and tinted by damage type from one table, rising and fading by the tick count and the fraction; the oldest recycled when the set is full, and counted; a word rises through the same set, and nothing joins it |
| Joining a number | A hit inside the window adds to the number of its type already rising for that unit and rewrites it in place, keeping the rise and the colour it began with; one record per slot of the unit pool per damage type, keyed by the id, and a join naming a recycled spawn is refused |
| Feedback timings | Tunables read through the world view's tuning state, never the content module: flash lengths, a number's rise and fade, the wedge's steps, the camera's lerp. A flash or a number takes its length when it starts; the rest are read each frame |
| Colour and frame | The definition's tint and frame, read at bind; the hero a white disc |
| Elite outline | Its own view kind: a thick outline quad bound while an elite or boss is on screen, a boss's wider |
| Status icons | Their own view kind bound to the unit: a row of quads at the text band, one per status on its table, the frame the definition names |
| Numbers | `BitmapText` with the atlas font; `Text` only for rare static labels, never in the sync |
| Filters, post-processing, masks, blend modes | None |
| Camera | Locked follow of the hero's projected point with lerp, clamped to the projected bounds' box; a pointer unprojected to the world; no zoom |
| Canvas | Logical 1920 by 1080, fit and centred, no device-pixel-ratio scaling |
| Renderer | `Phaser.AUTO`; a Canvas renderer shows a warning and is unsupported |
| Map geometry | A tile-layer view kind when needed; the domain never knows |
| Input | `presentation/input/` owns keys, pointer, and the targeting cursor, and emits commands; a vector cursor holds its press on the button going down and sends on the button coming up, on the canvas or off it; one drag test, in logical canvas pixels, serves the mapper and the preview |
| An open cursor | Closed each frame when the hero's state or flags refuse what it would send: every cursor on death, and one whose disable matrix cell says closed: a slot cursor on stun, silence, or lift, the attack-move cursor on stun or lift. A held press is closed with nothing sent by Escape, a right click, a slot key, or losing focus, and by S with a stop |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — how the sync reads the view and drains the ring
- [Presentation coding standards](../standards/presentation-coding.md) — the rules a view body follows
- [Developer tools and instrumentation](./devtools-and-instrumentation.md) — the debug band and the render-time ring
- [ADR 0001 — Phaser renderer and quad atlas](../adr/0001-phaser-renderer-and-quad-atlas.md) — why one atlas of quads and no `Graphics`
- [ADR 0006 — The isometric view](../adr/0006-isometric-view-over-a-square-world.md) — why the projection lives here and the world stays square
