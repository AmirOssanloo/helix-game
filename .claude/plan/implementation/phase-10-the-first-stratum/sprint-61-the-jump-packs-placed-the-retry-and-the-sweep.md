# Sprint 61 — The jump, packs placed, the retry, and the sweep

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

> **Note, 2026-09-28:** the panel's jump runs first, the sketch's last row moved up, so a generated map can be played in the build from this sprint's first day.

## Goal

A generated map holds its enemies by the recipe's budget, a boss with its guard before the portal; a candidate that fails its checks is made again and, past the limit, falls back and is counted; a thousand seeds are swept by a script and a sample is hashed in the tests; generation's time is seen; and the panel jumps to any level of the Nave.

## Playable outcome

Open the panel, jump to map 4 of the Nave, and fight through its rooms: field packs, elites, and a boss with its guard before the portal, drawn as the long road's archetypes. The panel's readouts show the map's generation time and its attempts.

---

## Tickets

### P10-S61-T01 — The panel's jump to a descent map by level

| Field | Value |
| --- | --- |
| Layer | domain, devtools, tests, docs |
| Size | 0.5 |
| Depends on | P10-S60-T01, P10-S55-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** a debug command, `jump_to_map_level`, naming a level, in the map and travel commands' file P10-S55-T02 made. It makes that level's map fresh with the hero at its arrival point, marks nothing reached, and closes a standing town portal. It is recorded in the log as every panel command is ([ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md)), and the panel's simulation group gains a level field and a button.

**Acceptance:**
- The jump to any level of the Nave lands the hero at the arrival point of that level's map, the same map a portal would reach.
- A dead hero is carried as `load_map` carries it ([Q99](../backlog/open-questions.md)).
- It plays: in Chrome by an agent, a jump to map 4 and to map 10.
- The bar: not applicable; a transition's cost is the generator's.

**Tests:**
- `tests/simulation/debug-commands.spec.ts`: the jump, its landing, the portal closed, the dead hero carried.
- `tests/devtools/panel.spec.ts`: the control submits the command.

**Pages:** [developer panel](../../../../docs/product/features/developer-panel.md), the control.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

