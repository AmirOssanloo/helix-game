# Presentation coding standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Coding standards](./coding.md) · [Presentation](../architecture/presentation.md) · [Performance standards](./performance.md)

How code under `src/presentation/` is written so that the world renders in a handful of draw calls, allocates nothing per frame, and never becomes a second copy of the rules. What the layer holds is in [Presentation](../architecture/presentation.md); this page is how to write it.

---

## The one layer with Phaser

**`presentation/` is the layer that uses Phaser; the composition root imports it only to construct the game.** Everything the presentation draws is a view over the simulation's `Readonly` world view, read by reference during sync. It never writes world state: a click becomes a `Command`, and the simulation decides what it means. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) holds the argument.

**Scene classes hold lifetime and composition, nothing else.** A scene creates pools at `create`, calls sync each frame, and releases at shutdown. A rule in a scene — "skip the facing marker when stunned" — is a rule the tests cannot see. The domain sets a flag; the view reads it.

**The camera never reads input directly.** The input mapper turns pointer and key events into commands and camera intents; the camera consumes the intents. One place knows what a middle-drag means.

---

## Quads only

Every visible thing is a tinted quad from the one white atlas baked at boot; the floor tile, copied into it in its own colours, is the one frame that is not white. The reasoning is in [ADR 0001](../adr/0001-phaser-renderer-and-quad-atlas.md); the rules that follow are these.

- **`Graphics` and every `Shape` game object are banned**, including `this.add.rectangle`, `this.add.circle`, `this.add.line`, and the rest. Including in debug overlays. A shape rebuilds its geometry every frame and breaks the quad batch.
- **Colour is a tint, never a second texture.** An archetype colour, a hit flash, a status tint: the `tint` field, with the fill tint mode when the whole quad must go one colour. Colour and mode are two settings: the tint is written every frame, the mode only when it turns.
- **Adding a shape means adding a frame** to the frame list in `content/`, baked at boot. Nothing draws at runtime.
- **Scale a frame down, never up by more than two.** Frames are baked large. A small frame scaled up shows its edge pixels.
- **A line is a stretched pixel frame. A cone is its baked frame at the cast angle. A ring is the ring frame scaled to radius.** [Presentation](../architecture/presentation.md) has the recipes.

---

## Text

**`Text` only for a static label that is never updated inside sync** — a warning banner, a menu heading. **`BitmapText` for anything that changes**: damage numbers, resource values, cooldown digits. A `Text` update rasterises a new texture and breaks the batch; a `BitmapText` update rewrites quad coordinates.

---

## The batch

One texture, one blend mode, no filters, no masks. Each of these is a batch break and a draw call:

| Breaks the batch | Because |
| --- | --- |
| A second texture | The atlas is the one texture. A loaded image drawn from, a `Text` object, a render texture each add one; a painted tile is copied into the atlas at boot and its image dropped |
| A blend mode | Every quad is normal blend. Additive glow is a later art decision, not a prototype convenience |
| A filter or post-processing effect | Ends the batch and starts a pass |
| A mask | Stencil pass |
| A `Text` update inside sync | New texture upload |

