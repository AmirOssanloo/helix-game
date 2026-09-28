# Phase 10 — The first stratum: the town, travel, and the generator

**Sprints:** 54–65, sketched · **Sized days:** 46.5, sketched: 43.5 in tickets and 3 of bucket appetite · **Gate:** [Phase 10 gate](../04-phase-exit-gates.md#phase-10-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 9 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows, no more than one phase's playtest outstanding. Ticket IDs are assigned then.

## Goal

The hero starts in the town and walks down ten generated maps of the Nave, portal to portal. It finds each map's waypoint midway and goes home by town portal to sell. It comes back to the same spot, kept frozen while the portal stands. It kills the Gaolmaster on map 10 to open the way down. The rules are the [map and camera page's travel](../../../../docs/product/features/map-and-camera.md#travel) and [the descent](../../../../docs/product/specs/the-descent.md). The long road stays a playtest map outside the descent, reached from the panel.

## What it builds on

- Q120 (travel and the town) and Q121's `stun_bolt`, which the Gaolmaster throws.
- The architecture outline's section 2, Q120 table, and its section 4 for phase 10.
- ADR 0013's revisit points: a kept map is not made again, and each recipe reads its expected drops against the capacity.
- The designer's answers to the architect's questions 1, 2, 4, 5, and 6 (Q123 onward): B under each status, where a portal sits in the right click, a resume while a portal stood, health on resume, and the level table. Question 6 decides whether the long road's logs move (R36).
- **The Nave's generator style, decided by the game designer on 2026-09-28 (Q131):** rooms and corridors, as Diablo I's Cathedral, which this plan sizes. Open ground broken by blocks stays the fallback cut ([R42](../02-risks-and-hidden-work.md)), accepted only with every region still closed by a choke, and rooms then come with the next stratum built.
- **The designer's answers to the architect's questions, 2026-09-28:** Q123, B refused under stun, lift, and the self-lift; Q124, portals and waypoints after an item's icon and before the ground in the right click; Q128, only the levels above 12 change, so the long road's stored logs do not move.

## The order inside the phase

The architect's order ([R45](../02-risks-and-hidden-work.md)), so a generator bug never looks like a travel bug:
1. **Paper and design:** ADRs 0015 to 0018 before any code (0017, saves, on paper now, since this phase adds run-scope state a save must hold); the Nave's roster and recipe as design; the four file splits.
2. **Travel on authored maps:** the map reference, the pack as a list of members, two map scopes, travel points, the town portal, waypoints, the town and its store. Closed by **M15**, a replay spec that walks to town and back with the kept map's checksum unchanged.
3. **The generator on fixture families:** the map checks moved into the domain, the recipe kind, the layout, pack placement, the bounded retry, the sweep, the driver. Closed by **M16**, the driver walking a seed sweep from arrival to waypoint to portal.
4. **The Nave:** the family kind, six families at variant I, the recipe, the level table, the Gaolmaster.
5. **The balance, the playtest, the docs; the bucket and the gate.**

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 54 | ADR 0015, a town portal keeps its map as a second map scope that is not stepped, with the heap of a second scope measured before it is accepted | 1 |
| 54 | ADR 0016, a generated map is a pure function of the run's seed, its level, and its recipe | 1 |
| 54 | ADR 0017, run scope is the save, on paper; ADR 0018, a variant is a row of its family | 1 |
| 54 | The game designer: the Nave's recipe (style, size against eight to twelve minutes, regions, chokes, pack budget by the density table) and the town's layout | 1 |
| 55 | The game designer: the Nave's roster. The six families at variant I by the enemy catalogue's method, map bosses and their guards, the Gaolmaster's kit and Legendary piece, and the level table and experience for a hundred maps | 1.5 |
| 55 | Split the files at the limit: `domain/ai/packs.ts`, `domain/debug/debug-commands.ts`, `presentation/scenes/play-view-syncers.ts`, `presentation/input/input-claim.ts`, by the seams R40 names | 1.5 |
| 55 | The map reference and the map kind; every map file gains its kind, portal point, waypoint, and boss gate. Re-stamp only | 1 |
| 56 | A pack as a bounded list of members, so a map boss stands with its guard in one pack and a sleep keeps a mixed pack whole | 1.5 |
| 56 | Two map scopes of the same capacities, and the hero's slot-zero object exchanged between the unit pools on a transition | 2 |
| 56 | Portal and waypoint rings from the atlas, and the new strings (TOWN, MAP N, THE NAVE) in the font's content test | 0.5 |
| 57 | The checksum over both scopes by role, the world view over the stepped scope, and the views rebinding on a swap | 1 |
| 57 | Travel points in map scope, the order target's travel-point tag, the pending-travel record applied first on the next tick, and the portal down by a right click | 2 |
| 57 | Waypoints reached in run scope, and the travel command naming a map level or the town | 1 |
| 58 | The town portal on B: the channel state in `channel-transitions.ts`, the ability with its required no-reduction flag, a disable-matrix column, and the map kept while the portal stands, one portal at a time | 2 |
| 58 | The town as an authored map of kind town, and the town store in run scope, restocked by the count of waypoints reached; the open store as a store reference | 1.5 |
| 59 | The waypoint screen on the input claim, opened by a right click on a reached waypoint | 1.5 |
| 59 | Travel walked on two authored fixture maps: a replay spec to town and back with the kept map's checksum unchanged, the fade, and the camera clamped again per map. **M15** | 1 |
| 59 | The map checks moved from the content tests into `domain/map/map-checks.ts`, called by the tests and, from sprint 60, by the generator | 1 |
| 60 | The recipe as a definition kind with no tuning surface, the generator's keyed draws at the level and tick 0, the generator version in the content version, and the plain fallback layout | 2 |
| 60 | The rooms-and-corridors layout, with regions, an arrival point, a waypoint a third to a half along the walk, and a portal behind the map boss | 2 |
| 61 | Pack placement against the recipe's budget and the density table, the map boss with its guard | 1.5 |
| 61 | The bounded retry by attempt index, the fallback counter, a seed sweep under `tooling/`, and a golden hash of a sampled sweep in the tests | 1.5 |
| 61 | Generation time: an instrumentation sample and panel readouts, under 50 ms headless for the largest map, left out of the tick window as a map load is | 0.5 |
| 61 | The panel's jump to a descent map by level, recorded as a command | 0.5 |
| 62 | The map-agnostic recording driver: from arrival to waypoint to portal on any map, taking drops and using the town. **M16** when it walks a seed sweep of generated maps on fixture families | 2 |
| 62 | The family kind (ADR 0018): the registry expands each row into the archetype record the domain reads; tuning keys into the row | 1.5 |
| 63 | The Nave's six families at variant I as rows | 1 |
| 63 | The Nave's recipe as content, with a floor tint that reads as the Nave | 1 |
| 63 | The level table above the long road's reach and the variants' experience | 0.5 |
| 63 | The Gaolmaster: `stun_bolt` every six seconds, grunt adds, a slam, the chamber whose portal opens on its death, and its Legendary piece | 1.5 |
| 64 | The stress case per recipe on a sampled sweep: no `enemy_cap_reached`, the bound of 60 near any point, the most A* expansions a tick printed against the re-path budget (R23) | 1 |
| 64 | The balance: the driver walks a seed sweep of the stratum from the town to the Gaolmaster's kill, the hero at about level 12 on map 10, the Nave's numbers tuned as content; the sweep's figures of R42 recorded | 1.5 |
| 64 | The maintainer's playtest and its triage: the town and the Nave's first maps in one sitting, about 40 minutes, the town portal and a waypoint used once each; the Gaolmaster is judged by the driver here and by the maintainer in phase 11 | 0.5 |
| 64 | Documentation sync, beside the playtest ([R17](../02-risks-and-hidden-work.md)) | 1 |
| 65 | The triage bucket, an appetite | 3 |
| 65 | The phase gate | 1 |
| | **Total** | **46.5** |

## Size and band

46.5 sized, the largest phase in the plan, because it holds two new structures and the first content pipeline since the item catalogue. Most of it is new ground: the second map scope, the generator, the channel, and the waypoint screen. Those ran nearer 0.8 in phases 1 and 2 than the plan's 0.53. **Expect about 0.65: about 30 engineer-days, in a band of 23 to 46.5.** The sprints hold 3.5 to 4 each. Sequencing, not size, leaves 1.5 days of slack.

The bucket is 3, between phase 6's 4 and phase 8's 2. A generated stratum is the first playtest of maps no one has walked, and the generator's findings are content (R42).

## Cut-line, sketched

**In:**
- the town, with the store restocked by new waypoints;
- the town portal on B, with a 3 s channel and a 60 s clock;
- the kept map, frozen;
- waypoints and the waypoint screen;
- the portal down, gated on the stratum boss on map 10;
- two map scopes;
- the generator with the Nave's recipe, the map checks, a bounded retry, the fallback, the sweep, and the golden hash;
- the map-agnostic driver;
- the pack as a list of members;
- the family kind and the Nave's six families at variant I;
- map bosses with guards;
- the Gaolmaster and its Legendary;
- the level table for a hundred maps;
- the panel's jump to a map level;
- ADR 0017 on paper;
- one playtest and a bucket of 3.

**Out:**
- saves, the stash, and a death penalty (phase 11);
- aspects and variants II to IV (phase 12);
- any stratum but the Nave;
- a way up by portal;
- a minimap;
- silhouettes (phase 12);
- sound (phase 11);
- a coarse path over the room graph, which is a decision record only if R23's first two steps fail.

**The fallback cut, if R45's re-cut rule fires at sprint 59:** open ground broken by blocks instead of rooms and corridors, about 2 days.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-10-gate):
- travel and the kept map by their specs;
- the generator pure, checked, and hashed;
- the stratum walked by the driver to the Gaolmaster's kill at about level 12;
- the stress case per recipe;
- the heap with two scopes;
- the maintainer's playtest, replayed and triaged;
- the docs;
- the bar on the densest map of the Nave's sweep.

## Risks

- [R45](../02-risks-and-hidden-work.md), two structures in one phase: milestones M15 and M16, and the re-cut at sprint 59.
- [R42](../02-risks-and-hidden-work.md), the generator's tuning: gate rows as bands on the sweep's figures, and fixes as content.
- [R21](../02-risks-and-hidden-work.md) and [R23](../02-risks-and-hidden-work.md), the live cap and A* on generated maps: the stress case per recipe.
- [R31](../02-risks-and-hidden-work.md), the generator's draws leaking: purposes of their own, and a spec generating every map before and after a played session.
- [R38](../02-risks-and-hidden-work.md), the checksum over two scopes: walked by role.
- [R43](../02-risks-and-hidden-work.md), the Nave's design ahead of its rows: the two design tickets in sprints 54 and 55.
