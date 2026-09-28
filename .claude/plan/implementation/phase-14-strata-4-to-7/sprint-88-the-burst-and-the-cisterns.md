# Sprint 88 — The burst and the Cisterns

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The Cisterns stand as content: a bloater's death bursts and sets off the next one a tick later, all seventeen of the stratum's families stand at their variants with a silhouette each, and the Cisterns' recipe generates maps at the new density that pass the map checks and hold the live cap.

## Playable outcome

Jump to map 31 from the panel: a Cisterns map, packs of four to seven, draggers throwing hooks from the back of a pack and bloaters running at the front. Kill a bloater inside its pack and watch the chain run through it, one burst a tick.

---

## Tickets

### P14-S88-T01 — `death_burst` on the on-death hook, chained on the next tick

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P14-S86-T02, P14-S86-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** `death_burst`, a status the bloater carries whose on-death hook, ADR 0019's as phase 12 built it, deals the Cisterns' damage to every unit within its radius at the dying unit's point, enemies included, through the one damage function and credited as ADR 0008 credits. The area's side filter gains "every unit" if phase 12 left only hostile; that is one field on the area, not a new primitive. A bloater a burst kills bursts on the next tick's death pass, so a chain runs one link a tick (Q129), and a tick's bursts are bounded by the bloaters that died on the tick before. The glyph for the carried status joins the frame list.

**Acceptance:**
- A burst harms the hero and the enemies in its radius, and nothing outside it.
- A line of five bloaters, the first killed, bursts over five ticks, one a tick.
- The experience and drops of a unit a burst kills go as the placement's crediting says.
- It plays: in a simulation spec, a bloater popped inside a pack of grunts kills the grunts; one popped beside the hero harms it.
- The bar: the most bursts a tick printed on a pack of bloaters at the worst the recipe allows; nothing allocates.

**Tests:**
- `tests/simulation/abilities/death-burst.spec.ts`: the radius, both sides harmed, the chain one link a tick, the crediting, a burst on the tick the hero dies.
- `tests/content/statuses.spec.ts`: the status and its hook.

**Pages:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) and the [simulation loop](../../../../docs/architecture/simulation-loop.md), checked against the chain; [status effects](../../../../docs/product/features/status-effects.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P14-S88-T02 — The Cisterns' rows, and two silhouettes

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P14-S86-T03, P14-S87-T03, T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** sketched at 1; resized to 1.5 by the delivery strategist on counting the rows. The stratum adds two families and fifteen variant rows, seven of them with an ability more, where phase 12 sized thirteen rows and six abilities at 1.5. The two silhouettes are small beside that.

**Build:** as rows of the family kind (ADR 0018), at the numbers P14-S86-T03 approved:
- **The dragger and the bloater at variant I,** each a family with its behaviour key, body, kit by key, and a silhouette frame painted in code by `src/presentation/atlas/shape-painter.ts` from points in `src/content/atlas-frames.ts`, into the one atlas page, as phase 12's fifteen were.
- **Fifteen rows for the families above:** the Nave's six at IV, the Undercroft's seven at III, each with its ability more by key, and the Ossuary's two at II, each with its name, tint, and numbers.

No new code: a row that needs a rule the families do not have is a question to the architect, not a branch.

**Acceptance:**
- The family content test holds all seventeen of the stratum's families at their variants to the catalogue's tables.
- Every frame a family names exists; two silhouettes told apart from the fifteen of phase 12 at the size they are drawn.
- Every new name inside the font's set.
- It plays: in Chrome by an agent, a panel spawn of each new variant beside its family's lower variant: the same silhouette, a different tint.
- The bar: world draw calls unchanged at the densest choke; the render benchmark, by an agent.

**Tests:**
- `tests/content/families.spec.ts`: the stratum's rows against the catalogue, the frames, the names in the font.
- `tests/presentation/shape-atlas.spec.ts`: the two new frames baked inside the one page.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P14-S88-T03 — The Cisterns' recipe, at the density of strata 4 to 7, and its stress case

| Field | Value |
| --- | --- |
| Layer | content, domain, tests, tooling |
| Size | 1 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Cisterns' recipe under `src/content/strata/`, at P14-S86-T03's shape: field packs of 4 to 7, elites about 15%, 100 to 120 enemies, map bosses and their guards, the seventeen families drawn six to eight a map with the two new ones in the later regions, and a floor tint that reads as the Cisterns. The recipe kind grows a field only if the density needs one it lacks ([R37](../02-risks-and-hidden-work.md)). The recipe's stress case joins the per-recipe cases on a sampled sweep. Adding the recipe moves the content version; `pnpm restamp` re-stamps the stored logs, with no checksum moved.

**Acceptance:**
- A 1000-seed sweep of maps 31 to 40: every map passes the map checks or falls back and is counted, fallbacks at most 2% ([R42](../02-risks-and-hidden-work.md)).
- The sweep's figures recorded in the sprint exit: enemies a map, the most near any point against 60, the waypoint's fraction of the walk, minutes a map at the driver's pace, the most A* expansions a tick against the re-path budget, generation time for the largest map under 50 ms headless.
- It plays: the driver walks a sampled sweep from arrival to waypoint to portal on maps 31 to 39.
- The bar: the stress case under `pnpm test:budget`: no `enemy_cap_reached`, bursts at their worst.

**Tests:**
- `tests/content/strata.spec.ts`: the recipe against the catalogue's shape.
- The per-recipe stress case in `tests/simulation/stress-recipes.spec.ts`: the Cisterns' sampled sweep, no refusal.
- The generator's golden hash re-recorded for the new recipe only, the version moved with it.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md), checked against the recipe's figures.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Bursts chained one link a tick, and the most a tick | |
| Seventeen families at their variants, two silhouettes, draw calls unchanged | |
| The Cisterns' sweep: fallbacks, enemies a map, the most near a point, the waypoint, minutes, A*, generation time | |
| The Cisterns' stress case, no refusal | |
| Every stored log re-stamped, no checksum moved | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Density meets the near-point bound.** Packs of seven on rooms and corridors crowd a choke; a recipe that misses is fixed as content, a smaller budget or wider chokes, never with generator code ([R42](../02-risks-and-hidden-work.md)).
- **A chain of bursts in one pack.** The bound per tick is the bloaters that died the tick before; the stress case holds the worst pack the recipe makes.
