# ADR 0012 — Screens draw in the HUD scene, behind one input claim

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Status**        | Accepted, 2026-09-28                                                          |
| **Date**          | 2026-09-27                                                                    |
| **Deciders**      | The engineering architect; accepted by the game designer on the maintainer's delegation, with the pick order amended to Q98's answer |
| **Supersedes**    | None; answers [ADR 0003](./0003-layered-single-package-architecture.md)'s fourth-scene revisit condition |
| **Superseded by** | None                                                                          |

## Context

The game is about to have screens: a pause screen on Escape, then the inventory and armory, a store beside it, and tooltips over both. Until now the only thing on the canvas that is not the world is the bottom bar, and the only thing that keeps a click on the bar from reaching the world is the HUD scene stopping a pointer that goes down on it. That is not enough for a screen.

- **A release leaks.** The play scene hands every pointer coming up to the input mapper, so a press that went down on a screen and came up anywhere still reaches the mapper.
- **Keys have no claim at all.** Every key reaches the mapper, whatever is open.
- **The claim rests on Phaser's scene order.** It holds only because the HUD scene sits above the play scene and its input plugin sees the pointer first. A third place that draws, a DOM element or a fourth scene, would be a third source of events with its own order.
- **A right click will soon pick an item.** It must be resolved against the rectangles of item labels the play scene draws, and no port says how the mapper reads them.
- **One screen stops the world and another does not.** The pause screen stops the tick; the inventory and the store leave the world running. A paused driver still buffers commands for its next tick, so a click that leaked under the pause would land on the resume tick.

Three earlier choices bound the answer. [ADR 0001](./0001-phaser-renderer-and-quad-atlas.md) draws everything as tinted quads from one atlas, with a draw-call budget the bar measures. [ADR 0003](./0003-layered-single-package-architecture.md) keeps three scenes, because a parallel scene would copy the play camera every frame, names "an inventory that cannot be a DOM adapter" as the reason to reopen that, and foresaw a DOM `ui/` adapter. The developer panel is DOM, and works.

The player feels this as a click on the inventory that also walks the hero, or a key typed with the pause screen open that lands a spell the moment it closes. The engineer feels it as the third screen that has to know which scene saw the event first.

## Decision

**Screens are Phaser, drawn in `HudScene`'s screen-space camera from the one atlas. Whether an event is a screen's is decided by one presentation object, the input claim, which both scenes consult and which the input mapper asks before it turns any pointer or key into a command. A screen that pauses reaches the driver through a port presentation declares and the composition root implements.**

**Phaser, not the DOM.** A screen is quads and `BitmapText` from the atlas, like the bar: its frame and panels are stretched frames, an item is its icon frame in its rarity's tint, and every string is the atlas font. Every object a screen will show is made when the HUD scene is created, pooled where a screen shows a count of things, and shown or hidden, written and never read back, as every HUD element is. Screens add no texture, no filter, and no draw call beyond the HUD scene's own.

**In `HudScene`, not a fourth scene.** The HUD scene gains bands of its own: the bar, then screens above it, then what sits over a screen, a tooltip or an item on the pointer. The HUD's camera is already fixed to the canvas, so nothing is copied from the play camera, and there are still two input plugins, not three.

**One input claim.** `presentation/input/` holds one claim object, made by the composition root and handed to both scenes, as the flashes record is. What claims, and how:

- **Regions.** Each open screen, and the bar always, registers the canvas rectangles it covers, in the same logical canvas points a pointer event carries.
- **Pointers.** A press that goes down inside a claimed region is that region's, and so is its release, wherever the pointer comes up. A press that went down on the world keeps its release even if it comes up over a screen, so a held aim still commits.
- **Keys.** A screen names the keys it claims, and a claimed key never reaches the mapper; a key it does not name does. A key whose press reached the mapper always sends its release there, so nothing sticks down when a screen opens.
- **Escape** is resolved in the claim, in one order: an open targeting cursor closes first, which the claim asks the mapper; then the topmost open screen closes; then, with neither, the pause screen opens.
- **A modal screen claims everything.** Every pointer event anywhere on the canvas, and every key but the ones it names, is its. Opening one closes any held press and releases every held key, with nothing sent, as the window losing focus does. Every screen that pauses is modal.

