# Phase 12 — The Undercroft and the Ossuary: variants, aspects, and the first new problems

**Sprints:** 72–80, in sprint files · **Sized days:** 33: 30 in tickets and 3 of bucket appetite. Was 32.5 sketched, and 31 once ADR 0021 left for phase 16 · **Gate:** [Phase 12 gate](../04-phase-exit-gates.md#phase-12-gate), milestone M19
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md) · **Cut:** 2026-09-28 by the delivery strategist into sprint files, ahead of phases 10 and 11 at the maintainer's request

**Status of this page:** the outline of phases 9 to 16 was **approved by the maintainer on 2026-09-28**. On the same day the maintainer asked for the tickets of phases 10 to 16 to be written at once, ahead of STATUS.md's rule that a phase is cut when the one before it closes, and moved all sound and all sourced art to phase 16. The sprint files below were cut then. They are re-read at the phase's start against what phases 10 and 11 left, and a ticket that moved is edited in place with a one-line note. The phase starts on phase 11's gate, and only while [R41](../02-risks-and-hidden-work.md)'s limit allows.

## Goal

Strata 2 and 3, maps 11 to 30:
- **The Undercroft:** the long road's disablers return as families: hexer, trapper, skirmisher, crusher, summoner, troll, and brute, at variant I, and at II in the Ossuary.
- **The Nave's six** come back at variants II and III, each variant with its own name, tint, and numbers, and one ability more where the rows give one.
- **Aspects:** elite packs and map bosses roll them, one on an elite and two on a boss, and one on a Nave map boss, shown as an icon over each member.
- **The Ossuary** brings two problems the hero has not met: the leech's `mana_burn` and the bolter's `stun_bolt` in flight.
- **Stratum bosses:** the Hollow Abbess and Marrowleech, each with a Legendary piece.
- **A silhouette per family,** painted in code into the one atlas page as every frame is today, since fifteen families cannot be told apart as tinted squares. Readability, not art.
- **Items to level 30:** the catalogue grows to bases and affix tiers there.

## What it builds on

- [The descent](../../../../docs/product/specs/the-descent.md)'s sections 3 to 5.
- ADR 0018, the family kind, and the pack as a list of members (phase 10).
- The generator, its recipe kind, its sweep and golden hash, and the map-agnostic driver (phase 10).
- Saves, and the driver's saves at any map's arrival (phase 11).
- The designer's answer to the architect's question 7, Q129: death bursts chain, one link a tick, which ADR 0019 needs.
- **Q133, art:** the style and what the art must convey were decided by the game designer on 2026-09-28, and the silhouettes need only that. Where phase 16's sprite art comes from is the maintainer's and open, and now blocks only phase 16 ([R44](../02-risks-and-hidden-work.md)).

## Sprints and tickets

Each ticket block in its sprint file is self-contained: size, dependencies, owner, what to build, acceptance with "it plays" and the bar, tests, pages, and the definition of done.

