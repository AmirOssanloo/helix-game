# Sprint 48 — The screen's god objects and the seams ahead

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

Presentation's two largest modules are split. The debug overlays cost nothing outside the panel build. The play scene's views are a list, not twenty hand-ordered fields, so loot's ground views and labels register rather than edit it. Three seams that phase 8 or 9 needs are in place:

- ids that cannot cross pools;
- a keyed draw that can draw many numbers at one key;
- two decision records that P8-S31-T02 and phase 9's first ticket would otherwise write.

## Playable outcome

In a production build, a frame with the panel absent walks none of the overlays' quads or texts. Headless, a ground-item id passed where a unit id is wanted fails the typecheck.

---

## Tickets

### P7-S48-T01 — The debug overlays split, gated on the panel build, and pooled like every view

| Field | Value |
| --- | --- |
| Layer | presentation, devtools, app, tests, docs, bench |
| Size | 1 |
| Depends on | T02 (architect review, 2026-09-27) |
| Status | done |

**Selection rule:**
- **A god object** that P8-S33-T03 must grow: its ground labels need `QuadRun` as a shared pool.
- **A verified violation** of the presentation cost rules, in the same file.

**Build:**
- **The split.** `presentation/overlays/debug-overlays.ts` (1326 lines, nine classes) splits into one file per overlay. `QuadRun` is promoted to a shared view pool under `presentation/views/`.
- **The gate.** The overlays are built only when `__PANEL__` is set. Today they are built unconditionally (`presentation/scenes/play.scene.ts:265`), about 4,300 quads and 512 texts that `GroundLayer.keepSorted` walks every frame.
  - **Who decides.** The composition root registers the overlays' syncers on T02's list in the panel build. The play scene holds no `__PANEL__` check and no import of the overlays, so the production bundle drops them by tree-shaking, with no dynamic import (`no-dynamic-import` stands).
- **One camera-box query.** One shared per-frame unit query by the camera's box replaces the four in `unit.view.ts:221,359`, `status-icon.view.ts:231`, and `debug-overlays.ts:1263`.
- **Pool sizes in one place.** Every pool size lives in `presentation/views/view-counts.ts`, including those `debug-overlays.ts:81,124-132` and `floating-number.view.ts:19` keep for themselves.
- **The draw-call counter.** Its rest arguments allocate on every draw (`presentation/render/draw-call-counter.ts:59,64`). The counter wraps with a fixed arity.

`debug-overlays.ts`'s line comes off the `max-lines` list.

**Acceptance:**
- A production build contains no overlay code, and the ground layer walks no overlay object.
- In the panel build, every overlay draws as before by eye in Chrome, read by an agent through browser automation.
- The render benchmark in Chrome by an agent, before and after, its figures in the sprint exit: draw calls unchanged, sync no slower.
- No allocation in the sync or in a counted draw, by the allocation sampler over thirty seconds.

**Tests:**
- `tests/presentation/overlays/*.spec.ts`: each overlay's spec moved to its file, green.
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: every pool size read from `view-counts.ts`.
- `tests/presentation/draw-call-counter.spec.ts`: no allocation per draw.
- `tests/app/build-flags.spec.ts`: the overlays absent without `__PANEL__`.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:** now runs after T02, not before it. With the syncer list in place, gating the overlays is one registration in `app/`, which is where build flags are wired, and the scene never learns the panel exists. Before, T02 would have re-edited the gate T01 had just put in the scene. Size unchanged.

---

### P7-S48-T02 — The play scene's views as an ordered list of syncers

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 0.5 |
| Depends on | none; runs before T01 (architect review, 2026-09-27) |
| Status | done |

**Selection rule:** a god object a feature must grow. P8-S33-T03's ground views and labels, P8-S34-T03's screen, and P8-S36-T03's store would each add a field and a hand-placed update call to `PlayScene`.

**Build:** `PlayScene`'s 20-field `Stage` (`presentation/scenes/play.scene.ts:96-118`) and its hand-ordered update become an ordered list of view syncers. Each syncer is registered with its place in the sync order and its depth band. The [presentation](../../../../docs/architecture/presentation.md) page states the order and how a view is added.
- **Fixed after scene start** (architect review, 2026-09-27). The list is built once, when the scene is created, from what the composition root registers; it is sorted then and never during play. The per-frame walk is an indexed loop with no allocation. The map rebind at `play.scene.ts:303` is one more syncer, not a special case.

**Acceptance:**
- A view syncer added in a test runs in its stated place with no edit to `play.scene.ts`.
- The frame draws as before, and the sync readout is no slower.

**Tests:**
- `tests/presentation/play-scene.spec.ts`: syncers run in order, and a registered one runs.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:** moved ahead of T01, whose overlay gate becomes a registration on this list. Added that the list is fixed at scene start and walked without allocation. Size unchanged.

