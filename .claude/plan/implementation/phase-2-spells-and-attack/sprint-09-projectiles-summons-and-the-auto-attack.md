# Sprint 09 — Projectiles, summons, the dummy, and the auto-attack

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

The last two primitives exist, the first enemy definition stands in the arena, and the hero auto-attacks it with a homing projectile that lands with a flash and a number.

## Playable outcome

Spawn a training dummy from the panel, right-click it, and watch the hero path into range, face, fire, and repeat. A-click across it and watch the hero acquire it on the way.

---

## Tickets

### P2-S09-T01 — The projectile entity and system, the spawn-projectile primitive

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests |
| Size | 1 |
| Depends on | P2-S08-T02 |
| Status | planned |

**Build:** The projectile pool's shape finished: caster id, ability id, previous and current position, direction, speed in units per tick, radius, a homing target id or null, an on-hit effect list, a max range or lifetime, a tint. `projectileSystem` after movement: advance; a linear projectile sweeps the segment from previous to current against candidate discs from the hash's segment query and the first hit along the segment wins; a homing projectile skips the query, follows its target's current position, and tests only that disc; on hit run the on-hit effects with the hit unit as target and release; on max range or a target resolving to null, release. Events `projectile_spawned`, `projectile_hit`, `projectile_expired`. The `spawn_projectile` primitive. A `projectile.view.ts` at the projectiles band.

**Acceptance:**
- A projectile at 900 per second passes no unit between two ticks; a unit of radius 24 across the segment is hit.
- A homing projectile hits a moving target; when the target dies mid-flight the projectile expires without hitting a reused slot.
- The hundred-and-first projectile miss is counted, not grown.

**Tests:**
- `tests/domain/movement/sweep.spec.ts` — segment against discs at boundaries.
- `tests/simulation/projectiles/*.spec.ts` — linear, homing, stale target, expiry.
- `tests/presentation/projectile-view.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · Anything under `src/presentation`.

---

### P2-S09-T02 — Summons: the spawn-unit primitive, ownership, lifetime

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** The `spawn_unit` primitive acquires a unit from the unit pool with kind `summon`, the definition id of what it is (an enemy-shaped definition under `src/content/summons/`), an owner id, a lifetime in ticks, and a behaviour key. The AI module lands in phase 3; for now `domain/ai/` holds the behaviour registry with `stationary` and a `summon_follow` behaviour that idles beside its owner, moves when the owner is beyond a tunable distance, and auto-attacks the nearest enemy within its attack range using the attack code from T03. A summon expires on its lifetime or on the same tick its owner dies, in the death system's pass as an expiry that grants no experience, so owner and dependants resolve together and an enemy's adds follow the same rule in phase 5. It is a valid enemy target and cannot be selected or ordered. The ability pipeline page already states the rule (Q1).

**Acceptance:**
- A summon lives for its lifetime, follows its owner, and attacks a dummy in range.
- Owner death expires the summon on that tick, with no experience granted for the expiry.
- Hoarfrost on a summon works like on any unit (tested in sprint 10 with the real spell; here with `apply_status`).

**Tests:**
- `tests/simulation/summons/lifecycle.spec.ts`, `follow.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

> **Note, 2026-09-21:** per the catalogue the summon definition is its own kind with a follow distance, and `spawn_unit` writes the spell's bonuses as modifier rows on the summon at spawn, so the definition owns the base and the spell owns what the orbs add. Section 5 and 7.1 of `docs/product/specs/spell-catalogue.md`.

---

### P2-S09-T03 — The training dummy and the auto-attack

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, devtools, tests |
| Size | 1.5 |
| Depends on | T01 |
| Status | planned |

**Build:** `src/content/enemies/training-dummy.def.ts` with every `EnemyDef` field at neutral values, tier normal, behaviour `stationary`, an empty ability list, the clamp-at-one flag, zero experience, and a square-with-outline frame. The panel's Enemies group reads the registry for its dropdown; spawn at click or at a distance, group size, nearest free cells, refusal past the live cap. Under `src/domain/attack/` and `attackSystem`: `attack_target` paths into range (attack range plus both bound radii), faces, runs the attack point, fires a homing projectile carrying physical damage from the caster's attack damage (base plus Ember instances plus modifiers), then the backswing, repeating on the base attack time scaled by attack speed; `attack_move` walks to the point, acquires the nearest valid enemy within the acquire radius through the hash, switches to `attack_target`, and resumes the walk without backtracking when the target is lost; the attack point and the backswing cancel on move, stop, or cast, a cancelled attack point firing nothing and starting no attack clock (Q20); disarm refuses attacks; a target that becomes untargetable drops the order to idle. Idle policy: no acquire. The hero's attack numbers live in `content/hero.ts`.

**Acceptance:**
- Right-clicking the dummy from 1200 units paths to 600 plus bounds, faces, fires after 0.4 s, hits at 900 units per second, and fires again 1.7 s after the first attack point at base attack speed.
- Attack-move past the dummy acquires it within 800 and, after `clear_units`, resumes the walk without turning back.
- Three Ember instances at level 1 raise the hit by the definition's per-instance value.
- The dummy at 1 health takes a 100-damage hit and shows 100 in the event, staying at 1.

**Tests:**
- `tests/simulation/attack/attack-target.spec.ts`, `attack-move.spec.ts`, `backswing.spec.ts`, `disarm.spec.ts`.
- `tests/content/enemies.spec.ts` — the dummy validates.
- `tests/simulation/dev-api.spec.ts` extended with spawn by archetype.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A new enemy or behaviour (the dropdown row) · A developer-panel control.

> **Note, 2026-09-22:** the clamp-at-one flag is `indestructible` on `EnemyDef`, built in sprint 07 with the damage door that reads it. The damage rule and the death system read the unit, not the definition, so the spawn this ticket builds writes the definition's health, armour, magic resistance, and that flag onto the unit it acquires. A unit spawned with no maximum health is never taken by the death system, which is what keeps the panel's plain stress bodies standing.

---

### P2-S09-T04 — Hit feedback from events: flashes and floating numbers

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** The play scene's event drain reacts to `unit_damaged` with a fill-mode white tint on the unit's view for a tunable number of frames (the end is a frame count read from a tunable, not a timer the view owns) and a floating `BitmapText` number from a pool at the impact point that rises and fades over a tunable duration; when the pool is full the oldest is recycled early. `cast_committed` and `command_refused` events drive the HUD square reactions already built. Numbers are white.

**Acceptance:**
- A hit flashes and spawns a number; two hundred hits in one second recycle numbers without a pool miss being treated as growth.
- Pausing the driver freezes the flash and the number mid-rise (they advance on ticks, not frames, via the interpolation fraction).

**Tests:**
- `tests/presentation/floating-number.spec.ts` — pool recycle, rise from the event.

**Definition of done:** Every change · Anything under `src/presentation`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Auto-attack cadence matches the spec's numbers in tests | |
| Dummy spawns from the registry-driven dropdown | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **R12 is closed here** by editing the architecture page. Do it in T02, not later.
- Attack speed composition (agility, Whorl, later Quicken) is a modifier-stack stat like movement speed. Do not compute it inside the attack system.
