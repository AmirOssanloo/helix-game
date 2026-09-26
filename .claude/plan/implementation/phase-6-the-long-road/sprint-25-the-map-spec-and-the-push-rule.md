# Sprint 25 — The map spec and the push rule

**Phase:** 6 · **Sized days:** 4 · **Buffer:** 1

## Goal

The long road exists on paper, approved by the maintainer: regions, packs, checkpoints, and an experience budget that lands the hero near level 10 at the last boss. A crowd can no longer carry the hero out of a choke. Elites and bosses pay for their health in experience, and a pack that cannot be placed costs a bounded search.

## Playable outcome

In the arena's corridor, two hundred chasers press the hero and the hero holds its ground: a click back is enough to stay. An elite grunt killed from the panel pays three grunts' experience.

---

## Tickets

### P6-S25-T01 — The long road: the map spec

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | none |
| Status | done |

> **Note, 2026-09-26, closed:** [the long road spec](../../../../docs/product/specs/the-long-road.md) written: bounds 4000 by 24000; five regions, the approach, the line, the hexes, the heavies, and the hall, each adding archetypes the hero has not met, all thirteen roster archetypes placed; 32 dormant packs, 54 enemies, 5 of them elite and 5 boss; 137 obstacles, 10 choke walls with openings narrowing 416, 352, 288, 288, 224, and 127 blocks; 6 checkpoints, each more than 1000 from every pack. The budget: 5408 before the last boss, level 9, and 6308 after its 900, level 10 and 212 short of 11; with the five costliest of the 22 normal packs skipped, 4672, level 9. Live enemies near any point: bound 40 for any sleep radius up to 3200; the list peaks at 14 within 2000 and 22 within 3200. Checked by a script, not by eye: every pack and checkpoint reachable from the spawn for radii 16, 27, and 50 on the 32-unit grid, no two obstacles overlapping, every pack at least 256 from any obstacle. Fewer packs than the fifty expected, because the budget decides and five bosses at ten times take half of it: [Q58](../backlog/open-questions.md), decided provisionally and awaiting the maintainer. The vocabulary gains the long road, region, and checkpoint, and "camp" beside pack; the map and camera page gains the long road; the product README and the docs index link the spec. The maintainer's approval waits under Waiting on a person in STATUS.md, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24. Sized 1.5, actual 0.5.

**Build:** `docs/product/specs/the-long-road.md`, a product spec shaped like the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), with real names and numbers. It holds:

- **The rectangle.** Bounds 4000 by 24000, the road running along the long axis from the spawn at one end to the last boss at the other. Under ADR 0006 an axis-aligned strip runs diagonally on screen, and that is accepted (Q50).
- **Five regions** of rising difficulty, each drawn only from the thirteen roster archetypes (the dummy and the imp are not placed). The first uses grunts and runners alone; each later region adds archetypes and abilities the hero has not yet met, so the region is the lesson. Each region has elite packs through its middle and closes with a boss-tier pack and its guard at a choke. Difficulty is archetype, tier, and count; no pack is scaled beyond its tier (Q55).
- **The pack list.** One row per pack: archetype, tier, count, position, all dormant. About fifty packs is the expected order; the budget decides the number.
- **Obstacles.** Walls that narrow to a choke between regions and break up the open ground inside one, about 150 rectangles, with the choke widths stated so the Q31 test has a place.
- **Checkpoints.** One at the spawn, one at each region's entrance, and one before the last boss, in order along the road. The furthest reached is where the hero comes back after dying (Q51).
- **The experience budget.** Per region and in total, from each archetype's experience in the catalogue and the tier multipliers of T03 (Q54), against `experienceThresholds` in `src/content/hero.ts`: a full clear reaches 5550, level 10, with the last boss's kill and stays under 6520; a hero who skips a fifth of the normal packs still reaches level 9 before the last boss. Each region's share is about two levels.
- **Live enemies near any point.** The bound the map's content test holds: no point on the road has more than the stated count of enemies in packs within the sleep radius, leaving room under 200 for adds and for packs not yet asleep behind the hero.
- **Words.** The page and the vocabulary use "region" for a stretch of the road, since "zone" is a spell's; "checkpoint" and "the long road" are added to the [vocabulary](../../../../docs/product/vocabulary.md); "camp" joins the "Not" column beside "pack" (Q56). The [map and camera](../../../../docs/product/features/map-and-camera.md) page gains the long road beside the arena, and the product README links the spec.

