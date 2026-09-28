# Sprint 93 — The Furnace walked, the flicker, and the kindler

**Phase:** 14 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 13 left, and edit a ticket in place with a one-line note if it moved.

> **If the cut after the Warrens was taken at sprint 91's start,** this sprint's tickets move whole to the phase that takes the Furnace and the Mirrorhalls, IDs kept.

## Goal

The Furnace is walked by the driver through the Kindled King's kill. Then the Mirrorhalls' two problems: a flicker that blinks away when the hero closes, and a kindler that leaves burning ground where it walks. The Mirrorhalls stand as content.

## Playable outcome

From the driver's save at map 51, the driver reaches the Kindled King and kills him. In Chrome by an agent, on a panel spawn: walk at a flicker and it is gone to the far side of its pack; a kindler chases the hero and the ground behind it burns in a line of segments that go out one by one.

---

## Tickets

### P14-S93-T01 — The Furnace balanced

| Field | Value |
| --- | --- |
| Layer | content, tests, tooling |
| Size | 0.5 |
| Depends on | P14-S92-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the driver walks a seed sweep of maps 51 to 60 from a save at map 51 through the Kindled King's kill with no panel help. The Furnace's numbers tuned as content along the descent's line between level 25 at map 50 and 28 at map 70. The driver writes a save at map 51's arrival for the playtest.

**Acceptance:**
- The sweep kills the Kindled King on every sampled seed; level at the kill and deaths a map recorded.
- The Cisterns' and the Warrens' sweeps still green.
- It plays: in Chrome by an agent, the save at map 51 loads and a run reaches the kill.
- The bar: the Furnace's stress case still green after the tuning.

**Tests:** the Furnace's balance sweep under the budget tier; the save at map 51 stored under `tests/`.

**Pages:** the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), by the content test.

**Definition of done:** Every change · A documentation change.

---

### P14-S93-T02 — `blink_away` on `blink_to`; the flicker's ability

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | P14-S86-T02, P14-S87-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** `blink_away` at the Mirrorhalls' numbers: cast when the hero comes within its trigger range, a `blink_to` to the point its distance directly away from the hero, clamped to walkable ground as phase 9's clamp does. The blink bumps the flicker's disjoint count, so a projectile aimed at it is disjointed, as any blink's is. Its selection condition, the hero's distance, is one the ability-selection conditions already read or one field more, named by the placement. The flicker's row is P14-S93-T04's.

**Acceptance:**
- The flicker blinks away when the hero closes past its trigger, not before, and not while rooted, stunned, or lifted.
- A Fetter Bolas root holds it in place; a projectile aimed at it in flight is disjointed by its blink.
- It plays: in a simulation spec, the hero walks at a flicker and it lands the decided distance away, clamped short of a wall.
- The bar: nothing allocates.

**Tests:** `tests/simulation/abilities/blink-away.spec.ts`: the trigger, the clamp, the root, the disjoint.

**Pages:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P14-S93-T03 — `ember_trail`, a trail zone of fixed segments; the kindler's ability

| Field | Value |
| --- | --- |
| Layer | domain, content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P14-S86-T02, P14-S87-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** `ember_trail`, a status the kindler carries whose periodic list lays a burning segment where the kindler stands once it has walked the segment length from the last, as Glacier's segments are fixed, each a zone from the pool with the Mirrorhalls' lifetime and damage. A kindler's live segments are capped by the lifetime over the lay interval, so the most zones a kindler holds is a number the map checks and the stress case can read. The segment's look is burning ground's if phase 12 left one; otherwise a zone look painted in code into the one atlas page, with the zone. The kindler's row is P14-S93-T04's.

**Acceptance:**
- A walking kindler lays a segment each segment length; a standing one lays none; each goes out at its lifetime.
- The hero in a segment burns as in any burning ground; the self-lift passes over it untouched (Q125).
- A kindler's live segments never pass its cap.
- It plays: in Chrome by an agent, a kindler chasing the hero around a room leaves a trail that goes out behind it.
- The bar: the zone pool's fill printed with the most kindlers the Mirrorhalls' recipe allows; no miss; zones draw in the existing batch, world draw calls unchanged.

**Tests:**
- `tests/simulation/abilities/ember-trail.spec.ts`: laying by distance, the lifetime, the cap, the damage, the self-lift over it.
- `tests/simulation/stress-zones.spec.ts`: a case with the recipe's most kindlers, no pool miss.
- `tests/presentation/zone-view.spec.ts`: the segment's look, if a new one.

**Pages:** the ability pipeline and [entities and pools](../../../../docs/architecture/entities-and-pools.md), checked against the zone pool's capacity.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · Anything under `src/presentation` · A documentation change.

---

### P14-S93-T04 — The Mirrorhalls' rows, and two silhouettes

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P14-S87-T02, T02, T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** as rows of the family kind, at the numbers P14-S87-T02 approved:
- **The flicker and the kindler at variant I,** each with its silhouette painted in code into the one atlas page.
- **Six rows for the families above:** the Cisterns' two at IV, the Warrens' two at III with their ability more, the Furnace's two at II. The Ossuary's two at IV stand as the crowd with P14-S92-T01's rows.

**Acceptance:**
- The family content test holds all ten of the stratum's families at their variants.
- Every frame exists; the two silhouettes told apart from the twenty-one before them.
- It plays: in Chrome by an agent, a panel spawn of each new variant beside its lower one.
- The bar: world draw calls unchanged; the render benchmark, by an agent.

**Tests:** `tests/content/families.spec.ts`, the Mirrorhalls' rows; `tests/presentation/shape-atlas.spec.ts`, the two frames.

**Pages:** the enemy catalogue, by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Furnace's balance: level at the kill, deaths a map | |
| `blink_away`: the trigger, the clamp, the disjoint | |
| `ember_trail`: segments, cap, and the zone pool's fill at the recipe's most kindlers | |
| Ten families at their variants, two silhouettes, draw calls unchanged | |
| The render benchmark, by an agent | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The zone pool at its worst.** Kindlers' trails, the Kindled King's rings, burning ground from the Burning aspect, and the hero's Glacier together: the capacity was read in P14-S86-T02, and a miss here is a recipe fix, fewer kindlers a map, not a capacity raised inside this ticket.
- **A flicker that blinks into a wall or off the walk.** `blink_to`'s clamp is phase 9's; the spec holds it at a wall and at a map's edge.
