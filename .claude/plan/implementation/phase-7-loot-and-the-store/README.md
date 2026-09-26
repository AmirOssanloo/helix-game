# Phase 7 — Loot and the store

**Sprints:** 31–38 · **Sized days:** 29, of which 27 are tickets and 2 are the triage bucket's appetite, plus P7-S31-T04, 0.5, unplanned, from the maintainer's answer to Q60 · **Gate:** [Phase 7 gate](../04-phase-exit-gates.md#phase-7-gate)
**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's decisions of 2026-09-26

## Goal

Enemies on the long road drop gold, health globes, mana globes, and equipment. The hero takes them by walking over them, wears equipment in ten armory slots that change its derived stats, and buys and sells at a store opened from a checkpoint ring. The first proof: the maintainer walks the long road from level 1 to the last boss's kill with no **Heal** or **Restore mana** from the panel, which the clean run of 2026-09-26 needed twice and eight times.

The maintainer split the retrospective's *one floor* bet on 2026-09-26: loot and the store first (this phase), usable active items second ([phase 8](../phase-8-active-items/README.md)), the generated floor and stairs after. Phases 7 and 8 are played on the long road. The decisions that shape this phase are recorded as answered, Q73 to Q82 in [Open questions](../backlog/open-questions.md); the provisional answers it builds on are Q83 to Q95.

## The order inside the phase

1. **The catalogue and the architecture first** (sprint 31), after the one unplanned ticket, P7-S31-T04, which moves the checkpoint reach to 256 on the maintainer's answer to Q60 so the store's ring is the size to click. The item catalogue decides slots, bases, rarities, affixes, drop tables, and the economy on paper before any schema exists, as every catalogue in this plan came before its schema. The engineering architect then places items, inventory, loot, the ground item, and the store in the layers that already exist, and decides the first real UI screen: Phaser or DOM, and how a click on it never walks the hero. The schema follows both.
2. **Drops on the ground** (sprint 32): the ground item as a new entity kind with its pool, loot tables rolled on a draw of their own at a death, the item level from the pack, and the font's missing space. Nothing is picked up yet, so the combat of every stored log is untouched while determinism is proved.
3. **Walk over it** (sprint 33): the run-scope inventory and gold, the armory commands, walk-over pickup, and the ground views and labels. From here the hero's health can rise from a globe, so the long road playtest log's fights move for the first time.
4. **Wear it** (sprint 34): equipment as a modifier source with spell damage %, the first screen, and the inventory and armory screen.
5. **Rarity** (sprint 35): seven tiers and rolled affixes, the +1 to an orb, and the twenty bases and three Legendary pieces from the approved catalogue.
6. **The store** (sprint 36): tooltips, the store's stock and its buy and sell commands, its screen opened from the checkpoint ring, and the panel's loot controls.
7. **The balance and the playtest** (sprint 37), then **the docs and the gate** (sprint 38).

## Cut-line

**In:** an item catalogue under `docs/product/specs/` and a feature page; ten armory slots; about twenty bases, one-handed only; seven rarity tiers with rolled affixes; spell damage %; a +1 to an orb at the top tiers; three fixed-identity Legendary equipment pieces; gold, health globes, and mana globes; loot tables per enemy tier on a draw of their own, elites always dropping and bosses dropping Rare or better; an item level from the pack's region and a level requirement; the ground item as an entity kind; pickup by walking over; ground labels with Alt for all; a run-scope inventory; equip, unequip, drop, buy, sell, open store, and close store as commands; the first UI screen, for the inventory and armory; tooltips; a store at each checkpoint that sells equipment and buys items; the atlas font's space; panel controls to grant an item, grant gold, and preview a loot table; drop rates balanced against the clean run's route; one playtest by the maintainer; triage; a bucket of two sized days.

**Out, deliberately:** active items in the drops or the store (their weight is zero, phase 8), two-handed weapons, a click-to-pick-up order, a sized inventory grid, a stash, a store that restocks or buys back what it sold, crafting (never), sets, sockets, item comparison in a tooltip, lifesteal, status resistance, enemy affixes, a death penalty, saves, the generated floor, the town, sprite art, and audio. Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

**Not re-cut ahead of feedback:** the long road's map. It holds 54 enemies in 32 packs, far fewer kills than a loot game is usually tuned for; the drop rates are set for it (Q95). More packs is a map edit and a move of the levelling budget (Q58), decided after the playtest if the road feels poor.

## Live cap on the long road

**200** enemies, `ENEMY_LIVE_CAP`, as before. Ground items do not count against it: they are their own pool, map scope, with a capacity the architect sets in P7-S31-T02, and their views and labels are pools sized to the screen and bound by the camera's rectangle. P7-S38-T01 measures the bar with the ground-item pool full.

## What the engineer can do at the end

Walk the long road from level 1, see enemies drop gold, globes, and items with coloured labels, hold Alt to read every label, walk over a globe to heal, press I to open the inventory and armory and wear what dropped, read an item's affixes in its tooltip, stand on a checkpoint ring and click it to buy and sell, and finish the road at the last boss with the panel closed.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [31](./sprint-31-the-item-catalogue-and-where-it-lives.md) | The item catalogue and where it lives | 4 |
| [32](./sprint-32-drops-on-the-ground.md) | Drops on the ground | 4 |
| [33](./sprint-33-walk-over-it.md) | Walk over it | 4 |
| [34](./sprint-34-wear-it.md) | Wear it | 4 |
| [35](./sprint-35-rarity.md) | Rarity | 4 |
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

- **Seven stored logs, not six.** Every content-version move re-stamps the six logs and `tests/simulation/replays/long-road-playtest.json`. From P7-S33-T02 the replayed hero picks up what it walks over, so that log's fights move; its spec is held, and a failure is reported for the maintainer to choose (R32).
- **A new column in the disable matrix** for the armory and store commands, one test per cell (P7-S33-T01).
- **A dropped item picked straight back up** by walk-over pickup unless it waits for the hero to step off it (Q87, P7-S33-T02).
- **Alt's browser default**: Firefox on Windows opens its menu bar on the release (P7-S33-T03).
- **The +1 to an orb reaches the Skein kit**: every place an orb level is read, the Invoke cooldown, and the mechanics spec's section 2.2, which keeps item effects on orb level in its scope (P7-S35-T02).
- **Loot draws never touch the combat stream**, proved by the xorshift stream reading the same at every tick with every loot table on and emptied (P7-S32-T02).
- **A reload loses the inventory**, since there are no saves: the playtest is one session in one tab (R30).
- **The render benchmark after the atlas grows** by glyphs and icons, a person's box (P7-S32-T04, P7-S33-T03).

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
| 7 | 29 | | | |
