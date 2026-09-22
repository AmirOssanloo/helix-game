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

> **Note, 2026-09-21:** the product owner approved the shape as written: the effect lists of section 3, the statuses of section 4, and the primitives, named effects, and capabilities of section 7, including the three calls flagged for review. Q10 is closed. T02 was built against this shape and needs no change.

> **Note, 2026-09-22:** one line of that approval is withdrawn. Section 3.5 had Updraft's funnel carry the units it lifts and drop them where it left them; the maintainer walked it in the arena on 2026-09-22 and reversed it — a unit carried the length of the funnel's travel leaves the screen and reads as a knockback. Updraft lifts in place and the unit comes down where it stood. The catalogue is rewritten in P2-S11-T06. Nothing else in sections 3, 4, or 7 moves, and the shape the approval was about — the effect lists, the primitives, and the capabilities — is untouched: the change is which of them Updraft's named effect does.

---

### P2-S07-T02 — Definition types, schemas, the registry, and the content tier

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

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
>
> **Note, 2026-09-21, on closing:** built against the catalogue as written, on the maintainer's instruction to pick up the next ticket, while the approval box in STATUS.md stays open; a change to the shape reopens the schemas here, which are data-shaped and cheap to move. Seven things the build decided or found: (1) content may import domain types only, so the validator lives in `src/domain/definitions/validate-registry.ts` beside the schemas, `src/content/index.ts` only assembles, and the composition root and the content test each run the validator; (2) there is no phase 1 seconds-to-ticks shim to delete: the run-scope record builders under `src/domain/definitions/` are the one conversion, run at world creation, and the registry stays in the designer's units so the tuning surface and the content stamp read what a designer wrote; (3) a damage hook is an effect list with a cooldown table and no function key, since the list is the whole behaviour, so `domain/combat/hooks/` is not built and the pipeline page, the vocabulary, and the catalogue's hook wording say so; (4) the fourteen status definitions the catalogue lists arrive here as data, since `statuses.spec.ts` is in this ticket's test list, and sprint 08 T01 builds the system over them; (5) the frames the catalogue calls new exist in the list now, `cone_60` drawn as the triangle until a cone painter arrives and every `icon_*` as the plain icon until sprint 08 T04 gives each a glyph, so no definition renames later; (6) the named-effect registry entry carries the schema of its fields beside the function, and the effects registry is empty until the first bespoke effect in sprint 10; (7) the recorded phase 1 replay was re-stamped from `aabbe4b2` to `a2b0b595`, since the registry gained six kinds and the spell numbers changed, and its commands (move, set_tuning, spawn_units, kill_hero) touch nothing that changed. The render benchmark was not rerun for the thirteen new frames; no view changed.

---

### P2-S07-T03 — The pipeline: stages, targeting kinds, the effect runner, refusals

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1.5 |
| Depends on | T02 |
| Status | done |

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

> **Note, 2026-09-22, on closing:** the phase 1 skeleton was already the pipeline this ticket describes, bar one piece. Sprint 05 built the stages, the four targeting kinds, the refusals, the approach, and the cancels; what was missing was the effect runner and the context it hands an effect, and that is what was built, with the test suite the ticket names. Eleven things the build decided or found: (1) `runEffects` in `src/domain/abilities/effect-runner.ts` walks a list in order and hands each entry to the primitive its kind names or the function its key names, and the same runner is what a zone's lists, a projectile's hit list, and a status hook's list will call, so an effect never learns which of them ran it; (2) the primitive table is `src/domain/abilities/primitives/index.ts`, keyed by the entry kind, and every entry is `null` until sprint 08 T02, T03, and sprint 09 register one, an unregistered kind being a broken invariant of the runner; (3) a content-tier check refusing an entry that names an unregistered primitive was built and then reverted, because T02's fourteen status definitions already carry real effect lists and those lists are correct data the status system will run, so "no runner yet" is the plan's business and not a content fault; (4) a named effect takes a third argument, the validated fields of the entry that named it, since a two-argument function could not read the fields the catalogue's section 7.2 gives all three of them, and the pipeline page's sample, the adding-a-spell runbook, and that sentence say so; (5) the cast context is a record filled in place from module scratch, with the orb levels copied at commit, so a level raised afterwards does not change what landed and a commit allocates nothing; (6) "range is checked at commit only" is read as the pipeline page reads it: the request stage refuses for range only while rooted, and range decides when the cast point may begin, so a commit is always in range, and a target that walks out of range during the cast point does not cancel, because the page lists what cancels and range is not on it; (7) "the second waiting for the first cast point" is not what the page says and was not built: a second cast replaces the first, which had spent nothing, one order at a time and never a queue, and `ordering.spec.ts` covers key order through two slot keys pressed in one tick instead; (8) `activeFormOf` returned the hero's first form record for any unit, so a non-hero caster read the hero's orb levels and kit; it is guarded on the hero now, and nothing else depended on it; (9) the pipeline is caster-agnostic except `holdsAbility`, which can only read a form's kit, so an enemy cast is still refused `ability_not_held`: run scope holds no archetype table and the first enemy cast in phase 3 adds the lookup; (10) the runner's dispatch has no test of its own, since both registries are empty and their tables have no seam, so nothing observable runs through it; the first primitive in sprint 08 T02 is what tests it, and the context has its own unit spec at `tests/domain/abilities/cast-context.spec.ts`; (11) `tests/simulation/cast-skeleton.spec.ts` is deleted and its cases live under `tests/simulation/pipeline/`, in the three files the ticket names plus `stages.spec.ts` for the stage timeline and what a commit reads, which is neither targeting, a refusal, nor ordering. Two stale things were fixed on the way: `docs/architecture/where-to-look.md` still named `src/domain/combat/hooks/`, which T02 decided not to build, so the row is gone with a note on the sprint 10 ticket that asks for it and an amendment on Q3; and Q24 is raised, that "effect" names both the visual pool entity and an entry of an ability's effect list.

