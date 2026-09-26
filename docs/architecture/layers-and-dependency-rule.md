# Layers and the dependency rule

> **Entry point:** [Architecture](./README.md)
> **See also:** [Simulation loop](./simulation-loop.md) · [Commands and events](./commands-and-events.md) · [Presentation](./presentation.md)

The eight layers under `src/`, what each one is for, and the one rule that holds them apart. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The layers

| Layer | Job | Holds |
| --- | --- | --- |
| `shared/` | Pure helpers with no game knowledge | Vector math without allocation, angle wrap, clamp, ring buffer, assert, generational ids, an integer hash |
| `domain/` | **Decides.** Pure rules over plain state | Definition types and their validation schema, entity kinds and pools, the command and event unions, the order state machine, movement, pathing, the ability pipeline, the attack, the hero's Invoke mechanics, stats, combat, AI, map derivation, and `public.ts` |
| `simulation/` | **Orchestrates.** Owns a world and steps it | The world with its run scope and map scope, the seeded random source, the command buffer, the event ring, the fixed system order, `tick`, input-log recording and replay, and `public.ts` |
| `content/` | Typed data | One file per spell, enemy ability, enemy, status, form, and map; the hero; the tuning table; the atlas frame list; a registry index that assembles them for the domain to validate |
| `instrumentation/` | Measures | Preallocated sample rings: tick time, render time, live counts, pool misses, frame rate |
| `presentation/` | **Adapts.** Where Phaser is used | Scenes, the shape atlas, pooled views, input mapping, camera, HUD, debug overlays |
| `devtools/` | The developer panel | The HTML panel and `DevApi` |
| `app/` | Composition root | The Phaser game config, the game construction, the fixed-step driver, the wiring |

The domain never imports content. The simulation receives the content registry when a world is created, so a test can hand it three definitions instead of three hundred. Content imports domain **types** only, never domain functions, and points at named effects and behaviours by string key.

---

## The dependency rule

Imports run one way. The lint configuration states this as an allow-list, and a wrong-direction import fails the build:

| Layer | May import |
| --- | --- |
| `shared` | nothing under `src/` |
| `domain` | `shared` |
| `simulation` | `domain`, `shared` |
| `content` | `domain` types, `shared` |
| `instrumentation` | `shared` |
| `presentation` | `simulation/public`, `domain/public`, `shared`, Phaser |
| `devtools` | `simulation/public`, `domain/public`, `instrumentation`, `shared` |
| `app` | everything |

Three things follow from the table:

- **`domain` and `simulation` import no Phaser, no DOM, no `window`, and no clock.** They run in Node. Lint also bans `Math.random`, `Date.now`, and `performance.now` under both, so a tick is a function of its inputs. [Simulation coding standards](../standards/simulation-coding.md#quick-reference) hold the detail.
- **`presentation` is where Phaser is used, and `app` may import it only to construct the game.** The composition root builds the game config, creates the game, and hands it the scenes; it never builds a view, reads a game object, or draws. A Phaser type appearing in any other layer is a build failure.
- **The wall clock lives in `app/`.** The fixed-step driver feeds Phaser's frame delta into an accumulator and calls `tick` with a constant step. Time inside the domain is a tick count.

---

## The public doors

Everything outside a layer enters it through its `public.ts`.

- **`domain/public.ts`** exports the types other layers need to name things: entity state shapes, the command and event unions, definition types.
- **`simulation/public.ts`** exports the simulation API — create a world, load a map, submit commands, `tick`, dispose — and a `Readonly` view of world state. The view is a compile-time type over the live state and costs nothing at runtime; the presentation reads it by reference during sync and copies nothing.

Only the composition root reaches past a door.

```typescript
// presentation reads through the door and never past it
import type { WorldView } from '@simulation/public'

export const syncFooViews = (world: WorldView): void => { /* … */ }
```

---

## Where does my code go?

Most placement questions come down to one: **does it decide, orchestrate, describe, draw, or wire?**

| What you're writing | Where it goes |
| --- | --- |
| A rule about what a unit may do | `domain/orders/` or the module that owns the rule |
| A per-tick pass over world state | The owning `domain/` module, registered in `simulation/systems.ts` |
| A new entity kind | `domain/entities/` |
| A new command or event variant | `domain/commands/`, `domain/events/` |
| A named effect a spell references | `domain/abilities/effects/` |
| An AI behaviour an enemy references | `domain/ai/behaviours/` |
| A random draw in a rule | The keyed draw in `domain/random/`, with a new entry in its purpose list |
| A spell, enemy, status, or map | `content/<kind>/` |
| A number design will retune | The tuning table in `content/`, read through world state |
| Anything that draws or reads input | `presentation/` |
| A developer-panel control | `devtools/`, issuing a `DebugCommand` |
| A timing sample | `instrumentation/` |
| Wiring two layers together | `app/` |

A function that both decides and draws is two functions.

---

## Anti-patterns

### A domain module that reads the clock

A cooldown computed from `Date.now()`. It works on the author's machine, drifts on a slow one, and makes a replay diverge. Cooldowns are tick counts, and the driver owns the clock.

### A view that decides

A view that checks whether a unit is stunned and skips drawing its facing. The rule now lives in two places and the second one is invisible to tests. The domain sets a flag; the view reads it.

### Content that calls the domain

A spell definition importing an effect function and calling it. The registry can no longer validate the key, the content test needs the whole domain, and a rename breaks silently. Content names the effect; the domain looks it up.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The split | Rules in `domain/`, orchestration in `simulation/`, data in `content/`, drawing in `presentation/`, wiring in `app/` |
| `shared` may import | Nothing under `src/` |
| `domain` may import | `shared` |
| `simulation` may import | `domain`, `shared` |
| `content` may import | `domain` types only, `shared` |
| `instrumentation` may import | `shared` |
| `presentation` may import | `simulation/public`, `domain/public`, `shared`, Phaser |
| `devtools` may import | `simulation/public`, `domain/public`, `instrumentation`, `shared` |
| `app` may import | Everything. It is the one place that knows concrete wiring |
| Phaser | Used in `presentation`; imported in `app` only to construct the game; a build failure anywhere else |
| Clock, DOM, `window` | Never in `domain` or `simulation` |
| `Math.random`, `Date.now`, `performance.now` | Banned by lint under `domain` and `simulation` |
| Time in the domain | A tick count |
| Content and the domain | The domain never imports content; content references effects and behaviours by string key |
| Entering a layer | Through its `public.ts`; only the composition root reaches past it |
| The world view | A `Readonly` type over live state, read by reference during sync, never copied |
| A function that decides and draws | Split it |

---

## Related documentation

- [Simulation loop](./simulation-loop.md) — what the driver and `tick` do with these layers
- [Commands and events](./commands-and-events.md) — the only way state enters and leaves the simulation
- [Presentation](./presentation.md) — what the one Phaser layer holds
- [ADR 0003 — Layered single-package architecture](../adr/0003-layered-single-package-architecture.md) — why the layers are split this way
- [Coding standards](../standards/coding.md) — the naming these folders follow
