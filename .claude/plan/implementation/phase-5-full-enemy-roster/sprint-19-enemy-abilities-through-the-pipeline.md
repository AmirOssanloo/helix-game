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

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. The brute's bash stunned the hero 0.8 s, then not again for 4.8 s, and greyed all six squares with the stun icon over the hero; the frost raider's swing slowed the walk with no square greyed; the hexer's curse silenced 2.5 s and greyed all six while the hero walked; the trapper's net rooted 1.5 s with no square greyed. A over the brute and F over the frost raider showed for life. Q40's icon answered: keep.

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

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. The skirmisher's arrow homed on the walking hero and hit; the crusher slammed only once the hero was within 250 (cast at 248) and knocked the hero and an Emberling straight away; the troll did not heal at full and cast its heal below half. A Hoarfrost stun landing inside the crusher's slam wind-up cancelled it and nothing landed; it slammed again after the stun.

---

### P5-S19-T04 — Summon adds and charge or leap

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** `summon_adds` as `spawn_unit` of a small enemy definition with the caster as owner, refused this cast with no cooldown spent when the live cap is reached; the adds join the caster's pack. `charge` as a named effect `charge_to` that displaces the caster itself toward the target at speed for a distance, through the movement translate step so walls stop it, then attacks.

**Acceptance:**
- At the live cap the summon is refused and its clock does not start.
- A charger closes 600 units in the table's ticks and stops at a wall.

**Tests:**
- `tests/simulation/abilities/summon-adds.spec.ts`, `charge.spec.ts`.
- `tests/domain/abilities/effects/charge-to.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-25: the adds are enemies, and a push now stops its unit walking on the tick it lands.** `spawn_unit` acquired every unit as a summon, on the hero's side, so a spawned unit's kind now follows its definition: an archetype spawns an enemy in the caster's pack that counts against the live cap, and ends with its owner or lifetime by the summons' rule; the entry's `summonId` is `unitId`. The cap is checked on what the cast's own list spawns, at request and at commit, and the content tier refuses an archetype in a nested list. The small definition is a new archetype, `imp`, worth no experience. A charge committed mid-tick walked its caster one step before its status's flag was raised, so the movement step also leaves alone a unit a push has hold of; no replay number moved. Decided with the engineering architect; Q42. The arena walk waits on a person.

**Walked, 2026-09-25, by the delivery lead on the maintainer's delegation**, in Chrome on the Apple M1 laptop against `pnpm dev`, the simulation advanced by the panel's single step because the tab reported itself hidden; frame rate, render time, draw calls, and the bench need a visible window and wait for the hardware sitting in STATUS.md. The summoner brought two violet imps of 120 health; an imp killed granted no experience; the summoner killed took its remaining imp with one death announced; at 200 enemies it shot instead of summoning. A summoner that casts before turning lays its imps on its far side, first cast only, in Deferred. The lancer's charge showed its status, stopped against the hero, and swung; into a wall it stopped at the wall edge. The bench after the `icon_charge` frame waits for the hardware sitting. Q42 answered as decided.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Nine abilities green; pipeline diff clean of caster-kind branches | Green, 2026-09-25: the nine specs under `tests/simulation/abilities/` pass, `bash`, `frost-attack`, `silence-curse`, `root-net`, `arrow`, `slam`, `self-heal`, `summon-adds`, and `charge`, with `tests/domain/abilities/effects/charge-to.spec.ts`. `git diff 5e15106 -- src/domain/abilities` adds no branch on the caster's kind: the two kind reads added are the spawned definition's, in `spawn-unit.ts`. The arena walk of all nine waits on a person, deferred until phase 5 is done |
| Actual days per ticket | T01 0.3 · T02 0.4 · T03 0.4 · T04 0.5. Sized 4, done in 1.6 |

## Risks in this sprint

- The on-deal-damage hook is a second hook. Keep it symmetrical with the on-damage hook from sprint 10; if the two diverge in shape, stop and unify.
