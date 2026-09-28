# Sprint 38 — The docs and the phase gate

**Phase:** 8 · **Sized days:** 1.5 · **Buffer:** 1

## Goal

The docs match the build, and the phase 8 gate is walked with numbers.

## Playable outcome

The long road with loot and the store, as the maintainer's feedback left it. Milestone M13.

---

## Tickets

### P8-S38-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | every bucket ticket, T02 |
| Status | done |

**Build:** walk every row of the [phase 8 gate](../04-phase-exit-gates.md#phase-8-gate) with its evidence: the maintainer's session and the balance walk, every drop kind picked up, the armory's stats, the store's commands, the replays, the combat stream unmoved by loot, the long-road stress case with the ground-item pool full, and the bar at the densest choke with drops on the ground. Every row of the bar is an agent's, headless or in Chrome on the development machine through browser automation, the render benchmark included, written as figures; no other browser or machine is measured (standing instruction of 2026-09-27, which edited this line). Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.
- The long-road case of `tests/simulation/stress.spec.ts` holds the tick budget with the ground-item pool at capacity.

**Tests:**
- `tests/simulation/stress.spec.ts`: the long-road case with the ground-item pool full.
- Any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

> **Closed, 2026-09-28, on every row an agent can verify; the rows that read the maintainer's session are deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24.** No bucket ticket exists ([Q118](../backlog/open-questions.md)) and T02 is done, so the dependency held. No gate row an agent can walk failed, so no replay test was added. The per-row results are in the [phase README](./README.md#exit-record); the evidence is here.
> - **`pnpm check`.** Exit 0: lint, both typechecks, the build, and 257 files and 5330 tests passed, 2 files and 8 tests skipped, 1 todo. The two skipped files are `long-road-loot-playtest.spec.ts`, which skips until the maintainer's log is stored, and the balance recorder. One of three full runs failed once in `tests/domain/stats/stats-system.spec.ts`, its steady-state heap growth reading 73 704 bytes against a bound of 65 536; the spec passed five times alone and in the other two full runs, and this change touches no code it measures. The flake is a row of [Deferred](../backlog/deferred.md).
> - **The stress tier with the ground-item pool full.** The long-road case of `tests/simulation/stress.spec.ts` now tops the ground-item pool up to its capacity of 512 before every tick, on open cells spread along the whole road, gold, health globes, mana globes, and items in turn, and asserts it full on every tick, something taken by walking over it, and drops refused for want of a slot. Under `pnpm test:budget`, three runs, 6 of 6 green: 4338 ticks to the last boss's kill at level 9 with no death, 512 of 512 on every tick, 6 taken and 117 drops not made; a mean of 0.157 to 0.163 ms and a worst of 1.80 to 1.86 ms, against 0.148 to 0.157 ms for the case as it stood, with drops lying only where they fell. About 25 times under the 4 ms budget.
> - **The bar in Chrome.** Chrome for Testing 153, headless, on the Apple M1 (ANGLE Metal), 1920 by 1080, over the DevTools protocol, the dev build with the panel and overlays off, as phase 7's run. The hero jumps to checkpoint 5 and every unit is cleared. Elite grunt packs are spawned in a ring about the hero and killed until the ground-item pool holds 512: about 125 each of items, gold, health globes, and mana globes, their labels on screen. I is pressed, and the inventory and armory screen stays open. Then twenty packs of ten grunts are spawned in the last boss's chamber, aggro and leash raised, and press through choke 5 at the hero, healed every half second. 30 s after an 8 s warm-up, two runs:
>   - 59.97 fps; frames 16.65 to 18.34 ms, p99 16.68. 1 world draw call and 2 in all on every frame. 201 live and 512 ground items on every sample. No unit, projectile, effect, zone, or view miss. The second run's pool-miss readout holds 6 through the whole measurement: those were ground-item drops refused as the fill's last round ran past the capacity, before the measurement began. Sync and render: mean 2.72 and 2.74 ms, p99 3.4 and 3.8, one frame each at 36.2 and 35.3. Browser tick: mean 2.65 and 2.61 ms, p99 3.3 and 4.1, worst 3.8 and 4.8. Heap after a collection: 41.5 → 41.8 and 41.6 → 41.9 MB, at most 44.9 between. No console error.
>   - The same scene with no drops and no screen, one run: 60.00 fps, frames 16.65 to 16.68 ms, 1 and 2 draw calls, sync and render mean 1.90 ms, p99 3.1, tick mean 3.37, p99 5.1, heap 40.9 → 41.0 MB. So 512 drops and the open screen add about 0.8 ms of sync and render a frame, all of it under the frame. Phase 7's run read 1.76 ms and one world draw call.
>   - **Allocation.** The sampling heap profiler at 1 KB, collected objects included, attributes 66.2 and 97.2 MB to the tick and 9.2 and 9.0 MB to the sync over the 30 s, against 66.0 and 2.0 MB with no drops. The tick's is collision's `separatePair` and movement, Q30's engine boxing as in phase 7. The sync's rise is the unit views' sync under a denser screen and Phaser's own display-list sort; no ground-item or screen function appears in the top twelve. The heap stays flat.
> - **The render benchmark.** `pnpm bench` in the same headless Chrome, 30 s after an 8 s warm-up, two runs: 60.03 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 64.5 MB, no console error; the baseline sprint 36 recorded is 60.03 fps, 16.5 to 16.8 ms, 1 draw call, 64.1 to 64.2 MB.
> - **Caveats.** The browser tick's p99 of 4.1 and its worst of 4.8 in one run pass 4 ms, as phase 7's 4.5 and 20.6 did, and the no-drops run's 5.1 does too; the standard holds the tick to the headless reading, well inside. The walk headless reaches at most 26 live, since packs sleep behind the hero; the 200 are the arena cases' and the Chrome run's.
> - **Deferred to a person.** The gate rows that read the maintainer's session: its no-panel walk and the level at the kill; its gold, globes, and `pick_up`; its `equip_item`, `buy_item`, and `sell_item`; its replay into two worlds; and the feedback and triage. Each is under Waiting on a person in STATUS.md and in [Deferred](../backlog/deferred.md). Every other part of those rows holds on the driver's `balance-loot.json` and the specs.

---

### P8-S38-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every bucket ticket |
| Status | done |

**Build:** the world model's ground item and run-scope rows, the where-to-look pointers for items, loot, the inventory, the store, and the screens, the feature pages (items and loot, hero, HUD, enemies, spells and attack, controls and orders, map and camera, developer panel), the vocabulary, the disable matrix's new columns for the armory commands and `pick_up`, the long road spec's packs, budget, and map level, and the item catalogue against its files and against any number the bucket moved, each read against the build and corrected.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

> **Closed, 2026-09-28:** `pnpm check` green, 5329 tests passed and 8 skipped, the docs-links test over the repository among them. No bucket ticket exists (Q118), so the dependency held. Every page the build names was read against the build and corrected. The world model now says a load or reset also removes every ground item and leaves every store unstocked and closed, and names `stat-totals.ts`. Every path in where to look resolves; the depth bands, screens, views, loot, and debug rows were sharpened, and rows were added for the pick up order, the ground item views and labels, lifting an item, the tooltip, the store's ring, and the loot preview. The feature pages gained gold and globes on the hero, the inventory and store screens on the HUD, loot by tier on enemies, worn items in the attack, the store's ring, Alt, and the Esc order in the controls, map scope's ground items and stores on the map, and every panel control under its real label. The disable matrix names the eight item and store commands its one Items column covers and `pick_up` its Pick up column; the build has one column for all eight, not one each, so the page follows the data. The long road spec was recomputed from the map file and matched, with the store's stock at the hero's level and the Legendary bosses named. Every number of the item catalogue matched its file and the balance spec's print, so none moved; no bucket moved one. The vocabulary gained implicit stat, loot, drop, tooltip, stock, and value, price, and sell price, and "drop table", "shop", "bag", "gear", and "equipment" were swept from the pages, decision records 0011 and 0014, the roadmap, and the mechanics spec. The tooltip's REQUIRED LEVEL line against the vocabulary's **Level requirement** went to [Q119](../backlog/open-questions.md), decided provisionally: the build stands. Also not moved: `pause-screen.ts` is named unlike `inventory.screen.ts` and `store.screen.ts`, a code rename left for a code ticket; where to look says one module per screen, which holds for both.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The gate walk | 2026-09-28, T01: every row an agent can verify holds, with the figures in T01's note and the [phase README](./README.md#exit-record); the rows that read the maintainer's session are deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24, under Waiting on a person in STATUS.md and in Deferred |
| Milestone M13 | Reached on every part an agent can verify, 2026-09-28: the driver finishes the road from level 1 with no panel heal or mana, uses the store, and replays identically. The maintainer's session and the triage are deferred with the gate's person rows |
| Actual days per ticket | T01: 0.5, sized 1; T02: 0.5, sized 0.5 |
| Sprint total | Sized 1.5 with 1 of buffer, done in 1, the buffer unspent. Closed 2026-09-28 on every row an agent can verify; the maintainer's session rows wait under Waiting on a person, deferred until phase 8 is done |
