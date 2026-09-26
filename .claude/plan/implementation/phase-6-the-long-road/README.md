# Phase 6 — The long road

**Sprints:** 25–30 · **Sized days:** 23, of which 19 are tickets and 4 are the triage bucket's appetite · **Gate:** [Phase 6 gate](../04-phase-exit-gates.md#phase-6-gate)
**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's goal and the engineering architect's structural brief of the same day

## Goal

A real, hand-authored playtest map: the long road, a rectangle 4000 by 24000 the hero walks from level 1 at one end to about level 10 at the last boss at the other. Simple enemies first, many packs and many archetypes, difficulty rising along the road so progression is obvious by direction. Its purpose is playtesting: the hero's share of push-out (Q31), how the early game feels, and how the hero and the enemies play, with the maintainer's feedback captured in the build and triaged into tuning and, where a spell does not suit a Diablo-like, a spell swap.

The maintainer chose this bet before *one floor* on 2026-09-26. One floor, loot, the generator, the town, and art wait until after it, in [Deferred](../backlog/deferred.md).

## The order inside the phase

1. **The map spec and the push rule first** (sprint 25). The spec decides regions, packs, checkpoints, and the experience budget before any map data exists, as every catalogue in this plan came before its schema. Q31 comes early because it is the first thing the maintainer wants to test and it moves five stored logs, so every later ticket re-stamps on top of it rather than under it. The tier experience multiplier and the bounded placement search are small and the spec's arithmetic and the map's content tests lean on them.
2. **What a long map needs from the world** (sprint 26): the map chosen like the seed, checkpoints, and packs that sleep again. The map definition cannot be written or tested without all three: a long map with one-way dormancy ratchets to the cap and silently refuses the regions' bosses.
3. **The playtest tools** (sprint 27): enemies go home while the hero is dead, the checkpoint jump and its marker, the feedback key and its file, and the replace-a-spell runbook with the recipe check. All must exist before the maintainer plays.
4. **The long road itself and its cap** (sprint 28): the definition from the approved spec, obstacle views bound by the camera, and the cap measured headless on the whole road.
5. **The playtest and the triage** (sprint 29), then **the rest of the bucket and the gate** (sprint 30).

## Cut-line

**In:** a map spec under `docs/product/specs/`; the long road as one map definition; checkpoints with a jump to any of them from the panel; the map chosen from the panel and a log loaded on its own map; packs that wake and sleep again, with a content check on live enemies near any point; a bounded placement search; elites and bosses paying more experience; enemies going home while the hero is dead; obstacle views bound by the camera; the hero's smaller share of push-out; the feedback key and file with the build's commit; the replace-a-spell runbook and the recipe check; one playtest by the maintainer; triage; a bucket of four sized days for what the triage accepts.

**Out, deliberately:** loot and items, a minimap, fog of war, the generator and *one floor*, the town, per-level or per-pack enemy scaling (Q55), a map editor, sprite art, audio, saves, an eleventh spell, and the kit fix from the phase 5 door tests. Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

**Not refactored ahead of feedback:** the shared specs that use real spells as fixtures. A spell swap moves only the named spells' uses onto test-only fixture spells, inside its own ticket.

## Live cap on the long road

**200**, `ENEMY_LIVE_CAP`, as Q9 settled it on 2026-09-25. Nothing in this phase raises it. The long road holds more than 200 enemies in its packs; the cap is held by dormancy in both directions and by a content check that no point on the road can wake more than the spec's bound, which leaves room for adds. P6-S28-T03 measures a full walk headless.

## What the engineer can do at the end

Pick the long road from the panel, walk from the spawn at level 1 through five regions, each harder than the last and closed by a boss-tier pack, die and come back at the furthest checkpoint, jump to any checkpoint from the panel, press the feedback key to write a note that saves with the session and reopens at its tick, and see the live count fall as packs behind the hero sleep.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [25](./sprint-25-the-map-spec-and-the-push-rule.md) | The map spec and the push rule | 4 |
| [26](./sprint-26-map-choice-checkpoints-and-sleeping-packs.md) | Map choice, checkpoints, and sleeping packs | 4 |
| [27](./sprint-27-the-playtest-tools.md) | The playtest tools | 4 |
| [28](./sprint-28-the-long-road-and-its-cap.md) | The long road and its cap | 4 |
| [29](./sprint-29-the-playtest-and-the-triage.md) | The playtest and the triage | 1.5 + 2.5 bucket |
| [30](./sprint-30-the-bucket-and-the-phase-gate.md) | The rest of the bucket and the phase gate | 1.5 + 1.5 bucket |

## The triage bucket

The playtest will find work the tests cannot, as sprint 11's 5.75 unplanned days showed the one other time the maintainer played thoroughly. The plan does not pretend to know it. It holds an **appetite of four sized days**, 2.5 in sprint 29 after the triage and 1.5 in sprint 30 before the gate. P6-S29-T02 writes each accepted item as a ticket with the next free number, in this order, until the appetite is spent:

1. Anything that stops the road being played from the spawn to the last boss.
2. The hero's push share and the early-game numbers: a tuning change kept as a content edit, recording the balance logs again if a balance number moves. About 0.5 a batch.
3. Spell swaps, each through the replace-a-spell section of the [adding-a-spell runbook](../../../../docs/workflows/adding-a-spell.md): the definition, the form's ability list, the disable matrix's row, the named spells' shared-spec uses moved onto fixture spells, and `balance-spells.json` recorded again. About 1.5 each, so the bucket holds two at most.
4. Map edits: a pack moved, a count changed, a wall opened, with the map's content tests run again. About 0.5 a batch.

