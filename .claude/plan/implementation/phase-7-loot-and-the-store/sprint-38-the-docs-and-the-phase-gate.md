# Sprint 38 — The docs and the phase gate

**Phase:** 7 · **Sized days:** 1.5 · **Buffer:** 1

## Goal

The docs match the build, and the phase 7 gate is walked with numbers.

## Playable outcome

The long road with loot and the store, as the maintainer's feedback left it. Milestone M12.

---

## Tickets

### P7-S38-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | every bucket ticket, T02 |
| Status | planned |

**Build:** walk every row of the [phase 7 gate](../04-phase-exit-gates.md#phase-7-gate) with its evidence: the maintainer's session and the balance walk, every drop kind picked up, the armory's stats, the store's commands, the replays, the combat stream unmoved by loot, the long-road stress case with the ground-item pool full, and the bar at the densest choke with drops on the ground. The bar's browser rows are a person's, written as figures. Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.
- The long-road case of `tests/simulation/stress.spec.ts` holds the tick budget with the ground-item pool at capacity.

**Tests:**
- `tests/simulation/stress.spec.ts`: the long-road case with the ground-item pool full.
- Any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

### P7-S38-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every bucket ticket |
| Status | planned |

**Build:** the world model's ground item and run-scope rows, the where-to-look pointers for items, loot, the inventory, the store, and the screens, the feature pages (items and loot, hero, HUD, enemies, spells and attack, controls and orders, map and camera, developer panel), the vocabulary, the mechanics spec's orb-level sections, the disable matrix's new column, the long road spec's item levels, and the item catalogue against its files and against any number the bucket moved, each read against the build and corrected.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The gate walk | |
| Milestone M12 | |
| Actual days per ticket | |
| Sprint total | |
