# Sprint 19 — Enemy abilities through the pipeline

**Phase:** 5 · **Sized days:** 4 · **Buffer:** 1

## Goal

Nine enemy ability kinds exist as definitions: seven under `src/content/abilities/`, cast through the same pipeline as the hero's spells and chosen by a behaviour rule, and the bash and the frost attack as statuses an archetype carries under `src/content/statuses/`; nothing enemy-specific is added to the pipeline.

> Edited 2026-09-25: two of the nine are carried statuses, not abilities; the P5-S19-T02 note says why.

## Playable outcome

A grunt with a bash stuns the hero; a caster silences; a netter roots; a slammer knocks back; a summoner brings adds; a charger closes the gap.

---

## Tickets

### P5-S19-T01 — The abilities folder and the selection rule

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | P4-S18-T04 |
| Status | done |

**Build:** `src/content/abilities/` with its registry index, validated exactly as spells without a recipe. The enemy's ability list on its definition. In `domain/ai/`: a selection rule run in Chase and Attack: pick the first listed ability that is off cooldown, in range of the current target, and whose targeting kind the behaviour can supply (unit, point at the target, self); submit a `cast` request through the pipeline as the hero would; never interrupt the enemy's own cast point; back to the attack loop after. An enemy in cast point is `ability_cast_point` in the shared order machine, so a stun on it cancels it at no cost. A `frost_volley`-style test ability for the runbook.

**Acceptance:**
- An enemy with one ability casts it when the rule allows and attacks otherwise; a stun during its cast point cancels it and the clock does not start.
- The diff under `domain/abilities/` since phase 2 adds no branch on the caster's kind.

**Tests:**
- `tests/simulation/ai/ability-selection.spec.ts`.
- `tests/content/abilities.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability · A new enemy or behaviour.

---

### P5-S19-T02 — Stun bash, slow frost attack, silence curse, root net

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T01, P2-S10-T01 |
| Status | done |

**Build:** `bash` as a status on the enemy whose `onDamageDealt` hook, the side sprint 10 built and left without a consumer, applies a short stun to the hit unit with an internal cooldown; `frost_attack` likewise applying slow; `silence_curse` as a unit-targeted ability applying silence; `root_net` as a projectile applying root on hit. Each with tables, frames, and an icon.

**Acceptance:**
- Each ability applies its status to the hero and the HUD greys what the status page says; the bash's internal cooldown holds.

**Tests:**
- `tests/simulation/abilities/bash.spec.ts`, `frost-attack.spec.ts`, `silence-curse.spec.ts`, `root-net.spec.ts`.

**Definition of done:** Every change · A new spell, effect, or enemy ability.

> **Note, 2026-09-25: the bash and the frost attack are statuses an archetype carries, and a projectile may leave from the caster.** Nothing put a status on a unit for its life, so `EnemyDef` gains `statuses`, ids the spawn applies from the unit itself at level one with an end tick no tick reaches (`STATUS_NEVER_ENDS`), through packs, summons, and the test helper alike; the validator refuses an unknown id, a duplicate, more than two, or one that raises a flag. `bash` and `frost_attack` live under `src/content/statuses/`, not `abilities/`, so the selection rule and the elite's extra ability never pick them. A unit cast anchors on its target, so the net would have been spawned on the hero; `spawn_projectile` gains `origin`, `anchor` or `caster`, and the net leaves from the caster toward its target. Both were decided with the engineering architect and are Q40. No archetype carries any of the four yet; the roster does.

---

### P5-S19-T03 — Ranged projectile, area slam, self-heal

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** `arrow` as a unit-targeted homing projectile with physical damage; `slam` as a self-centred `damage_area` circle with `displace('push')` outward; `self_heal` as a no-target self status restoring health over time, chosen only below a health fraction (a behaviour condition on the ability entry).

**Acceptance:**
- Slam pushes every unit in the circle away from the caster and stops them at walls; heal fires only below the threshold.

**Tests:**
- `tests/simulation/abilities/arrow.spec.ts`, `slam.spec.ts`, `self-heal.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-25: the ticket needed domain, for an entry's condition and a status's heal.** An enemy's ability list held bare ids, so each entry becomes an id and a condition, `always`, `health_below`, or `target_within`, checked by the selection rule alone; the slam needs the third, since a no-target ability's range is zero and it would be cast from anywhere. An enemy's stats are written once at spawn and it regenerates only in Return, so a status restores health through a new `healOverTime` field rather than a `health_regen` modifier. Both were decided with the engineering architect and are Q41.

---

### P5-S19-T04 — Summon adds and charge or leap

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** `summon_adds` as `spawn_unit` of a small enemy definition with the caster as owner, refused this cast with no cooldown spent when the live cap is reached; the adds join the caster's pack. `charge` as a named effect `charge_to` that displaces the caster itself toward the target at speed for a distance, through the movement translate step so walls stop it, then attacks.

**Acceptance:**
- At the live cap the summon is refused and its clock does not start.
- A charger closes 600 units in the table's ticks and stops at a wall.

**Tests:**
- `tests/simulation/abilities/summon-adds.spec.ts`, `charge.spec.ts`.
- `tests/domain/abilities/effects/charge-to.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Nine abilities green; pipeline diff clean of caster-kind branches | |
| Actual days per ticket | T01 0.3 · T02 0.4 · T03 0.4 · T04 |

## Risks in this sprint

- The on-deal-damage hook is a second hook. Keep it symmetrical with the on-damage hook from sprint 10; if the two diverge in shape, stop and unify.