Whatever does not fit goes to [Deferred](../backlog/deferred.md) as "the long road, after triage", or to [Open questions](../backlog/open-questions.md) if it is a decision. An eleventh spell is a kit redesign, three orbs give exactly ten recipes, and it goes to the engineering architect, never into the bucket. The bucket is not spent to fill it: an unspent day is recorded as unspent.

## Exit record

Closed 2026-09-26 on every row an agent can verify. P6-S30-T01 walked the gate, and P6-S30-T02's docs sync made the docs row hold. The rows that need a person, the maintainer's playtest and its session replayed, the feedback and its triage, and the bar in Chrome, Firefox, Safari, and Edge, are deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and a row of [Deferred](../backlog/deferred.md). Milestone M10 is reached on the same terms. A bucket ticket the triage writes later runs against this record, and the gate's playtest and triage rows are walked again when it closes. They were, after the maintainer's clean run of 2026-09-26: the playtest, its replay, and its triage hold, and the bar per browser is the one person row left open.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-26; the evidence per row is in the [sprint 30 gate walk](./sprint-30-the-bucket-and-the-phase-gate.md#phase-6-gate-walk). Six rows hold headless: the long road walkable to about level 10 by the budget, every pack placing, the cap, the push share at Q59's provisional default of 0.5, the checkpoints and sleeping packs, and the bar's tick. The docs row holds since P6-S30-T02, on its checklist. Walked again after the maintainer's clean run the same day: the level row holds by play, level 10 at the last boss's kill; the session replays identically; the feedback is triaged. Only the bar per browser waits on a person. No gate bug | the engineer running the plan |
| The maintainer's playtest | **Clean run 2026-09-26**, seed 3742014961, content version `08d1c2e4`, 13164 ticks, stored as `tests/simulation/replays/long-road-playtest.json`: the last boss killed on tick 12961 at **level 10**, from level 1 at the spawn, and `tests/simulation/replays/long-road-playtest.spec.ts` passes, two replays agreeing at every tick. Panel use: 2 `heal` and 8 `restore_mana`, no `level_up`, no toggle; accepted by the maintainer pending health and mana from loot, in [Deferred](../backlog/deferred.md). The gate's level and replay rows hold. Was: first run 2026-09-26, seed 3727497116: the last boss killed at level 22 on tick 13413, but only with 19 `level_up` commands and other panel help, since the first three enemies could not be passed by play; discarded by the maintainer, not stored. A clean run follows P6-S30-T03. Before it: not yet played. The build starts on the long road and `tests/simulation/replays/long-road-playtest.spec.ts` skips until the session is stored, then reads the level at the last boss's kill. Headless, the long-road stress case reaches the last boss at level 9 in 8524 ticks with no death, fighting only what comes within 800 of its line | the engineer running the plan |
| Triage and the bucket | Triaged 2026-09-26 with the maintainer, from five notes given in chat on the first run, all accepted: 4 of 4 days committed, P6-S29-T03 to T06 (2.5) and P6-S30-T03 (1.5); then P6-S29-T07 (0.5), found by the T03 engineer and approved by the maintainer as unplanned work, 4.5 of 4 on sprint 29's buffer, nothing cut; then P6-S29-T08 (0.5), the tier damage multiplier from the maintainer's answer to Q71, approved as unplanned work, 5 of 4, the buffer spent, nothing cut; the hero's side toward Diablo II curves and a dedicated last boss to Deferred; the bucket closed at about 5.25 of 4 with P6-S30-T03's quarter over. **Walked again after the clean run, 2026-09-26:** no F9 file; two points in chat, each given an outcome in the [triage note](../notes/2026-09-26-long-road-triage.md#the-clean-run): the five fixes feel much better, no change; the heal and mana use, accepted, to Deferred's new row "Health and mana from loot drops". No ticket, no day spent. The row holds. Q57's final value and Q59 to Q67 are not settled by the run and wait on the maintainer's answers. Before it: no feedback filed, so nothing triaged and no bucket ticket written. The bucket: 0 of 4 days spent, 2.5 in sprint 29 and 1.5 in sprint 30, unspent; nothing cut to Deferred. The [triage note](../notes/2026-09-26-long-road-triage.md) holds the tables to fill | the engineer running the plan |
| Sized versus actual | Sized 23 days, 19 in tickets and 4 of bucket appetite, with no unplanned ticket. Actual 8.0: sprints 25 to 30 took 1.75, 2, 1.5, 1.5, 0.5, and 0.75, the bucket nothing. Ratio 0.35 against 23, 0.42 against the 19 in tickets. Across phases 0 to 6, 69.0 actual against 130.6 sized, 0.53 | the engineer running the plan |
| Largest miss | No ticket went over its size. The widest gap was P6-S28-T01, the long road as a map definition, sized 2 and done in 0.5, since the spec had settled every pack and checkpoint before it. The agent days leave out the maintainer's calendar time, which sets this phase's end | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 6 | 23 | 8.0 | 0.35 | P6-S28-T01: sized 2, actual 0.5 |
