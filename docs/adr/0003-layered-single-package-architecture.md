# ADR 0003 — Domain decides, simulation orchestrates, presentation adapts — in one package

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Status**        | Accepted                                               |
| **Date**          | 2026-09-20                                             |
| **Deciders**      | Amir Ossanloo, with the engineering architect          |
| **Supersedes**    | None                                                   |
| **Superseded by** | None                                                   |

## Context

A game has three kinds of code. One decides: whether a fourth orb evicts the oldest, whether a stunned unit may turn, how much damage armour removes. One orchestrates: run the systems in order, hand out ids, count ticks, own the random source. One draws and listens: put a sprite where the unit is, turn a key press into an intent. Deciding code needs nothing but plain state. Orchestrating code needs a world but no screen. Drawing code needs Phaser, a canvas, and a GPU.

When they share a folder, the fast kind inherits the slow kind's problems. A rule about orb eviction that lives in a scene needs a booted Phaser game before a test can ask it a question. Tests get slow, people run them less, and a bug that a replay would have pinned to a tick becomes a guess. No tool can help, because the folder is the only signal a lint rule can read. So the folder has to carry the distinction.

Two things sharpen the question for Helix. The game is small now and intends to grow to items, inventory, loot, procedural dungeons, acts, and a town, each of which adds content and systems without changing the tick. And the team is small, so every structural cost is paid by the same two or three people who pay the cost of getting it wrong. [ADR 0002](./0002-custom-fixed-step-simulation.md) already commits the simulation to running in Node with no Phaser; this record decides what surrounds it.

The people who feel this are the engineer who wants to test a rule in a millisecond, the designer who wants a tuning change to show up in a replay, and the next engineer who has to place a loot table without asking.

## Decision

**The code is eight layers in one package, and the folder a file sits in is its contract.** [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) states the table; this record is where it is argued.

| Layer | Job | May import |
| --- | --- | --- |
| `shared` | Pure helpers with no game knowledge | nothing under `src/` |
| `domain` | Decides. Rules over plain state | `shared` |
| `simulation` | Orchestrates. The world, the tick, the system order | `domain`, `shared` |
| `content` | Typed data. One file per definition | `domain` types, `shared` |
| `instrumentation` | Preallocated sample rings | `shared` |
| `presentation` | Adapts. The only place Phaser is imported | `simulation/public`, `domain/public`, `shared`, Phaser |
| `devtools` | The developer panel and its API | `simulation/public`, `domain/public`, `instrumentation`, `shared` |
| `app` | Composition root | everything |

The rules that follow:

- **Domain and simulation are two layers, not one.** The domain holds rules and never sees a clock, the content registry, or a world lifetime. The simulation holds the world, the seeded random source, the command buffer, the event ring, and the one file that lists the systems in tick order. The domain never imports content; the simulation receives the content registry when a world is created.
- **Every layer is entered through its `public.ts`.** `domain/public.ts` exports the types other layers name things with. `simulation/public.ts` exports the simulation API and a `Readonly` view of world state that the presentation reads by reference during sync. The view is a compile-time type and costs nothing at runtime. Only the composition root reaches past a door.
- **The wall clock lives in `app/fixed-step-driver.ts`.** It feeds the frame delta into an accumulator, runs zero to three ticks, measures around each for instrumentation, and pauses when the tab is hidden. `tick` takes a constant step and the pending commands and reads no clock. Time inside the domain is a tick count; cooldowns, cast points, and turn steps are tick arithmetic.
- **Entities are pooled plain objects with generational numeric ids** and fixed capacities — 512 units, 512 projectiles, 256 effects — with free lists. The domain stores previous and current position per entity so the presentation can interpolate. Typed arrays are the fallback if a profile shows the tick over budget, not the starting point.
- **The world has two lifetimes.** Run scope holds the hero, the tunables, and the random source, and later inventory and progression. Map scope holds enemies, projectiles, zones, and effects, and later ground items. Loading a map resets map scope and never touches run scope, so no code may assume the hero is recreated per map.
- **Three scenes: Boot, Play, Hud.** Debug overlays are the top depth band inside the play scene with their own quad pool and a toggle, not a fourth scene, because a parallel scene would need its camera copied from the play camera every frame. The HUD scene runs in parallel with its own camera. The arena is a map definition the play scene loads, not a scene of its own.
- **One package.** Root `package.json`, one `src/`, tests under `tests/` mirroring it, the benchmark under `bench/`. The boundary is an ESLint allow-list derived from the table above, Node-only tests for `domain`, `simulation`, and `content`, and `tests/architecture.spec.ts` asserting the same table a second time.
- **Tooling.** Node LTS current at project start, pinned in `.nvmrc` and `packageManager`. pnpm, Vite, Vitest in the Node environment with jsdom only for presentation adapter tests, ESLint flat config, Prettier defaults. No browser-driving test framework until there are enemies to drive against.
- **Invariants.** Always-on cheap invariants at layer boundaries: command validation, content validation, pool acquire, map load. Development-only asserts inside the tick, stripped from production.
- **Decision records live in `docs/adr/`**, and the repository is initialised with this layout: `main` plus short-lived branches, conventional commits.

Rules stated now so that later scope lands without a rewrite, none of which adds code today:

