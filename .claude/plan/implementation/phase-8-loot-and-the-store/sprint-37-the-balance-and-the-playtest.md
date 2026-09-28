# Sprint 37 — The balance and the playtest

**Phase:** 8 · **Sized days:** 1.5 in tickets, 2 of bucket appetite · **Buffer:** 1

## Goal

The drop rates carry the clean run's route to the last boss with no heal or mana restore from the panel, headless first. Then the maintainer plays the long road with loot and the store, and the feedback is triaged into the bucket.

## Playable outcome

The long road from level 1 to the last boss's kill with the panel closed but for **Jump to checkpoint**: globes keep the hero alive and casting, items are worn, and the store is used.

---

## Tickets

### P8-S37-T01 — Drop rates balanced against the clean run's route

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | every ticket of sprints 31 to 36 |
| Status | done |

> **Note, 2026-09-27:** the road is P8-S39-T01's, at Diablo II density, and the clean run's route on seed 3742014961 no longer exists on it. The driver walks the new road; Q86's answer is its starting point.

> **Note, 2026-09-28:** the session is the seventh stored log, not the eighth, since P8-S39-T01 retired the phase 6 one; and a loot table is world state, so the stored logs took `pnpm restamp --checksums`, not only the stamp.

**Build:** a recording driver under `tests/helpers/recording/` that walks the new long road on a fixed seed the ticket records, checkpoint to checkpoint, fighting what wakes as the long-road stress case does, with no `heal` or `restore_mana`, and turning aside for a globe within a stated distance of its line when the pool it restores is below half. From Q86's starting values, a globe at 25% of its pool, a normal enemy's health globe at 25% and mana globe at 35%, one of each from an elite and two from a boss, the globes and gold are tuned in the catalogue and `src/content/tuning.ts` until the driver's walk kills the last boss with no panel command and a margin the catalogue states. The target is the sustain gap the clean run measured on the old road, 2 heals and 8 mana restores, read as the least the drops must cover. The session is stored as `tests/simulation/replays/balance-loot.json`, an eighth log, with a spec. The catalogue's economy table is rewritten to the measured numbers. The content version moves; every stored log is re-stamped by `pnpm restamp`.

**Acceptance:**
- The driver's walk reaches the last boss's kill with no `heal`, `restore_mana`, `level_up`, or grant, and the hero's health never falls below the catalogue's stated margin outside the boss fights.
- Every drop kind is picked up on the walk: gold and both globes by passing them, and equipment by the driver's `pick_up` order (Q87; edited 2026-09-27).
- The gold on the walk buys at least one Rare at the store before the last region.
- The catalogue's economy table matches the measured walk.

**Tests:**
- `tests/simulation/replays/balance-loot.spec.ts`: on the stored log, the kill with no panel command, the margin, each drop kind picked up, the gold.

**Definition of done:** Every change · A documentation change.

---

### P8-S37-T02 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01 |
| Status | done |

**Build:** the maintainer plays the published playtest build from the spawn at level 1 to the last boss's kill, the panel closed but for **Jump to checkpoint**, in one tab with no reload, since a reload loses the inventory (R30), wearing what drops and using the store at least once, pressing F9 for each note, and saving the input log at the end: a box under Waiting on a person in STATUS.md with the steps. An agent stores the session as `tests/simulation/replays/long-road-loot-playtest.json`, the long road's new reference log in place of the phase 6 one P8-S39-T01 retired, and each feedback file under `notes/`, and a spec beside the log replays it. The triage is held with the maintainer by the phase 6 method, in a dated note, `notes/<date>-loot-triage.md`: each note gets one outcome, a bug, a tuning change, a screen fix, or no change, with a new system to Deferred. Accepted items are written as P8-S37-T03 onward in the bucket's order until two days are spent.

