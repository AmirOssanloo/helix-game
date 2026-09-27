# Layers and the dependency rule

> **Entry point:** [Architecture](./README.md)
> **See also:** [Simulation loop](./simulation-loop.md) · [Commands and events](./commands-and-events.md) · [Presentation](./presentation.md)

The eight layers under `src/`, what each one is for, and the one rule that holds them apart. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The layers

| Layer | Job | Holds |
| --- | --- | --- |
| `shared/` | Pure helpers with no game knowledge | Vector math without allocation, angle wrap, clamp, ring buffer, assert, generational ids, an integer hash |
| `domain/` | **Decides.** Pure rules over plain state | Definition types and their validation schema, entity kinds and pools, the command and event unions, the order state machine, movement, pathing, the ability pipeline, the attack, the hero's Invoke mechanics, stats, combat, AI, map derivation, items, loot, the store, and three doors: `public.ts`, `queries.ts`, and `rules.ts` |
| `simulation/` | **Orchestrates.** Owns a world and steps it | The world with its run scope and map scope, the seeded random source, the command buffer, the event ring, the fixed system order, `tick`, input-log recording and replay, the session that owns the world and switches it between live play and a replay, `public.ts`, and `testing.ts` |
| `content/` | Typed data | One file per spell, enemy ability, enemy, status, form, map, item base, affix, loot table, and Legendary piece; the hero; the rarity table; the tuning table; the atlas frame list; a registry index that assembles them for the domain to validate |
| `instrumentation/` | Measures | Preallocated sample rings: tick time, render time, live counts, pool misses, frame rate |
| `presentation/` | **Adapts.** Where Phaser is used | Scenes, the shape atlas, pooled views, the input claim and input mapping, camera, HUD, screens, debug overlays |
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
| `simulation` | `domain/public`, `domain/queries`, `domain/rules`, `shared` |
| `content` | `domain/public` types, `shared` |
| `instrumentation` | `shared` |
| `presentation` | `simulation/public`, `domain/public`, `domain/queries`, `shared`, Phaser |
| `devtools` | `simulation/public`, `domain/public`, `domain/queries`, `instrumentation`, `shared` |
| `app` | every layer, through the doors open to it |

Three things follow from the table:

- **`domain` and `simulation` import no Phaser, no DOM, no `window`, and no clock.** They run in Node. Lint bans `Math.random`, `Date.now`, and `performance.now` under both in every spelling, called or read, destructured, by a computed key, or through `globalThis`, `self`, or `window`, and `Date` called, or constructed with no argument, by name or through the same three, so a tick is a function of its inputs. It also bans the host's globals there: the page (`window`, `document`, `navigator`, `requestAnimationFrame`), the timers (`setTimeout`, `setInterval`, `queueMicrotask`), storage and the network (`localStorage`, `sessionStorage`, `fetch`), `crypto`, `structuredClone`, and `globalThis` and `self` themselves. `shared`, `domain`, and `simulation` are typechecked a second time as their own project with no DOM library and no ambient types, so a host name that lint misses does not resolve. [Simulation coding standards](../standards/simulation-coding.md#quick-reference) hold the detail.
- **`presentation` is where Phaser is used, and `app` may import it only to construct the game.** The composition root builds the game config, creates the game, and hands it the scenes; it never builds a view, reads a game object, or draws. A Phaser type appearing in any other layer is a build failure.
- **The wall clock lives outside the tick.** The fixed-step driver in `app/` feeds Phaser's frame delta into an accumulator and calls `tick` with a constant step, and owns tick time. Time inside the domain is a tick count. The boot's seed and the panel's refresh timer read the clock too, and neither changes world state; [Simulation loop](./simulation-loop.md#the-driver) says why.

---

## The public doors

Everything outside a layer enters it through a door: a file at the layer's root that exports what outer layers use and nothing more. Most layers have one, `public.ts`. The domain has two audiences, so it has three:

| Door | Holds | Imported by |
| --- | --- | --- |
| `domain/public.ts` | Types only: entity state shapes, the command and event unions, definition types | `simulation`, `content`, `presentation`, `devtools`, `app` |
| `domain/queries.ts` | Pure reads and the constants they read by. Each takes its arguments read-only, writes only into an `out` record its caller owns, and allocates nothing; the `create` functions here make such a record once | `simulation`, `presentation`, `devtools`, `app` |
| `domain/rules.ts` | Systems, pool and record constructors, mutators, and the content checks | `simulation`, `app` |

- **Why a mutator is behind its own door.** A `Readonly` view does not stop view data being passed into a function that writes it; TypeScript accepts the call. So the presentation and the developer panel are never given a mutator to call. A reader that needs a piece of a rule gets a query for that piece alone, such as a behaviour's kind or a kit's slot reads, never the rule itself.
- **`simulation/public.ts`** exports a session's handle — make one, submit commands, `tick`, recreate, retune it under a reloaded registry, save and load its log — the `Readonly` view of world state, and the event ring's read port. The view is a compile-time type over the live state and costs nothing at runtime; the presentation reads it by reference during sync and copies nothing. The read port reads events and moves the caller's own reader, and has no write and no clear. The world itself, its systems, its command buffer, its random source, and the replay are behind the door.
- **`testing.ts`**, beside a `public.ts` that needs one, is the door for tests: what is behind `public.ts`, for a spec to arrange a world and step it. The scripts under `tooling/` that replay a stored log take it too. Nothing under `src/` imports one.

