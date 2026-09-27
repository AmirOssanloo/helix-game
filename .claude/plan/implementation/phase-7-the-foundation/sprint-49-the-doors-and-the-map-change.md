# Sprint 49 — The doors and the map change

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

Each layer's public door exports what outer layers use and nothing more, and an architecture test holds it:

- The domain has a types door and a read-only queries door.
- Tests have a door of their own.
- Presentation and devtools read the event ring through a read port.

A map change is a command in the input log. It keeps run scope, runs in production, and replays. The docs that misstate where the clock is read are fixed.

## Playable outcome

Choose another map from the panel mid-run: the hero keeps its level, experience, and kit on the new map. Save the input log, reload, and load it: it replays through the map change to the same checksums.

---

## Tickets

### P7-S49-T01 — Narrow the doors, and test them

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, devtools, app, tests, docs |
| Size | 2 |
| Depends on | P7-S47-T03, P7-S48-T03, T02 (architect review, 2026-09-27) |
| Status | planned |

**Selection rule:** verified violations of the [layers](../../../../docs/architecture/layers-and-dependency-rule.md#quick-reference) page's door rules. It is also a seam: loot's screens read items and must not be able to mutate them.

**Build:**
- **The simulation's door.** `simulation/public.ts` exports internals no outer layer uses: CommandBuffer, the systems, `nextFloat`, `nextInt`, `seedRandom`, `createWorld`, `beginReplay`, and `Simulation.state` as a mutable `World` (`simulation/world.ts:173`). Each is removed or made read-only.
- **A door for tests.** Tests get their own door, a `testing.ts` beside each `public.ts` that needs one, which lint lets only `tests/` import.
- **The domain's door.** `domain/public.ts` is 588 lines, re-exports 106 modules, and exposes 289 values, among them every system and mutators such as `spendMana`. It splits into:
  - a **types door**, types only;
  - a **queries door** of read-only predicates and lookups, among them the range predicate P7-S46-T04 uses.
- **Why types alone are not enough.** A `readonly` view does not stop view data being passed into a mutator; this was confirmed compiling. Mutators are therefore not exported to presentation or devtools at all.
- **The event ring.** Presentation and devtools receive the whole `EventRing`, with a public write and clear (`simulation/event-ring.ts:86,150`). They get a read port instead.
- **The architecture test** (`tests/architecture.spec.ts`), which checks only `LAYER_IMPORTS` today, gains two rules:
  - an outer layer imports a layer only through its door;
  - a types door exports only types.
- **Docs.** The [layers](../../../../docs/architecture/layers-and-dependency-rule.md) page states the doors in the same change, and `domain/public.ts`'s line comes off the `max-lines` list.

**The doors' shape** (architect review, 2026-09-27). The domain has two audiences, so it gets three doors. The simulation needs its systems, constructors, and mutators; presentation and devtools need types and reads.

| Door | Holds | Imported by |
| --- | --- | --- |
| `domain/public.ts`, the types door | Types only, as the layers page already describes it | content, simulation, presentation, devtools, app |
| `domain/queries.ts`, the queries door | Pure reads: `isInCastRange`, P7-S46-T04's readiness query, and lookups the HUD and panel call today. Each takes `Readonly` or `DeepReadonly` arguments, writes only into an `out` argument its caller owns, and allocates nothing | simulation, presentation, devtools, app |
| `domain/rules.ts`, the rules door | Systems, pool constructors, and mutators such as `spendMana` and `addModifier` | simulation and app only |

- **The lint allow-list** gains the two new rows in the same change.
- **The simulation's door** after T02 holds the session, its option and result types, `WorldView`, `Steppable`, and the event ring's read port. `Simulation`, `createWorld`, `Replay`, the command buffer, the random source, and `systems` go to `simulation/testing.ts`.

**Acceptance:**
- An import of a domain mutator from presentation, of an internal from past a door, or of `testing.ts` from `src/` fails the architecture test or lint, each shown on a branch and deleted.
- Presentation cannot write to or clear the event ring; a type test holds it.
- The seven logs match their checksums.

**Tests:**
- `tests/architecture.spec.ts`: the door and types-only rules.
- `tests/presentation/doors/*.spec.ts`: the read port and the queries door, with `@ts-expect-error` on a mutator.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:**
> - **Three doors, not two.** The simulation imports the domain's mutators and systems through `domain/public.ts` today (`simulation/world.ts:12-37`). A two-way split into types and queries would either leave those with no door or put them back in reach of presentation.
> - **Runs after T02.** The session's move and the map-change command reshape the simulation's door, so narrowing it first would mean narrowing it twice.
>
> Size unchanged.

---

### P7-S49-T02 — A map change is a command in the input log

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, app, tests, docs |
| Size | 2 |
| Depends on | P7-S45-T02 |
| Status | planned |

**Selection rule:** documented drift and a seam. The [roadmap](../../../../docs/product/roadmap.md)'s door says run scope and map scope are separate lifetimes, so a map change never recreates the hero. In the build it is exercised only by tests:
- `World.loadMap` (`simulation/world.ts:291`) has no production caller and mutates with no command;
- a map choice goes through `restart` (`app/session.ts:170-185`), which wipes run scope.

P8-S33-T01's run-scope inventory, and the descent after phase 9, depend on it.

**Build:**
- **The command.** A `load_map` debug command under [ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md). It resets map scope, keeps run scope, and places the hero at the new map's spawn. The panel's **Map** sends it. `restart` means a new run and wipes both scopes.
- **Replay through a map change.** `simulation/replay/replay.ts:62-76` resolves one map, and `simulation/replay/input-log-file.ts:19-26` holds one `mapId`. The header's `mapId` stays as the starting map, and later maps arrive as commands, so no stored log changes.
- **Session orchestration: decided, it moves whole to `simulation/session.ts`** (architect review, 2026-09-27).
  - **Why it belongs there.** `app/session.ts` imports nothing but `@domain/public` and `@simulation/public`. It reads no clock, since the timestamp comes in through `CommandStamps.now`, and no DOM. What it does is orchestrate a world: replay switching, the content stamps, retunes as commands, and saving and loading the log. That is the simulation's job by the layer table.
  - **What moves.** The `Session` class joins `createSessionWorld` and `restartSessionWorld`, which already live in `simulation/session.ts`. `app/` keeps the driver and the wiring, and constructs the session.
  - **What it unlocks.** This lets T01 drop the replay and world internals from the simulation's door.
- **The map change's shape** (architect review, 2026-09-27):
  - **Maps are world state.** The registry's maps go into run scope as validated definitions, so a system resolves `load_map`'s id with no reach past the world. They are already inside the stamp.
  - **The rule lives in the domain.** `Simulation.loadMap`'s body moves to a domain function under `domain/map/`. The command handler calls it at the command system's fixed point in the tick. A later rule that changes map, such as the descent's stairs, requests the change for that same point and never calls it mid-pass.
  - **It allocates, once, on purpose.** Deriving the grid and the pack records allocates. A map change is a transition between scopes, not steady state, and the [simulation loop](../../../../docs/architecture/simulation-loop.md) page says so. The allocation sampler's window excludes the tick that changes map.
  - **The header names the starting map.** `simulation/replay/input-log-file.ts:68` writes `view.map.mapId`, the current map. After a `load_map`, a saved log would name the wrong starting map and replay on it. The session passes its starting map's id to the serializer, never the view's.
  - **`restart` stays a session operation**, never a command and never in a log. It begins a new log on the chosen map. `load_map` changes a running session and is in its log.
- **The clock's drift: fixed in the docs, not the code.** The docs say the clock is read only in the driver, but `app/main.ts:38` reads `Date.now()` for the seed and `devtools/mount-panel.ts:111` uses `setInterval`. Both are outside the tick and outside the simulation: the seed is an input the log records, and the panel's refresh reads no world state it could change. The [simulation loop](../../../../docs/architecture/simulation-loop.md) page's rule becomes "the tick reads no clock; the driver owns tick time". It names the seed read and the panel's timer as the two reads outside it, and why.
- **A false comment.** The comment at `simulation/world.ts:167` is corrected.

**Acceptance:**
- After `load_map`, the hero's level, experience, orbs, slots, and cooldowns are as they were, and every map-scope pool is empty but for the new map's packs.
- A session with two map changes replays into two worlds that agree at every tick and match its checksums.
- The seven stored logs match their checksums, with no format migration.
- A `load_map` for an unknown map is refused and announces its reason. What a `load_map` does while the hero is dead is the same as the panel's map choice does today, and the [developer panel](../../../../docs/product/features/developer-panel.md) page states it.
- A log saved after a `load_map` names the map the session started on, and loads and replays from it.

**Tests:**
- `tests/simulation/world.spec.ts`: `load_map` keeps run scope and resets map scope.
- `tests/simulation/replay/map-change.spec.ts`: a log with map changes replays identically, and its header names the starting map.
- `tests/simulation/session.spec.ts`, moved from `tests/app/`: the panel's map choice sends the command, and a restart wipes both scopes.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A developer-panel control · A documentation change.

> **Architect review, 2026-09-27:**
> - **Decided the orchestration question:** the session moves to the simulation.
> - **Fixed the map change's shape:** maps in run scope, the rule in the domain at one point in the tick, and its allocation named as a transition.
> - **Found a bug the ticket would have tripped.** The saved header takes the current map (`input-log-file.ts:68`), so "the header's `mapId` stays as the starting map" needed a code change the Build did not name.
> - **Closed the clock drift in the docs**, since both reads sit in `app/` and `devtools/`, outside the tick.
>
> Size unchanged at 2. The session's move is a file move, and the docs route for the clock is cheaper than moving code.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Each door rule shown failing on a branch | |
| Presentation holds a read port on the ring | |
| A map change keeps run scope, by hand in Chrome by an agent | |
| A log with map changes replays identically | |
| The seven logs match their checksums | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T01 moves the import of most of presentation and devtools. The change is mechanical but wide, and it lands in one commit so no half-narrowed door is ever on main.
- T02's orchestration decision is made: the session moves whole to the simulation (architect review, 2026-09-27). If the move turns out to be more than a file move, the ticket takes the sprint's buffer, and anything past that goes to Deferred rather than growing the ticket.
- The order inside the sprint is T02, then T01 (architect review, 2026-09-27). T01 lands in one commit, on the simulation door T02 leaves.
