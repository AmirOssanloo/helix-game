# Sprint 37 — The balance and the playtest

**Phase:** 7 · **Sized days:** 1.5 in tickets, 2 of bucket appetite · **Buffer:** 1

## Goal

The drop rates carry the clean run's route to the last boss with no heal or mana restore from the panel, headless first. Then the maintainer plays the long road with loot and the store, and the feedback is triaged into the bucket.

## Playable outcome

The long road from level 1 to the last boss's kill with the panel closed but for **Jump to checkpoint**: globes keep the hero alive and casting, items are worn, and the store is used.

---

## Tickets

### P7-S37-T01 — Drop rates balanced against the clean run's route

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | every ticket of sprints 31 to 36 |
| Status | planned |

**Build:** a recording driver under `tests/helpers/recording/` that walks the long road on seed 3742014961 along the clean run's route, checkpoint to checkpoint, fighting what wakes as the clean run's log does, with its `heal` and `restore_mana` taken out, and turning aside for a globe within a stated distance of its line when the pool it restores is below half. The globe percentages and chances, and gold, are tuned in the catalogue and `src/content/tuning.ts` until the driver's walk kills the last boss with no panel command and a margin the catalogue states (Q86). The session is stored as `tests/simulation/replays/balance-loot.json`, an eighth log, with a spec. The catalogue's economy table is rewritten to the measured numbers. The content version moves; every stored log is re-stamped.

**Acceptance:**
- The driver's walk reaches the last boss's kill with no `heal`, `restore_mana`, `level_up`, or grant, and the hero's health never falls below the catalogue's stated margin outside the boss fights.
- Every drop kind is picked up on the walk: gold, health globe, mana globe, and equipment.
- The gold on the walk buys at least one Rare at the store before the last region.
- The catalogue's economy table matches the measured walk.

**Tests:**
- `tests/simulation/replays/balance-loot.spec.ts`: on the stored log, the kill with no panel command, the margin, each drop kind picked up, the gold.

**Definition of done:** Every change · A documentation change.

---

### P7-S37-T02 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** the maintainer plays the published playtest build from the spawn at level 1 to the last boss's kill, the panel closed but for **Jump to checkpoint**, in one tab with no reload, since a reload loses the inventory (R30), wearing what drops and using the store at least once, pressing F9 for each note, and saving the input log at the end: a box under Waiting on a person in STATUS.md with the steps. An agent stores the session as `tests/simulation/replays/long-road-loot-playtest.json` and each feedback file under `notes/`, and a spec beside the log replays it. The triage is held with the maintainer by the phase 6 method, in a dated note, `notes/<date>-loot-triage.md`: each note gets one outcome, a bug, a tuning change, a screen fix, or no change, with a new system to Deferred. Accepted items are written as P7-S37-T03 onward in the bucket's order until two days are spent.

**Acceptance:**
- The stored session holds no `heal`, `restore_mana`, `level_up`, toggle, or grant, reaches the last boss's kill, and holds at least one pickup of each kind, one `equip_item`, one `buy_item`, and one `sell_item`.
- Two replays of it agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome in the triage note; the bucket's committed and unspent days are written in it.

**Tests:**
- `tests/simulation/replays/long-road-loot-playtest.spec.ts`: skips until the log exists; then the replay, the commands it must not hold, the kill, the counts, and the level at the kill printed.

**Definition of done:** Every change · A documentation change.

---

### The bucket — 2 days of appetite

Tickets P7-S37-T03 onward are what P7-S37-T02 accepts, in the order the [phase README](./README.md#the-triage-bucket) gives. They run before sprint 38.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The driver's walk with no panel heal or mana | |
| The maintainer's run | |
| Triage | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- The driver's route is the clean run's, and the maintainer's will not be. The margin exists for the difference; a maintainer who still needs the panel is a tuning change in the bucket, first after anything that stops the road.
- The playtest is calendar time outside the sprint, as phase 6's was.
