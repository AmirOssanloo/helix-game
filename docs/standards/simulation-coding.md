# Simulation coding standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Coding standards](./coding.md) · [Simulation loop](../architecture/simulation-loop.md) · [Performance standards](./performance.md)

How code under `src/domain/` and `src/simulation/` is written so that a tick is a pure function of its inputs, runs in Node, and allocates nothing once the world is warm. Where the code goes is in [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md); this page is how it is written once it is there.

---

## Nothing from outside

**No Phaser, no DOM, no `window`, no clock.** These two layers see plain state and nothing else. A type from Phaser is as banned as a runtime import.

**`Math.random`, `Date.now`, and `performance.now` are banned by lint** under both folders. Randomness comes from the world's seeded source; time is the tick count. The reason is replay: a session recorded as an input log must reproduce the same state on another machine, tick for tick, or a bug report cannot be reproduced. [ADR 0002](../adr/0002-custom-fixed-step-simulation.md) holds the argument.

**No `async` anywhere.** A tick runs to completion. Nothing in the simulation waits for anything.

---

## Time is a tick count

Every duration inside the simulation is an integer number of ticks. A cooldown is "ready at tick N", a cast point is "commit at tick N", a status is "expires at tick N".

Content writes seconds because designers think in seconds. **The domain converts seconds to ticks when a definition is loaded**, once, and stores the tick value. A system never multiplies by a tick rate; if it does, the rate has leaked into a rule.

```typescript
// At load, once. Never inside a system.
const cooldownTicks = toTicks(fooDef.cooldownSeconds)
```

---

## Allocation

**A system allocates nothing in steady state.** The tick is on the hot path two hundred times a second at scale, and every garbage object becomes a collector pause that eats a frame.

| Instead of | Write |
| --- | --- |
| A new object or array literal per entity | Write into a preallocated field or a scratch slot |
| A closure passed to a callback | A named function at module level taking the world |
| Spread, `map`, `filter`, `reduce` on the hot path | An index loop over the pool |
| A new vector per operation | The scratch vectors from `shared/`, reset before use |
| String concatenation for a key | Integer cell coordinates packed into one number |
| Two coordinates passed to a call made per unit per tick | The point object the coordinates already live in. The engine boxes a fractional number handed to a call it does not inline, one heap object per argument per call |
| Anything that lives longer than the tick | Acquired from its pool, released back to it |

