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
| Status | planned |

**Build:** walk every row of the [phase 8 gate](../04-phase-exit-gates.md#phase-8-gate) with its evidence: the maintainer's session and the balance walk, every drop kind picked up, the armory's stats, the store's commands, the replays, the combat stream unmoved by loot, the long-road stress case with the ground-item pool full, and the bar at the densest choke with drops on the ground. Every row of the bar is an agent's, headless or in Chrome on the development machine through browser automation, the render benchmark included, written as figures; no other browser or machine is measured (standing instruction of 2026-09-27, which edited this line). Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.
- The long-road case of `tests/simulation/stress.spec.ts` holds the tick budget with the ground-item pool at capacity.

**Tests:**
- `tests/simulation/stress.spec.ts`: the long-road case with the ground-item pool full.
- Any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

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
| The gate walk | |
| Milestone M13 | |
| Actual days per ticket | T02: 0.5, sized 0.5 |
| Sprint total | |
