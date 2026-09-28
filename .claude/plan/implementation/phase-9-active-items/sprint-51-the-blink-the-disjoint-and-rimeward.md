# Sprint 51 — The blink, the disjoint, and Rimeward

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch. Runs after sprint 44; the number is the next free one after phase 7's 45 to 50

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)).

## Goal

A projectile aimed at a unit that blinks or is lifted hits nothing; Slipknife blinks, and is refused under root and for 3 s after an elite's or a boss's damage; Rimeward's ring grows to 900 and its armour stays while it is banked.

## Playable outcome

On the long road, let a trapper throw its net and blink away with Slipknife as it flies: the net lands where the hero stood. Take a hit from an elite and see Slipknife refused with its lockout for 3 s. Fire Rimeward in a pack and watch the ring grow and slow every enemy it reaches; open the panel's hero readouts and see armour 4 higher while it sits in the bank.

---

## Tickets

### P9-S51-T01 — Slipknife: `blink_to`, the rooted refusal, and the lockout

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P9-S44-T03, P9-S43-T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, at the cut:** runs before the disjoint, not after it as the sketch listed: the disjoint is bumped by `blink_to`, which this ticket makes.

**Build:**
- **`blink_to`,** a primitive in `src/domain/abilities/primitives/`: the unit is placed at the point, or the nearest walkable ground to it for its radius class, or at the range toward it if the point is further; no travel, no path.
- **Slipknife** at the catalogue's numbers: a point within 1200, 15 s, no mana, 1400 gold. Its active block's "refused while rooted" flag is set, read by the cast pipeline with reason `rooted`.
- **The lockout,** a bank passive (P9-S44-T03): a status carrying a damage-taken hook filtered to `elite_or_boss` whose list holds Slipknife's clock at least 3 s from the hit.

**Acceptance:**
- A blink to open ground, into an obstacle (to its nearest walkable edge), and past 1200 (1200 toward it).
- Refused `rooted` while rooted; after an elite's or a boss's hit its clock reads at least 3 s; a normal's hit changes nothing.
- It plays: in a simulation spec, a blink out of a pack, then a hit from an elite spawned from the panel and the key refused for 3 s.
- The bar: `blink_to` searches a bounded ring, allocating nothing.

**Tests:**
- `tests/domain/abilities/primitives/blink-to.spec.ts`: the three placements.
- `tests/simulation/actives/slipknife.spec.ts`: the range, the rooted refusal, the lockout by tier.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), `blink_to` and the rooted flag; the item catalogue, by the content test.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S51-T02 — The disjoint

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests, docs |
| Size | 1.5 |
| Depends on | T01, P9-S44-T02, P9-S41-T02, P9-S41-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** a disjoint count on the unit, in the sub-record for what carries it, bumped by `blink_to` and by the landing of any status that raises `lifted`, the self-lift and Updraft's included. A projectile aimed at a unit records its target's count at launch; the projectile system, on a mismatch, sends the projectile on to the point the target stood, where it ends and hits nothing. A point-aimed projectile and a zone are dodged, never disjointed. A melee swing checks its reach when it commits and lands on nothing if the target blinked out of it. Both counts join the checksum's lists.

If Updraft lifts an enemy with a projectile in flight at it in a stored log, that log's play moves by design: this ticket names each such log, traces each moved checksum to the rule on the tick it parts, and only then records it again ([R36](../02-risks-and-hidden-work.md)). The phase 8 run is played on the pinned build (P9-S41-T03), so its log is not one of them.

**Acceptance:**
- A homing projectile at a unit that blinks, is self-lifted, or is lifted by Updraft flies on to where it stood and hits nothing; one at an unmoved unit lands.
- A point-aimed projectile and a zone are unaffected.
- A melee swing at a target that blinked away lands on nothing.
- Every stored log replays; each re-recorded one is named with its traced tick.
- It plays: the sprint's playable outcome, the trapper's net dodged by Slipknife, in a simulation spec and in Chrome by an agent.
- The bar: one comparison per projectile per tick; the stress tier with 100 projectiles green.

**Tests:**
- `tests/simulation/projectiles/disjoint.spec.ts`: each source of a disjoint, the point-aimed and zone cases, the melee swing.
- `tests/simulation/replay-determinism.spec.ts` green on every stored log.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the disjoint; [status effects](../../../../docs/product/features/status-effects.md), checked; [entities and pools](../../../../docs/architecture/entities-and-pools.md), the two fields.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S51-T03 — Rimeward

| Field | Value |
| --- | --- |
| Layer | domain, presentation, content, tests, docs |
| Size | 1.5 |
| Depends on | P9-S44-T03, P9-S43-T03, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the expanding ring, the first zone of its shape: a ring growing from the caster to 900 over 1.5 s, each enemy it reaches taking `90 + 9 × L` magical damage once and slowed 40% for 4 s. Rimeward at the catalogue's numbers: no target, 30 s, 100 mana, 2000 gold, with +4 armour as a bank passive. The zone view draws the ring as it grows from the atlas, with no new draw call.

**Acceptance:**
- An enemy is hit once, on the tick the ring's edge reaches it, and never twice.
- +4 armour while banked, none in the inventory.
- It plays: fired in a long-road pack in Chrome by an agent, the ring seen growing and every enemy it reaches slowed.
- The bar: the ring is one zone from the pool, drawn in the zone band; draw calls unchanged; the render benchmark by an agent.

**Tests:**
- `tests/simulation/actives/rimeward.spec.ts`: the growth, one hit per enemy, the slow, the armour in and out of the bank.
- `tests/presentation/zone-view.spec.ts`: the ring's scale with its radius.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the ring's shape; [presentation](../../../../docs/architecture/presentation.md), if the zone view gains a shape; the item catalogue, by the content test.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Slipknife: the three placements, the rooted refusal, the lockout by tier | |
| The disjoint by each source; every stored log replaying, each re-record traced | |
| Rimeward's ring and its armour | |
| The trapper's net dodged, and the ring, in Chrome by an agent | |
| The render benchmark, by an agent | |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The disjoint moves a stored log** if Updraft lifts an enemy a stored projectile was aimed at. Traced to the rule before any re-record (R36).
- **Slipknife's 1200 on the isometric view** ([R20](../02-risks-and-hidden-work.md)): a retune is a number from the panel first, and a bucket ticket after the playtest.
- **`blink_to` is a new primitive** inside a 1-day ticket. If it runs over, the sprint's buffer takes it; the disjoint does not start before it is done.
