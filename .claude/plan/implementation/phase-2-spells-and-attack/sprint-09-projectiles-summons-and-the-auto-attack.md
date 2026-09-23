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
| Status | done |

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

> **Note, 2026-09-22:** five things came out differently and the ticket stands as edited here. The projectile holds the ability itself, whose id names it, and the three orb levels the cast snapshotted, exactly as the zone does, because its hit list runs through the same cast context and every table in it must be read at the levels the caster committed with. Its heading and speed are a facing and world units per tick; there is no lifetime beside the max range, since the max range is the only limit content writes and a field nothing ever sets is a branch nothing ever takes. A homing entry the cast aimed at no unit fires nothing rather than quietly becoming a line shot, which is a rule the ability pipeline page now states. An expiry for a dead target lands on the first tick after the death, because the projectile pass runs before the death pass so that a hit is counted on the tick it landed. And the segment sweep is `src/domain/movement/sweep.ts`, a pure disc-against-disc rule the spatial hash's candidates are tested with.
>
> Two things beside the build: the placeholder case in `tests/simulation/combat/death.spec.ts` that stood in for a projectile system was removed, since `tests/simulation/projectiles/stale-target.spec.ts` now owns what it asserted; and the panel gained a **Last projectile** readout, so the three new events are drained by something, per the definition of done's rule that an event nobody reads is removed. The developer-panel page lists it.

---

### P2-S09-T02 — Summons: the spawn-unit primitive, ownership, lifetime

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** The `spawn_unit` primitive acquires a unit from the unit pool with kind `summon`, the definition id of what it is (an enemy-shaped definition under `src/content/summons/`), an owner id, a lifetime in ticks, and a behaviour key. The AI module lands in phase 3; for now `domain/ai/` holds the behaviour registry with `stationary` and a `summon_follow` behaviour that idles beside its owner and walks back when the owner is beyond the distance its definition gives, plus the pass that runs a unit's behaviour each tick. The acquire and the attack are T03's, with the attack code. A summon expires on its lifetime or on the same tick its owner dies, in the death system's pass as an expiry that grants no experience, so owner and dependants resolve together and an enemy's adds follow the same rule in phase 5. It is a valid enemy target and cannot be selected or ordered. The ability pipeline page already states the rule (Q1).

**Acceptance:**
- A summon lives for its lifetime and follows its owner. Attacking a dummy in range moved to T03 with the attack code and the dummy, per the note below.
- Owner death expires the summon on that tick, with no experience granted for the expiry.
- Hoarfrost on a summon works like on any unit (tested in sprint 10 with the real spell; here with `apply_status`).

**Tests:**
- `tests/simulation/summons/lifecycle.spec.ts`, `follow.spec.ts`.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

> **Note, 2026-09-21:** per the catalogue the summon definition is its own kind with a follow distance, and `spawn_unit` writes the spell's bonuses as modifier rows on the summon at spawn, so the definition owns the base and the spell owns what the orbs add. Section 5 and 7.1 of `docs/product/specs/spell-catalogue.md`.
>
> **Note, 2026-09-22:** four things came out differently and the ticket stands as edited here.
>
> The acquire-and-attack half of `summon_follow` moved to T03, which owns the attack system, the acquire radius, and the dummy to attack. A behaviour issues orders and runs none of them; an `attack_target` order with no attack system behind it would only make the summon stand still beside what it meant to hit, which is worse than not acquiring at all. What this ticket built of the behaviour is the follow: it holds its ground inside its definition's follow distance and walks to the near side of that ring once its owner has left it behind, one order per walk rather than a fresh one every tick, and a root keeps it where it stands.
>
> Something has to run a behaviour, so the pass is `aiSystem` under `src/domain/ai/`, registered after the cast stages and before pathing, so an order a behaviour issues is planned and walked on the tick it was issued. The ability pipeline page states where it sits and what a behaviour may do.
>
> A summon expires with no event of its own. An expiry is not a death, and the definition of done removes an event nobody reads, so the release is silent and the spec asserts the slot is back and that no `unit_died` names the summon, which is what "grants no experience" comes to while nothing grants any.
>
> Run scope gained a unit table, `src/domain/definitions/unit-state.ts`: every archetype and every summon by id with its rates in ticks, since the world holds no registry and a spawn must find the definition it names. The spawn itself is `src/domain/entities/unit-spawn.ts` — the body and the seven derived values from a definition, with the modifier rows written between the two — and T03's dummy spawn uses it as it is.
>
> One thing the ticket did not ask for and did not get: the movement system still reads `base_ms` and `turn_rate_T` for every unit, so a definition's `movementSpeed` and `turnRate` are written by content and read by nothing, and the summon follows at the hero's base speed. In [Deferred](../backlog/deferred.md), waiting on the AI module in sprint 12.

