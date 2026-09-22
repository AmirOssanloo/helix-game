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
| Status | done |

**Build:** `StatusDef` gains `onDamageTaken` and `onDamageDealt` hook keys, each a key or null, resolved against a registry under `domain/combat/hooks/` at registry build like an effect key: one file per hook, the file name is the key, and `docs/architecture/where-to-look.md` gains the row. `applyDamage` runs the target's `onDamageTaken` hooks and the source's `onDamageDealt` hooks after mitigation, once per damage instance; damage caused by a hook runs no hooks, so a hook cannot trigger itself or ping-pong with another. The internal cooldown is a ready-at tick on the status table entry, its length a table on the definition, so a hook cannot fire every tick and the state replays. Only `onDamageTaken` has a consumer this sprint; the dealt side is exercised by the stun bash in phase 5. Hoarfrost: unit-targeted, applies the `hoarfrost` status whose hook applies a short stun and bonus magical damage on each hit, with duration, stun length, bonus damage, and internal cooldown tables by Quartz level from the catalogue. Definition file, status file, tests at levels 1 and 7.

**Acceptance:**
- A dummy under Hoarfrost hit three times inside the internal cooldown is stunned once and takes one bonus hit; three hits spaced past it stun three times.
- Hoarfrost on a lifted unit keeps counting (asserted in sprint 11 with Updraft; here with `apply_status('lift')`).
- A hook whose damage would trigger another hook does not: Hoarfrost's bonus damage on a unit under Hoarfrost fires no second hook.
- The dealt side fires for the stun bash in phase 5 with no change to `applyDamage`; here a fixture status with an `onDamageDealt` hook proves the path.

**Tests:**
- `tests/domain/combat/on-damage-hook.spec.ts`.
- `tests/simulation/spells/hoarfrost.spec.ts` — levels 1 and 7, the refusals per the adding-a-spell runbook.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-22:** the hook's target is the unit the damage landed on, not the unit on the other side of it. [Ability pipeline](../../../../docs/architecture/ability-pipeline.md) said the other side and the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md) says the holder; the catalogue is the approved one, and a hook that stunned the attacker is not the Hoarfrost the acceptance rows describe. The one rule that serves both sides is the damaged unit: the holder for a damage-taken hook, whom the holder hit for a damage-dealt one, which is what the stun bash in phase 5 wants. The architecture page and its quick reference were corrected in this ticket.
>
> **Note, 2026-09-22:** the hook registry sentence is superseded. P2-S07-T02 built a damage hook as an effect list with a cooldown table and no function key, so there is no `domain/combat/hooks/` and no row for it in `docs/architecture/where-to-look.md`; the stale row was removed in P2-S07-T03. What this ticket builds is `applyDamage` running a hook's list through the effect runner, and the Hoarfrost definitions over the shape already in `src/domain/definitions/status-def.ts`.

---

### P2-S10-T02 — Quicken and Zenith

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | P2-S08-T03 |
| Status | done |

**Build:** Quicken: no-target, self, `apply_status('quicken')` with attack speed and attack damage modifiers by Whorl and Ember level. Zenith: point, `spawn_zone` with a delay by the catalogue, then `damage_once_then_expire` with pure damage split among units in the circle, and a ground marker during the delay. Definitions, tests at levels 1 and 7, the delay resolving on empty ground with mana and cooldown already spent.

**Acceptance:**
- Quicken raises attack cadence and damage for its duration and expires; a second cast refreshes.
- Zenith with two units in the area splits the pure damage evenly and ignores armour and resistance; with none, nothing happens and the clock is running.

**Tests:**
- `tests/simulation/spells/quicken.spec.ts`, `zenith.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-22:** the `src/domain` rows were added to the line above. The ticket's layer row said domain from the start and `damage_once_then_expire` turned out to be a domain rule, so the rows belong.
>
> **Note, 2026-09-22:** `damage_once_then_expire` is no primitive and no named effect. It is a zone whose lifetime is nothing: the spawn-zone primitive already carries the delay, the marker, the shape, and the activation list, and the one thing missing was that the zone system released a zone on its expiry tick before the activation the delay had just earned could run, so a lifetime of nothing struck nobody. The system now activates and then expires on that tick, which is the rule the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) already stated and its quick reference now carries in full. Zenith needs nothing else, and the moving zone Wane wants next ticket is untouched by it.

---

### P2-S10-T03 — Siphon and Wane

| Field | Value |
| --- | --- |
| Layer | content, domain, tests |
| Size | 1 |
| Depends on | T02 |
| Status | done |

**Build:** Siphon: point, delayed zone, then a named effect `siphon_burn` that removes mana from every enemy in the circle up to a table value and deals magical damage as a fraction of mana burned; enemies have mana from their definition (the dummy has some). Wane: no-target, self, applies `wane` status setting the `aggro_hidden` flag and a self slow, and spawns an `aura_status` zone that follows the hero applying a slow to enemies within its radius; the flag is tested here, the aggro behaviour that respects it is tested in sprint 12. Adaptations per the spells page.

**Acceptance:**
- Siphon on a dummy with 100 mana at a burn of 150 removes 100 and deals damage for 100.
- Wane sets the flag for its duration, slows the hero by the table value, and slows a dummy inside the aura while the hero stands beside it.

**Tests:**
- `tests/simulation/spells/siphon.spec.ts`, `wane.spec.ts`.
- `tests/domain/abilities/effects/siphon-burn.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

