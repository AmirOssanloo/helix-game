# Sprint 39 — The long road at Diablo II density

**Phase:** 8 · **Sized days:** 4, unplanned: T01 2, T02 0.5, T03 1.5 · **Buffer:** 1 · **Runs:** first in phase 8, before sprint 31, as sprints 23 and 24 ran between 13 and 14

> **Note, 2026-09-27:** added by a re-cut before phase 8 started, from Q58's answer, decided by the delivery lead on the maintainer's delegation. Sprint 31 was full, so the road takes the next free sprint number and runs first, so every loot ticket and the drop-rate balance run on the new road. Its number says when it was written, not when it runs.

## Goal

The long road holds enough enemies for loot to have volume, with most of the hero's experience from normal packs rather than bosses. Every map has a level, which an item's level is read from, and the panel can set it. A crowd presses the hero far less.

## Playable outcome

Choose the long road from the panel and walk it from level 1: packs of three to six through the fields, elite packs of two or three, a boss and its guard at every choke, the hero holding its ground in a choke, and the hero at about level 11 to 13 at the last boss's kill.

---

## Tickets

### P8-S39-T01 — The long road at Diablo II density

| Field | Value |
| --- | --- |
| Layer | docs, content, tests |
| Size | 2 |
| Depends on | none; Q58 answered |
| Status | done |

> **Note, 2026-09-27:** unplanned, from Q58's answer of 2026-09-27, which supersedes Q95: the road changes in phase 8. Loot needs volume, and today the five bosses pay 3140 of a full clear's 6308.

**Build:** [the long road spec](../../../../docs/product/specs/the-long-road.md) rewritten, then `src/content/maps/long-road.def.ts` from it:

- **Packs.** Normal field packs of 3 to 6 members, Diablo II's group sizes; elite packs of 2 to 3; each region's boss and its guard as today. About 100 to 130 enemies in all. The five regions, their order, their archetypes, the chokes, and the checkpoints stay; every pack still stands at least 256 from any obstacle and more than 1000 from every checkpoint.
- **Experience.** `boss_experience_multiplier` in `src/content/tuning.ts` from 10 to 5, so normal packs pay most of a full clear. The budget table lands the last boss's kill at about level 11 to 13, each region worth roughly two levels. Enemy stats are not scaled (Q55 stands).
- **The near-point bound.** The spec's bound on live enemies near any point is argued again for the larger packs; it stays far under the cap of 200, with room for adds and for packs not yet asleep behind the hero.
- **The Legendary bosses.** The spec names the three boss packs that each drop one of the three Legendary pieces (Q84); P8-S32-T02 builds the drop.
- **Hidden work: the phase 6 playtest log is retired.** `tests/simulation/replays/long-road-playtest.json` was recorded on the old road and cannot replay on the new one. It and `tests/simulation/replays/long-road-playtest.spec.ts` are removed, and a line in the [phase 6 README](../phase-6-the-long-road/README.md#exit-record)'s exit record says it proved the phase 6 replay row on the commit before this ticket. Phase 8's playtest, P8-S37-T02, records the new reference log.
- **Hidden work: Q86's rates.** The globe rates are tuned against the new road in P8-S37-T01, not against the clean run's route on seed 3742014961, which no longer exists.
- **Docs.** The enemies page's tiers table and section 7.4 of the enemy catalogue state the boss multiplier at 5; the vocabulary's long road row loses "about level 10".

The content version moves; the six stored logs that remain are re-stamped by `pnpm restamp`, and their checksums re-recorded with `pnpm restamp --checksums` where the map moves them (phase 7's P7-S45-T01 and T02). The map definition is exempt from the `max-lines` limit as data.

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

> **Done, 2026-09-27:** 37 packs of 104 enemies: 27 normal packs of 89, 5 elite pairs, 5 bosses; the 32 old positions kept with five new field packs on open ground, one in region 1 and four in region 5, and the 137 obstacles and 6 checkpoints unchanged. The guards stay at 2 or 3, as the ticket's "as today" reads. A full clear pays 7931: 7481 before the last boss, level 11, and level 12 with its kill; the regions end at levels 3, 5, 7, 9, and 11; normal packs pay 4747, 60%. The five field packs grown into region 5 are of earlier archetypes, since its level is the dearest (Q101, provisional). The near-point bound is 60, peaking at 33 within 2000 and 48 within 3200. The Legendary bosses are packs 14, 28, and 37 (Q100, provisional). The long-road stress case: 4338 ticks, mean 0.141 ms, worst 4.72 ms, most live 26, most awake behind 1, no pack refused, the hero at level 9 fighting only its line. The six logs replay on content version `14e6373d`, their checksums re-recorded by `pnpm restamp --checksums`, since the tuning table and the map are world state from tick 0; the balance, corridor, and boss-encounter specs hold unchanged. The phase 6 playtest log and spec are removed, with the line in the phase 6 README.

---

### P8-S39-T02 — A level on every map, and a panel command to set it

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, devtools, tests, docs |
| Size | 0.5 |
| Depends on | T01; Q89 answered |
| Status | done |

> **Note, 2026-09-27:** first written as "Regions and their area levels on the map" on Q89's Diablo II recommendation; rewritten the same day on Q89's answer, which takes Diablo I's structure: a level is one map and is not split into regions, and an item's level is the map's level.

**Build:** every map definition gains a required `level` field, its **map level**, Diablo I's dungeon level: the arena at 1, and the long road at **3**. The long road takes the hero from level 1 to about 12, as Diablo I's Cathedral, dungeon levels 1 to 4, does, so one level for the whole road sits in that band; 3 lets the catalogue's lower bases and affixes drop and be worn early, while any with a quality or affix level above 3 are reached only through the panel's command below, which is how item-level gating is tested on the road. A debug command, `set_map_level`, sets the current map's level for the rest of the session, recorded and replayed as every command is ([ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md)); the panel's **Map** group gains a control for it. Enemies still have no level for their stats (Q55, confirmed by the maintainer 2026-09-27: a level drives only loot). The [world model](../../../../docs/architecture/world-model.md)'s map row, the [long road spec](../../../../docs/product/specs/the-long-road.md), and the [developer panel](../../../../docs/product/features/developer-panel.md) page state it. It is a content-format change: every map is edited, the content version moves, and the six logs are re-stamped by `pnpm restamp`.

**Acceptance:**
- Every map names a level; the arena's is 1 and the long road's 3.
- `set_map_level` changes the current map's level on the next tick, lands in the log, and replays; loading a map reads its definition's level again.
- No enemy stat reads the map level.

**Tests:**
- `tests/content/maps.spec.ts`: every map's level.
- `tests/simulation/dev-api.spec.ts`: the command, its log line, its replay, and a map load resetting it.
- `tests/devtools/panel.spec.ts`: the control.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

> **Note, 2026-09-27:** two readings corrected while building. The panel has no **Map** group; its map dropdown sits in the simulation group, so the **Map level** control sits there beside it. And the level is world state a command changes, so the checksum hashes it: the six logs had their checksums recorded again with `pnpm restamp --checksums`, not only their stamps, after a probe with the level left out of the hash replayed all six to their old checksums at every stored tick, which shows nothing else moved.

> **Done, 2026-09-27:** `MapDef` has a required `level`, a whole number of one or more that the map kind validates; the arena is at 1 and the long road at 3. Map scope holds the level, read from the definition on creation and on every `loadMap`; a `reset_map` keeps it (Q102, provisional). `set_map_level` is a debug command validated as a whole number of one or more, refused otherwise as `invalid_map_level`, and applied to map scope hero or no hero; it is in the log and the checksum. The simulation group's **Map level** shows the world's level, follows each load and replay, and submits the command. No enemy stat reads it: a brute elite spawned at level 60 matches one at level 1. The world model, the map and camera page, the long road spec, the developer panel page, the devtools architecture page, and the vocabulary state it. Content version `14e6373d` to `6f28a66b`. `pnpm check` green, 4603 tests; the budget project green.

---

### P8-S39-T03 — The crowd's push on the hero at 0.1

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | T01 |
| Status | done |

> **Note, 2026-09-27:** unplanned, from the maintainer's walk of sprint 25's crowd press: "the knockback is too much, it needs to be reduced by 80%". Read by the delivery lead as the crowd's push on the hero, `hero_push_share`, since grunts carry no knockback ability and push-out is the only push in that check. An assumption the maintainer can correct: if an ability's knockback was meant, this ticket is re-aimed at that ability's displacement before it starts.

> **Note, 2026-09-28:** the engineering architect's call: option (b), a contact rank. Under (a) the corridor's overlap reaches 0.956 at 0.1, discs visibly stacked, which no longer reads as a crowd, and the carry is still 188.3 against 430.6. The rule: at the start of every push-out pass, not once per tick (once per tick measured 0.753 and fails), a breadth-first walk over the spatial hash ranks units by contact. Every grounded hero in the pool is rank 0; a grounded unit that is not a hero, enemy or summon alike, touching a unit of rank n is rank n + 1, where touching is a centre distance under the sum of the radii plus a contact slack of 1 unit; everything else is unranked. The slack is a named constant beside the rule with a comment giving its reason, that a pair the last pass left exactly touching is still in contact, and not a tunable: it is a tolerance of the rule, not a feel a designer turns. Lifted units neither take nor pass a rank, so a lift breaks a chain, and a dead, lifted, or absent hero seeds nothing, so every pair splits evenly. A pair's shares are decided in this order: the lift rule first, then the hero's pair at `hero_push_share` as today, then two ranked units of different rank, where the one nearer the hero takes `hero_push_share` and the other the rest, and otherwise half each. One tunable, no new one; at 0.5 the rule is today's to the bit, measured. The rank is a breadth-first distance, so it does not depend on the order the hash returns neighbours in. The rank and the queue are preallocated in `world.scratch`, indexed by pool slot, with a sentinel for unranked; the walk compares squared distances and allocates nothing. The overlap bar stays 0.75, and holds at 0.506. ADR 0002 is not amended: it fixes positional separation along the centre line in capped passes with no speed response, and the rule keeps all three and changes only the shares, which the movement, collision, and pathing page owns. No new decision record either: the rule is one module's, reversible by the tunable, and vanishes at 0.5. Measured: carry 0.019 at 0.1 against 430.6 at 0.5, not a fifth, because the share damps the press once per rank; the acceptance row is edited in place with those numbers, reading "reduce by 80%" as the share itself, which the Build text fixes. That the press now barely carries the hero at all is a feel for the maintainer's playtest to confirm, not a structural question.

**Build:** `hero_push_share` in `src/content/tuning.ts` from 0.5 to 0.1, 80% less (Q57 and Q59 now answered at 0.1). Q59 measured the corridor's overlap bar failing below about 0.43: the enemy pinned against the hero takes the whole overlap and the column behind it cannot pass it back in four passes. So the ticket takes one of Q59's two options, and which is **the engineering architect's call inside the ticket**, made in writing before the code: (a) loosen the overlap bar for a column pressed behind the hero, stating the new bar and why it still reads as a crowd; or (b) stop a crowd pressing into the enemies ahead of it, a rule in the collision pass, at a tick cost the stress tier measures. More passes and a larger tick budget, Q59's (c), is not open: the stress tier ran 5.9 to 7.5 ms at 16 passes. The [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md) page and the [status effects](../../../../docs/product/features/status-effects.md) page state the share; ADR 0002 is amended only if (b) changes what it fixes about separation, which the architect says. The logs whose specs read what a crowd does, the corridor, the boss encounter, and the balance sessions, are recorded again, their checksums with them; the rest re-stamped by `pnpm restamp`.

**Acceptance:**
- At 0.1, the corridor press carries the hero at most a fifth of what it did at 0.5, measured on the corridor replay and written in the ticket.

  > **Note, 2026-09-28:** edited in place from "about a fifth", on the architect's call above: the carry is not linear in the share, since under the contact rank the share damps the press once per rank, so at 0.1 it measured 0.019 units against 431 at 0.5. "Reduce by 80%" is read as the share itself, which the Build text fixes.

- The overlap bar holds as written, under (b), or as the architect's loosened bar, under (a); no bar is loosened silently.
- The long-road stress case and the budget project hold the tick budget.
- The stored logs replay on the new content version.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/domain/movement/collision.spec.ts`: the hero's pair at 0.1; under (b), a crowd not pressing into the enemies ahead.
- `tests/simulation/corridor-200.spec.ts`: the carry at 0.1 and the overlap bar the ticket settles.
- `tests/simulation/stress.spec.ts`: green.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Done, 2026-09-28:** option (b), at the engineering architect's call written above before the code. `hero_push_share` is 0.1. At the start of every push-out pass the collision system ranks units by contact with a hero, breadth first over the spatial hash, into a rank array and a queue preallocated in the world's scratch by pool slot, comparing squared distances; the contact slack of 1 unit is a named constant beside the rule. A living, grounded hero is rank 0, a grounded unit that is not a hero touching rank n is n + 1, a lifted unit takes and passes no rank. Of two units that are not the hero, ranked apart, the one nearer the hero takes the push share; otherwise half each. At 0.5 the rule is the old one to the bit. On the corridor replay: the carry is 0.019 units at 0.1 against 430.6 at 0.5, where under (a) it would have been 188.3 with an overlap of 0.956; the worst overlap is 0.506 against the unchanged bar of 0.75; the settle bars and the walk home hold. The stress tier's means 2.28, 2.03, 2.34, and 2.71 ms against 2.31, 1.99, 2.40, and 2.52 before; the long road 4338 ticks, mean 0.135 ms, worst 1.73 ms, most live 26, no pack refused. ADR 0002 is not amended. The movement, collision, and pathing page, the status effects page, the hero page, and the vocabulary, with a new row for **Contact rank**, state the rule; Q57 and Q59 record it. The three balance sessions were recorded again by their drivers (the hero session now 5382 ticks against 5188, the spells session's records moved, the archetypes session's unchanged), and every log's checksums recorded again with `pnpm restamp --checksums`, since the tuning table is world state from tick 0; the corridor and the boss encounter have no recorder, so their inputs stand and their checksums were recorded again, and every spec reading them holds. Content version `6f28a66b` to `58ea785f`. `pnpm check` green, 4613 tests; the budget project green. That the press now barely carries the hero is a feel for the maintainer's playtest, deferred under Waiting on a person.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The long road at 100 to 130 enemies, the budget at level 11 to 13 | 104 enemies in 37 packs; level 11 before the last boss, 12 with its kill, two levels a region; normal packs 60% of a full clear |
| The near-point bound and the long-road stress case | Bound 60, peaks 33 within 2000 and 48 within 3200; the stress case at most 26 live, no pack refused, mean tick 0.141 ms |
| The phase 6 playtest log retired with its note | Removed with its spec; the line is in the phase 6 README's exit record |
| A level on every map, and the panel command to set it | The arena at 1, the long road at 3; `set_map_level` in the log and the checksum, replayed, reset by a map load, kept by a reset; the **Map level** control in the simulation group |
| The crowd's push at 0.1, and the overlap bar the architect's option settles | Option (b), a contact rank set each pass; the corridor carry 0.019 against 430.6 at 0.5; the overlap bar unchanged at 0.75, worst 0.506; stress means under 2.8 ms |
| Actual days per ticket | T01: 0.5 against 2; T02: 0.5 against 0.5; T03: 0.5 against 1.5 |
| Sprint total | Sized 4 with 1 of buffer, done in 1.5, the buffer unspent; closed 2026-09-28 |

## Risks in this sprint

- The budget at a boss multiplier of 5 and packs of 3 to 6 may not land in 11 to 13 on the first table. The pack counts move before the multiplier does; a multiplier other than 5 is a question for the maintainer.
- More live enemies near a choke press the hero harder; T03 takes the share to 0.1, and the maintainer's playtest in sprint 37 is where the chokes are felt again.
- T03's option (b) is new collision behaviour with a tick cost. If the architect cannot bound it inside 1.5 days, (a) is the fallback, and the ticket says so rather than running over.
