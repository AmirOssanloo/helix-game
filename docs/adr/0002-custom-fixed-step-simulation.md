# ADR 0002 — The simulation is our own fixed-step tick, not a physics engine

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Status**        | Accepted                                               |
| **Date**          | 2026-09-19                                             |
| **Deciders**      | Amir Ossanloo, with the engineering architect          |
| **Supersedes**    | None                                                   |
| **Superseded by** | None                                                   |

## Context

Phaser 4 ships two physics systems, both optional and enabled per scene. Arcade Physics is Phaser's own lightweight system: rectangle and circle bodies, velocity and drag, `collider` and `overlap` pairs, an RTree broadphase, and a fixed step at 60 per second by default. Matter.js is a full rigid-body solver with mass, friction, constraints, and compound bodies. The obvious question for a game with units that move and collide is whether one of them should move our units.

What the game needs from a simulation is specific, and most of it is not physics:

- A **fixed tick at 30 Hz**, rendered at display refresh with interpolation, because turn rate, cast points, and cooldowns are time values, not frame counts. the reference game's own turn-rate source uses 0.03 s steps, and the [mechanics spec](../product/specs/character-movement-and-mechanics.md) is written in those units.
- **Turn-then-move locomotion.** A unit yaws toward its target at a fixed angular rate with a short ramp, and only translates or casts once its bearing is inside an 11.5 degree action cone. Shortest-arc turning, order replacement, a state machine.
- **Constant speed along a path.** Each tick a moving unit advances exactly speed times the step along its polyline. No acceleration, no momentum, no sliding. Every physics engine integrates velocity and changes it on contact, which is the opposite of this rule.
- **Hard disc push-out.** Units are solid circles. Overlapping pairs separate along the centre line; a unit inside an obstacle is pushed to the nearest edge. Enemies push each other rather than steering around each other.
- **Grid pathfinding** for the hero and up to two hundred enemies, with a budget so re-pathing does not spike a tick.
- **Range and segment queries** for aggro, attack range, area spells, and attack-move, without two hundred squared distance checks.
- **Projectile sweeps.** A projectile at 900 units per second moves 30 units per tick, more than a unit's radius, so it must test the segment it travelled, not the point it landed on.
- **Determinism.** The same seed and input log must produce the same state, so a bug report is a replay.
- **Testability in Node**, with no canvas and no DOM, and **zero allocation** inside the tick, with a budget of about 4 ms worst case.

Reading the Phaser 4.2.1 source settled what Arcade actually does. Its circle separation is impulse based: it computes a momentum exchange from masses and relative velocity, applies it to both velocities, multiplies by bounce, and only then pushes positions apart. Its broadphase clears and reloads the RTree from a freshly allocated array every step. A body no longer needs a game object, but the Phaser import and the DOM requirement remain, so domain tests would need jsdom. Nothing in Arcade's design or tests protects determinism. Matter.js, bundled at 0.20.0, had its last upstream commit in August 2024 with 278 open issues.

The people who feel this are the player, who notices when a unit slides after stopping or turns faster on a 144 Hz display, and the engineer who cannot reproduce a bug because two clocks disagree.

## Decision

**The simulation is a custom fixed-step tick in plain TypeScript under `domain/` and `simulation/`. No physics engine and no collision library. The `physics` key is absent from the Phaser game config, and Phaser never owns a position, velocity, facing, or radius.**

The tick runs at 30 Hz with a constant step. The presentation interpolates between the previous and current tick positions, both stored in the domain, so movement is smooth at any refresh rate. The per-tick turn step is scaled by the step over 0.03 s, so the turn rate in the mechanics spec keeps its wall-clock meaning. The domain owns positions; sprites are written during presentation sync and never read.

The six things the simulation builds itself, each in the module that owns it:

| Need | Built as |
| --- | --- |
| Turn-then-move locomotion | A state machine over Idle, Turning, Moving, and Casting, with shortest-arc yaw at the fixed rate, the action cone, and order replacement |
| Constant speed along a path | Advance by speed times step along the polyline, clamped to what remains. No velocity state survives a tick |
| Hard disc push-out | Circle-versus-circle and circle-versus-rectangle positional separation after movement, a capped number of passes starting at three, no velocity response |
| Grid pathfinding | A* on 32-unit cells with a binary heap, line-of-sight smoothing, obstacles inflated per unit radius class, and a per-tick re-path budget for enemies. No navigation mesh |
| Range and segment queries | A uniform spatial hash on 128-unit cells keyed by integer cell coordinates, supporting insert, move, circle query, and segment query |
| Projectile hits | A segment sweep from the previous to the current position against candidate discs from the spatial hash. A homing projectile tests only its target |

Determinism is a rule set, not a hope: floats with fixed iteration order, a seeded random source owned by the world, lint bans on `Math.random`, `Date.now`, and `performance.now` under `domain/` and `simulation/`, and a replay test in continuous integration. Single-machine replay is the requirement; fixed-point arithmetic is not.

The clock lives in the app's fixed-step driver. It accumulates the frame delta, runs at most three ticks per frame and then drops time, and pauses when the tab is hidden, freezing cooldowns and discarding input received while hidden.

```typescript
// the driver owns the clock; the tick owns nothing but its inputs
export const tick = (world: World, commands: readonly Command[]): void => { /* … */ }
```

The budget is proven, not assumed: a Vitest stress test ticks 300 units with random orders on a 4000 by 4000 arena and asserts a mean tick under 4 ms on the reference laptop, and a replay test feeds a recorded input log through two worlds and compares them tick by tick.

