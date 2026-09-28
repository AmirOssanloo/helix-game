# Sprint 74 — The on-death hook, mana burn, and the volley

**Phase:** 12 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

Three capabilities the Ossuary and the aspects need, each built once and named: a status that acts at its holder's death, the leech's drain on the hero's mana, and a ranged attack loosed as a fan.

## Playable outcome

From the panel, jump to a Nave map and spawn a leech beside a pack of archers. The leech's cast lands and the hero's mana bar drains for five seconds; with too little mana left, the drain turns into damage on the health bar. Burning's ground and the volley are seen in the specs until sprint 75 puts them on aspects.

---

## Tickets

### P12-S74-T01 — The on-death hook (ADR 0019), and Burning's ground

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S72-T01, P12-S72-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **An on-death list on a status,** a required field, empty on every status that has none.
- **The death system runs a dying unit's on-death lists** at its death, before the corpse, anchored at its point, credited to the entry's applier as ADR 0008 credits, each list once whatever killed it.
- **A death a list causes resolves on the next tick's death pass,** so a tick's work stays bounded and a chain runs one link a tick ([Q129](../backlog/open-questions.md)). The pass's working memory is the world's scratch.
- **`burning`,** carried, whose on-death list spawns `burning_ground`: a zone of `burn` at the point, at the numbers P12-S72-T04 sets.

**Acceptance:**
- A holder's list runs at its death, at its point, once; a unit that dies with no list is unchanged.
- A fixture list that kills a second holder resolves that death on the next tick, and a chain of three takes three ticks.
- Every stored log replays unchanged after `pnpm restamp`, since no stored unit carries an on-death list.
- It plays: in a simulation spec, a unit carrying `burning` killed by the hero leaves a zone that burns the hero standing in it.
- The bar: one zone from the pool per death; no allocation in the death pass; the stress tier green.

**Tests:**
- `tests/simulation/combat/on-death.spec.ts`: the list at death, the anchor, the credit, the chain one link a tick.
- `tests/simulation/statuses/burning.spec.ts`: the ground, its burn, its life.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md) and [simulation loop](../../../../docs/architecture/simulation-loop.md), the death pass's place in the tick, checked against ADR 0019; [status effects](../../../../docs/product/features/status-effects.md), burning ground.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P12-S74-T02 — `mana_burn`: the `burn_mana` primitive and the leech

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S72-T02, P12-S73-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The primitive `burn_mana`,** run from a status's per-tick pass: it drains mana at the tick rate from the status's table; a tick that finds too little takes what there is and deals the rest as magical damage through the damage function, credited to the applier ([Q121](../backlog/open-questions.md)).
- **`mana_burn`,** a status with the drain and no flag, dispelled by the self-lift as every status an enemy applied is. Its rows on the status effects page and the disable matrix exist already and are checked.
- **The enemy ability `mana_burn`:** 10 mana a second for 5 s, a cast point of 0.5 s, range 700, a 12 s clock.
- **The leech family at variant I** as a row of the family kind, a kiter, at P12-S73-T01's numbers, sharing `ranged_kiter` by key.

**Acceptance:**
- A hero with enough mana loses 50 over the burn and no health; a hero with 20 loses the 20 and takes the rest as magical damage, reduced by its magic resistance.
- The self-lift sheds the burn on the tick it rises.
- The content version moves: `pnpm restamp` re-stamps the stored logs, and none of them replays differently.
- It plays: in Chrome by an agent, a leech spawned from the panel on a Nave map drains the hero's mana bar and then its health bar.
- The bar: one status entry; no allocation in the pass; the stress tier green.

**Tests:**
- `tests/domain/abilities/primitives/burn-mana.spec.ts`: the drain, the shortfall, the damage type, the credit.
- `tests/simulation/abilities/mana-burn.spec.ts`: the cast, the burn over its length, the dispel.
- `tests/simulation/enemies/leech.spec.ts`: the kiter holds its range and casts on its clock.
- `tests/content/families.spec.ts`: the leech's row against the catalogue.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the primitive; [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), the leech; [status effects](../../../../docs/product/features/status-effects.md#dispel) and the [disable matrix](../../../../docs/product/specs/disable-matrix.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · A documentation change.

---

### P12-S74-T03 — Volley: a ranged attack loosed as a fan

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P12-S72-T01, P12-S72-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The shot count,** a stat with a base of one, raised by a flat modifier row, and read only where a ranged attack spawns its projectile. A melee swing never reads it.
- **The fan:** the first shot is the attack's own, at its target; each other shot is a linear projectile at an even angle either side, out to the attack's range, hitting the first unit of the other side it touches. The side shots are dodged, not disjointed ([Q121](../backlog/open-questions.md)).
- **`volley`,** a status carrying a modifier row that raises the count to three, and nothing else.

**Acceptance:**
- An archer holding `volley` looses three shots per attack in the fan; one without looses one; a grunt holding it swings as before.
- A side shot hits the first hero it touches, and a hero who steps out of the fan takes only the centre shot.
- The content version moves: `pnpm restamp`, and every stored log replays unchanged.
- It plays: in a simulation spec, three archers holding `volley` at the densest choke of the Nave's stress case.
- The bar: the projectile pool at that stress case with no miss, its peak printed against the 100 of the live cap; the stress tier green.

**Tests:**
- `tests/simulation/attack/volley.spec.ts`: the count, the angles, the side shots' hits, a melee unit unchanged.
- `tests/simulation/stress.spec.ts`: a volley case with the pool's peak printed.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the shot count, checked; [spells and attack](../../../../docs/product/features/spells-and-attack.md), if the attack's page names a single shot.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The on-death hook and a chain of three over three ticks | |
| `mana_burn` and the shortfall as damage; the leech | |
| Volley's fan; the projectile pool's peak | |
| Every stored log after the re-stamp | |
| The render benchmark, by an agent, with the leech on screen | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Volley fills the projectile pool.** Three shots from each ranged elite at a choke can triple the peak; it is read at the stress case here, and a pool that misses is a capacity change in this ticket with its heap number, not a bucket ticket.
- **The death pass grows unbounded.** A death a list causes waits for the next tick by construction; the chain spec holds it.
