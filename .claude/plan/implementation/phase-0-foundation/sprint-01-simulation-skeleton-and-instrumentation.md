# Sprint 01 — Simulation skeleton and instrumentation

**Phase:** 0 · **Sized days:** 4 · **Buffer:** 1

## Goal

A world that can be created, given commands, ticked, read through a `Readonly` view, recorded, and disposed, in Node, with no system yet registered; and a driver in `app/` that owns the only clock.

## Playable outcome

A blank canvas that logs "WebGL" and a tick counter in the console. In a test, a world ticks and the input log holds every command it consumed.

---

## Tickets

### P0-S01-T01 — Shared helpers

| Field | Value |
| --- | --- |
| Layer | shared, tests |
| Size | 0.5 |
| Depends on | P0-S00-T04 |
| Status | done |

**Build:** Under `src/shared/`: scratch vector functions that write into a caller-supplied target and never allocate (`add`, `sub`, `scale`, `length`, `normalize`, `dot`, `distanceSquared`); angle helpers (`wrapAngle` to ±π, `shortestArc`, `bearing`); `clamp`; a fixed-capacity ring buffer with a cursor; `assert` that throws in development and is a no-op in production via the Vite define; generational id `packId`, `unpackIndex`, `unpackGeneration`, with the bit split as named constants. Everything exported by name through `shared/public.ts`.

> Edited while building: the packer is `packId`, not `pack`, because the vocabulary reserves "pack" for a group of enemies.

**Acceptance:**
- No function in `shared/` allocates on the hot path; each takes an output parameter where it returns a vector.
- `wrapAngle(π + ε)` returns `−π + ε`; `shortestArc` never returns a magnitude over π.

**Tests:**
- `tests/shared/vec.spec.ts` — table-driven, boundaries included.
- `tests/shared/angle.spec.ts` — wrap at ±π, shortest arc across the seam.
- `tests/shared/ring-buffer.spec.ts` — at capacity, overwrite, cursor.
- `tests/shared/ids.spec.ts` — pack and unpack round-trip, generation bump changes the id.

**Definition of done:** Every change.

---

### P0-S01-T02 — Pool primitive and the entity pools

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** Under `src/domain/entities/`: a pool primitive over one plain-object shape with a free list of indices, a live count, per-slot generation, `acquire` returning the object or `null`, `release` by id that clears the object and bumps the generation, `resolve` by id returning the object or `null`, and index iteration from zero to the live count. One file per kind with its capacity as a constant at the top: units (512), projectiles (512), effects (256), zones (with its own declared capacity, 64). The unit shape holds kind tag, definition id, previous and current position, facing, order, resources, cooldown clock map, a fixed-size status table, active form index, pack id, spawn point, owner id, lifetime. Fields not used until later phases exist now with neutral values so the shape never changes under a running test. The world state type with run scope (hero id, form records, tuning state, random state) and map scope (the four pools, the walkability grid slot, the spatial hash slot), and `domain/public.ts` exporting the types.

> Edited while building: iteration runs from zero to the pool's `end`, not the live count, because a released slot leaves a hole so every live index stays stable; `at` returns `null` for a hole. The lifetime field is `expiresAtTick`, a tick the way cooldowns and statuses are.

**Acceptance:**
- Acquiring to capacity and one past returns `null` on the last and increments the pool's miss counter.
- Releasing then acquiring reuses the slot with a new generation; the old id resolves to `null`.
- Iteration by index visits live slots in index order and skips released ones.