The accepted cost is eleven to twelve engineer days: about two for locomotion and the state machine, half a day for constant-speed path following, one for push-out, two for the grid and A*, one for the spatial hash, half a day for sweeps, and the rest for the fixed-step loop, the seeded random source, pools, debug hooks, and the tests.

## Consequences

### What this makes easy

**The mechanics spec is implementable as written.** Turn rate, action cone, order replacement, and cooldown timing are tick arithmetic in one clock. Nothing has to be translated into a velocity for an engine to integrate and then corrected afterwards.

**A bug report is a replay.** Same seed, same input log, same state. The engineer opens the log, steps to the tick, and looks. The designer retuning a number sees the same fight twice.

**Every rule runs in a Node test in a millisecond.** No canvas, no jsdom, no Phaser boot. The acceptance tests in the mechanics spec are ordinary unit tests, and people run them.

**Zero allocation is achievable.** Pools, a preallocated spatial hash, and a preallocated open list for A* mean the tick produces no garbage, so there is no collector pause in the middle of a fight.

**Phased, flying, or displaced units are one rule each.** Updraft lifting a unit, Clarion pushing one, Bolide rolling across a pack — these are scripted motion the domain writes directly, with no solver to argue with.

### What this makes hard

**We own collision and pathing code.** Roughly a third of the simulation budget goes on things a library would hand us. Bugs in push-out under a fifty-unit pile-up, or in path smoothing around a corner, are ours to find.

**A* on a grid has known limits.** Diagonal-looking paths, inflation per radius class, and the re-path budget all need tuning against real enemy counts. Real levels may eventually want a navigation mesh, and that is a rewrite of one module.

**Thirty-three milliseconds of input latency is a design bet.** A command issued just after a tick waits for the next one. the reference game players are used to this; a player who is not may feel it.

**Debug visualisation is our job too.** With no engine debug renderer, the domain has to expose discs, ranges, paths, and cells for the presentation to draw.

## Alternatives considered

**Arcade Physics as the integrator.** Collision, separation, world bounds, and overlap queries exist today, and `world.step` is public, so it could be driven from our accumulator. It lost on four counts. Positions would live on bodies, and even though a body no longer needs a game object, the Phaser import and DOM requirement remain, so domain tests need jsdom. Its default 60 Hz step against our tick is two clocks, and aligning them is a permanent source of subtle bugs. Its separation is impulse based and designed for platformers, so disc pile-ups jitter and a unit holding constant path speed has its velocity changed by every contact. And nothing protects determinism: the broadphase rebuilds from a fresh allocation every step, which also breaks the zero-allocation goal. It would have saved two to three days and cost them back before enemies shipped.

**Matter.js.** A robust solver with sensors and compound bodies. It lost because everything in it — mass, restitution, friction — is the wrong feel for units that stop on a dime and turn at a fixed angular rate, and because the upstream project has been stalled since 2024.

**A hybrid: custom simulation with Arcade for broadphase only.** Reuses one hard piece. It lost because bodies would still need creating for the one feature a forty-line spatial hash replaces, and the boundary would break for nothing.

**Third-party engines and collision libraries.** Surveyed and rejected one by one: phaser-box2d (stalled, rigid-body, in metres), Planck.js (healthy, but a full Box2D solver nothing on our list needs), Rapier 2D (the best-maintained solver on the web, with a deterministic build, but WASM in the domain and a solver we do not need — the one to reach for if rigid-body behaviour is ever required), check2d (detection only and the closest fit, but it allocates fresh arrays per query and pulls in three dependencies for what a spatial hash does in forty lines), the standalone Arcade extraction (abandoned, LGPL), and pathfinding libraries such as easystarjs and pathfinding (old, allocate per search, and would still need our smoothing and budget). Common to all of them: none provides turn-then-move locomotion, constant-speed path following, grid A*, or scripted displacement, which are the expensive rows. The engines only cover push-out and range queries, which are the cheap ones.

## Revisit when

- **Thirty-three milliseconds of input latency feels wrong in play testing.** The remedy is 60 Hz, which the driver and the turn-step scaling already allow. The mechanics spec would change its tick constant and nothing else.
- **The profile shows the tick over budget with pooled objects.** Then the entity stores move to typed arrays, which the domain's module boundaries are shaped to allow. See [ADR 0003](./0003-layered-single-package-architecture.md).
- **A second consumer needs the simulation off the main thread** — a headless balance tool or a worker — which the Phaser-free layering permits but this record did not design for.
- **Real levels need a navigation mesh.** Grid A* with smoothing is the choice for hand-authored arenas and early generated dungeons; if generated geometry makes it visibly wrong, the pathing module is replaced and its callers are not.
- **Rigid-body behaviour is genuinely required** by a design that does not exist today. Rapier 2D is the candidate.

## References

Enforced by:

- The absence of the `physics` key in the game config under `src/app/`. An architecture test asserts it stays absent.
- Lint rules banning `Math.random`, `Date.now`, and `performance.now` under `src/domain` and `src/simulation`, and the layer allow-list that keeps Phaser out of both.
- `tests/architecture.spec.ts`, which asserts the layer table and the config invariant.
- The stress test and the replay determinism test under `tests/simulation/`, which are the budget proof and the determinism proof, run in continuous integration.

---

## Related documentation

- [Simulation loop](../architecture/simulation-loop.md) — the driver, the accumulator, the tick, and the system order
- [Movement, collision, and pathing](../architecture/movement-collision-pathing.md) — the six pieces this record commits to building
- [Simulation coding standards](../standards/simulation-coding.md) — the determinism and allocation rules
- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the numbers and acceptance tests the simulation implements
- [ADR 0001 — Phaser renderer and quad atlas](./0001-phaser-renderer-and-quad-atlas.md) — the other half of "Phaser draws, the simulation decides"