---

### P7-S48-T03 — Branded ids per pool, and an order's target tagged by kind

| Field | Value |
| --- | --- |
| Layer | shared, domain, simulation, presentation, devtools, tests, docs |
| Size | 1 |
| Depends on | P7-S47-T01 |
| Status | done |

**Selection rule:** a seam phase 8 names. P8-S40-T01's `pick_up` puts a ground-item id in an order's target. Today `EntityId` is a plain number (`shared/ids.ts:8`), and `Order.targetId` (`domain/orders/order.ts:41`) is read as a unit id at about 17 sites. A ground-item id could resolve as a unit and compile.

**Build:**
- **Brands.** `EntityId` is branded per pool: unit, projectile, zone, effect, and room for the ground item. The brands cost nothing at run time. A pool takes and resolves only its own brand.
- **The order's target.** It is a tagged value, none, a point, or a unit, so every reader states which it handles. The ground item joins it in P8-S40-T01 as one more tag.
- **Docs.** The [entities and pools](../../../../docs/architecture/entities-and-pools.md) page states the brands.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **Where the brands live.** `shared/ids.ts` holds only the generic `Id<Brand>`, a `number` intersected with a phantom brand, beside the packing it already has. `shared/` has no game knowledge, so the concrete `UnitId`, `ProjectileId`, `ZoneId`, and `EffectId` are declared in each kind's own file under `domain/entities/`, next to its pool.
- **How pools mint them.** `Pool<T, I extends Id<string>>` returns and takes `I`. The one cast from `packId`'s number to `I` sits inside the pool, so the brands cost nothing at run time. The input log's parser is the one other place a number becomes an id, at the boundary.
- **The tagged target is one fixed shape.** Every order target object carries all of its fields at all times (`tag`, `point`, `unitId`), typed as a union over `tag` so a reader must narrow before it reads `unitId`. The state machine's setters write the tag and its fields together, so no write allocates and the hidden class never changes.
- **The walk goal stays outside the target.** The approach point named in P7-S46-T03 is a separate field of the order, not a tag.
- **The checksum's sequence does not change.** Its order accessors read the new shape into the old sequence (P7-S45-T02).

**Acceptance:**
- In a type test, passing a projectile id where a unit id is wanted fails the typecheck, and reading an order's target as a unit without checking its tag fails it too.
- No file under `src/shared/` names an entity kind.
- The seven logs match their checksums, with the log format unchanged.

**Tests:**
- `tests/shared/ids.spec.ts`: the brands, with `@ts-expect-error` lines for each wrong pairing.
- `tests/domain/orders/order.spec.ts`: each tag read and refused.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:** placement fixed. The generic brand goes in `shared/`, and the concrete brands go in `domain/entities/`, since a unit is game knowledge `shared/` may not hold. The one cast is inside the pool. The tagged target is a fixed-shape record written in place, because a fresh union object per order write would allocate in the tick. Ordering confirmed: after P7-S47-T01's regrouping and before P7-S49-T01's doors, which export the branded types. Size unchanged.

---

### P7-S48-T04 — Two decision records: where items live, and the first screen

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Status | planned |

> **Note, 2026-09-27:** a structural ticket. The engineering architect writes both records; the delivery strategist sizes them and names the questions, and does not answer them.

> **Note, 2026-09-27, from P7-S46-T02:** the unit's modifier table is 22 rows, sized for today's sources alone with the arithmetic beside `MODIFIER_TABLE_SIZE`; raising it from 16 grew a world's heap by 4.2%. The architect's ruling on that ticket: record (a) states its effect on this arithmetic, and if it puts item rows on the unit table it carries a heap reading before and after. The headroom is not room for items.

**Selection rule:** documented drift, and seams phases 8 and 9 name. The first screen, both records moved here from P8-S31-T02. Item identity is also a seam for phase 9's sprint 41, where an item's cooldown must survive a move between the bank, the inventory, and the ground.

**Build:** two records under `docs/adr/`, 0011 and 0012 unless the architect numbers them otherwise, each Proposed until the maintainer reads it (a box under Waiting on a person in STATUS.md). The tickets after them build on them as written.

- **(a) Where items live, and item identity.**
  - **The drift.** The two pages disagree with the code and the plan:
    - `docs/architecture/entities-and-pools.md:76` and [ADR 0003](../../../../docs/adr/0003-layered-single-package-architecture.md) (`:56`) put an armory on each form record and item slots on the unit;
    - the code has `FormRecord.armory: null` (`domain/entities/world-state.ts:56`);
    - the loot plan puts the inventory and the armory in run scope with no form.
  - **The decision.** Decide where they live, and amend both pages.
  - **Item identity.** An item instance holds its base id, its rarity, and its affix ids with their values, never content indices, so a content edit never changes an item's meaning. Decide it with phase 9's item cooldowns in view.
  - **Where an item's modifier rows live** (added by the architect review, 2026-09-27, from P7-S46-T02). There are two options:
    - on every unit's modifier table, which needs a source identity per row and a capacity that multiplies by the unit pool's 512 slots;
    - in a run-scope table beside the armory, rewritten whole by slot and read only by the hero's derivation.

    The record states the choice, its memory and per-tick cost at the 200 live cap, and what P8-S34-T01 builds. The architect's lean going in is the second, which keeps every other unit's table at today's size.
