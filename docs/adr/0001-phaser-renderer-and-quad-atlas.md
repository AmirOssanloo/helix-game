# ADR 0001 — Phaser 4 draws everything as tinted quads from one generated atlas

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Status**        | Accepted                                               |
| **Date**          | 2026-09-19                                             |
| **Deciders**      | Amir Ossanloo, with the engineering architect          |
| **Supersedes**    | None                                                   |
| **Superseded by** | None                                                   |

## Context

Helix is a browser game whose art, until real sprites arrive, is flat-colour geometry: the hero is a circle with a triangle, enemies are squares, projectiles are discs, spell areas are rings, cones, and rotated rectangles, and the HUD is bars and wedges. Several hundred of these move every frame, and the budget is a stable 60 fps on a mid-range laptop with integrated graphics, with around 300 unit shapes and 100 projectiles alive at once.

The first question asked was whether Phaser has a renderer at all, or whether we should reach for PixiJS. Phaser 2 was built on PixiJS; Phaser 3 and 4 are not. Phaser 4 ships its own WebGL renderer built on composable render nodes, with index-buffer quads, WebGL2 support, multi-texture batching, and automatic context restoration. Its Canvas renderer still boots but is deprecated by Phaser Studio and supports none of the version 4 rendering features. Choosing PixiJS would therefore mean not using Phaser, and rewriting scenes, camera, input, tilemaps, timers, tweens, and text on top of a bare renderer.

The second question was how to draw flat geometry fast enough on whichever renderer we keep, and that is where the real cost lives. At our object counts the render cost is on the CPU, not the GPU, and three things drive it:

- **Per-object vertex work.** A sprite is four transformed vertices and no allocation. A circle drawn as a Shape object is about 102 vertices and about 100 triangles, and every frame the renderer transforms every one of those vertices on the CPU and allocates two fresh arrays per fill. Three hundred circle Shapes cost roughly thirty thousand vertex transforms and six hundred allocations a frame before the GPU does anything. A Graphics object is worse: its command buffer is replayed and re-triangulated on every render.
- **Allocation.** Garbage collection pauses eat whole frames. A per-frame allocation in the draw path is a stutter waiting for a busy moment.
- **Batch breaks.** Sprites, images, bitmap text, and meshes share one batch family; Graphics and Shapes share another. Every switch of family, texture, or blend mode flushes the batch and costs a draw call.

Shape objects also cannot tint, so a hit flash or an elite outline on a Shape means a second object rather than a property write.

The person who feels this is the player, as a hitch in the middle of a combo, and the engineer who has to find which of four hundred objects broke the batch.

## Decision

**Phaser 4.2.1's built-in WebGL renderer draws the game, and everything it draws is a tinted quad from one texture generated at boot.**

The game config uses `Phaser.AUTO` with `render: { maxTextures: 1 }`. There is no other engine, no custom renderer, and no escape hatch: if a benchmark fails, the fix is inside Phaser.

A `ShapeAtlas` module draws every shape the game needs onto one HTML canvas at boot, white with alpha and anti-aliased edges, and registers it as one Phaser texture with named frames. The frame names are fixed in a definition list under `content/`, so a disk atlas with the same names can replace the bake when sprite art arrives without touching game code. The frames are: a disc; thin and thick rings; a square and a square outline; a triangle; a four-pixel `pixel`; one cone per spell cone angle; a sixty-four-step wedge sheet for cooldown sweeps; status icons; and the glyphs of a bitmap font. Every frame is baked large and scaled down, never scaled up more than twice, and every colour is a runtime tint.

Every visible thing in the play scene — units, projectiles, orbs, obstacles, zones, previews, HUD bars, status icons, and debug overlays — is an `Image` or `Sprite` using one of those frames. Dynamic geometry is a quad recipe, not a drawing: a line or a rotated rectangle is the `pixel` frame stretched and rotated; a cone is its baked frame scaled to range; a growing circle or ring is the disc or ring frame scaled by radius; a cooldown sweep is the wedge frame for the current fraction; a hit flash is a fill-mode tint for a few frames; an outline is a second quad parented to the unit's position. **No `Shape` object and no `Graphics` object exists anywhere, including the debug overlays.**

Numbers are `BitmapText` drawn with a `RetroFont` whose glyphs live in the atlas. `Text` is used only for static labels that rarely change, and never updated inside the render sync. Depth is a fixed set of bands (ground effects, obstacles, units, projectiles, air effects, floating text, debug) with no y-sorting, and the HUD runs in a parallel scene with its own camera.

The canvas is a logical 1920 by 1080, `Scale.FIT`, auto-centred, with no device-pixel-ratio scaling. The Canvas renderer boots through `AUTO`, but is unsupported and untested: the boot scene reads the renderer type and shows a warning banner when it is Canvas, and no code path may depend on it. `Mesh2D`, `SpriteGPULayer`, and `Blitter` exist in Phaser 4 and are not used.

```typescript
// a dynamic shape is a recipe over a baked frame, never a draw call
fooView.setFrame('pixel').setOrigin(0, 0.5).setScale(length / 4, thickness / 4).setRotation(angle)
```

## Consequences

### What this makes easy

**The whole world renders in one to three draw calls.** One texture, one batch family, no blend-mode or filter switches. The engineer never has to ask which object broke the batch, because nothing can.

**Steady state allocates nothing.** Views are pooled and only their transform and tint change, so the garbage collector has nothing to collect and the player never sees a pause in the middle of a combo.