### P10-S61-T02 — Pack placement by the recipe's budget

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 1.5 |
| Depends on | P10-S60-T02, P10-S56-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** placement in `src/domain/generation/`, on the pack record's side P10-S55-T02 split, by the recipe and [the density table](../../../../docs/product/specs/the-descent.md#6-density):
- field packs of 3 to 6 and elite packs of 2 to 3, about 10% of the map elite, 90 to 110 enemies;
- the families drawn per region by the seed from the recipe's roster, harder toward the portal;
- packs placed in rooms clear of the arrival point and the waypoint by the recipe's margins, every pack dormant;
- the map boss in the boss room before the portal, one pack of a boss member and a guard of two or three of its family ([map bosses](../../../../docs/product/specs/the-descent.md#51-map-bosses)); on a stratum's tenth map, the recipe's stratum boss in its chamber, and the portal waiting on it.

The placement keeps to the bound of 60 near any point by construction where it can, and the map checks judge it.

**Acceptance:**
- On 100 seeds at every level: enemies per map in 90 to 110, the elite share near 10%, a boss with its guard before every portal, and every map's checks passed or its faults counted.
- It plays: in Chrome by an agent, a jumped-to map fought room by room, its boss and guard waking as one pack.
- The bar: the most enemies near any point printed per map against 60; the placement's time inside the 50 ms budget.

**Tests:** `tests/domain/generation/place-packs.spec.ts`: the budget, the pack sizes, the elite share, the boss pack's members, the tenth map's chamber and gate, the margins, on a sweep of 100 seeds.

**Pages:** the Nave's spec, checked against what placement makes.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P10-S61-T03 — The bounded retry, the fallback counter, the sweep, and the golden hash

| Field | Value |
| --- | --- |
| Layer | domain, content, tooling, tests, docs |
| Size | 1.5 |
| Depends on | T02, P10-S59-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The retry:** a candidate the map checks fault is generated again under the next attempt index, a key of the generator's draws, at most `generator_max_attempts` times, a tunable in `src/content/tuning.ts`. Exhaustion gives the plain layout, placed by the same budget, and counts a fallback in run scope and as an event.
- **The sweep:** `tooling/sweep-maps.ts`, run by `pnpm sweep`, generates every level of a recipe for N seeds, 1000 by default, and prints per map and in total: the checks' faults, attempts, fallbacks, enemies per map, the most near any point, the waypoint's fraction, the walk's length, the obstacle count, and generation time. It is the source of the phase's [R42](../02-risks-and-hidden-work.md) figures.
- **The golden hash:** a hash of every map a fixed sample of 20 seeds makes at every level, stored in a spec. It fails on any change to the output unless the generator version moved with it.

**Acceptance:**
- A 1000-seed sweep of the Nave runs to its end and prints its figures; fallbacks at most 2%, or the recipe is tuned as content before the ticket closes ([R42](../02-risks-and-hidden-work.md)).
- A generator change without a version move fails the golden hash; with one, the hash is recorded again and every stored log's stamp refuses.
- It plays: in Chrome by an agent, a jumped-to map that fell back plays, and the panel counts it.
- The bar: the sweep's slowest generation, retries included, printed against 50 ms.

**Tests:**
- `tests/domain/generation/retry.spec.ts`: a candidate forced to fail is made again under the next index; exhaustion falls back and counts.
- `tests/domain/generation/golden-sweep.spec.ts`: the sample's hash.
- `tests/tooling/sweep-maps.spec.ts`: the script's figures on 3 seeds.

**Pages:** [development workflow](../../../../docs/workflows/development.md), `pnpm sweep`; [content and registries](../../../../docs/architecture/content-and-registries.md), the retry and the fallback, checked against ADR 0016.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P10-S61-T04 — Generation time, sampled and shown

| Field | Value |
| --- | --- |
| Layer | instrumentation, simulation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** a generation-time sample in `src/instrumentation/`, read around the generator by the session, since the simulation holds no clock. It is left out of the tick window as a map load is ([ADR 0016](./sprint-54-the-records-and-the-nave-on-paper.md)'s budget). The panel's readouts show the last map's generation time, its attempts, and the run's fallbacks.

**Acceptance:**
- The sample reads each transition's generation and nothing else; the tick window's figures do not include it.
- It plays: in Chrome by an agent, the readouts after a jump.
- The bar: generation of the Nave's largest map under 50 ms headless on the development machine, by the sweep, and read in Chrome by an agent beside it.

**Tests:**
- `tests/instrumentation/rings.spec.ts`: the generation sample and its exclusion from the tick window.
- `tests/devtools/panel.spec.ts`: the readouts.

**Pages:** [devtools and instrumentation](../../../../docs/architecture/devtools-and-instrumentation.md), the sample; [developer panel](../../../../docs/product/features/developer-panel.md), the readouts; [performance](../../../../docs/standards/performance.md), the budget, checked.

**Definition of done:** Every change · A developer-panel control · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The jump to a map level, in Chrome | |
| Placement on 100 seeds: enemies per map, elite share, the boss and guard | |
| The 1000-seed sweep's figures and fallback rate | |
| The golden hash | |
| Generation of the largest map, headless and in Chrome | |
| The ratio over sprints 60 and 61, and the style kept or cut ([R42](../02-risks-and-hidden-work.md)) | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The fallback rate is over 2%** ([R42](../02-risks-and-hidden-work.md)). Fixed as recipe content, a smaller pack budget or wider chokes, and never as generator code in a bucket; the sweep reruns after each change.
- **The sweep is slow.** A thousand seeds at ten levels near the budget is minutes; it is a script run by hand or an agent, never a test tier, and the tests hold the 20-seed sample.
- **Sprints 60 and 61 over 1.0.** Open ground is the fallback cut, taken then, with the regions still closed by chokes ([Q131](../backlog/open-questions.md)).
