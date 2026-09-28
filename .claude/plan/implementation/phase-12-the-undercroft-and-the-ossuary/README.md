# Phase 12 — The Undercroft and the Ossuary: variants, aspects, and the first new problems

**Sprints:** 72–80, sketched · **Sized days:** 32.5, sketched: 29.5 in tickets and 3 of bucket appetite · **Gate:** [Phase 12 gate](../04-phase-exit-gates.md#phase-12-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 11 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows. Ticket IDs are assigned then.

## Goal

Strata 2 and 3, maps 11 to 30:
- **The Undercroft:** the long road's disablers return as families: hexer, trapper, skirmisher, crusher, summoner, troll, and brute, at variant I.
- **The Nave's six** come back at variants II and III, each variant with its own name, tint, and numbers, and one ability more at III.
- **Aspects:** elite packs and map bosses roll them, one on an elite and two on a boss, shown as an icon over each member.
- **The Ossuary** brings two problems the hero has not met: the leech's `mana_burn` and the bolter's `stun_bolt` in flight.
- **Stratum bosses:** the Hollow Abbess and Marrowleech, each with a Legendary piece.
- **A silhouette per family:** every family gets one as an atlas frame, since fifteen families cannot be told apart as tinted squares.
- **Items to level 30:** the catalogue grows to bases and affix tiers there.

## What it builds on

- [The descent](../../../../docs/product/specs/the-descent.md)'s sections 3 to 5.
- ADR 0018 and the pack as a list of members (phase 10).
- The driver and its saves (phases 10 and 11).
- The designer's answer to the architect's question 7, Q129: death bursts chain, one link a tick, which ADR 0019 needs.
- **Q133, art:** the style and what the art must convey were decided by the game designer on 2026-09-28; this phase's silhouettes need only that. Where the sprite art of phase 16 comes from, commissioned, licensed, or bought as an asset pack, is the maintainer's, open, and wanted at this phase's start ([R44](../02-risks-and-hidden-work.md)). ADR 0021's paper fixes the format either way.

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 72 | Split the files this phase touches at the limit, as R40 names them when the sprint is cut (`domain/ai/packs.ts` and `status.system.ts` again, if grown) | 0.5 |
| 72 | ADR 0019, a status may carry an on-death hook, and ADR 0020, a split's children are its pack's members, decided together | 1 |
| 72 | ADR 0021 on paper, sprite art as one atlas page per stratum, with a bench of one stratum's page | 1.5 |
| 72 | The game designer: the item catalogue's first step down, bases and affix tiers to item level 30 | 1 |
| 73 | The game designer: the Undercroft's and the Ossuary's roster. The seven families at I, the Nave's at II and III with their names, the leech and the bolter, the aspects' numbers, the two recipes' shapes, and the Hollow Abbess's and Marrowleech's kits and pieces | 2 |
| 73 | The aspect kind: rolled at generation into the pack and applied at spawn as carried statuses and modifier rows. The status table's fill is measured against the worst boss with its family's statuses and two aspects before any aspect is written | 2 |
| 74 | Burning's on-death hook (ADR 0019): the death system runs a dying unit's hooks before the corpse, and a death a hook causes resolves on the next tick | 1.5 |
| 74 | Rallying, a carried status whose periodic list applies to its pack in range, and Blinking, a periodic `blink_to` | 1 |
| 74 | Volley: an attack field for shots in a fan | 1 |
| 75 | The ten aspects as content, with their icons over elites from the status-icon view's pool, and a check that no rule branches on an aspect's id | 1.5 |
| 75 | `mana_burn`: the `burn_mana` primitive, the shortfall dealt as magical damage, and the leech family | 1.5 |
| 75 | The bolter family, on `stun_bolt` as phase 9 built it | 0.5 |
| 76 | The Undercroft's seven families at variant I as rows, sharing the long road's behaviours and abilities by key; the long road untouched | 1 |
| 76 | The Nave's six at variants II and III as rows, one ability more at III | 1.5 |
| 76 | Bases and affix tiers to item level 30 as content, with the rarity weights held by rolls | 1.5 |
| 77 | The Undercroft's and the Ossuary's recipes, and each one's stress case on a sweep | 1.5 |
| 77 | Silhouettes: fifteen family frames in the atlas, and the unit views drawn by family frame; draw calls unchanged, and the bench | 2 |
| 78 | The Hollow Abbess: `silence_curse`, a root net, summoner adds, and her Legendary piece | 1.5 |
| 78 | Marrowleech: `mana_burn` on a clock, a leech's drain, mana-burning adds, and its Legendary piece | 1.5 |
| 79 | The balance: the driver's sweeps of strata 2 and 3, the hero at about level 21 by map 30 | 1.5 |
| 79 | The maintainer's playtest and its triage: from driver-written saves at maps 11 and 21, each stratum through its boss, across sittings | 0.5 |
| 79 | Documentation sync, beside the playtest | 1 |
| 80 | The triage bucket, an appetite | 3 |
| 80 | The phase gate | 1 |
| | **Total** | **32.5** |

## Size and band

Most of it is content on kinds that exist or that this phase builds once: the aspect kind, the on-death hook, and the aura. Content has run near 0.35. The four capabilities and ADR 0021's bench are new ground. **Expect about 0.5: about 16 engineer-days, in a band of 11.5 to 26.** The roster is sized a stratum at a time, as R34 asks: about 7.5 days for stratum 2, and about 6 for stratum 3, the Ossuary's two families and its boss.

## Cut-line, sketched

**In:**
- strata 2 and 3 as the descent's table sets them;
- the ten aspects;
- the on-death hook;
- `mana_burn`;
- the two stratum bosses and their pieces;
- a silhouette per family;
- items to level 30;
- ADRs 0019 and 0020 decided, and ADR 0021 on paper with its bench;
- one playtest from saves and a bucket of 3.

**Out:**
- families below the Ossuary;
- variant IV;
- sprite art and animation (phase 16);
- items past level 30 (phase 13);
- aspects on a stratum boss, which rolls none;
- a sound per aspect, beyond the enemy casts phase 11 hears.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-12-gate):
- the families and variants as rows matching the descent's table;
- aspects as data only;
- `mana_burn` and the on-death hook by their specs;
- the status table's fill under capacity for the worst boss;
- every family with a silhouette and draw calls unchanged;
- items to 30 by rolls;
- both bosses and their pieces;
- the driver's sweeps;
- the maintainer's playtest from saves, triaged;
- ADR 0021's bench recorded;
- the docs;
- the bar.

## Risks

- **Aspects become per-aspect code** ([R37](../02-risks-and-hidden-work.md)): each capability is built once and named, and a branch on an aspect's id is refused in review.
- **The status table fills** with a boss's carried statuses and aspects: measured before the aspects are written (the architecture outline, section 4).
- **The roster's design runs behind its build** ([R43](../02-risks-and-hidden-work.md)): the designer's roster ticket runs in sprint 73, and the capabilities of sprint 74 do not wait on its numbers.
- **Art drawn two ways:** ADR 0021's paper precedes the silhouettes.