**A rotated-sprite renderer bug cannot reach us.** Two open Phaser 4.2.1 issues corrupt rotated quads in multi-texture batches; single-texture batches are never affected. One atlas plus `maxTextures: 1` puts us on the safe side by construction, and the benchmark runs with rotation on to prove it.

**Sprite art later is a content swap.** The chosen path is already the sprite path. Real art means the atlas comes from disk with the same frame names, views pick frames instead of tints, and animations are added where units need them. The renderer, the batch discipline, the depth bands, and the presentation boundary do not change.

**A designer can see the atlas.** The developer panel downloads the generated PNG, so "what does the cone frame look like" is a click, not a code read.

### What this makes hard

**Outlines and flashes cost a quad, not a property.** A Shape could stroke itself; a sprite cannot. An elite outline is a second pooled quad that follows its unit, and the view pool for enemies is really two pools.

**Every new shape is a frame.** Nobody may draw a new shape at runtime. Adding a cone angle, an icon, or a glyph means adding a frame to the definition list and rebaking, which is a small chore that must not be skipped in a hurry.

**Cones are baked per angle.** A spell with a cone of a new angle needs a new frame rather than a parameter. This is fine for a fixed spell list and would be wrong for a spell whose angle scales with level.

**The benchmark is a discipline, not a one-off.** The decision is gated on a benchmark scene under `bench/` that is rerun after every Phaser upgrade. Skipping it after an upgrade means finding out about a batching change from a player.

**Phaser Studio is a small team.** Four stable releases followed 4.0.0 in three months, then a quiet stretch; the two renderer issues above had zero to one comments at decision time. The version is pinned, the API surface we touch is narrow, and a local patch through `pnpm patch` is the fallback. This is logged as a risk, not a reason to leave.

## Alternatives considered

**Phaser 4 with Shape game objects everywhere.** The least code and exactly the art brief; this was close. It lost on the cost model: Shapes share the flat batch, transform every path vertex on the CPU each frame, allocate per fill, and cannot tint. At fifty objects it would have been fine; at three hundred moving circles it is tens of thousands of CPU vertex transforms per frame for the same picture a quad gives for four.

**PixiJS 8 standalone with our own engine layer.** Arguably the fastest 2D renderer for flat geometry on the web, with a WebGPU backend and a GPU-side geometry cache for its own Graphics. It lost because Pixi is a renderer, not a framework: scenes, camera, input mapping, tilemaps, tweens, timers, text, and the scale manager would all be ours to write or assemble from separate libraries, and the team's Phaser 4 knowledge would be discarded. At three to four hundred quads we are two orders of magnitude below where either engine's ceiling matters, so the raw speed buys nothing we need.

**Raw Canvas 2D or raw WebGL, no engine.** Total control and the smallest bundle. Canvas 2D at three hundred fills per frame would hold 60 fps on a desktop. It lost because text, camera, input, and tooling would all be ours, for no gain over Phaser's quad path.

**Other engines: Excalibur, Kaplay, melonJS, Babylon.js 2D.** Listed for completeness. None has a stronger scene, camera, and input model than Phaser 4 for a top-down 2D game, and their communities are one to two orders of magnitude smaller. Rejected unless Phaser fails its benchmark.

## Revisit when

- **The render benchmark fails and the cause is not an allocation or a batch break.** The benchmark is a scene under `bench/`: 300 tinted unit quads with position and rotation written every frame and a tenth flashing each second, 100 projectile quads spawning and despawning through the pool at 20 per second, 30 ring, disc, cone, and line quads changing scale, rotation, and alpha every frame, 6 cooldown wedges changing frame every frame, 50 `BitmapText` numbers changing text and position every frame, 50 static obstacle quads, and a following camera at 1920 by 1080 with `Scale.FIT`, measured over 30 seconds in Chrome and Safari on the reference laptop, once with `maxTextures: 1` and once with the default. It passes at a stable 60 fps with render time under 6 ms, under 5 draw calls per frame, and a flat heap after warm-up. If it fails with draw calls under 5, look for an allocation in the sync layer or a stray `Text` update; if draw calls exceed 5, something is breaking the batch; only if the quad batch is genuinely too slow at 500 quads does the question of counts or minimum hardware reopen. The engine decision itself does not.
- **Real sprite art needs y-sorting inside the units band, or crisper rendering than no-DPR gives.** Tall top-down sprites usually do not need y-sorting, but the DPR decision was taken partly because an open Phaser 4.1 issue affects camera zoom on high-DPI canvases, and that may be fixed by then.
- **A Phaser release changes the batching model** or fixes the multi-texture rotation bugs, which would let `maxTextures` return to its default.

## References

Enforced by:

- A lint rule under `src/presentation` that bans the `Shape` and `Graphics` factory methods and the `Text` game object outside the boot and menu scenes. A `this.add.circle` or `this.add.graphics` anywhere in the play or HUD scenes fails the build.
- The frame definition list under `src/content/`, which is the only place a frame name may be introduced; the atlas bake and every view read from it.
- The benchmark scene under `bench/`, run through the `bench` script, whose pass criteria are the ones listed under Revisit when.
- The `render` block of the game config under `src/app/`, which is the one place `maxTextures` is set.

---

## Related documentation

- [Presentation](../architecture/presentation.md) — the scenes, the atlas, and the pooled views this decision shapes
- [Presentation coding standards](../standards/presentation-coding.md) — the rules a view must follow
- [Performance standards](../standards/performance.md) — the frame budget this decision spends
- [ADR 0002 — Custom fixed-step simulation](./0002-custom-fixed-step-simulation.md) — why the renderer never owns a position
- [Running and debugging](../onboarding/03-running-and-debugging.md) — how to run the benchmark and download the atlas