**Acceptance:**
- The stored session holds no `heal`, `restore_mana`, `level_up`, toggle, or grant, reaches the last boss's kill, and holds at least one pickup of each kind, one `equip_item`, one `buy_item`, and one `sell_item`.
- Two replays of it agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome in the triage note; the bucket's committed and unspent days are written in it.

**Tests:**
- `tests/simulation/replays/long-road-loot-playtest.spec.ts`: skips until the log exists; then the replay, the commands it must not hold, the kill, the counts, and the level at the kill printed.

**Definition of done:** Every change · A documentation change.

Closed 2026-09-28 on what an agent can verify. `tests/simulation/replays/long-road-loot-playtest.spec.ts` skips with its owner and condition until the maintainer's log is saved; then it checks the log holds no command but a player's and **Jump to checkpoint**, at least one `equip_item`, `buy_item`, and `sell_item`, two replays agreeing at every tick, the last boss's kill, a pickup of each kind, and every `<date>-long-road-loot-feedback-*.json` file under `notes/` stopping at its tick, printing the tick and level at the kill. It was run once against a copy of `balance-loot.json` standing in for the log, and all four cases passed; the copy was removed. [The triage note](../notes/2026-09-28-loot-triage.md) lists no note, writes no ticket, and commits no day of the bucket, with the steps for when the run comes in ([Q118](../backlog/open-questions.md), decided provisionally). The maintainer's run, the feedback files, and the triage wait on a person, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24, in STATUS.md.

---

### The bucket — 2 days of appetite

Tickets P8-S37-T03 onward are what P8-S37-T02 accepts, in the order the [phase README](./README.md#the-triage-bucket) gives. They run before sprint 38.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The driver's walk with no panel heal or mana | 2026-09-28, T01, in `tests/simulation/replays/balance-loot.spec.ts` on `balance-loot.json`, seed 3742014961, content version `01423cb9`: the hero walks the long road from level 1 at the spawn and the last boss falls on tick 8489 at level 9, with no command a player does not send and no death. It kills 45 normal enemies, 6 elites, and 5 bosses; outside the boss fights its health never falls below 44%, against the catalogue's margin of 25%. It takes 24 gold piles, 1236 gold, 23 health globes, 4.1 pools, and 38 mana globes, 9.3 pools, against the clean run's 2 and 8; it picks up 20 items by 23 `pick_up` orders, wears 8, sells 16, and buys four Rares at the stores up to region 5's entrance. Tuned: a normal enemy's mana globe chance from 35% to 50%, Q86's other values unchanged. The margin is the stored seed's: of eight seeds walked, three hold it, three dip to 8% to 22%, and two die once at level 2 in region 1, all reaching the kill with no panel command ([Q117](../backlog/open-questions.md)) |
| The maintainer's run | Waits on a person, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24, in STATUS.md. T02 built `tests/simulation/replays/long-road-loot-playtest.spec.ts`, which skips until `long-road-loot-playtest.json` is stored and passed its four cases on a stand-in copy of the loot walk's log |
| Triage | [The triage note](../notes/2026-09-28-loot-triage.md), 2026-09-28: no note yet, no bucket ticket; committed 0 of 2 days, 2 uncommitted until the maintainer's run is triaged ([Q118](../backlog/open-questions.md), decided provisionally) |
| Actual days per ticket | T01: 0.5 against 1; T02: 0.25 against 0.5 |
| Sprint total | Sized 1.5 in tickets with 2 of bucket appetite and 1 of buffer, done in 0.75; no buffer spent; the bucket's 2 days uncommitted. Closed 2026-09-28 on every row an agent can verify; the maintainer's run and the triage wait under Waiting on a person, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24, and any bucket ticket the triage writes goes here as T03 onward, ahead of sprint 38 |

## Risks in this sprint

- The driver's route is the clean run's, and the maintainer's will not be. The margin exists for the difference; a maintainer who still needs the panel is a tuning change in the bucket, first after anything that stops the road.
- The playtest is calendar time outside the sprint, as phase 6's was.