**Acceptance:**
- Every pack row names a catalogue archetype, a tier, a count, and a position inside the bounds; every region closes with a boss-tier pack.
- The budget table adds to level 10 at the last boss's kill, and to level 9 with a fifth of the normal packs skipped.
- The maintainer approves the spec, or names what to change: a box under Waiting on a person in STATUS.md. P6-S28-T01 writes the definition from the page as approved; a later change is made in the page and the file together.

**Tests:** none here. P6-S28-T01 makes `tests/content/catalogues.spec.ts` read the page's pack table and budget against the file.

**Definition of done:** Every change · A documentation change.

---

### P6-S25-T02 — The hero takes a smaller share of push-out

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | none |
| Status | done |

> **Note, 2026-09-26:** moved here from [Deferred](../backlog/deferred.md), where Q31 put it on 2026-09-25 as the first ticket of the next bet. The Deferred row named an ADR 0002 amendment; the engineering architect's brief of 2026-09-26 says none is needed, because ADR 0002 fixes only that separation runs along the centre line, not how it is shared. The rule is the movement page's.

> **Note, 2026-09-26, closed:** `separateDiscs` takes the share of `a`, and the collision system's pair rule decides the lift first, then gives the hero `hero_push_share` of an overlap with any unit that is not the hero, then splits the rest evenly. The tunable is in the table, a fraction, retuned from the panel through `set_tuning` on the next tick. The overlap bar does not hold at 0, so under the third acceptance row the default is **0.5, today's split to the bit**, decided provisionally and awaiting the maintainer as [Q59](../backlog/open-questions.md). Measured on the corridor replay at four passes: at 0 the hero is carried 0 units over the press, but two enemies in the column behind it are squeezed to 0.999 of their summed radii against the bar of 0.75. The bar holds at 0.43 to 0.46, 0.49, and 0.5 and fails at 0.35 to 0.42 and 0.47, so there is no clean threshold; those shares carry the hero 443 to 1065 units. At 0 the bar holds with 16 passes, at 0.605, but then the stress tier's mean tick is 5.9 to 7.5 ms against 4. The corridor spec proves the carry at 0 under 20 by retuning the recorded session on its first tick. The six logs are re-stamped, not re-recorded, because at 0.5 no position moves; no number in the enemy or spell catalogue moves either. The feel, stress-zones, and stress specs read no new positions at 0.5, so they are unchanged. The movement page and the status effects page state the share. Sized 1.5, actual 0.75.

