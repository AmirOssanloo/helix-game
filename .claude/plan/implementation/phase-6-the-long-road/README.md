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

Filled when the gate is walked.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| The maintainer's playtest | | |
| Triage and the bucket | | |
| Sized versus actual | | |
| Largest miss | | |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 6 | 23 | | | |
