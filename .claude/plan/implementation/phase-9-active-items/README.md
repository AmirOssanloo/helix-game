# Phase 9 — Active items, with their answers

**Sprints:** 41–44, then 51–53, in sprint files. Moved on 2026-09-27 from 39–42, then 40–43, as phase 8's re-cuts took 39 and 40. Grown on 2026-09-28 from four sprints to seven; the three added take the next free numbers after phase 7's 45–50 · **Sized days:** 27.5: 25.5 in tickets and 2 of bucket appetite. Was 14.5 · **Gate:** [Phase 9 gate](../04-phase-exit-gates.md#phase-9-gate)
**Written:** 2026-09-26 · **Author:** delivery strategist role, from the maintainer's decisions of 2026-09-26 · **Renumbered:** from phase 8 to phase 9 on 2026-09-27, when the maintainer inserted [phase 7, the foundation](../phase-7-the-foundation/README.md); its sprint numbers did not move · **Re-sized:** 2026-09-28 by the delivery strategist, from the game designer's answers to Q98, Q103, Q120, and Q121, [the design outline](../../2026-09-28-design-outline-next-phases.md), and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** the outline of phases 9 to 16 was **approved by the maintainer on 2026-09-28**. The sprint files were cut the same day by the delivery strategist, and the ticket table below names them. Phase 9 is active; the next ticket is in [STATUS.md](../STATUS.md).

## Goal

The eight active items are sold only in the store's Misc tab, at a steep price. They have no rarity, never drop, and wear an emerald-green label (Q84). The hero holds up to six in a bank beside the Skein kit, each on its own key in a 3 by 2 grid. Each is used through the ability pipeline: an ability like any other, with a cast point, a cooldown, and a mana cost where the item has one. They answer the game's disables, by Q121's rules:
- the self-lift, which dispels;
- silence leaving the active items alone;
- the disjoint;
- Slipknife's lockout;
- enemies holding under a lifted hero.

Played on the long road, which gains one stun in flight, `stun_bolt`, so Slipknife's answer can be played.

## Can it start, and what waits on the phase 8 playtest

Decided by the delivery strategist on 2026-09-28. The game designer confirmed Q118 from the design side and left the order question here.

- **Phase 9 starts on phase 8's gate as it stands.** Phase 8 closed on every row an agent can verify. Nothing in phase 9's design is set against the loot playtest's verdict: the active items' numbers are set against the hero and the descent's income.
- **Phase 8's bucket is held, not spent in advance.** It stays at 2 days in phase 8's accounting, and no phase 9 sprint reserves room for it. When the maintainer's run is triaged, the accepted items are written as P8-S37-T03 onward. They run first in whichever sprint is open. That sprint's last planned ticket moves to the next sprint, so no sprint holds more than four sized days. That is also Q118's answer, recorded in its row. Each sprint file opens with this rule.
- **What does wait: phase 8's run must be played on phase 8's build.** Two phase 9 tickets change how the long road plays:
  - `stun_bolt` on packs 21 and 37;
  - possibly the disjoint, if Updraft's lift turns out to disjoint projectiles the stored logs aim at lifted enemies.
  
  After those tickets, a log recorded on phase 8's build no longer replays on the head of main. The published build follows main. So sprint 41 pins the phase 8 build at a URL of its own ([P9-S41-T03](./sprint-41-the-placement-the-splits-and-the-right-click.md#p9-s41-t03--pinned-playtest-builds-and-phase-8s-build-pinned)). The phase 8 run's spec is then walked on phase 8's tag, and its log is retired with a note once proved, as P8-S39-T01 retired the phase 6 log. Phase 9's session then becomes the long road's reference log. The maintainer can play both runs in one sitting: the pinned phase 8 build first, then the phase 9 build.
- **Phase 10 does not start while two phases' playtests are outstanding** ([R41](../02-risks-and-hidden-work.md)). Phase 9 may run ahead of phase 8's run. Phase 10 may not run ahead of both.

## The maintainer's decisions it builds on

Recorded in [Open questions](../backlog/open-questions.md): the eight active items and what each does (Q81), and their keys (Q82). The keys are T, X, V on the top row and C, G, Space on the bottom row; G is a provisional choice the maintainer can overturn. The words are **active item** and **activating** (Q85, Q94). Numbers and rules are in the [item catalogue's section 7.1](../../../../docs/product/specs/item-catalogue.md#71-what-each-does), approved with Q103, and in Q121: the [status effects](../../../../docs/product/features/status-effects.md#dispel) page and the [disable matrix](../../../../docs/product/specs/disable-matrix.md)'s active-item column, self-lift row, and notes 17 to 20.

| Active item | Model | What it needs that does not exist |
| --- | --- | --- |
| Gyre Sceptre | Eul's | One ability, targeting the hero or an enemy, with the named effect `gyre_lift`. On an enemy it is a lift with landing damage. On the hero it is the self-lift: 2.5 s `lifted`, `untargetable`, and `invulnerable`, with Q, W, E, and R let through, and the one `dispel` in the game on the tick it rises. Enemies hold under it rather than going home |
| Scorchglass | Dagon | Targeted magical damage of `120 + 12 × L`: the per-level amount term, read at the caster's level on commit |
| Slipknife | Blink | `blink_to` clamped to walkable ground, and refused while rooted. It is locked for 3 s after damage from an elite or boss: a bank passive whose damage-taken hook reads the source's tier. It disjoints projectiles aimed at the hero |
| Rimeward | Shiva's | A zone that grows as a ring to 900 over 1.5 s, and +4 armour while in the bank, as a bank passive |
| Skyfall Maul | Meteor Hammer | A 2 s cast point, then a zone of 300 radius and `burn` |
| Mainspring | Refresher | The named effect `refresh_clocks`: every clock the hero holds but its own, Invoke's and the evicted spells' hidden clocks included (R33) |
| Fetter Bolas | Gleipnir | A projectile, then a 2 s root in 250; primitives only |
| Veilblade | Ethereal Blade | `ethereal` on either side: the flag `physical_immune`, `disarmed`, and a stat, magical damage taken, at +40% |

## Sprints and tickets

Cut on 2026-09-28 from the sketch the maintainer approved. Each ticket block in its sprint file is self-contained: size, dependencies, owner, what to build, acceptance with "it plays" and the bar, tests, pages, and the definition of done. Every split moves no checksum ([R36](../02-risks-and-hidden-work.md), [R40](../02-risks-and-hidden-work.md)).

| Sprint | Ticket | Size |
| --- | --- | --- |
| [41 — The placement, the splits, and the right click](./sprint-41-the-placement-the-splits-and-the-right-click.md) | P9-S41-T01 — The engineering architect's placement of the active items and Q121 | 1 |
| | P9-S41-T02 — Split the domain and simulation files at the limit | 1.5 |
| | P9-S41-T03 — Pinned playtest builds, and phase 8's build pinned | 0.5 |
| | P9-S41-T04 — The right click's order (Q98) | 1 |
| [42 — The bank and its keys](./sprint-42-the-bank-and-its-keys.md) | P9-S42-T01 — Split the presentation files at the limit | 0.5 |
| | P9-S42-T02 — The active item kind and the bank in run scope | 1.5 |
| | P9-S42-T03 — The six keys and the bank row on the HUD | 1.5 |
| | P9-S42-T04 — Active items in the store's Misc tab | 0.5 |
| [43 — The column and the first three actives](./sprint-43-the-column-and-the-first-three-actives.md) | P9-S43-T01 — The disable matrix's active-item column | 0.5 |
| | P9-S43-T02 — An active item moved between the bank and the inventory on screen | 0.5 |
| | P9-S43-T03 — The per-level amount term | 1 |
| | P9-S43-T04 — Scorchglass | 0.5 |
| | P9-S43-T05 — Fetter Bolas | 0.5 |
| | P9-S43-T06 — Mainspring and `refresh_clocks` | 1 |
| [44 — The self-lift](./sprint-44-the-self-lift.md) | P9-S44-T01 — `invulnerable`, the applier's side, and the dispel | 1.5 |
| | P9-S44-T02 — Gyre Sceptre on either side, the self-lift, and the hold | 1.5 |
| | P9-S44-T03 — Bank passives and the hook's source-tier filter | 1 |
| [51 — The blink, the disjoint, and Rimeward](./sprint-51-the-blink-the-disjoint-and-rimeward.md) | P9-S51-T01 — Slipknife: `blink_to`, the rooted refusal, and the lockout | 1 |
| | P9-S51-T02 — The disjoint | 1.5 |
| | P9-S51-T03 — Rimeward | 1.5 |
| [52 — The last actives, the stun bolt, and the playtest](./sprint-52-the-last-actives-the-stun-bolt-and-the-playtest.md) | P9-S52-T01 — Skyfall Maul | 1 |
| | P9-S52-T02 — Veilblade and `ethereal` | 1.5 |
| | P9-S52-T03 — `stun_bolt` on the long road | 1 |
| | P9-S52-T04 — The maintainer's playtest and the triage | 0.5 |
| [53 — The bucket, the docs, and the gate](./sprint-53-the-bucket-the-docs-and-the-gate.md) | The bucket, P9-S53-T03 onward, an appetite | 2 |
| | P9-S53-T01 — Documentation sync | 0.5 |
| | P9-S53-T02 — The phase gate | 1 |
| | **Total** | **27.5** |

**What the cut changed inside the 27.5,** each noted under its ticket:
- The disable matrix ticket fell from 1 to 0.5. Its self-lift row needs `invulnerable`, which sprint 44 makes, and the Gyre Sceptre ticket already carried that row, so it was counted twice.
- A 0.5 ticket was added, P9-S43-T02: the item catalogue's section 7.2 has the player move an active item between the bank and the inventory as any item is moved, and the sketch had the domain half but no gesture.
- Slipknife runs before the disjoint in sprint 51, since the disjoint is bumped by `blink_to`, which Slipknife's ticket makes.
- The active item's definition kind and the activation through the pipeline are named in the bank ticket, P9-S42-T02, which the sketch sized for them. The cursor that takes the hero as a target, for Gyre Sceptre and Veilblade, is named in the keys ticket, P9-S42-T03. Neither moved a size.

Sprint 53 holds 3.5 sized days, with half a day unallocated: the first room phase 8's bucket takes if its run comes in then.

## What moved the size

The sketch of 2026-09-26 was 14.5. On the plan's anchors, the answers of 2026-09-28 make it 27.5, 25.5 in tickets:
- **Down 0.5.** The catalogue section is written and approved (Q103), so its ticket is gone.
- **Up 13.5, work the sketch did not know of:**
  - The file splits: 2 across two tickets, beside the mapper's split inside Q98's ticket (R40).
  - Q98's pick order: 1.
  - Q121's counterplay, where each rule is a capability the sketch never had: `invulnerable`, the dispel, and the applier's side (1.5), the disjoint (1.5), bank passives and the hook's tier filter (1), and the hold, which grows Gyre Sceptre from 1 to 1.5 (0.5).
  - The per-level term: 1.
  - The bank's domain half, split from its keys and HUD row: 1 more.
  - Rimeward's ring, a first zone shape: 0.5 more.
  - `stun_bolt` and the re-recorded balance log: 1.
  - The pinned builds: 0.5.
  - A bucket of 2. The sketch held none, and three design questions go to this playtest.

Most of it extends the pipeline and the status table, which ran near 0.35 to 0.5. The disjoint, the dispel, and the bank passives are new capabilities, nearer 0.8. **Expect 0.5 of sized: about 14 engineer-days, in a band of 10 to 22.** The calendar is the maintainer's playtest, not these days.

## Cut-line

What is out is in [Deferred](../backlog/deferred.md), with the phase each waits on.

**In:**
- the eight active items;
- the bank of six places, and moving an item into and out of it on screen;
- the six keys and the HUD row;
- the active-item column and the self-lift row of the disable matrix;
- the dispel, `invulnerable`, `ethereal`, the disjoint, the lockout, and the hold;
- the per-level amount term;
- `stun_bolt` on packs 21 and 37 of the long road;
- the store's Misc tab;
- Q98's pick order;
- the file splits;
- pinned playtest builds;
- one playtest and a bucket of 2.

**Out:**
- key rebinding (Deferred, a settings menu), so G stays provisional;
- potions on a belt, a second kit, any active item beyond the eight, charges, upgrades, and passives other than Rimeward's armour and Slipknife's lockout;
- mana burn, mute, and fear, which arrive with the families that cast them;
- the town portal, the town, and the descent;
- a sound for any of it;
- a key guard on Space or G, unless the playtest asks for one.

## Gate

The rows are in [Phase exit gates](../04-phase-exit-gates.md#phase-9-gate):
- each active item cast through the pipeline, with nothing item-specific added to it;
- Q121's rules, each by its named test;
- the column and the row, tested per cell;
- the keys in the tie-break order, and Space not scrolling the page in Chrome, checked by an agent;
- the active items bought in the store and never dropped;
- the right click's order;
- the maintainer's playtest, replayed and triaged;
- the docs;
- the bar.

## Risks

- **The first exceptions to "a boss is health".** These are three flags, each read in exactly one place, with a content test that only the named statuses carry them ([R33](../02-risks-and-hidden-work.md), decided).
- **The disjoint may move stored logs** if Updraft already lifts enemies with projectiles in flight at them. Its ticket traces any moved checksum to the rule before re-recording ([R36](../02-risks-and-hidden-work.md)).
- **Six more keys on the keyboard's left hand.** Space and G are the ones pressed by accident; the playtest reads them.
- **Slipknife's 1200 on the isometric view** ([R20](../02-risks-and-hidden-work.md)): a retune is a bucket ticket, a number from the panel first.
- **Phase 8's bucket lands mid-phase.** Its tickets run first in the open sprint and push that sprint's last ticket on; sprint 53's spare half day takes the first of it, and past that phase 9 closes a sprint later ([R41](../02-risks-and-hidden-work.md)).

## Exit record

Not yet walked. P9-S53-T02 records every gate row here with its numbers.