The HUD scene draws and hit-tests its screens; the play scene's input binding asks the claim before it hands an event to the mapper. Neither scene stops propagation to protect the other, so the claim holds whatever order Phaser gives the scenes' input plugins.

**The pick port.** A right click that is not a screen's is resolved by the mapper against what the play scene draws, in one fixed order: a unit, then an item's label, then an item's icon on the ground, then the ground. While Alt is held, an item's label comes before a unit, and the rest keep their order. A unit is first so that a click on an enemy standing on its own drop is always an attack; Alt, already the key that shows every label, turns the order for looting, so an item under an enemy is always reachable. The mapper reads Alt from the same key state that shows the labels, at the event, as it reads the pointer; the order is the mapper's, and no view knows it. The labels reach the mapper through a port in `presentation/input/input-ports.ts`: a fixed record the label views rewrite each frame with the canvas rectangle and the ground item id of every label shown, in the order they are drawn, and a count. Within the labels, the one drawn on top wins. The mapper reads it and never asks a view.

**Pausing.** Presentation declares a pause port with a hold and a release. The composition root implements it over the fixed-step driver as a pause reason of its own, apart from the developer panel's and a hidden tab's; the driver runs a tick only when no reason holds, feeds no time to the accumulator while one does, and so runs no burst of catch-up ticks on the release. The pause is not world state, sends no command, and puts nothing in the log. Presentation never imports the driver.

```typescript
// the play scene's binding asks the claim before the mapper sees anything
if (!claim.pointerDown(fooButton, fooX, fooY)) mapper.pointerDown(fooButton, fooX, fooY)
```

## Consequences

### What this makes easy

**A click on a screen never walks the hero.** The press and its release belong to whoever the press landed on, and a modal screen owns everything, so the input log gains nothing while the pause screen is open, and nothing waits in the buffer for the resume tick.

**The next screen is a registration.** A screen says its rectangles, its keys, whether it is modal, and whether it pauses. The mapper, the scenes, and the driver do not change; the store is laid out beside the inventory and joins the claim.

**Screens cost what the bar costs.** One atlas, one batch, the HUD scene's one draw. The bar's draw-call budget measures a screen with no new counter, and the allocation rules of every view hold on a screen by construction.

**Item icons are drawn once, one way.** The icon an item wears on the ground, in the inventory, in the store, and on the pointer is one atlas frame in one tint, so a sprite art swap later changes all four at once.

**The pick is testable without a canvas.** The port is a plain record, so a mapper test writes three rectangles into it and clicks, once with Alt up and once with it down.

### What this makes hard

**Text layout is ours.** A DOM screen would wrap a tooltip, flow a column, and scroll a list for free. In `BitmapText` from the atlas font every line is placed by hand, the font needs every glyph a screen shows, and there is no wrapping, no hover state, and no scroll we did not write.

**No accessibility for free.** A DOM screen could be read by a screen reader and navigated by tab. A canvas screen is pixels. The game has no accessibility goal today; if it gains one, this is the record it reopens.

**The HUD scene grows.** It now owns the bar, every screen, their bands, and their hit tests. Its screens must stay separate modules registered on it, the way the play scene's views are, or the HUD scene becomes the next god object.

**The claim is one more thing to ask.** A new input path that hands an event to the mapper without asking the claim is a leak nothing catches but a test. Every event the binding takes goes through the claim, and the capture spec asserts it for each kind.

**The mapper answers the claim about the cursor.** Escape's order spans the claim and the mapper, so the claim reads whether a cursor is open. It is one narrow read, and it is a dependency.

