# Sprint 39 — The long road at Diablo II density

**Phase:** 7 · **Sized days:** 4, unplanned: T01 2, T02 0.5, T03 1.5 · **Buffer:** 1 · **Runs:** first in phase 7, before sprint 31, as sprints 23 and 24 ran between 13 and 14

> **Note, 2026-09-27:** added by a re-cut before phase 7 started, from Q58's answer, decided by the delivery lead on the maintainer's delegation. Sprint 31 was full, so the road takes the next free sprint number and runs first, so every loot ticket and the drop-rate balance run on the new road. Its number says when it was written, not when it runs.

## Goal

The long road holds enough enemies for loot to have volume, with most of the hero's experience from normal packs rather than bosses. Every map has a level, which an item's level is read from, and the panel can set it. A crowd presses the hero far less.

## Playable outcome

Choose the long road from the panel and walk it from level 1: packs of three to six through the fields, elite packs of two or three, a boss and its guard at every choke, the hero holding its ground in a choke, and the hero at about level 11 to 13 at the last boss's kill.

---

## Tickets

### P7-S39-T01 — The long road at Diablo II density

| Field | Value |
| --- | --- |
| Layer | docs, content, tests |
| Size | 2 |
| Depends on | none; Q58 answered |
| Status | planned |

> **Note, 2026-09-27:** unplanned, from Q58's answer of 2026-09-27, which supersedes Q95: the road changes in phase 7. Loot needs volume, and today the five bosses pay 3140 of a full clear's 6308.

**Build:** [the long road spec](../../../../docs/product/specs/the-long-road.md) rewritten, then `src/content/maps/long-road.def.ts` from it:

- **Packs.** Normal field packs of 3 to 6 members, Diablo II's group sizes; elite packs of 2 to 3; each region's boss and its guard as today. About 100 to 130 enemies in all. The five regions, their order, their archetypes, the chokes, and the checkpoints stay; every pack still stands at least 256 from any obstacle and more than 1000 from every checkpoint.
- **Experience.** `boss_experience_multiplier` in `src/content/tuning.ts` from 10 to 5, so normal packs pay most of a full clear. The budget table lands the last boss's kill at about level 11 to 13, each region worth roughly two levels. Enemy stats are not scaled (Q55 stands).
- **The near-point bound.** The spec's bound on live enemies near any point is argued again for the larger packs; it stays far under the cap of 200, with room for adds and for packs not yet asleep behind the hero.
- **The Legendary bosses.** The spec names the three boss packs that each drop one of the three Legendary pieces (Q84); P7-S32-T02 builds the drop.
- **Hidden work: the phase 6 playtest log is retired.** `tests/simulation/replays/long-road-playtest.json` was recorded on the old road and cannot replay on the new one. It and `tests/simulation/replays/long-road-playtest.spec.ts` are removed, and a line in the [phase 6 README](../phase-6-the-long-road/README.md#exit-record)'s exit record says it proved the phase 6 replay row on the commit before this ticket. Phase 7's playtest, P7-S37-T02, records the new reference log.
- **Hidden work: Q86's rates.** The globe rates are tuned against the new road in P7-S37-T01, not against the clean run's route on seed 3742014961, which no longer exists.
- **Docs.** The enemies page's tiers table and section 7.4 of the enemy catalogue state the boss multiplier at 5; the vocabulary's long road row loses "about level 10".

The content version moves; the six stored logs that remain are re-stamped.

**Acceptance:**
- Every normal field pack holds 3 to 6 members and every elite pack 2 to 3; the road holds 100 to 130 enemies; every pack places on the empty map within the placement radius; a path runs through every checkpoint in order to the last boss.
- The budget table and the file agree: the last boss's kill lands between level 11 and 13, each region about two levels, and normal packs pay more than half of a full clear.
- No point on the road has more enemies within the sleep radius than the spec's new bound, and the bound is under 200 with the room for adds the spec states.
- The long-road case of `tests/simulation/stress.spec.ts` holds: at or under 200 live at every tick of a full walk, no pack refused, the packs behind asleep, the tick budget kept.
- The phase 6 playtest log and spec are gone, with the line in the phase 6 README; the six stored logs replay on the new content version.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/content/maps.spec.ts`: pack sizes, placement, the path through the checkpoints, the near-point bound.
- `tests/content/catalogues.spec.ts`: the spec's pack table and budget against the file, the level at the last boss's kill.
- `tests/simulation/enemies/tiers.spec.ts`: a boss pays 5 times its archetype's experience.
- `tests/simulation/stress.spec.ts`: the long-road case on the new road.

**Definition of done:** Every change · A documentation change.

---

### P7-S39-T02 — A level on every map, and a panel command to set it

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, devtools, tests, docs |
| Size | 0.5 |
| Depends on | T01; Q89 answered |
| Status | planned |

> **Note, 2026-09-27:** first written as "Regions and their area levels on the map" on Q89's Diablo II recommendation; rewritten the same day on Q89's answer, which takes Diablo I's structure: a level is one map and is not split into regions, and an item's level is the map's level.

**Build:** every map definition gains a required `level` field, its **map level**, Diablo I's dungeon level: the arena at 1, and the long road at **3**. The long road takes the hero from level 1 to about 12, as Diablo I's Cathedral, dungeon levels 1 to 4, does, so one level for the whole road sits in that band; 3 lets the catalogue's lower bases and affixes drop and be worn early, while any with a quality or affix level above 3 are reached only through the panel's command below, which is how item-level gating is tested on the road. A debug command, `set_map_level`, sets the current map's level for the rest of the session, recorded and replayed as every command is ([ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md)); the panel's **Map** group gains a control for it. Enemies still have no level for their stats (Q55, confirmed by the maintainer 2026-09-27: a level drives only loot). The [world model](../../../../docs/architecture/world-model.md)'s map row, the [long road spec](../../../../docs/product/specs/the-long-road.md), and the [developer panel](../../../../docs/product/features/developer-panel.md) page state it. It is a content-format change: every map is edited, the content version moves, and the six logs are re-stamped.

**Acceptance:**
- Every map names a level; the arena's is 1 and the long road's 3.
- `set_map_level` changes the current map's level on the next tick, lands in the log, and replays; loading a map reads its definition's level again.
- No enemy stat reads the map level.

**Tests:**
- `tests/content/maps.spec.ts`: every map's level.
- `tests/simulation/dev-api.spec.ts`: the command, its log line, its replay, and a map load resetting it.
- `tests/devtools/panel.spec.ts`: the control.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

### P7-S39-T03 — The crowd's push on the hero at 0.1

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | T01 |
| Status | planned |

> **Note, 2026-09-27:** unplanned, from the maintainer's walk of sprint 25's crowd press: "the knockback is too much, it needs to be reduced by 80%". Read by the delivery lead as the crowd's push on the hero, `hero_push_share`, since grunts carry no knockback ability and push-out is the only push in that check. An assumption the maintainer can correct: if an ability's knockback was meant, this ticket is re-aimed at that ability's displacement before it starts.

**Build:** `hero_push_share` in `src/content/tuning.ts` from 0.5 to 0.1, 80% less (Q57 and Q59 now answered at 0.1). Q59 measured the corridor's overlap bar failing below about 0.43: the enemy pinned against the hero takes the whole overlap and the column behind it cannot pass it back in four passes. So the ticket takes one of Q59's two options, and which is **the engineering architect's call inside the ticket**, made in writing before the code: (a) loosen the overlap bar for a column pressed behind the hero, stating the new bar and why it still reads as a crowd; or (b) stop a crowd pressing into the enemies ahead of it, a rule in the collision pass, at a tick cost the stress tier measures. More passes and a larger tick budget, Q59's (c), is not open: the stress tier ran 5.9 to 7.5 ms at 16 passes. The [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md) page and the [status effects](../../../../docs/product/features/status-effects.md) page state the share; ADR 0002 is amended only if (b) changes what it fixes about separation, which the architect says. The logs whose specs read what a crowd does, the corridor, the boss encounter, and the balance sessions, are recorded again; the rest re-stamped.

**Acceptance:**
- At 0.1, the corridor press carries the hero about a fifth of what it did at 0.5, measured on the corridor replay and written in the ticket.
- The overlap bar holds as written, under (b), or as the architect's loosened bar, under (a); no bar is loosened silently.
- The long-road stress case and the budget project hold the tick budget.
- The stored logs replay on the new content version.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/domain/movement/collision.spec.ts`: the hero's pair at 0.1; under (b), a crowd not pressing into the enemies ahead.
- `tests/simulation/corridor-200.spec.ts`: the carry at 0.1 and the overlap bar the ticket settles.
- `tests/simulation/stress.spec.ts`: green.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The long road at 100 to 130 enemies, the budget at level 11 to 13 | |
| The near-point bound and the long-road stress case | |
| The phase 6 playtest log retired with its note | |
| A level on every map, and the panel command to set it | |
| The crowd's push at 0.1, and the overlap bar the architect's option settles | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- The budget at a boss multiplier of 5 and packs of 3 to 6 may not land in 11 to 13 on the first table. The pack counts move before the multiplier does; a multiplier other than 5 is a question for the maintainer.
- More live enemies near a choke press the hero harder; T03 takes the share to 0.1, and the maintainer's playtest in sprint 37 is where the chokes are felt again.
- T03's option (b) is new collision behaviour with a tick cost. If the architect cannot bound it inside 1.5 days, (a) is the fallback, and the ticket says so rather than running over.