A change that adds any of these includes its draw-call count before and after, per [Performance standards](./performance.md#quick-reference).

---

## Views

A view is a pooled Phaser object bound to one entity by id for as long as that entity is inside the camera rectangle.

- **Views write `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, and `visible`, and nothing else.** A view that sets a frame or a depth per frame is doing work the pool did at bind.
- **Interpolate `prev` to `curr` with the alpha the driver supplies.** The world stores both positions; the view never guesses velocity.
- **A view that lies on the ground writes world coordinates.** Its quads come from the ground layer's factory, and it writes the world position, the world heading, and the world size. It never calls the projection and never bakes a frame as a diamond or an ellipse; the ground layer draws it flat.
- **A view that stands up writes screen coordinates.** An icon, a number, or a label comes from the scene's own factory, outside the ground layer, and asks the projection where its world point is drawn, into a scratch it owns. It never goes inside the ground layer, where it would be squashed and turned.
- **The projection is asked, never repeated.** No view, overlay, or input handler writes `x − y` or a half-height of its own; the projection module is the one place the diamond is worked out, and the scale is its constant, never a camera zoom.
- **Depth is a band constant** from the presentation's band table. Never a computed y-sort: everything on the ground lies flat, so nothing needs to be drawn in front of what is behind it, and a per-frame depth write costs a sort. Inside the ground layer the band is honoured by the layer keeping its list sorted, not by the renderer.
- **Nothing is created or destroyed during play.** Pools are filled at scene `create`, sized to the screen plus a margin, and bound and unbound as entities enter and leave the camera rectangle. A pool miss during play is a bug, not a signal to grow.
- **No allocation inside sync.** The same rules as the simulation: index loops, no closures, no literals. [Simulation coding standards](./simulation-coding.md#quick-reference) list the replacements.
- **A HUD element is not a view.** It is bound to no entity and laid out once; each frame it writes what it shows, a bar's fill by its horizontal scale, a wedge by its frame once per step, and a label's text only when the text changes, since a `BitmapText` rewrite is the one write that builds a string.

```typescript
export class FooView {
  bind(id: EntityId): void { /* frame, depth, tint set once */ }
  sync(world: WorldView, alpha: number): void { /* x, y, rotation, scale, tint, alpha, visible */ }
  release(): void { /* … */ }
}
```

---

## The canvas

- **Logical resolution is 1920 by 1080, `Scale.FIT`, auto-centred.** No device-pixel-ratio handling. Flat shapes look fine stretched; when real art arrives that is a separate decision.
- **The Canvas renderer is unsupported.** The game boots under `Phaser.AUTO` and shows a warning banner when the renderer is Canvas, and no code path may depend on Canvas behaviour or test against it.
- **`maxTextures` is one.** The atlas is the only texture, and the setting keeps the batcher on its single-texture path.

---

## Anti-patterns

### A debug overlay drawn with `Graphics`

"It's only debug." It runs every frame the overlay is on, rebuilds geometry, breaks the batch, and the frame time you are trying to read is now the overlay's. Debug overlays are quads from the debug pool.

### A view that watches for its entity to die

A view checking `hp <= 0` and playing a fade. The rule is now in the view; the domain's death handling and the view's disagree the first time a status revives a unit. The domain emits an event; the view reacts to the event.

### Growing a pool on a miss

`if (pool.empty) pool.grow(16)`. It hides the moment the screen has more entities than the pool was sized for, and the growth allocates mid-play. Size the pool to the screen; treat a miss as a bug.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Phaser | Used here; the composition root imports it only to construct the game |
| World state | Read by reference through the `Readonly` view during sync; never written. Input becomes `Command`s |
| Scenes | Lifetime and composition only. No rules |
| Camera and input | The input mapper reads input; the camera consumes intents |
| Drawing | Tinted quads from the boot-time atlas. `Graphics` and `Shape` objects are banned, debug overlays included |
| Colour | Tint, never a second texture. The fill tint mode for a flat flash, written only when it turns |
| A new shape | A new frame in the frame list, baked at boot |
| Scaling | Down freely; up by at most two |
| Text | `Text` for static labels only; `BitmapText` for anything updated in sync |
| The batch | One texture, normal blend, no filters, no masks, no `Text` updates in sync |
| A view writes | `x`, `y`, `rotation`, `scale`, `tint`, `alpha`, `visible` |
| Interpolation | `prev` to `curr` with the driver's alpha |
| On the ground | Quads from the ground layer's factory; write world position, heading, and size; never call the projection or bake a diamond frame |
| Standing up | Quads and labels from the scene's factory, outside the ground layer; ask the projection for the screen point, into a scratch |
| The projection | Asked, never repeated; the scale is its constant, never a camera zoom |
| A HUD element | Not a view: laid out once; a bar's fill by horizontal scale, a wedge by frame once per step, a label only when its text changes |
| Depth | A band constant. Never a computed y-sort; inside the ground layer, the layer's sorted list honours the band |
| Game objects during play | None created or destroyed. Pools filled at `create`, sized to the screen, bound by camera rectangle |
| Allocation in sync | None |
| Canvas | 1920 by 1080, `Scale.FIT`, no DPR handling, `maxTextures` one |
| Canvas renderer | Unsupported: boots with a banner, never depended on, never tested |

---

## Related documentation

- [Presentation](../architecture/presentation.md) — the scenes, atlas, views, and depth bands these rules apply to
- [Commands and events](../architecture/commands-and-events.md) — how input leaves this layer and events arrive
- [ADR 0001 — Phaser renderer and quad atlas](../adr/0001-phaser-renderer-and-quad-atlas.md) — why quads only
- [ADR 0006 — The isometric view](../adr/0006-isometric-view-over-a-square-world.md) — why the ground is projected and the world is not
- [Content authoring standards](./content-authoring.md) — where a new atlas frame is declared