| Sprint | Ticket | Size |
| --- | --- | --- |
| [72 — The splits, the records, and the Undercroft on paper](./sprint-72-the-splits-the-records-and-the-undercroft-on-paper.md) | P12-S72-T01 — Split the files this phase grows at the limit | 0.5 |
| | P12-S72-T02 — ADR 0019 and ADR 0020, and the phase's capabilities placed | 1 |
| | P12-S72-T03 — The game designer: the item catalogue to item level 30 | 1 |
| | P12-S72-T04 — The game designer: the Undercroft's roster | 1.5 |
| [73 — The Ossuary on paper, the aspect kind, and the aura](./sprint-73-the-ossuary-on-paper-the-aspect-kind-and-the-aura.md) | P12-S73-T01 — The game designer: the Ossuary's roster | 1 |
| | P12-S73-T02 — The aspect kind, rolled into the pack and applied at spawn | 2 |
| | P12-S73-T03 — The periodic list: Rallying and Blinking | 1 |
| [74 — The on-death hook, mana burn, and the volley](./sprint-74-the-on-death-hook-mana-burn-and-the-volley.md) | P12-S74-T01 — The on-death hook (ADR 0019), and Burning's ground | 1.5 |
| | P12-S74-T02 — `mana_burn`: the `burn_mana` primitive and the leech | 1.5 |
| | P12-S74-T03 — Volley: a ranged attack loosed as a fan | 1 |
| [75 — The reflected hit, the ten aspects, and the Undercroft](./sprint-75-the-reflected-hit-the-ten-aspects-and-the-undercroft.md) | P12-S75-T01 — The reflected hit | 1 |
| | P12-S75-T02 — The ten aspects as data, and their icons | 1.5 |
| | P12-S75-T03 — The Undercroft's seven families at variants I and II | 1.5 |
| [76 — The Nave's variants, items to thirty, and the bolter](./sprint-76-the-naves-variants-items-to-thirty-and-the-bolter.md) | P12-S76-T01 — The Nave's six families at variants II and III | 1.5 |
| | P12-S76-T02 — Bases and affix tiers to item level 30 | 1.5 |
| | P12-S76-T03 — The bolter | 0.5 |
| | P12-S76-T04 — The Nave's map bosses take their aspect | 0.5 |
| [77 — The recipes and the silhouettes](./sprint-77-the-recipes-and-the-silhouettes.md) | P12-S77-T01 — The Undercroft's and the Ossuary's recipes, and each one's stress case | 1.5 |
| | P12-S77-T02 — Silhouettes: fifteen family frames painted in code | 1.5 |
| [78 — The Hollow Abbess and Marrowleech](./sprint-78-the-hollow-abbess-and-marrowleech.md) | P12-S78-T01 — The Hollow Abbess and her Legendary piece | 1.5 |
| | P12-S78-T02 — Marrowleech and its Legendary piece | 1.5 |
| [79 — The balance, the playtest, and the docs](./sprint-79-the-balance-the-playtest-and-the-docs.md) | P12-S79-T01 — The balance: the driver's sweeps of strata 2 and 3 | 1.5 |
| | P12-S79-T02 — The maintainer's playtest and the triage | 0.5 |
| | P12-S79-T03 — Documentation sync | 1 |
| [80 — The bucket and the gate](./sprint-80-the-bucket-and-the-gate.md) | The bucket, P12-S80-T02 onward, an appetite | 3 |
| | P12-S80-T01 — The phase gate | 1 |
| | **Total** | **33** |

Sprints 72 to 76 and 80 hold 4 sized days; 77 to 79 hold 3, and their two buffer days are where the recipes' tuning, a boss's kit sent back to the designer, and the maintainer's calendar land. Nine sprints, as sketched: 29 days outside the bucket's sprint do not fit seven sprints of 4, and the balance, the playtest, and the docs cannot share a sprint with work they wait on, so no sprint number is left unused.

## What moved the size

The sketch was 32.5. On 2026-09-28 the maintainer moved ADR 0021 and its bench to phase 16's first sprint with all sourced art and sound: **31**. The cut makes it **33**, each change noted under its ticket:
- **Down 0.5, the silhouettes, 2 to 1.5.** The shape painter already paints a filled polygon, the `silhouette` kind the item icons use, and a unit view already draws the frame its definition names. The half day for drawing units by family frame is not needed.
- **Up 1, the reflected hit, P12-S75-T01.** Vengeful turns damage back on its source, and a damage-taken hook today aims at its own holder and knows nothing of the hit. The sketch had no capability for it. Phase 15's `thorns` reuses it.
- **Up 0.5, the Undercroft's seven at variant II, in P12-S75-T03.** The descent's section 3 stands them at II in the Ossuary; the sketch counted I only.
- **Up 0.5, the roster written a stratum at a time.** The sketch's one 2-day design ticket becomes the Undercroft's at 1.5 and the Ossuary's at 1, since the Ossuary gained seven rows ([R34](../02-risks-and-hidden-work.md)).
- **Up 0.5, the Nave's map bosses take their aspect, P12-S76-T04.** The descent gives a stratum 1 map boss one aspect, and phase 10 left it out. Rolling it moves every Nave map, so phase 11's build is pinned and the maintainer's Nave sessions are proved there and retired before the change.

**Not resized, but carrying more than the sketch named:** the aspect kind holds the panel's spawn with aspects and Volley's eligibility, and the ten aspects hold Warded's ceiling, as a content test while no row it rolls on passes 0.45.

## Size and band

Most of it is content on kinds that exist, and content has run near 0.35. Six capabilities are new ground: the aspect kind, the periodic list, the on-death hook, `burn_mana`, the fan, and the reflected hit. **Expect about 0.5: about 16.5 engineer-days, in a band of 11.5 to 26.5.**

| Line | Sized days |
| --- | --- |
| Paper and splits | 1.5 |
| The capabilities, the ten aspects, and the Nave's aspect | 8.5 |
| Stratum 2's roster: its design, rows, recipe, silhouettes, and the Hollow Abbess | about 6 |
| Stratum 3's roster: its design, the leech and the bolter, rows, recipe, silhouettes, and Marrowleech | about 7.5 |
| Items to level 30 | 2.5 |
| The balance, the playtest, and the docs | 3 |
| The bucket and the gate | 4 |

The calendar is the maintainer's two sittings, not these days.

## Cut-line

What is out is in [Deferred](../backlog/deferred.md), with the phase each waits on.

**In:**
- strata 2 and 3 as the descent's table sets them, the Undercroft's seven at I and II and the Nave's six at II and III;
- the ten aspects, and the Nave's map bosses' one;
- the on-death hook, the periodic list, the fan, and the reflected hit;
- `mana_burn`;
- the two stratum bosses and their pieces;
- a silhouette per family, painted in code into the one atlas page;
- items to level 30;
- ADRs 0019 and 0020 decided;
- phase 11's build pinned;
- one playtest from saves across two sittings, and a bucket of 3.

**Out:**
- families below the Ossuary;
- variant IV;
- ADR 0021 and any sourced art, drawn, bought, or commissioned (phase 16);
- sprite art and animation (phase 16);
- any sound, the enemy casts' tells included (phase 16);
- items past level 30 (phase 13);
- aspects on a stratum boss, which rolls none;
- a magic resistance ceiling as a rule, until a row Warded rolls on passes 0.45.

## Gate

The rows are in [Phase exit gates](../04-phase-exit-gates.md#phase-12-gate):
- the families and variants as rows matching the descent's table, the Undercroft's seven at I and II;
- aspects as data only, with no rule branching on an aspect's id;
- `mana_burn`, the on-death hook, and the reflected hit by their specs;
- the status table's fill under capacity for the worst boss;
- every family with a silhouette, world draw calls unchanged, and the render benchmark by an agent;
- items to 30 by rolls;
- both bosses and their pieces;
- the driver's sweeps;
- the Nave's logs carried across its aspect;
- the maintainer's playtest from saves, triaged;
- the docs;
- the bar.

## Risks

- **Aspects become per-aspect code** ([R37](../02-risks-and-hidden-work.md)): each capability is built once and named, and a test fails on an aspect's id named under the domain or the simulation.
- **The status table fills** with a boss's carried statuses and aspects: measured in P12-S73-T02 before the aspects are written (the architecture outline, section 4).
- **The roster's design runs behind its build** ([R43](../02-risks-and-hidden-work.md)): the designer's two roster tickets run in sprints 72 and 73, and the capabilities of sprints 73 to 75 do not wait on their numbers.
- **Art drawn two ways.** The silhouettes are painted frames that phase 16's sprite sheets replace, and stay as the fallback when a sheet has no frame. No artist draws anything twice.
- **The Nave's stored logs break** when its map bosses roll their aspect ([R36](../02-risks-and-hidden-work.md)): phase 11's build pinned, the sessions proved there, and the golden hash's move traced to the roll alone.
- **The recipes' tuning does not converge** ([R42](../02-risks-and-hidden-work.md)): sprint 77 holds two buffer days, and a recipe that misses its band is the designer's call.
- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)): two strata, two sittings, from the driver's saves.

## Exit record

Not yet walked. P12-S80-T01 records every gate row here with its numbers.
