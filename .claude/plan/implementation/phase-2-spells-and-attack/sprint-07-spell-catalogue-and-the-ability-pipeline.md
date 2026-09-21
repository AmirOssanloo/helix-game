# Sprint 07 — Spell catalogue, definition schemas, the registry, and the pipeline

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

The ten spells are specified as data before any is built, every definition kind has a schema the registry validates, and the cast pipeline is the real one.

## Playable outcome

The game plays exactly as at the end of phase 1. Under the hood, every stub now passes through the general pipeline and the registry, and `pnpm test tests/content/` runs a real content tier.

---

## Tickets

### P2-S07-T01 — The spell catalogue

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Status | done |

**Build:** `docs/product/specs/spell-catalogue.md`, the document the roadmap lists as arriving with phase 2. For each of the ten spells: the recipe, targeting kind, cast point, backswing, cast range, cooldown and mana by orb level, adapted where the spells page says so, the effect list written as primitives and named effects with parameters, the statuses it applies with durations by level, the zone or projectile shape and speed, the atlas frames and cone angles it needs, and the tint. A closing section lists every primitive parameter and every named effect the ten spells need, and every status-definition capability they need (the damage-taken hook for Hoarfrost, the untargetable flag for lift, the aggro-hidden flag for Wane, an aura slow for Wane and Glacier). Numbers live in the definition files.

**Acceptance:**
- Every spell is expressible as the primitive set plus at most one named effect; the closing section is the shopping list for sprints 08 to 11.
- The product owner has approved the shape: the effect lists, the primitives, and the capability list. That approval is what T02 waits on (Q10).
- The numbers are recorded as starting values. They are changed later through the tuning surface at no code cost, so they never block T02.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

---

### P2-S07-T02 — Definition types, schemas, the registry, and the content tier

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** Under `domain/definitions/`: `SpellDef` and `AbilityDef` (the same shape, `recipe` present only on the spell), `StatusDef` (blocks, modifiers, stack rule, duration, `onDamageTaken` and `onDamageDealt` hook keys each a key or `null` with an internal cooldown table, flags), `EnemyDef` (fields from the enemies page, all required), `MapDef` finished, the effect entry union (`damage_area`, `apply_status`, `spawn_projectile`, `spawn_zone`, `spawn_unit`, `displace`, `named`), and a schema for each as a runtime validator with no dependency. `src/content/index.ts` assembles every definition of every kind into one registry, validates each against its schema, resolves every effect key against `domain/abilities/effects/index.ts` and every behaviour key against `domain/ai/behaviours/index.ts` (both exist with the empty and `stationary` entries), checks every referenced id exists, every level table has length 7, every `atlasFrame` is in the frame list, and no two definitions share an id; converts seconds to ticks and degrees to radians once; computes the content version stamp; fails loudly. `createWorld` receives the registry; the phase 1 seconds-to-ticks shim is deleted. Every phase 1 stub definition rewritten to the real `SpellDef` shape from the catalogue with empty effect lists for now.

**Acceptance:**
- A typo in an effect key fails the content tier with the file and the key named.
- A table of length 6 fails; a frame not in the list fails; a duplicate id fails.
- No tick count and no radian exists under `src/content/`.

**Tests:**
- `tests/content/registry.spec.ts` — schema, keys, ids, table lengths, frames, uniqueness, each with a deliberately broken fixture definition.
- `tests/content/spells.spec.ts`, `statuses.spec.ts`, `maps.spec.ts` — every real definition validates.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-21:** the catalogue settled the shape this ticket builds, and it differs from the sketch above in four places: a status definition has no duration, the applier gives one; every level table on a spell or a status names the orb that indexes it, and a status entry snapshots the three orb levels at application; `spawn_zone` carries an activation list and an each-tick list of effects rather than a rule key; and `SpellDef` gains a `preview`, `EnemyDef` gains mana, and a summon definition kind with a follow distance is added. Section 7 of `docs/product/specs/spell-catalogue.md` is the shape.

---

### P2-S07-T03 — The pipeline: stages, targeting kinds, the effect runner, refusals

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1.5 |
| Depends on | T02 |
| Status | planned |

**Build:** Replace the phase 1 cast skeleton under `src/domain/abilities/` with the pipeline the ability pipeline page describes, for any caster: request, validate (disable flags, clock, mana, range at commit), face, cast point, commit (mana, clock with snapshotted CDR, then the effect list in order), backswing. Targeting kinds none, point, unit, direction, each committing on the tick that sees its command. The effect runner dispatches each entry to a primitive or a named effect from the registry with a `Cast` context (caster id, definition, orb levels at commit, target payload, world). Unit-target cancels at no cost if the target dies during the cast point; range is checked at commit only; out of range paths toward the target and casts on arrival; rooted casters are refused out-of-range targets. Two casts in one tick apply in key order, the second waiting for the first cast point. Named effects registry under `domain/abilities/effects/` with `index.ts` mapping key to function. Every phase 1 acceptance test stays green.

**Acceptance:**
- Each targeting kind commits at the right moment; cast point delays the effect; cooldown starts at commit; mana is refused before the cast point.
- A named effect that reads nothing but the cast context and the world is the only kind possible (the signature enforces it).
- The phase 1 suite is unchanged and green.

**Tests:**
- `tests/simulation/pipeline/targeting.spec.ts` — one per kind.
- `tests/simulation/pipeline/refusals.spec.ts` — one per reason: mana, cooldown, each disable, target dead, rooted out of range.
- `tests/simulation/pipeline/ordering.spec.ts` — two casts in one tick.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

---

### P2-S07-T04 — Damage types, mitigation, and death resolution

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** Under `src/domain/combat/`: `applyDamage(world, targetId, amount, type, sourceId)` with physical reduced by armour, magical by magic resistance, pure by nothing, the formulas as tunables per the hero page, a `unit_damaged` event with the post-mitigation amount and the type, and health clamped at zero; the training dummy's clamp-at-one rule as a definition flag, not a special case in the formula. `deathSystem` registered at the end of the tick: every unit at zero health emits one `unit_died` event, clears its status table, and is released after a tunable delay (the hero goes through its death state instead). The `apply_damage` debug command now goes through `applyDamage`.

**Acceptance:**
- Mitigation at boundaries per damage type from a table (armour 0, 5, 20; resistance 0, 0.25, 0.75).
- Two lethal hits in one tick produce one death event.
- Death clears statuses and releases the slot after the delay; a projectile in flight at the dead unit resolves to null and lands on nothing.

**Tests:**
- `tests/domain/combat/mitigation.spec.ts` — every row.
- `tests/simulation/combat/death.spec.ts` — one event per death, delayed release, stale id.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Spell catalogue approved | Written 2026-09-21 as `docs/product/specs/spell-catalogue.md`; the shape waits on the product owner, recorded under Waiting on a person in STATUS.md |
| Content tier green; every phase 1 test green through the new pipeline | |
| Actual days per ticket | T01 0.5 · T02 · T03 · T04 |

## Risks in this sprint

- **R7 is retired here** if T01 and T02 land before any effect is written. If the catalogue takes longer than a day because numbers need discussion, the discussion happens outside the sprint and T02 waits; do not build the schema against a draft.
- T03 replaces working code. Keep the phase 1 acceptance suite running on every commit of it.
