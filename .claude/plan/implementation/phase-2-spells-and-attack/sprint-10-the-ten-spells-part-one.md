# Sprint 10 — The ten spells, part one

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

Five spells built mostly from primitives, plus the on-damage status hook and every spell's targeting preview, so the pipeline is proven by simple cases before the hard named effects.

## Playable outcome

Hoarfrost, Quicken, Zenith, Siphon, and Wane cast against the dummy with previews, numbers, and icons. Milestone M3.

---

## Tickets

### P2-S10-T01 — The on-damage status hook and Hoarfrost

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | P2-S08-T01, P2-S09-T04 |
| Status | planned |

**Build:** `StatusDef` gains an `onDamage` key or null, resolved against a small registry under `domain/combat/hooks/` at registry build like an effect key. `applyDamage` runs the target's active statuses' hooks after mitigation, with a per-status internal cooldown stored on the table entry so a hook cannot fire every tick. Hoarfrost: unit-targeted, applies the `hoarfrost` status whose hook applies a short stun and bonus magical damage on each hit, with duration, stun length, bonus damage, and internal cooldown tables by Quartz level from the catalogue. Definition file, status file, tests at levels 1 and 7.

**Acceptance:**
- A dummy under Hoarfrost hit three times inside the internal cooldown is stunned once and takes one bonus hit; three hits spaced past it stun three times.
- Hoarfrost on a lifted unit keeps counting (asserted in sprint 11 with Updraft; here with `apply_status('lift')`).
- The hook fires for the stun bash in phase 5 with no change to `applyDamage` (a design note in the code, tested then).

**Tests:**
- `tests/domain/combat/on-damage-hook.spec.ts`.
- `tests/simulation/spells/hoarfrost.spec.ts` — levels 1 and 7, the refusals per the adding-a-spell runbook.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

### P2-S10-T02 — Quicken and Zenith

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | P2-S08-T03 |
| Status | planned |

**Build:** Quicken: no-target, self, `apply_status('quicken')` with attack speed and attack damage modifiers by Whorl and Ember level. Zenith: point, `spawn_zone` with a delay by the catalogue, then `damage_once_then_expire` with pure damage split among units in the circle, and a ground marker during the delay. Definitions, tests at levels 1 and 7, the delay resolving on empty ground with mana and cooldown already spent.

**Acceptance:**
- Quicken raises attack cadence and damage for its duration and expires; a second cast refreshes.
- Zenith with two units in the area splits the pure damage evenly and ignores armour and resistance; with none, nothing happens and the clock is running.

**Tests:**
- `tests/simulation/spells/quicken.spec.ts`, `zenith.spec.ts`.

**Definition of done:** Every change · A new spell, effect, or enemy ability.

---

### P2-S10-T03 — Siphon and Wane

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** Siphon: point, delayed zone, then a named effect `siphon_burn` that removes mana from every enemy in the circle up to a table value and deals magical damage as a fraction of mana burned; enemies have mana from their definition (the dummy has some). Wane: no-target, self, applies `wane` status setting the `aggro_hidden` flag and a self slow, and spawns an `aura_status` zone that follows the hero applying a slow to enemies within its radius; the flag is tested here, the aggro behaviour that respects it is tested in sprint 12. Adaptations per the spells page.

**Acceptance:**
- Siphon on a dummy with 100 mana at a burn of 150 removes 100 and deals damage for 100.
- Wane sets the flag for its duration, slows the hero by the table value, and slows a dummy inside the aura while the hero stands beside it.

**Tests:**
- `tests/simulation/spells/siphon.spec.ts`, `wane.spec.ts`.
- `tests/domain/abilities/effects/siphon-burn.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

### P2-S10-T04 — Targeting previews per spell, cone frames, colours, catalogue conformance

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests |
| Size | 1 |
| Depends on | T01, T02, T03 |
| Status | planned |

**Build:** Each spell definition declares its preview shape (circle radius, line length and width, cone angle and length, or a unit reticle) and the mapper's cursor draws it from the atlas under the pointer with the range ring; the cone angle Clarion needs is added to the frame list and baked now. Every spell's tint per the catalogue. A content test asserting every spell's tables have length 7 and every level from 1 to 7 produces a valid cast (ticks positive, mana non-negative) so "casts at every orb level" is checked by the tier, not by ten tests.

**Acceptance:**
- Pressing D with each of the five spells shows the right shape; the preview is red at range plus one unit.
- The cone frame is in the atlas PNG.

**Tests:**
- `tests/presentation/targeting-preview.spec.ts` extended per spell kind.
- `tests/content/spells.spec.ts` — every level valid.

**Definition of done:** Every change · Anything under `src/presentation` · A new spell, effect, or enemy ability.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Five spells green at levels 1 and 7; by hand in the arena against the dummy | |
| Milestone M3 | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **R9 is retired here.** The hook is one capability with an internal cooldown; if Hoarfrost tempts a special case in `applyDamage`, stop and design the hook instead.
- Wane's aura zone that follows the hero is the first moving zone. It is also what Updraft's travel needs next sprint; make the zone's position update a rule, not a special case.