---

### P2-S09-T03 — The training dummy and the auto-attack

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, devtools, tests |
| Size | 1.5 |
| Depends on | T01, T02 |
| Status | done |

**Build:** `src/content/enemies/training-dummy.def.ts` with every `EnemyDef` field at neutral values, tier normal, behaviour `stationary`, an empty ability list, the clamp-at-one flag, zero experience, and a square-with-outline frame. The panel's Enemies group reads the registry for its dropdown; spawn at click or at a distance, group size, nearest free cells, refusal past the live cap. Under `src/domain/attack/` and `attackSystem`: `attack_target` paths into range (attack range plus both bound radii), faces, runs the attack point, fires a homing projectile carrying physical damage from the caster's attack damage (base plus Ember instances plus modifiers), then the backswing, repeating on the base attack time scaled by attack speed; `attack_move` walks to the point, acquires the nearest valid enemy within the acquire radius through the hash, switches to `attack_target`, and resumes the walk without backtracking when the target is lost; the attack point and the backswing cancel on move, stop, or cast, a cancelled attack point firing nothing and starting no attack clock (Q20); disarm refuses attacks; a target that becomes untargetable drops the order to idle. Idle policy: no acquire. The hero's attack numbers live in `content/hero.ts`. `summon_follow` gains the other half it was written without: before it decides to follow, it acquires the nearest enemy inside its definition's acquire radius and issues an attack on it through the same state machine, and follows only while it has nothing to hit.

**Acceptance:**
- Right-clicking the dummy from 1200 units paths to 600 plus bounds, faces, fires after 0.4 s, hits at 900 units per second, and fires again 1.7 s after the first attack point at base attack speed.
- Attack-move past the dummy acquires it within 800 and, after `clear_units`, resumes the walk without turning back.
- Three Ember instances at level 1 raise the hit by the definition's per-instance value.
- The dummy at 1 health takes a 100-damage hit and shows 100 in the event, staying at 1.
- A summon beside a dummy inside its acquire radius attacks it, and goes back to following when it is gone.

**Tests:**
- `tests/simulation/attack/attack-target.spec.ts`, `attack-move.spec.ts`, `backswing.spec.ts`, `disarm.spec.ts`.
- `tests/content/enemies.spec.ts` — the dummy validates.
- `tests/simulation/dev-api.spec.ts` extended with spawn by archetype.
- `tests/simulation/summons/follow.spec.ts` extended with the acquire.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A new enemy or behaviour (the dropdown row) · A developer-panel control.

