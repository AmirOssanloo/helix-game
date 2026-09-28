# Phase 8 — Loot and the store

**Sprints:** 39, then 31–33, 40, 34–38, after phase 7's 45–50 · **Sized days:** 34: 32 in tickets and 2 of the triage bucket's appetite.
- Of the 32, 27 are the tickets planned on 2026-09-26, resized on 2026-09-27 at the same total.
- 6 were added on 2026-09-27: P8-S31-T04 (0.5, Q60), sprint 39 (4: the road, Q58; a level on every map, Q89; the crowd's push, sprint 25's walk), and sprint 40 (1.5, the pick-up order, Q87).
- 1 moved to phase 7 on 2026-09-27: P8-S31-T02 from 1.5 to 1, and P8-S34-T02 from 1 to 0.5.

**Gate:** [Phase 8 gate](../04-phase-exit-gates.md#phase-8-gate)

**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's decisions of 2026-09-26 · **Re-cut:** 2026-09-27, twice, from the answers of that day; renumbered from phase 7 to phase 8 the same day, when the maintainer inserted [phase 7, the foundation](../phase-7-the-foundation/README.md), before it

## Goal

Enemies on the long road drop gold, health globes, mana globes, and equipment. The hero takes gold and globes by walking over or past them and picks up an item by a right click, holds items by their size in a 10 by 4 inventory, wears them in ten armory slots that change its derived stats, and buys and sells at a store opened from a checkpoint ring. The road itself grows first to Diablo II density, about 100 to 130 enemies, so loot has volume and most experience comes from normal packs (Q58), and a crowd presses the hero far less. The first proof: the maintainer walks the long road from level 1 to the last boss's kill with no **Heal** or **Restore mana** from the panel, which the clean run of 2026-09-26 needed twice and eight times on the old road.

The maintainer split the retrospective's *one floor* bet on 2026-09-26: loot and the store first (this phase), usable active items second ([phase 9](../phase-9-active-items/README.md)), then **the descent**, about a hundred generated levels in Diablo I's style (Q89's answer of 2026-09-27). The long road stays the test map for phases 8 and 9. On 2026-09-27 the maintainer put [phase 7, the foundation](../phase-7-the-foundation/README.md), before this phase. It fixes the architecture loot would grow, and lands the seams this phase's tickets name, each listed in the [dependency map](../01-dependency-map.md). Sprint 39 is still the first sprint inside this phase. Every question the phase builds on, Q58 and Q73 to Q94, is answered in [Open questions](../backlog/open-questions.md); Q95 is superseded.

## The order inside the phase

0. **The long road at Diablo II density** (sprint 39, run first): the spec and the map rewritten with packs of 3 to 6, elites of 2 to 3, about 100 to 130 enemies, bosses paying 5 times rather than 10, the last boss's kill at about level 11 to 13, and the phase 6 playtest log retired, since it cannot replay on the new road; a level on every map, the long road at 3, which an item's level is, and a panel command to set it (Q89); and the crowd's push on the hero from 0.5 to 0.1, on sprint 25's walk. Every loot ticket and the balance then run on the road they are tuned for.
1. **The catalogue and the architecture** (sprint 31), after its one unplanned ticket, P8-S31-T04, which moves the checkpoint reach to 256 on the maintainer's answer to Q60 so the store's ring is the size to click. The item catalogue decides slots, bases and their sizes, rarities, affixes, drop tables, and the economy on paper before any schema exists, as every catalogue in this plan came before its schema. The engineering architect then places the inventory, loot, the ground item, the pick-up order, and the store in the layers that already exist. The first UI screen, where items live, and item identity were decided in phase 7 (P7-S48-T04). The schema follows both.
2. **Drops on the ground** (sprint 32): the ground item as a new entity kind with its pool, loot tables rolled on a draw of their own at a death, the item level from the map level, and the font's missing space. Nothing is picked up yet, so the combat of every stored log is untouched while determinism is proved.
3. **Walk over it** (sprint 33): the run-scope inventory of sized items and gold, the armory commands, gold and globes taken on walk-over, and the ground views and labels.
4. **Pick it up** (sprint 40, after 33): the right click that sends the hero to take an item, a new order kind.
5. **Wear it** (sprint 34): equipment as a modifier source with magic damage %, the first screen, and the inventory and armory screen.
6. **Rarity** (sprint 35): seven tiers and rolled affixes, the twenty bases and three Legendary pieces from the approved catalogue, and moving an item on the grid by its size.
7. **The store** (sprint 36): tooltips, the store's stock and its buy and sell commands, its screen opened from the checkpoint ring, and the panel's loot controls.
8. **The balance and the playtest** (sprint 37), then **the docs and the gate** (sprint 38).

## Cut-line

**In:** the long road at Diablo II density, with a level on every map; the crowd's push on the hero at 0.1; an item catalogue under `docs/product/specs/` and a feature page; ten armory slots; about twenty bases, one-handed only, each with a size in cells and a quality level; seven rarity tiers with rolled affixes, each affix with an affix level; magic damage %; three fixed-identity Legendary equipment pieces with fixed values of existing stats, each dropped only by a named boss; gold, health globes, and mana globes; loot tables per enemy tier on a draw of their own, elites always dropping and bosses dropping Rare or better; an item level from the map's level, and a level requirement; the ground item as an entity kind; gold and globes taken on walk-over; a right click to pick up an item, a new order kind; ground labels with Alt for all; a run-scope 10 by 4 inventory of sized items; equip, unequip, move, drop, buy, sell, open store, and close store as commands; the first UI screen, for the inventory and armory; tooltips; a store at each checkpoint, a basic Diablo II store with Armour, Weapons, and Misc tabs, that sells equipment at the hero's level and buys items; the atlas font's space; panel controls to grant an item, grant gold, preview a loot table, and set the map's level; drop rates balanced on the new road; one playtest by the maintainer, whose session becomes the long road's reference log; triage; a bucket of two sized days.

**Out, deliberately:** active items, which have no rarity, never drop, and are listed in the store's Misc tab only in phase 9; any +1 to an orb, which is never built (Q92); the item catalogue at Diablo II's scale, about a thousand items, which waits on a research ticket; the descent and its generator; two-handed weapons, a stash, a store that restocks or buys back what it sold, crafting (never), sets, sockets, item comparison in a tooltip, lifesteal, status resistance, enemy affixes, a death penalty, saves, the town, sprite art, and audio. Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

**Re-cut before the phase started, 2026-09-27:** the long road's map, grown by Q58's answer, which supersedes Q95; walk-over pickup of items replaced by a right click (Q87); a sized inventory (Q88); item level from the map rather than from regions or the enemy's tier (Q89); the +1 to an orb cut (Q92); spell damage % renamed and widened to magic damage % (Q93).

## Live cap on the long road

**200** enemies, `ENEMY_LIVE_CAP`, as before. Ground items do not count against it: they are their own pool, map scope, with a capacity the architect sets in P8-S31-T02, and their views and labels are pools sized to the screen and bound by the camera's rectangle. P8-S38-T01 measures the bar with the ground-item pool full: the tick headless, the frame in Chrome on the development machine by an agent (standing instruction of 2026-09-27).

## What the engineer can do at the end

Walk the long road from level 1, see enemies drop gold, globes, and items with coloured labels, hold Alt to read every label, walk past a globe to heal, right-click an item to pick it up, press I to open the inventory and armory, fit items by their size and wear what dropped, read an item's affixes in its tooltip, stand on a checkpoint ring and click it to buy and sell, and finish the road at the last boss with the panel closed.

## Sprints

In the order they run.

| Sprint | Title | Sized days |
| --- | --- | --- |
| [39](./sprint-39-the-long-road-at-diablo-ii-density.md) | The long road at Diablo II density, run first | 4, unplanned |
| [31](./sprint-31-the-item-catalogue-and-where-it-lives.md) | The item catalogue and where it lives | 3.5 + 0.5 unplanned |
| [32](./sprint-32-drops-on-the-ground.md) | Drops on the ground | 4 |
| [33](./sprint-33-walk-over-it.md) | Walk over it | 4 |
| [40](./sprint-40-pick-it-up.md) | Pick it up, run after 33 | 1.5 |
| [34](./sprint-34-wear-it.md) | Wear it | 3.5 |
| [35](./sprint-35-rarity.md) | Rarity | 4, T02 cut |
| [36](./sprint-36-the-store.md) | The store | 4 |
| [37](./sprint-37-the-balance-and-the-playtest.md) | The balance and the playtest | 1.5 + 2 bucket |
| [38](./sprint-38-the-docs-and-the-phase-gate.md) | The docs and the phase gate | 1.5 |

## The triage bucket

The maintainer plays once, thoroughly, in sprint 37. Phase 6's bucket held four days and ran to about 5.25. This phase's playtest is aimed at fewer things, the drops, the screens, and the store, and the balance ticket before it tunes the economy headless, so the plan holds an **appetite of two sized days**, all in sprint 37 after the triage. P8-S37-T02 writes each accepted item as a ticket with the next free number, in this order, until the appetite is spent:

1. Anything that stops the road being finished from the spawn to the last boss without the panel.
2. Drop rates, globe percentages, and gold: a tuning change kept as a content edit, with the balance log recorded again. About 0.5 a batch.
3. A screen, a label, or a tooltip that misreads or misclicks. About 0.5 each.
4. Item numbers: affix ranges, base values, prices. About 0.5 a batch.

Whatever does not fit goes to [Deferred](../backlog/deferred.md) as "loot, after triage", or to [Open questions](../backlog/open-questions.md) if it is a decision. A new system, a new item kind, or a map edit that moves the levelling budget goes to Deferred, never into the bucket. An unspent day is recorded as unspent.

## Hidden work this phase carries

Named here so no ticket is surprised by it. Each is inside the ticket that names it.

- **The phase 6 playtest log is retired.** `tests/simulation/replays/long-road-playtest.json` was recorded on the old road and cannot replay on the new one; P8-S39-T01 removes it and its spec with a note that it proved phase 6's replay row on its commit. Every later content-version move re-stamps the six logs left; P8-S37-T01 adds `balance-loot.json`, and P8-S37-T02's session becomes the long road's reference log.
- **Every re-stamp goes through `pnpm restamp`** (P7-S45-T01), never by hand. The stamp covers simulation data only, so an atlas frame, a glyph, an icon, or a tint no longer re-stamps anything; P8-S32-T04 re-stamps nothing. A ticket that changes behaviour on purpose also re-records the logs' checksums, with `pnpm restamp --checksums` (P7-S45-T02), and says so in its Build.
- **`state-machine.ts` is at the size limit.** It sits at 500 lines under phase 7's `max-lines` rule, so P8-S40-T01's `pick_up` splits it by state rather than growing it.
- **The rates are tuned on the new road**, not on the clean run's route on seed 3742014961, which no longer exists (P8-S37-T01).
- **A level on every map**, a required field and so an edit to every map, and a debug command to set it, since the long road has one level and item-level gating can only be tested by moving it (P8-S39-T02).
- **The overlap bar at a push share of 0.1.** Q59 measured it failing below about 0.43; the architect chooses between loosening it for a pressed column and stopping a crowd pressing into the enemies ahead (P8-S39-T03).
- **Two new columns in the disable matrix**, for the armory and store commands and for the `pick_up` order, one test per cell (P8-S33-T01, P8-S40-T01).
- **A right click that is sometimes not a move**: the mapper resolves it against an item's icon and label first (P8-S40-T01).
- **A packing problem**: items several cells in size, placed by first fit, refused by fit, swapped only if the worn item fits (P8-S33-T01, P8-S35-T04).
- **Alt's browser default** is suppressed (P8-S33-T03).
- **Loot draws never touch the combat stream.** This is proved by phase 7's full-state comparison, extended to ground items, the inventory, and gold, which finds the world equal but for its ground items at every tick with every loot table on and emptied (P8-S32-T02), and equal but for rolled affixes with every affix table on and emptied (P8-S35-T01). Edited 2026-09-27: the xorshift stream reading the same proved nothing, since nothing in `src/` draws from it.
- **A reload loses the inventory**, since there are no saves: the playtest is one session in one tab (R30).
- **The render benchmark after the atlas grows** by glyphs and icons, and after each screen, run by an agent in Chrome (P8-S32-T04, P8-S33-T03, P8-S34-T03, P8-S36-T03).

## Exit record

Closed 2026-09-28 on every gate row an agent can verify, walked by P8-S38-T01; the evidence per row is in [T01's note](./sprint-38-the-docs-and-the-phase-gate.md#p8-s38-t01--the-phase-gate). The rows that read the maintainer's session wait on a person: its walk with no panel heal or mana and the level at the kill; its gold, globes, and `pick_up`; its `equip_item`, `buy_item`, and `sell_item`; its replay into two worlds; and its feedback and triage. They are deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24, each an open box under Waiting on a person in STATUS.md and a row of [Deferred](../backlog/deferred.md). Every other part of those rows holds on the driver's `balance-loot.json`. Milestone M13 is reached on every part an agent can verify.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Every row an agent can verify holds, 2026-09-28. **The road with no panel heal or mana:** `balance-loot.spec.ts` green, the driver's walk from level 1 to the last boss's kill on tick 8489 at level 9, no panel command, no death, health above the catalogue's 25% margin outside the boss fights; `catalogues.spec.ts` green, the road's budget reaching level 12 with the last boss's kill and not 13. **Every drop kind:** the driver's walk takes 24 gold piles, 23 health globes, 38 mana globes, and 20 items by `pick_up`; the pickup, pick-up order, roll, and rarity specs green, every rarity at its weight over 10 000 rolls a tier. **Items equip:** the armory, magic damage, and inventory specs green; the driver wears 8. **The store:** the store and store screen specs green; the driver buys four Rares and sells 16. **Replay and loot's stream:** `balance-loot.json` and the six older logs green on content version `01423cb9`; `drop-on-death.spec.ts`'s full-state comparison green; the phase 6 log retired by P8-S39-T01. **The bar with drops on the ground:** the long-road stress case with the pool full, and the view pools spec with a full pool, green; the figures in the row after it. **The docs:** P8-S38-T02's checklist. No gate bug, so no replay test. **Deferred to a person:** the maintainer's session in the first five rows, and the seventh row whole | the engineer running the plan |
| The bar | **Headless:** 6 of 6 stress cases green under `pnpm test:budget`. The long-road case, the ground-item pool topped up to 512 before every tick, three runs: 4338 ticks, 512 of 512 on every tick, a mean of 0.157 to 0.163 ms and a worst of 1.80 to 1.86 ms, against 0.148 to 0.157 ms with drops only where they fell. **In Chrome, at choke 5 with 201 live pressing, 512 drops on the ground, and the inventory open, two dev-build runs:** 59.97 fps, frames 16.65 to 18.34 ms, p99 16.68. 1 world draw call and 2 in all, unchanged from phase 7. No unit, projectile, or view miss; the 6 ground-item misses of one run came from the fill before the measurement. Sync and render: mean 2.72 and 2.74 ms, p99 3.4 and 3.8, against 1.90 with no drops and no screen, and phase 7's 1.76. Browser tick mean 2.61 to 2.65, p99 3.3 and 4.1. Heap flat, 41.5 → 41.8 MB after a collection. **Allocation:** Q30's engine boxing in collision and movement, as in phase 7; nothing from a ground item or a screen in the top twelve. **Render benchmark:** 60.03 fps, 16.5 to 16.8 ms, 1 draw call, 64.5 MB, twice, against sprint 36's 60.03 fps and 64.1 to 64.2 MB | the engineer running the plan |
| The maintainer's playtest | Waits on a person, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24. `long-road-loot-playtest.spec.ts` skips until the log is stored; it passed its four cases on a stand-in copy of the driver's log in P8-S37-T02 | the engineer running the plan |
| Triage and the bucket | [The triage note](../notes/2026-09-28-loot-triage.md) holds no note yet. No bucket ticket; 0 of 2 days spent, 2 uncommitted until the maintainer's run is triaged ([Q118](../backlog/open-questions.md)). Nothing went to Deferred from the triage | the engineer running the plan |
| Sized versus actual | Sized 34: 32 in tickets and 2 of bucket. Actual 17: sprints 39, 31, 32, 33, 40, 34, 35, 36, 37, and 38 took 1.5, 1.75, 1.75, 1.25, 1.25, 2.5, 3, 2.25, 0.75, and 1; the bucket nothing. Ratio 0.50 against 34, 0.53 against the 32 in tickets. Across phases 0 to 8: 99.5 actual against 188.1 sized, 0.53 | the engineer running the plan |
| Largest miss | One ticket went over its size: P8-S34-T04, the stats derivation allocating nothing, sized 0.25 from the buffer and done in 0.5. The widest gaps under were 1.5 days each: P8-S39-T01 and P8-S33-T01, each sized 2 and done in 0.5 | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 8 | 34 | 17 | 0.50 | P8-S34-T04: sized 0.25, actual 0.5 |