Allocation at world creation and map load is fine. That is where pools fill. The pool-miss counter in the instrumentation rings reads zero after warm-up, and [Performance standards](./performance.md#quick-reference) say what to do when it doesn't.

---

## Iteration order is fixed

Two runs with the same seed and the same commands must visit entities in the same order, or the replay diverges at the first pile-up.

- **Iterate pools by index**, from zero to the pool's `end`, skipping a slot that reads back `null`. A released slot leaves a hole so every live index stays put. Never by a `Map` or `Set` whose insertion order depends on the history of a session.
- **Never sort with a comparator that can return equal** unless the tie is broken by id. Two units at the same distance are ordered by id, every time.
- **Spatial queries return candidates in cell order, then slot order.** The hash is deterministic given the same positions.
- **Commands in the same tick apply in timestamp order, then by the fixed key priority** on ties. [Commands and events](../architecture/commands-and-events.md#quick-reference) owns that rule.

---

## Systems

A system is a function `(world) => void`, registered once in the single ordered list the simulation owns. It reads and writes world state only through the world it is handed. It holds no module-level state of its own, because module state is a second world that a test cannot reset.

**A rule is a pure function over plain state.** The system that applies it is thin: loop, call the rule, write the result. Test the rule with three arguments; test the system once for the loop. [Testing standards](./testing.md#quick-reference) say how many.

```typescript
export const fooSystem = (world: World): void => {
  for (let i = 0; i < world.map.units.end; i += 1) {
    const unit = world.map.units.at(i)

    if (unit === null) {
      continue
    }

    /* read, decide with a pure function, write */
  }
}
```

---

## Commands and failures

**A command is validated before it mutates anything.** The validator reads the unit's disable flags, its mana, and the ability's clocks, and returns either `ok` or a reason. A refused command changes nothing; the command system announces the refusal as one event carrying the reason, so the screen can flash the key. The event is the only trace it leaves.

**Failures are values.** A rule returns a result with a reason; nothing under these two layers throws for a game outcome. Throwing is for a broken invariant, not for "not enough mana".

---

## Invariants

Two kinds, and the difference is what happens in production.

- **Always-on cheap checks at boundaries.** Command validation, content validation at registry build, pool acquire (refuse past capacity), map load (grid matches bounds). These run in every build because a violation here means corrupted state, and the cost is a comparison.
- **Development-only asserts inside the tick.** `assert(unit.hp >= 0)` in the damage system. Stripped from production by the build, because the tick is the hot path and the invariant is already guaranteed by the boundary checks when the code is right.

---

## Numbers and references

**Every rule number comes from the tuning table or a definition.** A literal in a formula is a number design cannot change, cannot see in the developer panel, and cannot replay. The only literals in a system are `0`, `1`, and identity values.

**Entity references are generational ids, checked on use.** A system that holds an object reference across ticks holds a pointer into a pool slot that may be released and reused. It stores the id and resolves it each tick; a stale generation resolves to nothing, and the rule handles nothing on purpose.

**Floats are fine.** The simulation runs on one machine, so there is no cross-platform replay to protect. Fixed-point arithmetic is not used. What must be avoided is a computation whose *order* varies, not a computation with fractional results.

---

## Anti-patterns

### A helper that keeps its own cache

A pathing module with a module-level `Map` of recent paths. The second test in a file sees the first test's paths, and a replay on a fresh world diverges from the session that produced the log. Caches live on the world.

### A rule that reads the tick rate

`cooldown * 30` inside a system. It is right until the rate changes, and then every rule that copied it is wrong in a different place. Convert once at load.

### A refusal that throws

`throw new NotEnoughMana()` from a cast rule. The caller now needs a `try`, the system loop is interrupted, and a player pressing D on cooldown becomes an exception. Return the reason.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Outside world | No Phaser, DOM, `window`, or clock in `domain/` or `simulation/`, not even as types |
| Randomness and time | The world's seeded source and the tick count. `Math.random`, `Date.now`, `performance.now` are lint failures |
| Asynchrony | None. A tick runs to completion |
| Durations | Integer ticks, converted from seconds once at definition load. A system never multiplies by the tick rate |
| Allocation | None in steady state: no literals, closures, spread, or array methods on the hot path; scratch vectors from `shared/`; a point passed as its object, not its coordinates, to a call made per unit per tick; pools for anything that outlives the tick |
| Iteration | Pools by index from zero to `end`, skipping a `null` slot; no `Map` or `Set` order that depends on history; ties broken by id; queries in cell then slot order |
| A system | `(world) => void`, registered once in the ordered list, no module-level state, thin over pure rules |
| A rule | A pure function over plain state, testable without a world |
| Commands | Validated before any mutation; a refusal changes nothing and is announced as one event with its reason |
| Failures | Returned as values with a reason. Throwing is for broken invariants only |
| Boundary checks | Always on: command validation, content validation, pool acquire, map load |
| Inner asserts | Development only, stripped from production |
| Numbers | From the tuning table or a definition. No literal but `0`, `1`, and identities in a system |
| Entity references | Generational ids resolved each tick, never object references held across ticks |
| Arithmetic | Floats. No fixed-point. Protect the order of operations, not the fractions |

---

## Related documentation

- [Simulation loop](../architecture/simulation-loop.md) — the driver, the tick, and the system order these rules serve
- [Entities and pools](../architecture/entities-and-pools.md) — the pools and ids the reference rule depends on
- [Commands and events](../architecture/commands-and-events.md) — the ordering rule for commands in one tick
- [Performance standards](./performance.md) — the budgets the allocation rule protects
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why determinism is load-bearing
