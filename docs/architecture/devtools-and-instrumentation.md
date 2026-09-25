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

`devtools/` exposes one object, `DevApi`, on `window` wherever the panel is. A Vite define decides that at build time; there is no runtime flag to turn it back on.

**Two defines, because they answer different questions.** `__DEV__` says how the code behaves — an `assert` throws under it — and is true under the dev server and in tests only. `__PANEL__` says whether the panel is in the build. The two part company in the playtest build, which is the production game, with no development path and no assert that throws, published with the panel beside it for people to play with. A production build has neither: no panel, no `DevApi`, and not the pane either is built from.

`DevApi` does five things and nothing else:

- **Submits commands.** A panel button becomes a `DebugCommand` variant — spawn a pack here, damage the hero, set an orb level, kill everything — or a `SetTuning` command for a slider. Each goes into the world's command buffer with the next tick's stamp, exactly as a click does.
- **Drives the driver.** Pause, single-step, and the catch-up cap decide whether the driver calls `tick`, never what a tick does. They change no world state, so they are not commands and are not in the log; a replay feeds ticks with no driver and never needs them. Recreating the world under a chosen seed and loading a saved log to replay are driver operations for the same reason: each makes a session rather than changing one, restarting the world in place so every reference to its view, its ring, and its log stays good. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) draws the line.
- **Reads the world view.** The same `Readonly` view the presentation reads, by reference, throttled to once per render frame.
- **Reads the instrumentation rings.** Timing and counts, for the readouts.
- **Sets the overlay toggles.** One flag per debug overlay, on an object the world scene reads each frame. A toggle is presentation state: it changes nothing in the world, so it is not a command and is not in the log, and a replay draws whatever overlays are on at the time.

```typescript
window.DevApi = { submit, driver, view, rings, overlays, saveInputLog, loadInputLog, /* … */ }
```

**The width of the `DebugCommand` union is where the panel's power comes from.** Wanting the panel to do something new means adding a variant and the system code that handles it, which is also what makes the new thing replayable. There is no `world.setFoo()` for the panel to call; [Commands and events](./commands-and-events.md) holds the rule.

The HTML panel itself is outside the canvas and knows nothing about Phaser. It is built from a pane library rather than by hand: a folder per group, and in it a slider, a checkbox, a dropdown, a button, or a read-only line. The pane ships only where the panel does, and the build refuses a production bundle holding either.

The simulation group carries one line the panel only reads: what the last content reload came to, taken, refused with every fault named, or reloading the page. The composition root writes it; [Content and registries](./content-and-registries.md) has the reload. A slider shows its default beside it, so a reload that is taken builds the panel again over the new defaults.

---

## What a control is

**A control is a binding over a plain object the group owns.** The pane writes what a person does into the object and reports it; the group turns the report into a command, a driver call, or a toggle. Nothing reads a control back to learn what the world is.

Two rules come out of that, and both are load-bearing:

- **A control that follows the world compares before it acts.** Rewriting a control from the world reports a change exactly as a hand on it does, so a handler that acted on every report would answer its own refresh forever. The two switches on the hero, the seed, and the catch-up cap each check what they were handed against what the world or the driver already says, and do nothing when they match.
- **A control holding a person's own value is never rewritten.** The refresh touches only the few controls that mirror the world. A count, a position, or an amount is the person's until they change it; rewriting it would move the field under the hand typing in it.

The panel refreshes a few times a second while it is open, and stops while it is closed. The rings sample either way.

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
| Event ring overwrites, cumulative: events a reader lost to a full ring | The event ring |
| Frame rate | The driver |

A ring is a fixed array and a cursor. Writing a sample never allocates. The panel reads a ring and computes mean and max over the window it shows; the ring stores samples, not statistics.

Phaser keeps no draw-call counter of its own, and the count is never read from renderer internals: the wrapper counts calls to two documented methods and nothing else. Under the Canvas renderer there are no draw calls to count and the readout shows a dash.

The rings are on from the first line of code, in every build, because the cost of a sample is one array write and the cost of not having it is a performance regression nobody can date.

---

## Debug overlays

Overlays — collision discs, bound radii, the facing triangle and action cone, attack and aggro ranges, path segments, spell shapes, unit state labels — are drawn by `PlayScene` from a dedicated pool of quads at depth 90, plus `BitmapText` for labels. Each overlay has a toggle; an overlay that is off binds no quads. They obey every rule a view obeys: atlas frames only, no `Graphics`, no allocation during play.

