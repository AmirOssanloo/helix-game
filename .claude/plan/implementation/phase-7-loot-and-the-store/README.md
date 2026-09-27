# Phase 7 — Loot and the store

**Sprints:** 39, then 31–33, 40, 34–38 · **Sized days:** 35: 33 in tickets and 2 of the triage bucket's appetite. Of the 33, 27 are the tickets planned on 2026-09-26, resized on 2026-09-27 at the same total, and 6 were added on 2026-09-27: P7-S31-T04 (0.5, Q60), sprint 39 (4: the road, Q58; a level on every map, Q89; the crowd's push, sprint 25's walk), and sprint 40 (1.5, the pick-up order, Q87) · **Gate:** [Phase 7 gate](../04-phase-exit-gates.md#phase-7-gate)
**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's decisions of 2026-09-26 · **Re-cut:** 2026-09-27, twice, from the answers of that day

## Goal

Enemies on the long road drop gold, health globes, mana globes, and equipment. The hero takes gold and globes by walking over or past them and picks up an item by a right click, holds items by their size in a 10 by 4 inventory, wears them in ten armory slots that change its derived stats, and buys and sells at a store opened from a checkpoint ring. The road itself grows first to Diablo II density, about 100 to 130 enemies, so loot has volume and most experience comes from normal packs (Q58), and a crowd presses the hero far less. The first proof: the maintainer walks the long road from level 1 to the last boss's kill with no **Heal** or **Restore mana** from the panel, which the clean run of 2026-09-26 needed twice and eight times on the old road.

