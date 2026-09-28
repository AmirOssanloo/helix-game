# Sprint 62 — The driver and the family kind

**Phase:** 10 · **Sized days:** 3.5 · **Buffer:** 1.5 · **Milestone:** M16, a generated map walked
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward take this sprint's spare half day first; past it, T02 moves to the top of sprint 63, and P10-S63-T01 waits with it ([Q118](../backlog/open-questions.md)'s rule).

## Goal

A recording driver plays any generated map as a player would, from arrival to waypoint to portal, taking drops and using the town, so a seed sweep proves the maps playable and every later balance pass has something to run on; and the family kind exists, so the Nave's six are rows, not files.

## Playable outcome

**M16.** Watch the driver's recording of a generated map replayed in Chrome: it fights from the arrival point to the waypoint, opens a town portal, sells, comes back, and takes the portal down after the boss. The long road's archetypes still stand in for the Nave's.

---

## Tickets

### P10-S62-T01 — The map-agnostic recording driver: M16

| Field | Value |
| --- | --- |
| Layer | tests, tooling, docs |
| Size | 2 |
| Depends on | P10-S61-T02, P10-S61-T03, P10-S58-T02, P10-S58-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `tests/helpers/recording/descent-walk.ts`, beside the long road's `loot-walk.ts`, sending only what a player sends. It reads the map's arrival point, waypoint, and portal from the world view rather than a map's authored order. It:
- fights what wakes in its path with its attack and its casts;
- spends skill points;
- takes globes, gold, and items it can use, as the loot walk does;
- reaches the waypoint;
- opens a town portal when its inventory is full, sells and buys in town, and returns;
- kills the map boss and takes the portal down.

A walk ends on a portal taken, on a death past a tunable count, or on a tick limit, and reports which, with its minutes, its level, and its deaths.

- **In the tests:** `tests/simulation/replays/descent-walk.spec.ts` walks a sample of eight generated maps across the Nave's levels, each from its arrival point. The hero is set to the level the design expects at that map by a recorded panel command, since M16 proves the maps playable, not balanced. One sampled walk is stored as `tests/simulation/replays/descent-walk.json` and replayed.
- **In the sweep:** `pnpm sweep --walk` runs the driver on a larger sample and prints minutes per map at the driver's pace beside the sweep's other figures.

**Acceptance:**
- **M16:** every sampled map is walked from arrival to waypoint to portal, with the town portal used once on at least one, and none ends on the tick limit.
- The stored walk replays identically, two replays agreeing at every tick.
- The driver sends no `heal`, `restore_mana`, or grant; the one level set is named in the log.
- It plays: M16's outcome, the stored walk replayed in Chrome by an agent.
- The bar: minutes per map at the driver's pace printed for the sample against eight to twelve; the driver's walk under the stress tier's time.

**Tests:**
- `tests/simulation/replays/descent-walk.spec.ts`: the eight walks, their endings, the town portal used, and the stored walk's replay.
- `tests/tooling/sweep-maps.spec.ts`: `--walk` on one seed.

**Pages:** [testing](../../../../docs/standards/testing.md), the driver as the descent's balance tool, if it names the loot walk; [development workflow](../../../../docs/workflows/development.md), `pnpm sweep --walk`.

**Definition of done:** Every change · A documentation change.

---

### P10-S62-T02 — The family kind

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P10-S54-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the family as a definition kind, as [ADR 0018](./sprint-54-the-records-and-the-nave-on-paper.md) decides, in `src/domain/definitions/family-def.ts`. It holds a behaviour key, a body, a silhouette frame, which names an existing shape frame until phase 12's silhouettes, an ability kit, carried statuses, and one row per variant: id, name, tint, numbers, and at most one ability more. The registry expands each row into the archetype record the domain reads today, so no rule changes and `spawn_pack` names a variant's id as it names an archetype's. Tuning keys under [ADR 0009](../../../../docs/adr/0009-definition-tuning-key-is-the-field-path.md) are the field path into the family's row. A fixture family in `tests/helpers/content/` proves the kind; no content family yet. The long road's thirteen archetypes are untouched.

**Acceptance:**
- A fixture family's two rows expand into two archetype records equal to hand-written ones, field by field.
- A row's tuning key slides the expanded record's number live, and a content reload keeps it.
- A row with two abilities more, or a behaviour key that does not exist, is refused with its file named.
- Every stored log replays unchanged, since no archetype moved.
- It plays: not applicable until P10-S63-T01; a fixture family's variant fights in a simulation spec as its hand-written twin does.
- The bar: the expansion runs at registry build only; nothing per tick.

**Tests:**
- `tests/domain/definitions/family-kind.spec.ts`: the expansion, the refusals, the tuning keys.
- `tests/content/registry.spec.ts`: the kind registered.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md), the kind, checked against ADR 0018; [adding an enemy](../../../../docs/workflows/adding-an-enemy.md), a variant as a row; the `add-an-enemy` skill's steps, if the runbook's change moves them.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new enemy or behaviour · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| **M16:** eight sampled maps walked from arrival to waypoint to portal | |
| The stored walk replayed in Chrome | |
| Minutes per map at the driver's pace, against eight to twelve | |
| The family kind, a fixture family expanded; every stored log unchanged | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The driver's pace is not a player's.** Its minutes per map are a floor, written as the driver's and read beside the maintainer's in sprint 64; the recipe's size is tuned against both.
- **A map the driver cannot finish** is a map fault until shown otherwise: the sweep's checks are read first, then the driver's pathing, then the recipe, in that order.
