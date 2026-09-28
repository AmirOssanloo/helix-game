# Sprint 77 — The recipes and the silhouettes

**Phase:** 12 · **Sized days:** 3 · **Buffer:** 2
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The descent runs past the Nave to map 30: the Undercroft's and the Ossuary's maps are generated, held to the checks and the live cap on a sweep, and every family on them is told apart by its silhouette before its colour.

## Playable outcome

Kill the Gaolmaster and step through its portal onto map 11: a floor that is not the Nave's, families the long road taught now shaped by silhouette, elites with one aspect and the map boss with two. From the panel, jump to map 25 and meet a leech and a bolter in its later regions.

---

## Tickets

### P12-S77-T01 — The Undercroft's and the Ossuary's recipes, and each one's stress case

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling, docs |
| Size | 1.5 |
| Depends on | P12-S75-T03, P12-S76-T01, P12-S74-T02, P12-S76-T03, P12-S76-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** two recipes on the recipe kind phase 10 built, in the shapes P12-S72-T04 and P12-S73-T01 wrote:
- **The Undercroft, maps 11 to 20:** the seven families at I and the Nave's six at II; the **Ossuary, maps 21 to 30:** the leech and the bolter at I, always in the later regions, the Undercroft's seven at II, and the Nave's six at III, as [the descent](../../../../docs/product/specs/the-descent.md#3-families-and-variants)'s section 3 stands them.
- Six to eight families a map; field packs of 3 to 6, elite packs of 2 to 3, about 10% elites, 90 to 110 enemies, by section 6.
- One aspect on an elite pack and two on a map boss, by section 4.
- A chamber on maps 20 and 30 for the stratum boss, whose portal opens on its death, as phase 10 built the Gaolmaster's; the bosses themselves are sprint 78's, and until then a fixture stands in the chamber.
- A floor tint per stratum.
- The near-point bound counts each family's worst case, the summoner's adds included (ADR 0020).
- The end of the descent moves from map 10 to map 30, as phase 10 built the end.

The generator version moves and the golden hash's sample gains maps 11 to 30, recorded again by this ticket; the Nave's maps are unchanged, which the hash's Nave part shows.

**Acceptance:**
- A 1000-seed sweep of each recipe: every map passes the checks or falls back and is counted, fallbacks at most 2% ([R42](../02-risks-and-hidden-work.md)); at most 60 enemies near any point; expected drops at most half the ground-item capacity.
- The sweep's figures recorded in the sprint exit: enemies per map, the waypoint's place along the walk, minutes per map at the driver's pace, the most A* expansions a tick against the re-path budget, and generation time for the largest map under 50 ms headless.
- It plays: the driver walks a sampled seed of each recipe from arrival to waypoint to portal.
- The bar: each recipe's stress case under `pnpm test:budget` with no `enemy_cap_reached`.

**Tests:**
- `tests/content/recipes.spec.ts`: each recipe's families, variants, and counts against the descent.
- `tests/simulation/stress.spec.ts`: the Undercroft's and the Ossuary's stress cases.
- The golden hash spec, recorded again, with the Nave's part unchanged.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), checked against the recipes; [map and camera](../../../../docs/product/features/map-and-camera.md), if it names where the descent ends.

**Definition of done:** Every change · A documentation change.

---

### P12-S77-T02 — Silhouettes: fifteen family frames painted in code

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P12-S75-T03, P12-S76-T01, P12-S74-T02, P12-S76-T03 |
| Owner | The game engineer, with the game designer's read of the fifteen |
| Status | planned |

> **Note, 2026-09-28:** reworded and resized from 2 to 1.5 by the delivery strategist when the phase was cut, on the maintainer's decision of that day that all sourced art moves to phase 16. These are gameplay readability, not art. The shape painter already paints a filled polygon, the `silhouette` shape kind the item icons use, and a unit view already draws the frame its definition names, which a family row names under ADR 0018; the half day the sketch held for drawing units by family frame is not needed.

**Build:** a silhouette per family, as flat frames painted in code by `src/presentation/atlas/shape-painter.ts` into the one atlas page, the way every frame is made today: no drawn, bought, or commissioned asset, no new texture, no new shape kind.
- **Fifteen point lists** in the frame list, one per family: the Nave's six, the Undercroft's seven, the leech, and the bolter. Each fills its frame, so a body reads at its collision radius, and each reads as its family by outline alone at the size it is drawn, before its tint ([Q133](../backlog/open-questions.md)'s decided half).
- **Each family row names its frame;** a variant is its family's frame with its own tint. The elite and boss outline and the facing mark stay as they are, drawn over the silhouette.
- **The long road's thirteen archetypes wear the frame of the family each is,** so a hexer reads the same on the long road and in the Undercroft. A frame is outside the content version (`PRESENTATION_FIELDS` in `src/simulation/replay/content-version.ts`), so no stored log moves.

Phase 16's sprite sheets replace these frames; they stay in the frame list as what a unit is drawn with when a sheet has no frame for it.

**Acceptance:**
- Every family names a silhouette frame that exists, and no two families share one.
- A sheet of the fifteen, untinted at on-screen size, captured by an agent in Chrome and read by the game designer: each told from every other by shape. A family that fails is redrawn in this ticket.
- The atlas stays one page; its height is recorded in the sprint exit against the texture limit.
- Every stored log replays with no re-stamp.
- It plays: in Chrome by an agent, a capture of an Ossuary map at its densest choke, every family on screen told apart by the designer from the capture.
- The bar: world draw calls unchanged; the render benchmark by an agent, before and after, per [ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md).

**Tests:**
- `tests/content/families.spec.ts`: every family's frame exists and is its own.
- `tests/presentation/shape-atlas.spec.ts`: the fifteen laid out on one page, each point list inside its frame and filling it past the test's share.
- `tests/presentation/unit-view.spec.ts`: a family unit bound with its frame, the outline and the facing over it.
- `tests/presentation/draw-call-counter.spec.ts`: unchanged.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md#6-atlas-frames), sections 6 and 7.5, the frames by family; [presentation](../../../../docs/architecture/presentation.md), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Each recipe's 1000-seed sweep: fallbacks, near-point peak, drops | |
| The sweep's figures: enemies, waypoint, minutes, A* expansions, generation time | |
| Each recipe's stress case, no refusal | |
| The golden hash recorded again, the Nave's part unchanged | |
| The fifteen silhouettes, read by the game designer | |
| The atlas's height; world draw calls; the render benchmark | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The recipes' tuning does not converge** ([R42](../02-risks-and-hidden-work.md)). The fixes are content, and the sprint's two buffer days are there for them; a recipe that still misses its band at the sprint's end is the designer's call, not a bucket ticket.
- **Fifteen flat shapes do not read apart.** The designer reads them in the ticket; a second detail inside a frame is still a point list, and anything more is phase 16's.