An overlay that shades cells keeps to what the screen shows, not the camera's world rectangle. That rectangle is the box around the screen's unprojected corners, about twice the area on screen, so the walkability overlay shades a blocked cell only when its centre is drawn inside the screen rectangle, widened past a cell's half-width.

---

## The atlas download

`DevApi` exposes a hook that hands the baked atlas back as a PNG, so a designer can inspect what the shapes look like and an artist can see the frame layout they will replace.

---

## Anti-patterns

### A panel button that reaches the world directly

Importing `World` into the panel and calling a method. It works, it is not in the log, and the first tuning session that finds a bug cannot reproduce it. A `DebugCommand`.

### A readout that computes inside the simulation

A system computing a rolling average for the panel. The average is now in the tick's budget and in the replay's state. Systems write samples; the panel computes.

### A control that sends on every report it makes

A switch that submits its command whenever the pane reports a change. The refresh that writes the world's answer back into it reports a change too, so the switch answers itself, and the log fills with commands nobody sent. Compare against the world first.

### Instrumentation that is on only in development

Rings guarded by a build flag. The production build is the one whose frame time matters and the one with no numbers. Rings are always on; the panel that reads them is what is stripped.

---

## Quick reference

| Rule | Do |
| --- | --- |
| `DevApi` | One object on `window` wherever the panel is; stripped by a Vite define in production |
| The two defines | `__DEV__` says how the code behaves and gates `assert`; `__PANEL__` says whether the panel is in the build |
| The playtest build | The production game with the panel left in, for people to play with; the build fails if the panel is missing from it |
| What it does | Submits commands, drives the driver, reads the world view, reads the instrumentation rings, sets the overlay toggles |
| Panel actions | `DebugCommand` variants and `SetTuning` commands, into the same buffer and log as player input |
| Pause, single-step, catch-up cap | Driver operations on `DevApi`; they change no world state, so they are not commands and not in the log |
| Seed, load input log | Driver operations too: each makes a session rather than changing one, restarting the world in place; a log from another content version, or one spanning a content reload, is refused with a message naming the versions |
| A content reload | Reported on the simulation group's content line: taken, refused with its faults, or reloading the page; a reload that is taken builds the panel again over the new defaults |
| New panel power | A new `DebugCommand` variant and its handling, never a method on the world |
| Reading state | The `Readonly` world view, by reference, throttled per render frame |
| The panel | A pane outside the canvas; imports nothing from Phaser, and neither it nor the pane is in a production bundle |
| A control | A binding over a plain object the group owns; the group turns each report into a command, a driver call, or a toggle |
| A control that follows the world | Compares what it is handed against the world before it acts, because a refresh reports a change like a hand does |
| A control holding a typed value | Never rewritten by the refresh; it is the person's until they change it |
| Rings | Preallocated fixed arrays with a cursor, one per measurement, under `instrumentation/` |
| Measurements | Tick time, render time, draw calls, live counts, pool misses, view misses, event overwrites, frame rate |
| Who writes | The driver, `PlayScene`, the draw-call wrapper, the world, the pools, the event ring |
| Draw calls | Counted by wrapping the renderer's public `drawElements` and `drawInstancedArrays` between its pre-render and post-render events, per scene; never read from internals; a dash under Canvas |
| Statistics | Computed by the panel from samples, never inside the simulation |
| Rings in production | Always on; only the panel is stripped |
| Overlays | Quads from a dedicated pool at depth 90 in `PlayScene`, plus `BitmapText`; one toggle each, on `DevApi`, presentation state and never a command |
| Overlay rules | The same as views: atlas frames only, no `Graphics`, no allocation during play |
| Cell overlays | Bound from the camera's world rectangle, drawn only where a cell's centre falls inside the widened screen rectangle |
| Atlas download | A `DevApi` hook returning the baked atlas as a PNG |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — the buffer and the log the panel writes into
- [Presentation](./presentation.md) — the view rules the overlays share
- [Developer panel](../product/features/developer-panel.md) — every control the panel offers, from the player's side
- [Performance standards](../standards/performance.md) — the budgets the rings hold the frame to
- [ADR 0004 — All mutation enters as commands](../adr/0004-all-mutation-enters-as-commands.md) — why the panel has no back door