- **(b) The first screen and input capture.**
  - **Phaser or DOM**, weighed against [ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md)'s one atlas and draw-call budget, ADR 0003's three-scene rule, and the panel's DOM precedent.
  - **Input capture.** Today it is only the HUD scene's `stopPropagation` on pointerdown (`presentation/scenes/hud.scene.ts:59-62`). Pointerup still reaches the mapper (`presentation/input/bind-scene-input.ts:64-65`), and keys have no capture (`:69-70`).
  - **The pick port.** The port through which the right-click pick reads label screen rectangles (`presentation/input/input-ports.ts:26`), which P8-S40-T01 resolves a right click against.
  - **Pausing.** Whether a screen pauses the world: the pause screen does (Q97), and the inventory does not (Q91).
  - **Where screens and the capture sit** (added by the architect review, 2026-09-27). The architect's lean going in:
    - screens draw in `HudScene`'s screen-space camera as a screen band. ADR 0003's reason against a fourth scene, a camera copied every frame, does not arise for screen-space UI, and a fourth scene would add a third input plugin to arbitrate;
    - the claim is one presentation object that both scenes consult. The play scene's mapper asks it before it turns any pointer or key into a command, so capture does not rest on Phaser's propagation order between scenes;
    - a screen that pauses reaches the driver through a port presentation declares and `app/` implements. Presentation never imports the driver.

**Acceptance:**
- Both records written, each naming the pages it amends, and those pages amended in the same change.
- Every phase 8 ticket whose Build either record changes carries a one-line note before it starts, P8-S31-T02, P8-S34-T01, and P8-S34-T02 first.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

> **Architect review, 2026-09-27:** added two questions. Record (a) now answers where an item's modifier rows live, which P7-S46-T02 no longer builds ahead of the record. Record (b) now answers where screens and the claim sit, and how a screen reaches the driver across the layer rule. The leans are stated so the records do not start from nothing; the records decide. P8-S34-T01 joins the tickets to be noted. Size unchanged.

---

### P7-S48-T05 — The keyed draw gains a draw index, and loot gets its purposes

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | P7-S45-T02 |
| Status | planned |

**Selection rule:** a seam phase 8 names. P8-S32-T02 draws count, base, and rarity at one death. P8-S35-T01 draws each affix and its value, and P8-S36-T02 draws a store's stock. `hash4(seed, key, tick, purpose)` has no index, so a multi-draw drop would burn one purpose per number.

**Build:**
- The keyed draw in `domain/random/keyed-draw.ts` takes a draw index.
- The purpose list gains a loot block: drop count, base, rarity, affix, affix value, gold, globe, and store stock.
- Every existing caller passes index 0, and its draws are bit-identical.
- **How index 0 stays identical** (architect review, 2026-09-27). The index folds into the purpose argument as `purpose + index × PURPOSE_STRIDE`, with the stride a constant above the largest purpose and a stated cap on the index, both asserted at module load. Index 0 is then the same call to `hash4` as today. Neither a fifth hash argument nor a mix into the key would leave today's draws unmoved.
- [ADR 0010](../../../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md)'s revisit clause is answered in an amendment, and the where-to-look pointer to the purpose list is checked.

**Acceptance:**
- Every existing draw is identical at index 0; the seven logs match their checksums.
- Draws at one key over indices 0 to 63 are distinct and pass the same distribution test the draw has today.

**Tests:**
- `tests/domain/random/keyed-draw.spec.ts`: index 0 unchanged, indices distinct, the distribution per index.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** fixed how the index enters, which the acceptance needs index 0 to leave untouched. Every purpose stays below the stride, so a purpose at one index can never equal another purpose at another index. Size unchanged.

---

## Sprint exit

