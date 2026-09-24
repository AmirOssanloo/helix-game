# Performance standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Simulation coding standards](./simulation-coding.md) · [Presentation coding standards](./presentation-coding.md) · [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md)

The frame-time budgets as rules, what breaks them, and how a change proves it kept them. Performance is a feature here, not a later pass: a change on the hot path carries its numbers the way a change to a rule carries its test.

---

## The budgets

On the reference laptop — a mid-range machine with integrated graphics, in the current release of each supported desktop browser — every budget holds at the live caps.

| Item | Budget |
| --- | --- |
| Frame rate | 60 frames per second, stable |
| Live caps on screen | 200 enemies, 100 projectiles |
| Simulation tick | under 4 ms, worst case |
| Presentation sync | under 1 ms |
| Phaser render | under 6 ms; target 2 to 3 |
| World draw calls | under 5 per frame |
| Steady-state allocation in tick and sync | zero |
| Pool-miss counter after warm-up | zero |
| Heap after warm-up | flat |

A budget is a ceiling, not a target. A tick that takes 3.9 ms at the caps has no headroom for a boss, and the reviewer will say so.

---

## Measure, then change, then measure

**A change on the hot path includes its before and after numbers in the change description.** Hot path means anything inside a system, inside sync, inside the input mapper's per-frame work, or inside a view.

Two instruments, and both are read:

- **The instrumentation rings** in the developer panel: tick time mean and max over the last second, sync time, render time, live counts, pool misses, frame rate. [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md) says what each ring holds.
- **The browser's performance panel** over thirty seconds at the caps: frame time distribution, draw calls, heap growth. The rings say whether; the panel says why.

**Never optimise without a profile.** A guess about where the time goes is usually wrong, and the change it motivates adds complexity in a place that was never hot.

---

## The benchmark and the stress test

**The render benchmark under `bench/` is rerun** after every Phaser upgrade and after any presentation change that touches the atlas, the views, or the scene composition. It drives the caps' worth of quads, rings, wedges, and bitmap text through a fake simulation with the camera following, and its pass condition is the render budget and a flat heap. It is manual and not part of CI, because it needs a GPU.

**The stress test runs in CI.** Three hundred units with random orders on the full arena for a fixed number of ticks, asserting the mean tick under budget. It runs in Node with no canvas. A change that fails it does not merge.

**It runs uninstrumented, outside the coverage pass.** Coverage instrumentation makes the same tick about three times slower, so a budget measured through it measures the profiler and nothing else. Every other tier is instrumented and holds its coverage floors; this one runs on its own afterwards. A test that asserts a duration belongs outside the profiler or it asserts nothing.

---

## What breaks the batch

The world renders as one quad batch from one texture. Each of these ends it:

| Break | Cost |
| --- | --- |
| A second texture | One draw call per switch. A loaded image, a `Text` object, a render texture |
| A blend mode | A flush per mode change |
| A filter or post-processing effect | A whole pass |
| A mask | A stencil pass |
| A `Text` update inside sync | A texture upload and a break |

[Presentation coding standards](./presentation-coding.md#quick-reference) ban each of these; this page is where the draw-call count is checked when someone argues for an exception.

---

## What allocates

The collector pauses when the heap fills, and at sixty frames a second a pause is a dropped frame. These allocate, and each has a replacement:

| Allocates | Replacement |
| --- | --- |
| A closure created per call | A module-level function taking the world |
| Spread, `map`, `filter`, `reduce`, `forEach` | An index loop |
| An object or array literal per entity | A preallocated field, a scratch slot, a pool |
| String concatenation for a key | Integers packed into one number |
| A new vector per operation | The scratch vectors from `shared/` |
| A fractional number passed to a call the engine does not inline | The object the number lives in, for a call made per unit per tick |
| A `Map` or `Set` built per tick | A preallocated array or the spatial hash |
| A per-frame `Text` update | `BitmapText` |

The pool-miss counter and the heap graph are how you know. A heap that climbs during a stable scene is an allocation in the hot path; find it with the browser's allocation sampler, not by reading code.

---

## Bounded work

**Enemy re-pathing is budgeted per tick.** A fixed number of path searches run each tick; the rest wait their turn. A hundred enemies all re-pathing on the tick the hero moves is the one thing that blows the tick budget, and the budget is a tunable.

**Simulation cost is bounded by the live cap, not the map.** Packs beyond an activation radius sit as spawn data and cost nothing.

**Typed arrays only when the profile says so.** Pooled plain objects are the default; a struct-of-arrays layout is a rewrite of every system that touches the kind, and it earns its place only when the profile shows the tick over budget with the object layout.

---

## Anti-patterns

### Optimising from a hunch

Rewriting the spatial hash because "it must be slow", with no profile. Two days later the tick is the same and the hash is harder to read. The profile said the time was in re-pathing.

### A budget met at half the caps

"Sixty frames a second" measured with twenty enemies. The number means nothing until the screen holds the caps, and the test scene for it is the developer panel's spawn dropdown.

### Growing a limit to make a test pass

The stress test fails, so the tick budget becomes 5 ms. The budget is the product's promise to the player on the reference laptop; the test is how we keep it.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Reference machine | A mid-range laptop with integrated graphics, current desktop browsers |
| Frame rate | 60 fps stable at the live caps |
| Live caps | 200 enemies and 100 projectiles on screen |
| Tick | Under 4 ms worst case |
| Sync | Under 1 ms |
| Render | Under 6 ms, target 2 to 3 |
| Draw calls | Under 5 for the world |
| Allocation | Zero in tick and sync after warm-up; pool misses zero; heap flat |
| A hot-path change | Carries before and after numbers from the rings and the performance panel |
| Optimising | Only from a profile |
| Render benchmark | `bench/`, manual, rerun after every Phaser upgrade and any atlas, view, or scene change |
| Stress test | 300 units in Node, in CI, asserting the tick budget; uninstrumented, outside the coverage pass |
| Batch breaks | Second texture, blend mode, filter, mask, `Text` update in sync — each counted, none in the world scene |
| Allocation sources | Closures, array methods, literals, string keys, per-op vectors, per-tick collections, fractional numbers passed per unit to a call not inlined — each with its replacement above |
| Re-pathing | Budgeted per tick, the budget a tunable |
| Off-screen packs | Dormant spawn data until an activation radius |
| Typed arrays | Only when the profile shows the object layout over budget |

---

## Related documentation

- [Simulation coding standards](./simulation-coding.md) — the allocation and iteration rules inside the tick
- [Presentation coding standards](./presentation-coding.md) — the rules that keep the batch whole
- [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md) — what the rings measure
- [Testing standards](./testing.md) — where the stress test and benchmark sit among the tiers
- [Development workflow](../workflows/development.md) — the commands that run them