- **View pool capacity is a presentation number**, sized to what fits on screen plus a margin, not to simulation capacity. Sync asks the spatial hash for entities inside the camera rectangle and binds views to those, releasing a view when its entity leaves. Domain-owned previous and current positions make a freshly bound view interpolate correctly on its first frame.
- **Static map geometry is drawn by a tile layer**, never one sprite per tile. The arena's rectangles stay quads; the first real level uses a tilemap layer in the presentation with one extra draw call. The domain map is already a grid and never learns how it is drawn.
- **Simulation cost is bounded by a live cap, not the map.** Packs on a large map sit dormant as spawn data until the hero comes within an activation radius, a rule in the AI module using the spatial hash.
- **Later folders each land in a layer that exists.** `domain/progression`, `domain/items`, `domain/loot`, `domain/map/generation`, `content/stages`, `content/items`, `content/enemies/bosses`, and a DOM `ui/` adapter with the same import row as `devtools`. Usable items are abilities cast through `domain/abilities`, which is why the hero's Invoke mechanics are a separate module from the cast pipeline. Item passives are modifier sources in `domain/stats`, which is why stats are separate from combat.

```typescript
// the presentation names domain things through the door, and never past it
import type { WorldView } from '@simulation/public'

export const syncFooViews = (world: WorldView): void => { /* … */ }
```

## Consequences

### What this makes easy

**A rule is a millisecond test.** Orb eviction, disable flags, damage mitigation, and the order state machine are functions over plain state. The acceptance tests in the mechanics spec run in Node with no boot, so people run them before pushing.

**A new engineer can place code without asking.** "Does it decide, orchestrate, describe, draw, or wire?" maps to a folder, and the wrong answer fails the build instead of waiting for review.

**Tools enforce the boundary.** A Phaser import in the domain, a clock read in the simulation, or a content file calling a domain function is a lint failure and an architecture test failure, in that order.

**Items, dungeons, and a town arrive as folders, not rewrites.** Run scope versus map scope, view binding by camera rectangle, and the live cap were each one sentence to state now. Each would have been a week to retrofit.

**Moving to a workspace later is a rename.** The four Phaser-free layers never import upward, so when a second consumer of the simulation appears the move is `git mv` plus a `package.json`, and nothing inside them changes.

### What this makes hard

**There are more folders and more indirection.** A new spell can touch a definition, a named effect, an event variant, and a view. That is the price, and it pays for itself the first time a rule is tested without a canvas.

**"Decide or orchestrate" needs judgment at the edge.** Where the command validator ends and the system that applies commands begins is a line two thoughtful people can draw differently. Prefer moving logic over inventing a new layer.

**The `Readonly` view is a promise, not a wall.** A cast to the mutable type compiles. The rule holds because lint bans the cast under `presentation` and `devtools`, and because review knows to look.

**Pooled objects with generational ids are a discipline.** Holding an entity reference across a tick, instead of an id checked against the generation, is the bug this shape invites, and every system has to be written knowing it.

## Alternatives considered

**An entity-component-system library, such as bitecs or miniplex.** A good fit on paper: struct-of-arrays storage suits the zero-allocation and two-hundred-entity goals, and composing enemy abilities from components is natural. It lost on three counts. The ceremony is high for a team of this size. Ability logic with rich per-cast state — Updraft lifting units for a duration, Glacier placing segments, a summon with an owner and a lifetime — tends to fight pure component models and ends up as escape hatches. And it puts a dependency with its own update cadence in the hottest code path. Pooled objects with a fixed system order get the same testability with less to learn.

**Phaser-centric scenes holding the logic.** The fastest first demo. It lost because it is untestable without a canvas, cannot be deterministic, and turns `update` into the game. Both role documents reject it; it is listed so the rejection is explicit.

**A pnpm workspace from day one**, with the simulation, content, and the Phaser app as separate packages. It makes the boundary structural rather than a lint rule, and the simulation could be reused by a headless balance tool. It lost on overhead for a small team: cross-package type builds and slower iteration for a boundary that lint and an architecture test already enforce. It was close, and the layering is designed so the move is cheap when it is earned.

**One `sim` layer instead of separate domain and simulation.** Fewer folders. It lost because the tick loop, the random source, and the world lifetime are orchestration, and putting them beside the rules means a rule test needs a world. Splitting them mirrors the decide-versus-do split that has worked before, and costs one folder.

## Revisit when

- **Something other than the Phaser app imports `simulation/public`** — a headless balance tool, a map-generation command line, or the simulation running in a worker thread. That day, `shared`, `domain`, `simulation`, and `content` move to a `packages/sim` workspace package.
- **The profile shows pooled objects over the tick budget** at the enemy counts the design needs. Then the entity stores move to typed arrays behind the same pool interface.
- **A fourth scene is genuinely needed** — a menu, a town, an inventory that cannot be a DOM adapter. The three-scene rule is a default, not a law, and the reason for it (camera copying) should be re-checked against what the fourth scene needs.
- **The "decide or orchestrate" question keeps landing in review** without a clear answer: the test needs sharpening, or a third category exists.

## References

Enforced by:

- The layer allow-list in the ESLint flat config at the repository root, derived from the table above. A wrong-direction import fails the build.
- The lint rules banning `Math.random`, `Date.now`, `performance.now`, and casts away from the `Readonly` world view outside the simulation.
- `tests/architecture.spec.ts`, which asserts the layer table, the absent `physics` config key, and that no spec file lives under `src/`.
- The Vitest configuration, which runs `tests/domain`, `tests/simulation`, and `tests/content` in the Node environment, so a Phaser import there fails before lint does.

---

## Related documentation

- [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) — the table in full, and where each kind of code goes
- [Simulation loop](../architecture/simulation-loop.md) — the driver, the tick, and the system order
- [Entities and pools](../architecture/entities-and-pools.md) — generational ids, capacities, and the two world lifetimes
- [ADR 0002 — Custom fixed-step simulation](./0002-custom-fixed-step-simulation.md) — the decision that makes the domain Phaser-free
- [ADR 0004 — All mutation enters as commands](./0004-all-mutation-enters-as-commands.md) — the one way state enters the simulation
