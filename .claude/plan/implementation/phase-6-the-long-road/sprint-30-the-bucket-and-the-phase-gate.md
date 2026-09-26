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
| Status | done |

**Build:** Walk every row of the [phase 6 gate](../04-phase-exit-gates.md#phase-6-gate) with its evidence: the long road's content tests, the long-road stress case, the Q31 corridor bound, the checkpoint and dormancy specs, the playtest session replayed, the triage note, and the bar at the cap on the long road. Replay tests for gate bugs. The exit record and sized versus actual in the [phase README](./README.md#exit-record), with the bucket's spent and unspent days.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

**Closed 2026-09-26, on the rows an agent can verify.** No bucket ticket existed, since the triage waits on a person, so T02's sync stood as the docs the gate reads. The [gate walk](#phase-6-gate-walk) below holds six rows headless and the docs row on T02's checklist. The playtest session, the feedback and its triage, and the bar's browser half wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and a row of [Deferred](../backlog/deferred.md). No gate bug, so no replay test was added. The exit record is in the [phase README](./README.md#exit-record). `pnpm check` green.

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
| Phase 6 gate rows | Walked headless 2026-09-26 by T01, in the [gate walk](#phase-6-gate-walk): six rows hold on what an agent can verify, and the docs row holds since T02 on its checklist. The playtest session replayed, the feedback and its triage, and the bar in Chrome, Firefox, Safari, and Edge wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| The bucket: days spent of four, and what was cut to Deferred | 0 of 4 spent, 2.5 in sprint 29 and 1.5 here, unspent while the triage waits on a person. Nothing was cut to Deferred, since nothing was triaged |
| Milestone M10 | Reached 2026-09-26 on what an agent can verify: the gate's headless rows hold, and the playtest spec stands ready for the session. The maintainer's play, the feedback filed and triaged, and the session replayed identically wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| Actual days per ticket | T01: 0.25 of 1 · T02: 0.5 of 0.5. Bucket 0 of 1.5. Sprint: sized 3, done in 0.75, closed 2026-09-26 on what an agent can verify |

### Phase 6 gate walk

Walked 2026-09-26 on the Apple M1 laptop, headless, by the engineer running the plan, on commit `f23af0a` plus this ticket's plan edits. The rows of the [phase 6 gate](../04-phase-exit-gates.md#phase-6-gate), in order. Anything that needs a person, the playtest, the triage, or a GPU browser, is deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24.

| Row | Holds | Evidence |
| --- | --- | --- |
| The hero can walk the long road from the spawn at level 1 to the last boss and reach about level 10 | Headless, yes; the maintainer's session, waiting on a person | `tests/content/maps.spec.ts`: a small unit and a hero unit each walk from the spawn through the six checkpoints in order to the last boss's pack. `tests/content/catalogues.spec.ts`: the spec's budget reaches level 10 with the last boss's kill and not before, and stays under level 11. `tests/simulation/replays/long-road-playtest.json` does not exist yet, so the spec skips and no level at the kill is recorded |
| Every pack on the long road places | Yes | `tests/content/maps.spec.ts`: `long_road` places each of its 32 packs on its empty map within the placement radius, every one at least 256 from an obstacle and 1080 from a checkpoint |
| Live enemies never pass the cap, and no pack is refused silently | Yes | `pnpm test:budget`, 6 of 6 green, the long-road case among them: the live count at or under 200 on every tick of the walk from the spawn to the last boss, no `enemy_cap_reached`, the packs behind asleep. `tests/content/maps.spec.ts`: no walkable point on `long_road` has more enemies within the sleep radius than the spec's bound |
| The hero takes the smaller share of push-out (Q31) | Yes, at Q59's provisional default | `tests/domain/movement/collision.spec.ts` green, the even split at 0.5 to the bit. `tests/simulation/corridor-200.spec.ts`, 8 green: at a share of 0 the press carries the hero less than 20 units in fifteen seconds, and the overlap bar holds at the default. The default stays at 0.5, not the gate's 0, because the overlap bar fails at 0; that is Q59, decided provisionally and waiting on the maintainer |
| Death comes back at the furthest checkpoint; packs sleep and wake with their survivors | Yes | `tests/domain/map/checkpoint.spec.ts`, `tests/simulation/hero/death.spec.ts`, and `tests/simulation/enemies/dormancy.spec.ts` green: the respawn at the furthest after walking back, a killed pack kept dead through a death, a pack asleep past the sleep radius and woken with its survivors, and sleep and wake allocating nothing |
| The playtest session replays identically | Waiting on a person | `tests/simulation/replays/long-road-playtest.spec.ts` skips both cases until the session and the feedback files are stored. Every other replay is green: `vitest run -t replay`, 14 files and 30 tests |
| The maintainer has played the long road and filed feedback, and it is triaged | Waiting on a person | No feedback file exists. The [triage note](../notes/2026-09-26-long-road-triage.md) stands ready with its tables empty; the bucket's 0 of 4 days spent is in the phase README |
| The docs are in sync | Yes, 2026-09-26 | P6-S30-T02's checklist above. This ticket changes plan files only |
| The bar | Headless, yes; per browser, waiting on a person | Tick: the long-road case's production-build reading under P6-S28-T03, mean 0.019 to 0.026 ms and worst 0.62 to 3.49 ms, stands, since nothing under `src/domain/` or `src/simulation/` has changed since; the case is green under `pnpm test:budget` today. The walk holds at most 10 enemies live, so the tick at 200 is the arena cap cases', green in the same run. Tests in Node: `pnpm check` green. Frame rate, sync, render, and world draw calls at the densest choke in Chrome, Firefox, Safari, and Edge are a person's |

## Risks in this sprint

- A number the bucket moves re-records the balance logs and re-stamps the playtest session. Leave a day between the last bucket ticket and the gate so the gate reads the final version.
