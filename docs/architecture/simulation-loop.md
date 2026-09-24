# Simulation loop

> **Entry point:** [Architecture](./README.md)
> **See also:** [Layers and the dependency rule](./layers-and-dependency-rule.md) · [Commands and events](./commands-and-events.md) · [Entities and pools](./entities-and-pools.md)

How time moves. The driver owns the clock, the world owns the tick, and the tick is a function of its inputs. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The shape in one line

**Phaser reports a frame; the driver turns frames into whole ticks; the world runs each tick with a constant step and no clock.**

A 144 Hz display and a 60 Hz display run the same number of ticks per second, so the hero turns at the same rate on both. A tab that was hidden for a minute does not replay a minute of orb presses on resume.

---

## The driver

The fixed-step driver lives in `app/` and is the only file in the repository that reads a clock. Each render frame it:

1. Receives Phaser's frame delta and adds it to an accumulator.
2. Runs `tick` once for every whole step the accumulator holds, at most the **catch-up cap** per frame, three unless the developer panel sets another. Time beyond the cap is dropped, not queued.
3. Measures the wall time around each `tick` and writes it to the instrumentation ring.
4. Computes the interpolation fraction — how far the accumulator is into the next step — and hands it to the presentation sync.

The step is **30 Hz**, a constant `dt` of one thirtieth of a second. The driver never passes a frame delta into the world. The world never asks what time it is.

```typescript
// app: the only place a frame delta is seen
const onFrame = (frameDeltaMs: number): void => {
  accumulator += frameDeltaMs
  let steps = 0
  while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME) { /* tick, measure, count */ }
  if (steps === MAX_STEPS_PER_FRAME) { accumulator = 0 }
}
```

**When the tab is hidden**, the driver stops calling `tick`. Cooldowns freeze with it, because they are tick counts. Any input that arrived while hidden is discarded on resume, not replayed.

---

## The tick

`tick` on a world takes no argument: the step is a constant and the commands are already in the buffer. It does these things, in this order, every time:

1. Copy each entity's current position into its previous position, so the presentation can interpolate the step about to happen.
2. Sort the command buffer by the ordering rule and consume it, recording every consumed command with this tick in the input log. The consumed commands stay readable on the world, in that order, for the rest of the tick.
3. Run the systems, in the order the one list in `simulation/systems.ts` gives them. The first one applies the consumed commands, a tuning change to run scope and every other command to the hero; every later system sees the orders they produced.
4. Forget the consumed commands.
5. Write `tick_completed` to the event ring.
6. Advance the tick count.

The system order is a fact the file owns; [Where to look](./where-to-look.md) points at it. The invariant is that the order is one list, in one file, and that a system is a plain function over world state:

```typescript
export const fooSystem = (world: World): void => { /* … */ }
```

A system reads world state, the tick count, the commands the tick consumed, and the world's random source. It reads nothing else. It allocates nothing in steady state; [Performance standards](../standards/performance.md#quick-reference) hold the allocation rules.

---

## Time is a tick count

There are no seconds inside the domain. A cooldown is "ready at tick N". A cast point is "commits at tick N". A turn step is the angular rate times the constant step. A designer writes a cooldown in seconds in a definition; the registry converts it to ticks once, at load.

This is what makes a replay exact: two runs that receive the same commands at the same tick numbers do the same arithmetic.

---

## Determinism

**The same seed and the same input log produce the same world state, tick for tick.** That is the contract every system is written against.

- The world owns a seeded random source. Nothing under `domain/` or `simulation/` reads `Math.random`, `Date.now`, or `performance.now`; lint bans them.
- Iteration order is fixed. Pools iterate by index; the spatial hash returns candidates in cell-then-index order.
- Every command carries the tick it applies to, and the ordering rule in [Commands and events](./commands-and-events.md) settles ties.
- Floating-point arithmetic is fine. The contract is same-machine, same-build replay, not cross-platform bit equality.

Debug commands and tuning changes are commands too, so a session with the developer panel open replays exactly. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) is why.

---

## Recording and replay

The simulation records every command it consumes, with its tick, into an input log. Replay creates a world with the same seed and feeds the log back, tick by tick, with no driver and no Phaser. It runs in Node, which is what makes it a test as well as a debugging tool.

A bug report is a seed and a log. The engineer replays to the failing tick and inspects the world view.

---

## Anti-patterns

### Stepping gameplay with the frame delta

Multiplying a speed by the raw frame time. It looks right at 60 Hz and makes the hero turn twice as fast on a 120 Hz display. Everything time-based reads the constant step.

### Catching up without a cap

Running every tick the accumulator holds after a long stall. A tab resumed after two minutes runs three thousand ticks in one frame, the browser freezes, and the orb buffer processes every key that was held. Three ticks, then drop.

### A system that remembers between ticks

A system holding a module-level variable — a cached list, a counter — that is not in world state. It survives a map load, diverges on replay, and is invisible to the world view. Everything a system needs is on the world.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The clock | Read in `app/fixed-step-driver.ts` and nowhere else |
| The step | 30 Hz, constant `dt`; never a frame delta |
| Catch-up | At most the catch-up cap of ticks per render frame, 3 unless the developer panel sets another, then drop the remaining time |
| Hidden tab | No ticks; cooldowns freeze; input received while hidden is discarded |
| `tick` | Takes no argument; copies previous positions, sorts and consumes the command buffer into the input log, runs the system list in order with the consumed commands readable on the world, forgets them, writes `tick_completed`, advances the tick count; reads no clock |
| System order | One list, in `simulation/systems.ts`; command application runs first |
| A system | A plain function over world state; reads the world, the tick count, the consumed commands, and the world's random source; allocates nothing in steady state |
| Time in the domain | A tick count; seconds in a definition become ticks at load |
| Random | The world's seeded source only; `Math.random`, `Date.now`, `performance.now` are banned by lint |
| Iteration order | Fixed: pools by index, spatial hash by cell then index |
| Determinism contract | Same seed and input log give the same state, same machine, same build |
| Input log | Every consumed command with its tick, including debug and tuning commands |
| Replay | A world with the same seed fed the log, in Node, with no driver and no Phaser; the log carries the seed, the content version the world was created under and each one a content reload moved it to, the map, and the ticks run, and one from another content version or spanning a reload is refused |
| Interpolation | The driver hands the presentation the fraction into the next step; the world stores previous and current positions |
| Measuring the tick | The driver, around each `tick`, into the instrumentation ring |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — what enters a tick and what leaves it
- [Entities and pools](./entities-and-pools.md) — the state a system runs over
- [Simulation coding standards](../standards/simulation-coding.md) — the rules a system body follows
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why the world steps itself instead of a physics engine
- [Testing standards](../standards/testing.md) — the replay and stress tests that hold this page to account