**Build:** `separateDiscs` in `src/domain/movement/collision.ts` takes a share. `separatePair` gives the hero the `hero_push_share` of the separation when exactly one disc of the pair is the hero, and the other disc the rest. The lift rule is read first: a lifted unit's held disc (Q32) is decided before the hero's share. Two units that are not the hero split evenly, as now. `hero_push_share` is a tunable in `src/content/tuning.ts`, starting at 0 (Q57, the maintainer's call: an enemy does not push the hero back unless an ability knocks it), and retunes from the panel on the next tick. The [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md) page states the share in its push-out paragraph, its edge-case row, and its quick reference; the [status effects](../../../../docs/product/features/status-effects.md) page's push-out line follows.

**Acceptance:**
- At a share of 0.5, every pair separates exactly as it does today: the pinned unit case matches the old numbers to the bit.
- At the default share of 0, the corridor press of `tests/simulation/corridor-200.spec.ts` carries the hero less than 20 units in fifteen seconds, against about 600 today; the hero is displaced only by a push status such as a slam's knockback, which the share does not touch.
- The corridor test's overlap bar still holds with enemies pressed between the hero and a wall. If it does not at 0, the ticket reports the smallest share that holds it rather than loosening the bar, and the maintainer chooses.
- The value moved from the panel lands in the log as `set_tuning` and applies on the next tick.
- The six stored logs replay on the new content version: `corridor-200`, `boss-encounter`, `balance-hero`, `balance-spells`, and `balance-archetypes` recorded again, since their specs assert what the crowd does; `phase-1-session` re-stamped. Any number in section 5 of the enemy catalogue or section 8 of the spell catalogue that moves with the recording moves on the page in the same change.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/domain/movement/collision.spec.ts`: a share of 0.5 pinned to today's split; a hero pair at the default share; a lifted unit decided before the hero's share; two enemies split evenly.
- `tests/simulation/corridor-200.spec.ts`: the carry bound.
- `tests/simulation/feel/displacement.spec.ts`, `tests/simulation/stress-zones.spec.ts`, `tests/simulation/stress.spec.ts`: moved to the new rule where they read positions.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P6-S25-T03 — Elites and bosses pay more experience

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | none |
| Status | planned |

**Build:** `elite_experience_multiplier` at 3 and `boss_experience_multiplier` at 10 as tunables, read by `grantReward` from the dying unit's tier the way the health multipliers are read at spawn (Q54). An add still grants nothing. The [enemies](../../../../docs/product/features/enemies.md) page's tiers table and sections 4 and 7.4 of the enemy catalogue state it.

**Acceptance:**
- A grunt at normal, elite, and boss tier grants 46, 138, and 460; an imp grants 0.
- A multiplier retuned from the panel applies to the next death and lands in the log.
- The stored logs are re-stamped, or recorded again where a spec asserts experience.

**Tests:**
- `tests/simulation/enemies/tiers.spec.ts`: experience at each tier, and a retune read at the next death.
- `tests/simulation/hero/experience.spec.ts`: an elite kill levels the hero as its multiplied experience says.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P6-S25-T04 — A pack's placement search is bounded

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | none |
| Status | planned |

**Build:** `findPackCells` in `src/domain/ai/packs.ts` searches rings out to a `pack_placement_radius` tunable instead of until it finds room, about 440 rings on a 4000 by 24000 map, and a pack that finds no room within it waits as it does today, at a bounded cost a tick. The [entities and pools](../../../../docs/architecture/entities-and-pools.md) page's dormant-pack section states the radius.

**Acceptance:**
- A pack whose point is walled in waits, and the rings searched for it on any tick are no more than the radius allows.
- Every pack of every registered map places on its empty map within the radius.
- A pack spawned from the panel near a wall still places.

**Tests:**
- `tests/domain/ai/packs.spec.ts`: bounded search; a walled-in pack waits; a pack near a wall places.
- `tests/content/maps.spec.ts`: every pack of every map places on its empty map.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The map spec approved by the maintainer | Written by T01, 2026-09-26. The approval waits on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24 |
| The corridor carry at the default share, and the six logs on the new version | T02: at a share of 0 the corridor press carries the hero 0 units, tested under 20. The default stays at 0.5 because the overlap bar fails at 0 (0.999 against 0.75), provisionally, as Q59, awaiting the maintainer. The six logs are re-stamped on content version `ce5563f6` |
| Actual days per ticket | T01 0.5 of 1.5 · T02 0.75 of 1.5 |

## Risks in this sprint

- T02 re-records five logs. Run T03 and T04 after it, and let them re-stamp on top of its recording rather than record twice.
- The spec's budget is arithmetic on catalogue numbers that the triage may retune. The budget table names its inputs so a retune recomputes it rather than invalidating it.
- The approval is calendar time outside the sprint. Sprints 26 and 27 do not wait on it; P6-S28-T01 does.