The composition root enters each layer through its doors like every other layer. Lint states the doors as a table in `eslint/matrix.js`, and the architecture test holds every module reference to it, re-exports and dynamic imports included. It also holds `domain/public.ts` to types.

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
| An item, the inventory, the armory, gold, or a price | `domain/items/` |
| A drop, its roll, or taking what lies on the ground | `domain/loot/`; the ground item itself is `domain/entities/` |
| The store, its stock, and its commands | `domain/store/` |
| A spell, enemy, status, map, or item definition | `content/<kind>/`; every item kind under `content/items/` |
| A number design will retune | The tuning table in `content/`, read through world state |
| Anything that draws or reads input | `presentation/` |
| A developer-panel control | `devtools/`, issuing a `DebugCommand` |
| A timing sample | `instrumentation/` |
| Wiring two layers together | `app/` |

A function that both decides and draws is two functions.

A file under `src/` is at most 500 raw lines, blank and comment lines counted as `wc -l` counts them. A file over it is doing more than one job. Map definitions are exempt, since a map is as long as its data, not its logic; any other file let past the limit is listed in `eslint/size-limit.js` with its reason, leaves the list when it is split, and a new file never joins it.

---

## Anti-patterns

### A view that decides

A view that checks whether a unit is stunned and skips drawing its facing. The rule now lives in two places and the second one is invisible to tests. The domain sets a flag; the view reads it.

### A view handed to a mutator

A HUD click handler that imports a rule to spend the hero's mana and passes it the unit from the world view. It compiles, since `Readonly` does not survive assignment, and it changes world state outside a tick, so a replay diverges. The rules door is shut to the presentation; the handler submits a command.

### Content that calls the domain

A spell definition importing an effect function and calling it. The registry can no longer validate the key, the content test needs the whole domain, and a rename breaks silently. Content names the effect; the domain looks it up.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The split | Rules in `domain/`, orchestration in `simulation/`, data in `content/`, drawing in `presentation/`, wiring in `app/` |
| `shared` may import | Nothing under `src/` |
| `domain` may import | `shared` |
| `simulation` may import | `domain/public`, `domain/queries`, `domain/rules`, `shared` |
| `content` may import | `domain/public` types only, `shared` |
| `instrumentation` may import | `shared` |
| `presentation` may import | `simulation/public`, `domain/public`, `domain/queries`, `shared`, Phaser |
| `devtools` may import | `simulation/public`, `domain/public`, `domain/queries`, `instrumentation`, `shared` |
| `app` may import | Every layer, through the doors open to it. It is the one place that knows concrete wiring |
| Phaser | Used in `presentation`; imported in `app` only to construct the game; a build failure anywhere else |
| Clock, DOM, `window` | Never in `domain` or `simulation` |
| `Math.random`, `Date.now`, `performance.now`, `Date()`, `new Date()` | Banned by lint under `domain` and `simulation`: the first three in every spelling, read, destructured, computed, or through `globalThis`, `self`, or `window`; `Date` called, or constructed with no argument |
| Host globals | Banned by lint under `domain` and `simulation`: `window`, `document`, `navigator`, `requestAnimationFrame`, `setTimeout`, `setInterval`, `queueMicrotask`, `localStorage`, `sessionStorage`, `fetch`, `crypto`, `structuredClone`, `globalThis`, `self` |
| The DOM-free typecheck | `shared`, `domain`, and `simulation` also compile with no DOM library and no ambient types (`tsconfig.dom-free.json`) |
| File size | At most 500 raw lines per file under `src/`, blank and comment lines counted as `wc -l` counts them. Map definitions are exempt as data; every other file over it is listed in `eslint/size-limit.js` with its reason, leaves the list when it is split, and no new file joins it |
| Time in the domain | A tick count |
| Content and the domain | The domain never imports content; content references effects and behaviours by string key |
| Entering a layer | Through a door open to the importing layer: `public.ts`, or the domain's `queries.ts` or `rules.ts`. Lint and the architecture test hold it |
| The domain's doors | `public.ts` types only; `queries.ts` pure reads; `rules.ts` systems, constructors, and mutators, for `simulation` and `app` only |
| `testing.ts` | Tests and `tooling/` scripts only; nothing under `src/` imports it |
| The event ring outside the simulation | Its read port: read and skip, never write or clear |
| The world view | A `Readonly` type over live state, read by reference during sync, never copied |
| A function that decides and draws | Split it |

---

## Related documentation

- [Simulation loop](./simulation-loop.md) — what the driver and `tick` do with these layers
- [Commands and events](./commands-and-events.md) — the only way state enters and leaves the simulation
- [Presentation](./presentation.md) — what the one Phaser layer holds
- [ADR 0003 — Layered single-package architecture](../adr/0003-layered-single-package-architecture.md) — why the layers are split this way
- [Coding standards](../standards/coding.md) — the naming these folders follow