---

### P2-S07-T04 — Damage types, mitigation, and death resolution

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | done |

**Build:** Under `src/domain/combat/`: `applyDamage(world, targetId, amount, type, sourceId)` with physical reduced by armour, magical by magic resistance, pure by nothing, the formulas as tunables per the hero page, a `unit_damaged` event with the post-mitigation amount and the type, and health clamped at zero; the training dummy's clamp-at-one rule as a definition flag, not a special case in the formula. `deathSystem` registered at the end of the tick: every unit at zero health emits one `unit_died` event, clears its status table, and is released after a tunable delay (the hero goes through its death state instead). The `apply_damage` debug command now goes through `applyDamage`.

**Acceptance:**
- Mitigation at boundaries per damage type from a table (armour 0, 5, 20; resistance 0, 0.25, 0.75).
- Two lethal hits in one tick produce one death event.
- Death clears statuses and releases the slot after the delay; a projectile in flight at the dead unit resolves to null and lands on nothing.

**Tests:**
- `tests/domain/combat/mitigation.spec.ts` — every row.
- `tests/simulation/combat/death.spec.ts` — one event per death, delayed release, stale id.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

> **Note, 2026-09-22, on closing:** built as written, with the damage door, the two events, the general death system, and the two specs the ticket names. Nine things the build decided or found: (1) `applyDamage` in `src/domain/combat/damage.ts` is the one door, and `mitigate` beside it is the pure rule it calls, a function over an amount, a type, a unit's stats, and the armour constant, so the table in `tests/domain/combat/mitigation.spec.ts` needs no world; (2) the armour formula is the source game's curve, `constant * armour / (1 + constant * |armour|)` off the hit, with `armour_constant` a new tunable at 0.06, so each point is worth less than the one before it, no amount reaches immunity, and negative armour adds what it would have taken; magic resistance needs no constant, being a fraction of one already, and every type's result stops at zero so mitigation never heals; (3) the panel's damage derives the hero's stats first, as its heal and its restore already did, since the stats system has not run when a command applies and mitigation must read this tick's armour; (4) the clamp-at-one rule is `indestructible` on `EnemyDef` and on the unit, written from the definition when a unit is spawned from one, which is sprint 09's spawn to do; the damage door reads the unit, since the world holds no table of enemy definitions to resolve a definition id through; (5) the event ring's one shape gains four fields, `unitId`, `sourceId`, `amount`, and `damageType`, and `unit_damaged` carries what landed after mitigation even where the health it removed was less, which is the number the enemies page says the dummy shows; (6) the death system now runs over every unit, but only over one with a health pool: a plain body the panel spawns for the stress test carries no maximum health and is not taken for dead, so 300 of them still stand; a unit spawned from a definition carries its definition's health and dies; (7) death announces once, clears the table, and writes the tick it is due on, the hero's from `respawn_delay` and every other unit's from `corpse_delay`, a new tunable at one second; the hero respawns on that tick and every other unit is released, so an id held across it resolves to nothing; (8) damage to a unit already dead lands nothing and announces nothing, while two lethal hits in one tick both land and make one death, because death is resolved at the end of the tick and not in the damage door; (9) the developer panel's Readouts group gains **Last damage** and **Deaths**, drained from the event ring with the cursor it already keeps, so the two new events have a reader as the definition of done asks and the panel's Apply damage button shows what mitigation left of it; the presentation's hit flashes and damage numbers over the same event arrive in sprint 09. The recorded phase 1 replay was re-stamped from `a2b0b595` to `d7d73b03` for the two new tunables; its commands touch nothing that changed. A `spawnUnit` test helper was added beside `spawnHero` for a unit that is not the hero, and sprint 09's dummy ticket carries a note that a spawn writes the health and the flag onto the unit.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Spell catalogue approved | Written 2026-09-21 as `docs/product/specs/spell-catalogue.md`; the shape approved by the product owner as written, 2026-09-21 |
| Content tier green; every phase 1 test green through the new pipeline | `pnpm check` green on 2026-09-22: lint, typecheck, build, and 1635 tests in 84 files, the content tier at 139 and the simulation tier at 324, the phase 1 acceptance specs and the replay determinism test among them |
| Actual days per ticket | T01 0.5 · T02 1 · T03 0.5 · T04 0.5 |

## Risks in this sprint

- **R7 is retired here** if T01 and T02 land before any effect is written. If the catalogue takes longer than a day because numbers need discussion, the discussion happens outside the sprint and T02 waits; do not build the schema against a draft.
- T03 replaces working code. Keep the phase 1 acceptance suite running on every commit of it.
