# Sprint 11 — The ten spells, part two, and the phase gate

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

The three hard named effects and the two remaining spells, then the phase 2 gate with twenty concurrent zones within budget.

## Playable outcome

All ten spells against the dummy. Glacier segments, a travelling updraft that lifts, a rolling meteor that burns, a cone that pushes and disarms, a emberling that fights. Milestone M4.

---

## Tickets

### P2-S11-T01 — Glacier and Updraft

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1.5 |
| Depends on | P2-S10-T04 |
| Status | planned |

**Build:** Glacier: point, named effect `glacier_place` spawning N wall-segment zones in a line perpendicular to the cast direction at a distance in front of the hero, each an `aura_status` zone applying a heavy slow and a damage-over-time status, with count, spacing, duration, slow, and damage by Quartz and Ember level; wall segments block nothing (the walkability grid is static). Updraft: point, named effect `updraft_launch` spawning a `travel_line` zone that moves along the cast direction at a speed for a distance, and on first contact with each enemy applies `displace('lift')` for a duration by Whorl and Quartz level, carrying the lifted unit with the zone, then drops it with magical damage; lifted units are stunned and untargetable; Hoarfrost keeps counting while lifted; a rooted unit dropped where the updraft leaves it. Definitions, the two named effects, the zone rules they need, tests at levels 1 and 7.

**Acceptance:**
- Glacier places its segments perpendicular to facing; a dummy inside a segment's aura is slowed and burning and recovers after leaving plus the duration.
- Updraft lifts a dummy it passes, carries it, drops it after the duration with damage; a second dummy behind the first is lifted when the zone reaches it; a lifted dummy cannot be hit by a projectile.

**Tests:**
- `tests/domain/abilities/effects/glacier-place.spec.ts`, `updraft-launch.spec.ts`.
- `tests/simulation/spells/glacier.spec.ts`, `updraft.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

### P2-S11-T02 — Bolide and Clarion

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** Bolide: point, named effect `meteor_launch` spawning a delayed zone that, on landing, becomes a `travel_line` zone rolling along the cast direction for a distance, dealing magical damage each tick to units in contact and applying a `burn` damage-over-time status, by Ember and Whorl level. Clarion: point (cone), `damage_area` in the cone frame's angle, `displace('push')` along the cone direction, and `apply_status('disarm')`, all by all three levels. Definitions, tests at levels 1 and 7, the push stopping at an obstacle edge.

**Acceptance:**
- Bolide lands after its delay, rolls its distance, damages a dummy each tick of contact, and leaves it burning.
- Blast hits a dummy inside the cone and not one outside, pushes it the table distance, and disarms it; a dummy against a wall does not enter the wall.

**Tests:**
- `tests/domain/abilities/effects/meteor-launch.spec.ts`.
- `tests/simulation/spells/bolide.spec.ts`, `clarion.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

### P2-S11-T03 — Emberling

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | P2-S09-T02 |
| Status | planned |

**Build:** Emberling: no-target, self, `spawn_unit` of the `emberling` summon definition beside the hero with a lifetime, attack damage, and health by Ember and Quartz level, behaviour `summon_follow`. A summon definition file under `src/content/summons/` with a small-disc frame in dimmed hero white.

**Acceptance:**
- The spirit spawns beside the hero, follows, attacks a dummy in range with physical damage, expires on its timer and on hero death; it cannot be selected or ordered.

**Tests:**
- `tests/simulation/spells/emberling.spec.ts`.

**Definition of done:** Every change · A new spell, effect, or enemy ability.

---

### P2-S11-T04 — The phase 2 gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | T01, T02, T03 |
| Status | planned |

**Build:** `tests/simulation/stress-zones.spec.ts`: twenty concurrent zones and effects (a mix of walls, bolides, updrafts, and Zeniths) with 100 projectiles and one dummy, asserting the tick under budget. Rerun the bench (views changed this phase: zones, projectiles, icons, numbers). Record a session throwing all ten spells and replay it. Walk every row of the [phase 2 gate](../04-phase-exit-gates.md#phase-2-gate) and record evidence. Docs sync: world model rows for zones, projectiles, summons as kinds and the new definition kinds; where-to-look pointers run; the spells page updated if any behaviour differs from what it says. Replay tests for gate bugs. Fill the phase README's exit record and sized-versus-actual.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** `stress-zones.spec.ts`, plus any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Ten spells green at levels 1 and 7; twenty-zone stress test green | |
| Bench numbers after this phase's views | |
| Milestone M4 | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **R8 lives here.** Updraft carrying units is the hardest thing in the phase. If T01 runs past 1.5 days, T04's gate day is the buffer and the gate slides into the following week; do not cut Updraft's carry to make the date.
- After this sprint the ratio of actual to sized days across phases 1 and 2 is known. If it is over 1.3, re-cut phases 3 to 5 before starting sprint 12.