> **Note, 2026-09-22:** `aura_status` is no primitive. A circle that follows the hero and puts a short status on everything inside it every tick is the spawn-zone primitive anchored on the caster with one apply-status entry in its each-tick list, which is what the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md) writes and what the zone system already carries. Wane needed no domain change at all; the first moving zone the sprint risks named turned out to be the caster-anchored one the primitive had from the start, and Updraft's travelling one is still ahead.
>
> **Note, 2026-09-22:** `siphon_burn` is the first named effect, so it is the first entry the named-effect registry holds and the first fields schema declared beside a function. A named effect's schema is built where the function is, with no orb-level cap to check a table's length against, so it checks a table's shape and the count stays the tier's; the fault it raises names the field, which a case in `tests/content/registry.spec.ts` now proves. The training dummy gained a mana pool, since a burn needs something to take and the dummy is what every spell is read off.

---

### P2-S10-T04 — Targeting previews per spell, cone frames, colours, catalogue conformance

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests |
| Size | 1 |
| Depends on | T01, T02, T03 |
| Status | done |

**Build:** Each spell definition declares its preview shape (circle radius, line length and width, cone angle and length, or a unit reticle) and the mapper's cursor draws it from the atlas under the pointer with the range ring; the cone angle Clarion needs is added to the frame list and baked now. Every spell's tint per the catalogue. A content test asserting every spell's tables have length 7 and every level from 1 to 7 produces a valid cast (ticks positive, mana non-negative) so "casts at every orb level" is checked by the tier, not by ten tests.

**Acceptance:**
- Pressing D with each of the five spells shows the right shape; the preview is red at range plus one unit.
- The cone frame is in the atlas PNG.

**Tests:**
- `tests/presentation/targeting-preview.spec.ts` extended per spell kind.
- `tests/content/spells.spec.ts` — every level valid.

**Definition of done:** Every change · Anything under `src/presentation` · A new spell, effect, or enemy ability.

> **Note, 2026-09-22:** the definitions already declared their preview shape and their tint; P2-S07-T02 wrote both from the catalogue and nothing read either. What this ticket built is the reading: the cursor draws the shape the definition names at the size it names — a reticle or a circle under the pointer, a rectangle its offset in front of the hero, a cone on it — instead of one frame at one fixed size, and both quads wear the ability's tint rather than white, which is what the catalogue means by the tint being its colour on its preview. A rectangle's length and offset are read at the hero's orb levels, so Updraft's preview grows with Whorl.
>
> **Note, 2026-09-22:** the cone is a shape the bake now knows, not a triangle wearing a cone's name. A cone frame is baked per angle in `CONE_ANGLES`, apex at the frame's centre as the catalogue says, which makes a cone's length a radius from where the quad stands: a view puts the quad on the apex, turns it to the facing, and scales it by twice the length, the same rule a circle's radius already follows. The frame is baked at 900 square, half the 1800 a 900-long cone covers, so no view scales it past two. The zone view's cone branch scaled by the length rather than twice it and drew every cone zone at half size; it was a latent fault with no user, since no zone is a cone yet, and it now follows the same rule. The atlas grew from 1024 by 1168 to 1024 by 1878, which is what the benchmark row below is for.
>
> **Note, 2026-09-22:** the frame list is content and the recorded session is stamped with the content version, so adding the cone frames moved the stamp and the replay was re-stamped with it. The session commands are moves, a tuning change, a spawn, and a kill; none reads a frame, so the log still replays and the determinism test passes.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Five spells green at levels 1 and 7; by hand in the arena against the dummy | All five are green at levels 1 and 7 in the simulation tier. Walked by the maintainer in the arena on 2026-09-22, in two sittings, every row approved: Hoarfrost, Quicken, and Zenith first, then Siphon and Wane, each behaving as its ticket describes. The five targeting previews were walked the same day and approved: the shape, the size, and the colour each definition names, and red one unit past the range |
| Render benchmark after the cone frame and the preview | Run by the maintainer on 2026-09-22, on this branch and on `ad7ba25`, and approved against the render budget with a flat heap. The four figures the row asks for — fps, render ms, draw calls, heap — were not written down, so the **Bench numbers** row of the phase 2 [exit record](./README.md#exit-record) still has nothing to carry; the phase 2 gate wants them, and the sprint 08 and 09 benchmarks are open beside it |
| Milestone M3 | Reached 2026-09-22. Five spells cast against the training dummy with damage numbers, which is the bar [the milestone table](../00-overview.md#milestones-leadership-can-hold-us-to) sets for the end of sprint 10 |
| Actual days per ticket | T01 1.0 · T02 1.0 · T03 1.0 · T04 1.0 |

## Risks in this sprint

- **R9 is retired here.** The hook is one capability with an internal cooldown; if Hoarfrost tempts a special case in `applyDamage`, stop and design the hook instead.
- Wane's aura zone that follows the hero is the first moving zone. It is also what Updraft's travel needs next sprint; make the zone's position update a rule, not a special case.
