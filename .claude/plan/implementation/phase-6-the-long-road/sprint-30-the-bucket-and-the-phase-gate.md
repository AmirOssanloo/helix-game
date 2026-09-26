# Sprint 30 — The rest of the bucket and the phase gate

**Phase:** 6 · **Sized days:** 1.5 in tickets, 1.5 of bucket appetite · **Buffer:** 1

## Goal

The last of what the triage accepted is built, the docs match the build, and the phase 6 gate is walked with numbers.

## Playable outcome

The long road, as the maintainer's feedback left it. Milestone M10.

---

## Tickets

### P6-S30-T01 — The phase gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | every bucket ticket, T02 |
| Status | planned |

**Build:** Walk every row of the [phase 6 gate](../04-phase-exit-gates.md#phase-6-gate) with its evidence: the long road's content tests, the long-road stress case, the Q31 corridor bound, the checkpoint and dormancy specs, the playtest session replayed, the triage note, and the bar at the cap on the long road. Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

### P6-S30-T02 — Documentation sync

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | every bucket ticket |
| Status | done |

**Build:** The world model's map and map-scope rows, the where-to-look pointers for checkpoints, sleeping packs, map choice, and the feedback file, the feature pages (map and camera, enemies, developer panel, HUD, spells and attack if a spell was swapped), the vocabulary, the long road spec against its file, and the spell and enemy catalogues against any number the bucket moved, each read against the build and corrected.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

**Closed 2026-09-26.** No bucket ticket existed, so the pages were read against the build as phase 6 left it. The world model's pack, map-scope, and checkpoint rows now say the hero keeps its slot and is carried to the spawn, a reset makes every pack whole, and a sleeping pack is its record in map scope. Where-to-look gained pointers for map choice and the maps index, the feedback file and note, the build stamp, `restart`, where the hero comes back, and the push share. The feature pages were corrected: the checkpoint ring's tint and the word at the spawn, the fifth choke into the last boss's chamber, the pack radii with their numbers, the HUD's checkpoint word and rings, the hero's push share and respawn, and the developer panel's labels, its Units folder, and its readouts as they read. The vocabulary splits dormant, how a pack is written, from asleep, awake, waiting, and dead, what it is now, and adds choke and push share. The long road spec's nearest pack to checkpoint 6 is pack 28, and the block gap reads about 260. Three derived figures in the enemy catalogue and one in the spell catalogue were corrected; no definition number had moved. The runbooks that check in the arena now choose it under **Map**, since a fresh session starts on the long road. Relative links all resolve; `pnpm check` green, 3601 tests.

---

### The bucket — 1.5 days of appetite

Tickets P6-S30-T03 onward are the rest of what P6-S29-T02 accepted, written there. They run before T02 and T01.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 6 gate rows | |
| The bucket: days spent of four, and what was cut to Deferred | |
| Milestone M10 | |
| Actual days per ticket | T02: 0.5 |

## Risks in this sprint

- A number the bucket moves re-records the balance logs and re-stamps the playtest session. Leave a day between the last bucket ticket and the gate so the gate reads the final version.