> **Note, 2026-09-22:** the clamp-at-one flag is `indestructible` on `EnemyDef`, built in sprint 07 with the damage door that reads it. The damage rule and the death system read the unit, not the definition, so the spawn this ticket builds writes the definition's health, armour, magic resistance, and that flag onto the unit it acquires. A unit spawned with no maximum health is never taken by the death system, which is what keeps the panel's plain stress bodies standing.
>
> **Note, 2026-09-22:** nine things came out differently and the ticket stands as edited here.
>
> An attack is not an ability, and it needed a shape of its own. `AttackDef` — damage, range, acquire radius, the two stages, the base attack time, and the projectile it fires — sits on the hero definition and on every archetype, replacing the six flat attack fields `EnemyDef` carried, with the acquire radius added beside them because the catalogue gives the summon one and `aggroRadius` is the AI module's. `AttackRecord` reads its seconds for the tick once, per definition in the unit table and once for the hero on run scope, so nothing multiplies by the step rate at the moment of a shot. The rule is `src/domain/attack/`, and `attackSystem` is registered after the behaviours and before pathing, so an attack a command or a behaviour issued is walked and faced on the tick it was issued.
>
> The attack clock is counted from the shot, not from the attack point. Q20 says a cancelled point starts no clock, so the clock cannot start when the point begins; and two shots have to be one attack time apart, so the next point begins early enough to land on the tick the clock names. `attackReadyAtTick` on the unit is that tick.
>
> Attack speed's unhurried base is a hundred, not one. Every form definition writes `attackSpeed: 100` and the Quicken status adds flat tens, so the `UNHURRIED = 1` the summon spawn was written with in T02 was a base a hundredth of what every table is in. It is `BASE_ATTACK_SPEED` now, in one place, read by the spawn and by the attack time.
>
> An attack-move keeps its order kind while it is engaging, holding its walk point on the unit in `attackMovePoint` and its target in the order. The lift's `suspended` slot could not be borrowed for the walk: the status pass gives a suspended order back on the first tick the unit is not lifted, so anything left there is resumed at once. Two transitions, `engageTarget` and `disengageTarget`, are the only writers of it, and the walk resumes from where the unit stands, which is what keeps it from backtracking.
>
> Three more state-machine changes. `beginFacing` is any order that aims at something, not a cast alone, so its refusal is `no_order_to_face`. `cancelAttackWindup` is new: a disarm ends the point it landed in with nothing fired and the order kept, so the unit swings again the moment it may. And reaching a destination ends the order only for a move and for an attack-move that has acquired nothing; an approach is a place to act from, and the rule that asked for it decides what standing there means.
>
> The projectile carries `attackDamage`, a number, beside the hit list a spell's carries. An attack has no ability behind it and no list to run, and a list built per shot would allocate; the number is read through the modifier table at the moment of the shot, so an Ember instance out now is in this shot and not in the one already flying. The hit lands as physical through the damage door.
>
> The panel's spawn is `spawn_enemies`, a command of its own beside `spawn_units` rather than a field on it: the two spawn different things, and one refuses `unknown_archetype` where the other cannot. The dropdown reads `DevApi.archetypes`, which the composition root fills from the registry, since run scope's unit table holds summons beside archetypes and the dropdown lists only what a map may spawn.
>
> The dummy at one health is proved end to end here; the rule itself was already covered by the death spec, so this ticket's case shoots it with the hero instead of calling the damage door. And the recorded phase 1 replay is re-stamped for the hero's attack block and the dummy.
>
> Two things the ticket did not get. Every attack fires a homing projectile: nothing in the game attacks in melee, and a projectile speed of nothing would fire one that never arrives, so the melee branch waits for the first melee archetype. And the enemies group has the dropdown, the group size, and two spawn points but no tier selector, no kill-all, and no spawn at the pointer. Both are in [Deferred](../backlog/deferred.md).

---

### P2-S09-T04 — Hit feedback from events: flashes and floating numbers

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | done |

**Build:** The play scene's event drain reacts to `unit_damaged` with a fill-mode white tint on the unit's view for a tunable number of frames (the end is a frame count read from a tunable, not a timer the view owns) and a floating `BitmapText` number from a pool at the impact point that rises and fades over a tunable duration; when the pool is full the oldest is recycled early. `cast_committed` and `command_refused` events drive the HUD square reactions already built. Numbers are white.