**Tests:**
- `tests/domain/entities/pool.spec.ts` — the five or six per the testing standard.
- `tests/domain/entities/unit-pool.spec.ts`, `projectile-pool.spec.ts`, `effect-pool.spec.ts`, `zone-pool.spec.ts` — capacity constants respected, shape cleared on release.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` (the allocation and reference rows).

---

### P0-S01-T03 — The world: random source, command buffer, event ring, tick, input log

| Field | Value |
| --- | --- |
| Layer | simulation, domain, tests |
| Size | 1.5 |
| Depends on | T02 |
| Status | planned |

**Build:** Under `src/domain/commands/` the `Command` and `DebugCommand` unions with a tick timestamp, a millisecond timestamp for ordering, and, for now, one variant each (`noop` and `debug_noop`) to prove the plumbing; the ordering rule as a pure comparator (timestamp, then slot priority for slot-key commands, then arrival index). Under `src/domain/events/` the `DomainEvent` union with one variant (`tick_completed`). Under `src/simulation/`: a seeded random source (xorshift or PCG, chosen once, with `nextFloat`, `nextInt`, and state on the world); the command buffer as a preallocated array with a sort by the comparator at tick start; the event ring as a preallocated array with a write cursor, per-reader cursors, and an overwrite counter; `world.ts` with `createWorld({ seed, registry, map })`, `submit`, `tick`, `loadMap` (releases map scope, leaves run scope), `dispose`; `systems.ts` as an empty ordered list; `tick` copies previous positions, consumes the sorted buffer, runs the list, writes `tick_completed`, appends every consumed command with its tick to the input log, and advances the tick count. `simulation/public.ts` exports the API and a `WorldView` type that is `Readonly` over the state. Test helpers `makeWorld`, `submit`, `tickUntil` under `tests/helpers/`.

**Acceptance:**
- Two worlds with the same seed produce the same random sequence; different seeds differ.
- Commands submitted out of timestamp order are consumed in timestamp order; ties on slot-key commands resolve Q W E R D F.
- The event ring at capacity overwrites the oldest and increments the overwrite counter; a reader with its own cursor sees the entries since its last read.
- `loadMap` empties every map-scoped pool and leaves the hero id and tuning state unchanged.
- The input log after N ticks holds every consumed command with the tick it was consumed on.
- `tickUntil` fails loudly at its maximum.

**Tests:**
- `tests/simulation/random.spec.ts`, `command-buffer.spec.ts`, `event-ring.spec.ts`, `world.spec.ts`, `input-log.spec.ts`.
- `tests/domain/commands/ordering.spec.ts` — one per reason, two for ordering.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system.

---

### P0-S01-T04 — Instrumentation rings, the fixed-step driver, the game config, and BootScene

| Field | Value |
| --- | --- |
| Layer | instrumentation, app, presentation, tests |
| Size | 1 |
| Depends on | T03 |
| Status | planned |

**Build:** Under `src/instrumentation/`: one preallocated sample ring per measurement named in `docs/architecture/devtools-and-instrumentation.md` (tick time, render time, live counts, pool misses, event overwrites, frame rate), each a fixed array and a cursor, written by a function that allocates nothing. Under `src/app/`: `game-config.ts` with `Phaser.AUTO`, `render: { maxTextures: 1 }`, `Scale.FIT` at 1920 by 1080 auto-centred, no `physics` key, `FORCE_CANVAS` and `FORCE_WEBGL` window overrides; `fixed-step-driver.ts` as the one file that reads a clock: accumulates the frame delta, runs at most three ticks per frame then drops the remainder, measures around each tick into the ring, computes the interpolation fraction, pauses on `visibilitychange` hidden and discards any command submitted while hidden; `main.ts` wiring config, world, driver, and the development-only panel mount. Under `src/presentation/scenes/`: `boot.scene.ts` that reads the renderer type, logs it, shows a static `Text` warning banner when Canvas, and starts `PlayScene` and `HudScene` as empty shells that call the driver's `onFrame` and log the tick count every second.

**Acceptance:**
- `pnpm dev` shows the WebGL banner and a tick count climbing at 30 per second.
- `window.FORCE_CANVAS = true` then reload shows the banner over the canvas.
- Simulated frame deltas of 200 ms produce three ticks and an empty accumulator; a delta of 10 ms produces zero ticks and the fraction 0.3.
- With the document hidden, no ticks run; a command submitted while hidden is not in the buffer on resume.
- Every ring can be read from `window.DevApi.rings` in development (a placeholder `DevApi` exposing only `rings` for now).

**Tests:**
- `tests/app/fixed-step-driver.spec.ts` — accumulator, cap, drop, fraction, hidden, discard; the driver takes an injected clock so the test runs in Node.
- `tests/instrumentation/rings.spec.ts` — write, wrap, no allocation (asserted by shape, not by heap).

**Definition of done:** Every change · Anything under `src/presentation` (the banner is `Text` in `boot.scene.ts`, the one allowed place).

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 0 gate rows | |
| `pnpm check` green | |
| Tick count visible in the console at 30 per second | |
| Actual days per ticket | T01 0.25 · T02 0.25 · T03 · T04 |

## Risks in this sprint

- The `Readonly` world view over live pools is a compile-time type; make sure it is deep enough to refuse `view.units[0].hp = 0` under lint, or the ban in sprint 00 is hollow.
- The driver's hidden-tab discard needs the buffer to know when a command arrived relative to hidden state. Stamp commands at submit time from the driver, not in the world.
