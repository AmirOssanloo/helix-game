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

The fixed-step driver lives in `app/` and owns tick time: **the tick reads no clock, and the driver is the only reader of one that decides when a tick runs.** Each render frame it:

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

**Two reads of the clock sit outside the tick, and neither can move world state.** The composition root reads the wall clock once at boot for a new session's seed; the seed is an input, written into the input log, so a replay runs under the same one. The developer panel refreshes its readouts on a host timer; the refresh reads the world view and writes nothing, and anything it changes goes in as a command. Neither is under `domain/` or `simulation/`, where lint bans both.

**Every pause is a reason the driver holds, and each is held apart**: a hidden tab, the developer panel's pause, and a screen that pauses the world, which reaches the driver through a port presentation declares and the composition root implements. The driver runs a tick only when no reason holds, and feeds no time to the accumulator while one does, so releasing the last reason runs no burst of catch-up ticks, and releasing one never resumes a clock another still holds. No pause is world state or a command.

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

**A map change is a transition, not steady state.** It arrives as a `load_map` command and the command system applies it at its point in the tick, keeping run scope and making map scope again on the new map. A rule that changes map requests the change for that same point and never loads a map mid-pass. Deriving the new map's walkability grid and its pack records allocates, once, on the tick that changes map; an allocation sampler's window leaves that tick out.

---

## Time is a tick count

There are no seconds inside the domain. A cooldown is "ready at tick N". A cast point is "commits at tick N". A turn step is the angular rate times the constant step. A designer writes a cooldown, a duration, or a speed in seconds in a definition; the world converts it to ticks or a per-tick step once, when it takes the definition into run scope at creation or when a tuning command changes the number, and never where the number is used.

This is what makes a replay exact: two runs that receive the same commands at the same tick numbers do the same arithmetic.

---

## Determinism

**The same seed and the same input log produce the same world state, tick for tick.** That is the contract every system is written against.

- The world owns a seeded random source. Nothing under `domain/` or `simulation/` reads `Math.random`, `Date.now`, or `performance.now`; lint bans them.
- A rule draws a keyed number: a pure hash of the run's seed, an integer key such as the unit's id, the tick, and a purpose from the one purpose list in `domain/` with a draw index folded in, 0 for a site that draws one number. It reads the seed and writes nothing, so a draw in one rule never moves another's. The sequential generator on run scope is the simulation's, for orchestration that draws in sequence; a system never advances it. [ADR 0010](../adr/0010-a-rules-random-draw-is-a-keyed-hash.md) is why.
- Iteration order is fixed. Pools iterate by index; the spatial hash returns candidates in cell-then-index order.
- Every command carries the tick it applies to, and the ordering rule in [Commands and events](./commands-and-events.md) settles ties.
- Floating-point arithmetic is fine. The contract is same-machine, same-build replay, not cross-platform bit equality.

Debug commands, tuning changes, and map changes are commands too, so a session with the developer panel open replays exactly. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) is why.

---

## Recording and replay

The simulation records every command it consumes, with its tick, into an input log. Replay creates a world with the same seed on the map the session started on and feeds the log back, tick by tick, with no driver and no Phaser; a later map arrives as a `load_map` among the records. It runs in Node, which is what makes it a test as well as a debugging tool.

The log carries the seed, the content version the world was created under and each one a content reload moved it to, the map the session started on, the ticks run, and its records. A log from another content version, or one spanning a reload, is refused rather than replayed wrong. A stored log also carries state checksums a replay must reach; [Testing standards](../standards/testing.md) own them.

The session that owns the world, the replay that may be feeding it, and saving and loading its log live in `simulation/`; `app/` constructs it and steps it through the driver. A new run, under a new seed or from a loaded log, is a session operation that makes both scopes again and begins a new log; it is never a command. A map change keeps the run and is a command in the log.

A bug arrives as a seed and a log, in a feedback file or an input log. The engineer replays to the failing tick and inspects the world view.

---

## Anti-patterns

### Stepping gameplay with the frame delta

Multiplying a speed by the raw frame time. It looks right at 60 Hz and makes the hero turn twice as fast on a 120 Hz display. Everything time-based reads the constant step.

### Catching up without a cap

Running every tick the accumulator holds after a long stall. A tab resumed after two minutes runs three thousand ticks in one frame, the browser freezes, and the orb buffer processes every key that was held. Three ticks, then drop.

### A system that remembers between ticks

A system holding a module-level variable — a cached list, a counter, a scratch buffer — that is not in world state. It survives a map load, diverges on replay, is shared by two worlds in one process, and is invisible to the world view. Everything a system needs is on the world: what it remembers in run or map scope, and what it works in on the world's scratch.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The clock | The tick reads none; the driver in `app/fixed-step-driver.ts` owns tick time. Outside the tick, the boot's seed read and the panel's refresh timer, neither of which changes world state |
| The step | 30 Hz, constant `dt`; never a frame delta |
| Catch-up | At most the catch-up cap of ticks per render frame, 3 unless the developer panel sets another, then drop the remaining time |
| Hidden tab | No ticks; cooldowns freeze; input received while hidden is discarded |
| Pause reasons | A hidden tab, the panel's pause, and a pausing screen through its port, held apart; a tick only when none holds; no time fed while one does, so no catch-up burst on release; none is world state or a command |
| `tick` | Takes no argument; copies previous positions, sorts and consumes the command buffer into the input log, runs the system list in order with the consumed commands readable on the world, forgets them, writes `tick_completed`, advances the tick count; reads no clock |
| System order | One list, in `simulation/systems.ts`; command application runs first |
| A system | A plain function over world state; reads the world, the tick count, the consumed commands, and the world's random source; allocates nothing in steady state |
| A map change | A `load_map` command, applied at the command system's point in the tick: run scope kept, map scope made again; allocates once, on that tick, which a sampler's window leaves out |
| Time in the domain | A tick count; seconds in a definition become ticks or a per-tick step once, when the world takes the definition in or a tuning command changes it, never where used |
| Random | The world's seeded source only; `Math.random`, `Date.now`, `performance.now` are banned by lint |
| A rule's draw | Keyed: a hash of the seed, a key, the tick, and a purpose from the one list with a draw index folded in; writes nothing. The sequential generator is the simulation's, never advanced by a system |
| Iteration order | Fixed: pools by index, spatial hash by cell then index |
| Determinism contract | Same seed and input log give the same state, same machine, same build |
| Input log | Every consumed command with its tick, including debug, tuning, and map-change commands |
| Replay | A world with the same seed fed the log, in Node, with no driver and no Phaser; the log carries the seed, the content version the world was created under and each one a content reload moved it to, the map the session started on, and the ticks run, with a later map as a `load_map` record; one from another content version or spanning a reload is refused; a stored log's state checksums are the testing standards' |
| A new run | A session operation, under a new seed or from a loaded log: both scopes made again, a new log begun; never a command |
| Interpolation | The driver hands the presentation the fraction into the next step; the world stores previous and current positions |
| Measuring the tick | The driver, around each `tick`, into the instrumentation ring |

---

## Related documentation

- [Commands and events](./commands-and-events.md) — what enters a tick and what leaves it
- [Entities and pools](./entities-and-pools.md) — the state a system runs over
- [Simulation coding standards](../standards/simulation-coding.md) — the rules a system body follows
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why the world steps itself instead of a physics engine
- [Testing standards](../standards/testing.md) — the replay and stress tests that hold this page to account