| Check | Result |
| --- | --- |
| No overlay code in a production build | Yes, 2026-09-27 (T01): the overlays' step left `PLAY_VIEW_SYNCERS`; `src/app/main.ts` adds it from `panelViewSyncers()` inside its `__PANEL__` branch only, and the scene holds no flag. The production bundle has no overlay code, 1,619,180 bytes against 1,629,890 before, so the ground layer walks none of their 4,293 quads and 512 labels. `vite.config.ts` fails a production build that carries the overlays' sentinel, the syncer's name, and a playtest build without it; a production build with the gate removed was seen to fail. `tests/app/build-flags.spec.ts` builds both modes in memory and checks the sentinel |
| The render benchmark before and after T01, in Chrome by an agent | T01, 2026-09-27, headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 30 s after a warm-up, draw calls counted by wrapping the WebGL draw methods. `pnpm bench`: 60.03 → 60.02 fps, worst frame 19.2 → 20.1 ms, 1 → 1 draw call, heap 62.8→66.2 → 63.4→63.9 MB. The play scene on the long road with 48 dummies spawned, `644e8c8` from a worktree against the change, runs interleaved, three each: panel build, overlays off, render (sync and render) mean 1.30 → 1.22 ms and script 1.81 → 1.69 ms a frame; production build, script 1.58 → 1.35 ms a frame; 2 draw calls a frame, 1 in the world, both ways, no view miss, no console error. Draw calls unchanged, sync no slower. Every overlay on: the frame drew the same by eye before and after, read from screenshots. T02 changed no view and no atlas, and `bench/` does not build the play scene, so the benchmark was not rerun for it; the play scene's own render readout before and after is in the syncer row |
| No allocation in the sync or a counted draw, T01 | Yes, 2026-09-27: Chrome's sampling heap profiler over 30 s with every overlay on, 1 KB interval. Nothing sampled in the draw-call counter, before or after; presentation's sampled total 25.3 → 23.9 KB over 1,800 frames, all of it Phaser's own text layout when a hash count changes or its visibility setter, the same frames before and after. `tests/presentation/draw-call-counter.spec.ts` holds the counter to no collection and under 256 KB over 400,000 draws; the old rest-argument wrapper allocated 6.4 MB there |
| A view syncer registered with no edit to the scene | Yes, 2026-09-27 (T02): `tests/presentation/play-scene.spec.ts` registers a step beside the play scene's own at a place between the units and the outlines and has it run there, and made after them, with `play.scene.ts` untouched. The scene names no view: `PLAY_VIEW_SYNCERS` in `presentation/scenes/play-view-syncers.ts`, handed by the composition root, is made once at `create` in registration order, which keeps today's pool order and so the draw order inside each band, and walked in place order by an indexed loop. The map load is one step. In Chrome by an agent at `167242d` against the change, the same page and protocol, 900 frames each: render time mean 1.95 → 1.71 ms (a first after run read 1.47), 2 draw calls a frame, 1 in the world, both ways; the frame draws the same by eye, overlays on as well, no console error |
| Wrong-pool ids refused by the typecheck | Yes, 2026-09-27 (T03): `shared/ids.ts` holds only `Id<Brand>`, and `UnitId`, `ProjectileId`, `ZoneId`, and `EffectId` are declared beside their pools; `Pool<T, I>` takes and resolves only its own `I`, and `ViewPool` is keyed by its kind's id too. `tests/shared/ids.spec.ts` holds a `@ts-expect-error` line for each of the twelve wrong pairings and for a plain number, and a scan that no file under `src/shared/` names an entity kind. The order's target is one fixed-shape record tagged `none`, `point`, or `unit`, written in place by the state machine's setters; `tests/domain/orders/order.spec.ts` reads each tag and refuses a unit read before the tag is checked. The one cast from a packed number is in `pool.ts`, beside a placeholder for fixed-size buffers; the input log's guard is the other boundary. Readers of the target: the attack rule (three), movement, the AI's attack entry, and the state machine; the rename touched about 310 id sites across 120 files, 62 of them under tests, and the typecheck then sorted out the projectile and zone ids among them: in the events, the cast record, the spawn primitives, and the views. No site mixed two pools at run time. Presentation's emitted code is byte-identical, so the benchmark was not rerun |
| Both decision records written, pages amended | |
| The draw index, existing draws identical | |
| The seven logs match their checksums | T02 and T01: presentation changes; all seven match in `pnpm check`, nothing re-recorded. T03: the checksum hashes the target's unit id where it hashed `targetId`, the one leaf renamed `order.target.unitId`, the tag and point left out as derived; all seven match with the log format unchanged, nothing re-recorded |
| Actual days per ticket | T02: 0.5 of 0.5. T01: 0.75 of 1. T03: 1 of 1 |
| Sprint total | |

## Risks in this sprint

- T04's records can decide something that moves a phase 7 ticket still to run. Record (b) decides what P7-S50-T01 builds; if it chooses DOM, the capture layer spans two input sources and the ticket may need its buffer.
- The order inside the sprint is T02, T01, T03, T05, T04: the syncer list before the overlays that register on it (architect review, 2026-09-27).
- T03 touches every reader of an order's target. The typecheck finds them all, which is the point, but the count may be higher than seventeen once projectiles and zones are branded too.