## Alternatives considered

**Screens in the DOM, a `ui/` adapter beside the developer panel.** This was close, and it is what ADR 0003 foresaw. The DOM gives text layout, wrapping, scrolling, hover, and accessibility for nothing, the panel shows it works in this codebase, and a DOM element above the canvas blocks the canvas's pointer events by itself. It lost on three counts. An item's icon is an atlas frame in a runtime tint, so a DOM screen would draw it a second way, from an exported image with its own tinting, and the two could disagree. Keys are heard by Phaser on the window, so a DOM screen stops no key, and Phaser's release outside the canvas still fires under it: the claim would span two sources of events instead of one. And the screen would sit outside the bar's draw-call and render-time readouts, measured only as a frame that got slower. The panel escapes all three because it ships only in the panel build and is not part of the game.

**A fourth scene for screens.** Its own camera, its own input plugin, and its own lifetime, so the HUD scene stays small. ADR 0003's reason against a fourth scene, a camera copied every frame, does not arise for a screen-space scene. It lost on input: a third plugin is a third place Phaser orders events, and the claim would have to be right against both orders. The HUD scene's camera is already the screen-space camera a fourth scene would make.

**Keep capture on Phaser's propagation.** Each scene that draws something clickable stops the event before the scenes below, as the bar does. The least new code. It lost because Phaser stops propagation only between input plugins and only for pointer events the scene hit: it says nothing about keys, nothing about a release that comes up somewhere else, and nothing about a screen that should own the whole canvas.

**Pause by a command, as world state.** The pause would replay, and the world would know it was paused. It lost because a pause decides whether a tick runs, never what a tick does, which [ADR 0004](./0004-all-mutation-enters-as-commands.md) already rules for the panel's pause, and a pausing command would need a tick to run in order to stop the ticks.

## Revisit when

- A screen needs text the atlas font cannot do: long wrapped prose, a text field, a scrolling list of hundreds. Then a DOM screen is weighed again for that screen alone, behind the same claim.
- The game takes on an accessibility goal.
- The HUD scene's render time, as the panel reads it, grows past the bar's share with every screen open.
- A screen is needed that must be drawn in the world's camera, such as a menu over the map that scrolls with it. Then its place is asked again.
- Something else on the ground takes a right click, such as a portal or a waypoint. Its place in the pick order is stated here before it is built.
- Sprite art makes a unit's drawn shape taller than its disc, so a click on a sprite and a click on its footprint disagree. Then the unit's place in the pick order is read against the sprite's bounds.

## References

Nothing enforces it until the capture layer is built; its tests will:

- The capture spec under `tests/presentation/` asserts every pointer and key event passes the claim before the mapper, the release of a claimed press included, and a modal screen claims every event but its own keys.
- The input mapper's spec under `tests/presentation/` holds the pick order: a unit before a label with Alt up, a label before a unit with Alt down, then an icon, then the ground.
- The driver's spec under `tests/app/` asserts the screen's pause reason is held apart from the panel's, and a release runs no catch-up burst.
- The lint rule under `src/presentation` that bans the `Shape`, `Graphics`, and `Text` factories holds screens to the atlas, as it holds the bar.
- The layer allow-list keeps presentation from importing `app/`, so the pause can only reach the driver through its port.

---

## Related documentation

- [Presentation](../architecture/presentation.md) — the scenes, the HUD, screens, and input
- [ADR 0001 — Phaser renderer and quad atlas](./0001-phaser-renderer-and-quad-atlas.md) — the atlas and draw-call budget screens join
- [ADR 0003 — Layered single-package architecture](./0003-layered-single-package-architecture.md) — the three-scene rule this record keeps
- [ADR 0004 — All mutation enters as commands](./0004-all-mutation-enters-as-commands.md) — why a pause is not a command
- [Simulation loop](../architecture/simulation-loop.md) — the driver and its pause reasons
