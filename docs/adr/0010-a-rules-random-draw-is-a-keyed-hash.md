# ADR 0010 — A rule's random draw is a hash of the seed, a key, the tick, and a purpose

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                                   |
| ----------------- | ----------------------------------------------------------------------- |
| **Status**        | Accepted                                                                |
| **Date**          | 2026-09-26, amended 2026-09-27                                          |
| **Deciders**      | The engineering architect, on the maintainer's delegation of 2026-09-26 |
| **Supersedes**    | None                                                                    |
| **Superseded by** | None                                                                    |

## Context

[ADR 0002](./0002-custom-fixed-step-simulation.md) makes determinism a rule set: the same seed and the same input log give the same world, tick for tick, and the world owns a seeded random source. That source is a sequential generator: one integer of state on run scope, and draw functions that advance it, in the simulation.

The rules that would draw live in the domain. Every system is a domain function the simulation registers, and [ADR 0003](./0003-layered-single-package-architecture.md) lets the domain import only `shared`. So the one random source the world owns is out of reach of every rule that could want it, and the first rule to want a draw asks where it comes from.

The engineer writing that rule feels it first. The next one feels it more: a crit, a loot roll, a wander, or a generated room will ask the same question, and whatever the first answer is, every recorded log is built on it.

## Decision

**A rule under `domain/` draws a random number as a pure hash of the run's seed, an integer key, the tick, and a draw purpose.** The mixer is an integer hash in `shared/`, which knows nothing of the game. The keyed draw in `domain/random/` reads the seed from run scope and takes the key, the current tick, and a purpose from the one purpose list beside it, and returns an integer in [0, 2^24). It reads nothing else, writes nothing, and allocates nothing; the result stays below the engine's small-integer bound, so it is never boxed. A per-unit draw keys on the unit's generational id. The caller turns the integer into a chance or a range with local arithmetic.

**A site that draws several numbers of one kind for one key on one tick passes a draw index.** A drop's affixes, or a store's stock, take one purpose and count the index up from 0. The index folds into the hash's purpose word as `purpose + index × stride`, with every purpose below the stride, checked when the module loads, and the index below a stated limit, checked by a development assert. Index 0 is the purpose alone, the same hash call a draw with no index would make, so a site that draws one number passes 0 and no recorded log moves when a purpose gains indices. Two numbers of different kinds, such as a drop's count and its rarity, still take two purposes.

```typescript
// domain: a per-unit chance, drawn at the rule's own moment
if (
  keyedDraw(world, unitId, DRAW_PURPOSE.fooHalt, 0) <
  fooChance * KEYED_DRAW_RANGE
) {
  /* … */
}

// domain: many numbers of one kind at one key and tick, one index each
for (let index = 0; index < fooCount; index += 1) {
  const drawn = keyedDraw(world, barId, DRAW_PURPOSE.fooAffix, index);
  // …
}
```

The sequential source stays in the simulation, for orchestration that draws in sequence outside the systems. A system never advances it.

## Consequences

### What this makes easy

**A unit's draw depends on nothing but the seed, its id, and the tick.** A new rule that draws, a pack that sleeps and stops drawing, or a system moved in the list leaves every other draw where it was. Five members of a pack re-pathing on the same tick draw apart because their ids differ.

**A rule stays a pure function.** No mutable random state is threaded into per-unit code, and a test reproduces one draw from a seed, an id, and a tick without replaying the ticks before it.

**Drawing changes no state.** Run scope is untouched by a draw, so a rule that draws at a chance of zero leaves the world identical, to the bit, to one that does not draw.

**A multi-number roll stays readable.** A loot roll that draws a dozen affixes names one purpose and a dozen indices, not a dozen purposes.

### What this makes hard

**The purpose list is shared by every rule that draws.** It is one list so a clash is visible, and a test asserts the values are distinct and below the stride, but two sites that reuse one purpose and one index for one key on one tick draw the same number, and nothing but review catches that.

**The purpose word is finite.** Every purpose stays below the stride and every index below its limit, so the list and the longest roll share one budget: 256 purposes, 1,024 indices each. A purpose or an index past either fails at module load or in a development assert, not silently.

**The draw is a hash, not a tested generator.** It is good enough for chances and lengths. It has 24 bits of resolution, so a chance smaller than one in sixteen million reads as zero, and it has not been tested for the long-run statistics a generator has.

**There are two random mechanisms.** An author must know that a rule draws keyed and that the sequential source belongs to the simulation. The layer rule enforces this, since the domain cannot import the simulation.

**A change to the mixer or a purpose's value moves every draw it touches.** Every log whose spec reads a drawn outcome is recorded again.

## Alternatives considered

**Move the sequential draw into the domain, beside the state it advances, with the simulation re-exporting it.** This was close: one mechanism, and a generator that is already built and tested. It lost because every draw advances one shared state, so a draw's value depends on how many draws came before it in the tick. A new rule that draws, a unit that did not draw because it slept, or a reorder of the system list moves every later draw, and a unit's behaviour changes because of a rule it has nothing to do with. The replay still holds, but every behaviour change becomes a change to every other random behaviour.

**The simulation hands the draw down.** Either it pre-draws a number per unit per tick into a buffer on the world, or it puts a draw function on the world. The buffer costs a draw per unit per tick whether any rule reads it, and a buffer sized to the pool. A function on the world breaks the rule that world state is plain data, and hides a port inside every rule that reads it.

**For a multi-number draw, a fifth hash argument or the index mixed into the key.** Either would count the index apart from the purpose, but both change the hash every existing draw runs, so every recorded log would move with it. Folding the index into the purpose word leaves index 0 the same call it always was.

**A sequential state per unit, seeded at spawn from the seed and the id.** Order-independent across units, and a real generator. It lost because it adds a field to every unit record and to the map-scope reset, and two purposes on one unit still share one sequence, so the ordering problem returns inside the unit. The hash carries no state at all.

## Revisit when

- A rule draws more numbers of one kind for one key on one tick than the index limit allows, or the purpose list outgrows the stride. Then the stride and the limit are raised together, which moves no draw at index 0, or the keyed draw seeds a local sequence and the purpose names the sequence.
- A test or a playtest shows the draw's distribution is visibly off: streaks, or two purposes that move together.
- A map generator arrives and wants the same shape, keyed on a room or a region. If it does, the sequential source has no consumer left and is retired.

## References

Enforced by:

- The layer allow-list in the lint configuration, which keeps the domain from importing the simulation's sequential source.
- The lint rule banning `Math.random`, `Date.now`, and `performance.now` under `src/domain` and `src/simulation`.
- The keyed draw's spec under `tests/domain/random/`, which asserts the purposes are distinct and the draw is a function of its inputs.
- The replay determinism test and the stress test's allocation check under `tests/simulation/`.

---

## Related documentation

- [Architecture decision records](./README.md) — the index and the rules for writing one
- [Simulation loop](../architecture/simulation-loop.md) — the determinism contract the draw serves
- [Simulation coding standards](../standards/simulation-coding.md) — the allocation rule that sets the integer result
- [ADR 0002 — Custom fixed-step simulation](./0002-custom-fixed-step-simulation.md) — why the world owns a seeded source at all
- [ADR 0003 — Layered single-package architecture](./0003-layered-single-package-architecture.md) — why the domain cannot reach the simulation's source