The maintainer split the retrospective's *one floor* bet on 2026-09-26: loot and the store first (this phase), usable active items second ([phase 8](../phase-8-active-items/README.md)), then **the descent**, about a hundred generated levels in Diablo I's style (Q89's answer of 2026-09-27). The long road stays the test map for phases 7 and 8. Every question the phase builds on, Q58 and Q73 to Q94, is answered in [Open questions](../backlog/open-questions.md); Q95 is superseded.

## The order inside the phase

0. **The long road at Diablo II density** (sprint 39, run first): the spec and the map rewritten with packs of 3 to 6, elites of 2 to 3, about 100 to 130 enemies, bosses paying 5 times rather than 10, the last boss's kill at about level 11 to 13, and the phase 6 playtest log retired, since it cannot replay on the new road; a level on every map, the long road at 3, which an item's level is, and a panel command to set it (Q89); and the crowd's push on the hero from 0.5 to 0.1, on sprint 25's walk. Every loot ticket and the balance then run on the road they are tuned for.
1. **The catalogue and the architecture** (sprint 31), after its one unplanned ticket, P7-S31-T04, which moves the checkpoint reach to 256 on the maintainer's answer to Q60 so the store's ring is the size to click. The item catalogue decides slots, bases and their sizes, rarities, affixes, drop tables, and the economy on paper before any schema exists, as every catalogue in this plan came before its schema. The engineering architect then places items, inventory, loot, the ground item, the pick-up order, and the store in the layers that already exist, and decides the first real UI screen: Phaser or DOM, and how a click on it never walks the hero. The schema follows both.
2. **Drops on the ground** (sprint 32): the ground item as a new entity kind with its pool, loot tables rolled on a draw of their own at a death, the item level from the map level, and the font's missing space. Nothing is picked up yet, so the combat of every stored log is untouched while determinism is proved.
3. **Walk over it** (sprint 33): the run-scope inventory of sized items and gold, the armory commands, gold and globes taken on walk-over, and the ground views and labels.
4. **Pick it up** (sprint 40, after 33): the right click that sends the hero to take an item, a new order kind.
5. **Wear it** (sprint 34): equipment as a modifier source with magic damage %, the first screen, and the inventory and armory screen.
6. **Rarity** (sprint 35): seven tiers and rolled affixes, the twenty bases and three Legendary pieces from the approved catalogue, and moving an item on the grid by its size.
7. **The store** (sprint 36): tooltips, the store's stock and its buy and sell commands, its screen opened from the checkpoint ring, and the panel's loot controls.
8. **The balance and the playtest** (sprint 37), then **the docs and the gate** (sprint 38).

## Cut-line

**In:** the long road at Diablo II density, with a level on every map; the crowd's push on the hero at 0.1; an item catalogue under `docs/product/specs/` and a feature page; ten armory slots; about twenty bases, one-handed only, each with a size in cells and a quality level; seven rarity tiers with rolled affixes, each affix with an affix level; magic damage %; three fixed-identity Legendary equipment pieces with fixed values of existing stats, each dropped only by a named boss; gold, health globes, and mana globes; loot tables per enemy tier on a draw of their own, elites always dropping and bosses dropping Rare or better; an item level from the map's level, and a level requirement; the ground item as an entity kind; gold and globes taken on walk-over; a right click to pick up an item, a new order kind; ground labels with Alt for all; a run-scope 10 by 4 inventory of sized items; equip, unequip, move, drop, buy, sell, open store, and close store as commands; the first UI screen, for the inventory and armory; tooltips; a store at each checkpoint, a basic Diablo II store with Armour, Weapons, and Misc tabs, that sells equipment at the hero's level and buys items; the atlas font's space; panel controls to grant an item, grant gold, preview a loot table, and set the map's level; drop rates balanced on the new road; one playtest by the maintainer, whose session becomes the long road's reference log; triage; a bucket of two sized days.

**Out, deliberately:** active items, which have no rarity, never drop, and are listed in the store's Misc tab only in phase 8; any +1 to an orb, which is never built (Q92); the item catalogue at Diablo II's scale, about a thousand items, which waits on a research ticket; the descent and its generator; two-handed weapons, a stash, a store that restocks or buys back what it sold, crafting (never), sets, sockets, item comparison in a tooltip, lifesteal, status resistance, enemy affixes, a death penalty, saves, the town, sprite art, and audio. Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

**Re-cut before the phase started, 2026-09-27:** the long road's map, grown by Q58's answer, which supersedes Q95; walk-over pickup of items replaced by a right click (Q87); a sized inventory (Q88); item level from the map rather than from regions or the enemy's tier (Q89); the +1 to an orb cut (Q92); spell damage % renamed and widened to magic damage % (Q93).

## Live cap on the long road

**200** enemies, `ENEMY_LIVE_CAP`, as before. Ground items do not count against it: they are their own pool, map scope, with a capacity the architect sets in P7-S31-T02, and their views and labels are pools sized to the screen and bound by the camera's rectangle. P7-S38-T01 measures the bar with the ground-item pool full: the tick headless, the frame in Chrome on the development machine by an agent (standing instruction of 2026-09-27).

## What the engineer can do at the end

Walk the long road from level 1, see enemies drop gold, globes, and items with coloured labels, hold Alt to read every label, walk past a globe to heal, right-click an item to pick it up, press I to open the inventory and armory, fit items by their size and wear what dropped, read an item's affixes in its tooltip, stand on a checkpoint ring and click it to buy and sell, and finish the road at the last boss with the panel closed.

## Sprints

In the order they run.

| Sprint | Title | Sized days |
| --- | --- | --- |
| [39](./sprint-39-the-long-road-at-diablo-ii-density.md) | The long road at Diablo II density, run first | 4, unplanned |
| [31](./sprint-31-the-item-catalogue-and-where-it-lives.md) | The item catalogue and where it lives | 4 + 0.5 unplanned |
| [32](./sprint-32-drops-on-the-ground.md) | Drops on the ground | 4 |
| [33](./sprint-33-walk-over-it.md) | Walk over it | 4 |
| [40](./sprint-40-pick-it-up.md) | Pick it up, run after 33 | 1.5 |
| [34](./sprint-34-wear-it.md) | Wear it | 4 |
| [35](./sprint-35-rarity.md) | Rarity | 4, T02 cut |
| [36](./sprint-36-the-store.md) | The store | 4 |
| [37](./sprint-37-the-balance-and-the-playtest.md) | The balance and the playtest | 1.5 + 2 bucket |
| [38](./sprint-38-the-docs-and-the-phase-gate.md) | The docs and the phase gate | 1.5 |

## The triage bucket

The maintainer plays once, thoroughly, in sprint 37. Phase 6's bucket held four days and ran to about 5.25. This phase's playtest is aimed at fewer things, the drops, the screens, and the store, and the balance ticket before it tunes the economy headless, so the plan holds an **appetite of two sized days**, all in sprint 37 after the triage. P7-S37-T02 writes each accepted item as a ticket with the next free number, in this order, until the appetite is spent:

1. Anything that stops the road being finished from the spawn to the last boss without the panel.
2. Drop rates, globe percentages, and gold: a tuning change kept as a content edit, with the balance log recorded again. About 0.5 a batch.
3. A screen, a label, or a tooltip that misreads or misclicks. About 0.5 each.
4. Item numbers: affix ranges, base values, prices. About 0.5 a batch.

Whatever does not fit goes to [Deferred](../backlog/deferred.md) as "loot, after triage", or to [Open questions](../backlog/open-questions.md) if it is a decision. A new system, a new item kind, or a map edit that moves the levelling budget goes to Deferred, never into the bucket. An unspent day is recorded as unspent.

## Hidden work this phase carries

Named here so no ticket is surprised by it. Each is inside the ticket that names it.

- **The phase 6 playtest log is retired.** `tests/simulation/replays/long-road-playtest.json` was recorded on the old road and cannot replay on the new one; P7-S39-T01 removes it and its spec with a note that it proved phase 6's replay row on its commit. Every later content-version move re-stamps the six logs left; P7-S37-T01 adds `balance-loot.json`, and P7-S37-T02's session becomes the long road's reference log.
- **The rates are tuned on the new road**, not on the clean run's route on seed 3742014961, which no longer exists (P7-S37-T01).
- **A level on every map**, a required field and so an edit to every map, and a debug command to set it, since the long road has one level and item-level gating can only be tested by moving it (P7-S39-T02).
- **The overlap bar at a push share of 0.1.** Q59 measured it failing below about 0.43; the architect chooses between loosening it for a pressed column and stopping a crowd pressing into the enemies ahead (P7-S39-T03).
- **Two new columns in the disable matrix**, for the armory and store commands and for the `pick_up` order, one test per cell (P7-S33-T01, P7-S40-T01).
- **A right click that is sometimes not a move**: the mapper resolves it against an item's icon and label first (P7-S40-T01).
- **A packing problem**: items several cells in size, placed by first fit, refused by fit, swapped only if the worn item fits (P7-S33-T01, P7-S35-T04).
- **Alt's browser default** is suppressed (P7-S33-T03).
- **Loot draws never touch the combat stream**, proved by the xorshift stream reading the same at every tick with every loot table on and emptied (P7-S32-T02).
- **A reload loses the inventory**, since there are no saves: the playtest is one session in one tab (R30).
- **The render benchmark after the atlas grows** by glyphs and icons, and after each screen, run by an agent in Chrome (P7-S32-T04, P7-S33-T03, P7-S34-T03, P7-S36-T03).

## Exit record

Not yet walked.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| The maintainer's playtest | | |
| Triage and the bucket | | |
| Sized versus actual | | |
| Largest miss | | |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 7 | 35 | | | |