**Acceptance:**
- A hit flashes and spawns a number; two hundred hits in one second recycle numbers without a pool miss being treated as growth.
- Pausing the driver freezes the flash and the number mid-rise (they advance on ticks, not frames, via the interpolation fraction).

**Tests:**
- `tests/presentation/floating-number.spec.ts` — pool recycle, rise from the event.

**Definition of done:** Every change · Anything under `src/presentation`.

> **Note, 2026-09-22:** five things came out differently and the ticket stands as edited here.
>
> The flash ends at a tick, not a frame count. The ticket's build line asked for a frame count and its acceptance for a freeze under a paused driver, and the two cannot both hold: a frame count runs on while the simulation stands still. The acceptance wins, and it is the rule the HUD's refusal flashes and the status icons were already built to, so both flashes now read the same way. `HIT_FLASH_TICKS` is the number, in one place.
>
> Which units are flashing lives in a record beside the views, `HitFlashes`, not on them: one entry per slot of the unit pool holding the id that was hit and the tick its flash stops. A view is bound and released by the camera rectangle, so a clock on a view would start again every time a unit walked back on screen; the id is kept beside the tick so a unit taking a released unit's slot inherits nothing.
>
> The whole view flashes, body and facing marker, not the body alone. The hero's body is already white, so a white fill on it is no change at all; taking the dark marker with it is what makes a hit on the hero read. Phaser 4 splits the tint from its mode, so the mode is a `setTintMode` on the quad surface, written when a flash starts and when it ends and on no frame between, which leaves the seven sync fields as they were.
>
> The drain moved to the front of the frame. It was last, after every view had been written, so anything it raised waited a frame to be drawn — a quarter of a flash. The architecture page's list of what a sync does now has it first.
>
> A hit carries no point of its own, so a number is spawned over the unit the event names, at the position that unit is drawn at this frame, lifted clear of its body. A unit already released when the event is read — the ring holds a tick the world has moved past — shows nothing, since there is nowhere to put it. The reaction itself is `showHit` under `src/presentation/views/`, so the whole chain from an event to a number is tested without a scene.
>
> One thing the ticket did not ask for and did not get: the recycle count is a counter on the set, read by its spec, and is not on the panel. A readout reads an instrumentation ring or the world view, and this is neither.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Auto-attack cadence matches the spec's numbers in tests | Yes: the four specs under `tests/simulation/attack/` hold the walk into reach, the 0.4 s attack point, the shot at 900 units a second, the next point timed so the shot lands one base attack time after the last, the attack-move acquire and the walk resumed where it stands, and a disarm that ends a point with nothing fired |
| Dummy spawns from the registry-driven dropdown | Yes: the Enemies group reads `DevApi.archetypes`, which the composition root fills from the registry, and `spawn_enemies` refuses `unknown_archetype`; `tests/simulation/dev-api.spec.ts` and `tests/content/enemies.spec.ts` cover both |
| Render benchmark after the hit flash and the floating numbers | Chrome on the Apple M1 laptop, `pnpm bench` as configured, measured 2026-09-23 over 60 s after a 30 s warm-up, each in a fresh tab of a worktree at the commit. Before, `2ef33f7`: 60 fps, render 0.7 ms, 1 draw call, 1 texture, heap 59.4 to 71.0 MB. After, `ad7ba25`: 60 fps, render 0.9 ms, 1 draw call, 1 texture, heap 58.3 to 69.0 MB. Inside the render budget both times with a flat heap. A first run of `2ef33f7` in a tab reloaded from the run before read a heap near 100 MB, flat; a fresh tab read the figure above, so the offset was the reload |
| Actual days per ticket | T01 1.0 · T02 1.0 · T03 1.5 · T04 0.5 |

## Risks in this sprint

- **R12 is closed here** by editing the architecture page. Do it in T02, not later.
- Attack speed composition (agility, Whorl, later Quicken) is a modifier-stack stat like movement speed. Do not compute it inside the attack system.
