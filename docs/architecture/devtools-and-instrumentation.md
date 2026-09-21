# Developer tools and instrumentation

> **Entry point:** [Architecture](./README.md)
> **See also:** [Commands and events](./commands-and-events.md) · [Presentation](./presentation.md) · [Developer panel](../product/features/developer-panel.md)

How the developer panel reaches the game, why it has no more power than the mouse, and how the frame is measured. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**The panel is a second keyboard. It sends commands, reads the same view, and everything it does is in the input log.**

A session with the panel open replays exactly, so a bug found while tuning is a bug an engineer can replay.

---

## DevApi

`devtools/` exposes one object, `DevApi`, on `window` in development builds. A Vite define strips it from a production build; there is no runtime flag to turn it back on.

`DevApi` does five things and nothing else:

- **Submits commands.** A panel button becomes a `DebugCommand` variant — spawn a pack here, damage the hero, set an orb level, kill everything — or a `SetTuning` command for a slider. Each goes into the world's command buffer with the next tick's stamp, exactly as a click does.
- **Drives the driver.** Pause, single-step, and the catch-up cap decide whether the driver calls `tick`, never what a tick does. They change no world state, so they are not commands and are not in the log; a replay feeds ticks with no driver and never needs them. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) draws the line.
- **Reads the world view.** The same `Readonly` view the presentation reads, by reference, throttled to once per render frame.
- **Reads the instrumentation rings.** Timing and counts, for the readouts.
- **Sets the overlay toggles.** One flag per debug overlay, on an object the world scene reads each frame. A toggle is presentation state: it changes nothing in the world, so it is not a command and is not in the log, and a replay draws whatever overlays are on at the time.

```typescript
window.DevApi = { submit, driver, view, rings, overlays, /* … */ }
```

**The width of the `DebugCommand` union is where the panel's power comes from.** Wanting the panel to do something new means adding a variant and the system code that handles it, which is also what makes the new thing replayable. There is no `world.setFoo()` for the panel to call; [Commands and events](./commands-and-events.md) holds the rule.

The HTML panel itself is outside the canvas, built from plain DOM, and knows nothing about Phaser.

---

## Instrumentation

`instrumentation/` holds preallocated sample rings, one per measurement:

| Ring | Written by |
| --- | --- |
| Tick time, per tick | The fixed-step driver, around each `tick` |
| Render time, per frame | `PlayScene`, around the sync and Phaser's render |
| Draw calls, per frame | A presentation module that wraps the renderer's two public draw methods, `drawElements` and `drawInstancedArrays`, which every batch handler, filter pass, and tile layer draws through; it resets on the renderer's pre-render event, attributes the count per scene on the render event, and writes the frame total and the world scene's share on post-render |
| Live entity counts, per tick | The world, at the end of `tick` |
| Pool misses, cumulative | Each pool, on a `null` acquire |
| View misses, cumulative | `PlayScene`, once per frame, from each view pool's refused binds |
| Event ring overwrites, cumulative | The event ring |
| Frame rate | The driver |

A ring is a fixed array and a cursor. Writing a sample never allocates. The panel reads a ring and computes mean and max over the window it shows; the ring stores samples, not statistics.

Phaser keeps no draw-call counter of its own, and the count is never read from renderer internals: the wrapper counts calls to two documented methods and nothing else. Under the Canvas renderer there are no draw calls to count and the readout shows a dash.

The rings are on from the first line of code, in every build, because the cost of a sample is one array write and the cost of not having it is a performance regression nobody can date.

---

## Debug overlays

Overlays — collision discs, bound radii, the facing triangle and action cone, attack and aggro ranges, path segments, spell shapes, unit state labels — are drawn by `PlayScene` from a dedicated pool of quads at depth 90, plus `BitmapText` for labels. Each overlay has a toggle; an overlay that is off binds no quads. They obey every rule a view obeys: atlas frames only, no `Graphics`, no allocation during play.

---

## The atlas download

`DevApi` exposes a hook that hands the baked atlas back as a PNG, so a designer can inspect what the shapes look like and an artist can see the frame layout they will replace.

---

## Anti-patterns

### A panel button that reaches the world directly

Importing `World` into the panel and calling a method. It works, it is not in the log, and the first tuning session that finds a bug cannot reproduce it. A `DebugCommand`.

### A readout that computes inside the simulation

A system computing a rolling average for the panel. The average is now in the tick's budget and in the replay's state. Systems write samples; the panel computes.

### Instrumentation that is on only in development

Rings guarded by a build flag. The production build is the one whose frame time matters and the one with no numbers. Rings are always on; the panel that reads them is what is stripped.

---

## Quick reference

| Rule | Do |
| --- | --- |
| `DevApi` | One object on `window` in development builds; stripped by a Vite define in production |
| What it does | Submits commands, drives the driver, reads the world view, reads the instrumentation rings, sets the overlay toggles |
| Panel actions | `DebugCommand` variants and `SetTuning` commands, into the same buffer and log as player input |
| Pause, single-step, catch-up cap | Driver operations on `DevApi`; they change no world state, so they are not commands and not in the log |
| New panel power | A new `DebugCommand` variant and its handling, never a method on the world |
| Reading state | The `Readonly` world view, by reference, throttled per render frame |
| The panel | Plain DOM outside the canvas; imports nothing from Phaser |
| Rings | Preallocated fixed arrays with a cursor, one per measurement, under `instrumentation/` |
| Measurements | Tick time, render time, draw calls, live counts, pool misses, view misses, event overwrites, frame rate |
| Who writes | The driver, `PlayScene`, the draw-call wrapper, the world, the pools, the event ring |
| Draw calls | Counted by wrapping the renderer's public `drawElements` and `drawInstancedArrays` between its pre-render and post-render events, per scene; never read from internals; a dash under Canvas |
| Statistics | Computed by the panel from samples, never inside the simulation |
| Rings in production | Always on; only the panel is stripped |
| Overlays | Quads from a dedicated pool at depth 90 in `PlayScene`, plus `BitmapText`; one toggle each, on `DevApi`, presentation state and never a command |
| Overlay rules | The same as views: atlas frames only, no `Graphics`, no allocation during play |
| Atlas download | A `DevApi` hook returning the baked atlas as a PNG |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — the buffer and the log the panel writes into
- [Presentation](./presentation.md) — the view rules the overlays share
- [Developer panel](../product/features/developer-panel.md) — every control the panel offers, from the player's side
- [Performance standards](../standards/performance.md) — the budgets the rings hold the frame to
- [ADR 0004 — All mutation enters as commands](../adr/0004-all-mutation-enters-as-commands.md) — why the panel has no back door
