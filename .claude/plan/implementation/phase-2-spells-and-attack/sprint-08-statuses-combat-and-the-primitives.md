# Sprint 08 — Statuses, disable flags, zones, and the primitives

**Phase:** 2 · **Sized days:** 4 · **Buffer:** 1

## Goal

A status is one table entry with a stack rule; disables are flags the validator reads; zones live in the world with per-tick rules; and three of the six primitives run.

## Playable outcome

Apply any status to the hero from the panel and watch the blocked keys grey and an icon appear. Nothing yet casts a zone, but the panel can spawn one for testing.

---

## Tickets

### P2-S08-T01 — Status table, status system, disable flags, the eight status definitions

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests |
| Size | 1.5 |
| Depends on | P2-S07-T02 |
| Status | done |

**Build:** The unit's status table (fixed size, entries with definition id, end tick, stacks, source id). `applyStatus` with the definition's stack rule (refresh resets the end tick, stack adds and resets, ignore drops) and a `status_applied` event; expiry on the end tick with `status_expired`; death clears the table. `statusSystem` early in the tick computing the unit's disable flags (stun, silence, root, disarm, lifted, untargetable, aggro_hidden) from the active entries and installing each status's modifiers into the modifier stack (slow into speed, damage over time into health each tick). The validator reads the flags. Per the status page: stun clears the order and cancels a cast; silence closes nothing in the domain (the mapper closes the cursor on reading the flag); root clears a move and refuses out-of-range casts; disarm blocks attacks; lift is stun plus untargetable; knockback keeps the order and blocks movement while displaced (the displacement itself is T02). Eight definitions under `src/content/statuses/` with stack rules per the page and a placeholder icon frame each. Rooted while lifted: lift wins, root keeps counting. Two stuns: the longer remaining wins.

**Acceptance:**
- Every disable against every blocked and unblocked action from the status page, now through real statuses instead of the phase 1 flag.
- Refresh, stack, and ignore each behave per definition on a second application.
- A slow at 90% clamps speed at the minimum tunable.
- Silence with a move running keeps the move; root during a move clears it and does not resume on expiry.

**Tests:**
- `tests/domain/combat/status-stack.spec.ts` — the three rules.
- `tests/domain/orders/validator.spec.ts` — extended to real statuses.
- `tests/simulation/statuses/*.spec.ts` — one file per status, each edge case from the page.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A new spell, effect, or enemy ability (status definitions).

> **Note, 2026-09-21:** the status definitions are already data. P2-S07-T02 wrote the fourteen the catalogue lists under `src/content/statuses/`, with their flags, modifier tables, damage over time, the Hoarfrost hook, the Updraft expiry list, stack rules, and icon frames, and the content tier validates them. This ticket builds the table, the system, and the flags over them and changes a definition only where the system finds it wrong.

> **Note, 2026-09-22:** four things came out differently and the ticket stands as edited here. The status entry also snapshots the applier's three orb levels, which the `StatusDef` docblock already promised and every modifier and damage table needs to be read at. The `set_disable_flag` debug command became `apply_status` carrying a status id, since a disable is no longer a thing of its own; the panel's control offers every status in run scope, and `DisableId` is gone. The disable flags are the eight `StatusFlag` members, not seven, so knockback's `displaced` has somewhere to live. And the stack spec is `tests/domain/statuses/status-stack.spec.ts`, not `tests/domain/combat/`, because a spec mirrors the folder its subject lives in. The status hooks and the expiry effect lists are not run here: the hook is P2-S10-T01's and the expiry list P2-S11-T01's, and both need the primitives.

---

### P2-S08-T02 — Primitives: damage area, apply status, displace

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1 |
| Depends on | T01, P2-S07-T04 |
| Status | done |

**Build:** Under `src/domain/abilities/primitives/`: `damage_area` over a shape (circle, rotated rectangle, cone by angle) around a point, querying the hash and doing the exact test per shape, applying damage of a type with an amount from a level table, optionally split among those hit; `apply_status` to a unit or to units in a shape, with a duration table; `displace` as push (a direction and distance over N ticks) or lift (sets the lifted status and suspends the order, restores it on drop). Displacement moves the unit each tick through the movement system's translate step so push-out and obstacle rules apply. Every shape test is a pure function in `domain/movement/shapes.ts`.

**Acceptance:**
- Circle, rectangle, and cone each hit exactly the units inside from a fixture of twelve positioned units.
- Split damage divides evenly; unsplit applies fully to each.
- A push into a wall stops at the edge; a lift suspends a move and resumes it on drop; a lifted unit cannot be hit.

**Tests:**
- `tests/domain/movement/shapes.spec.ts` — the three shapes at boundaries.
- `tests/domain/abilities/primitives/damage-area.spec.ts`, `apply-status.spec.ts`, `displace.spec.ts` — one to three each.
- `tests/simulation/movement/displacement.spec.ts` — the two acceptance rows that are sequences: the push into a wall and the lift that gives the order back.

**Definition of done:** Every change · `src/domain`.

> **Note, 2026-09-22:** six things came out differently and the ticket stands as edited above.
>
> **Pull is not built.** Section 7.1 of the catalogue says pull has no user among the ten spells and is not built until one exists, and `DisplaceEffectDef` has carried push and lift only since P2-S07-T02. The ticket's "pull" is struck; the first ability that needs one adds the mode, the schema row, and its spec together.
>
> **A push names its status.** The catalogue says a push applies `knockback` for its duration, and the `displaced` flag is a status flag, so the flag can only come from a status. Rather than name a content id in the domain, the push variant gains `statusId` beside the lift's, the schema and the registry validation check it like every other status reference, and the catalogue's displace row is corrected to list it. Behaviour is unchanged; nothing was approved differently.
>
> **A lift suspends rather than clears.** T01 built the stun rule, and a lift is a stun, so a lift cleared the order for good. `suspendOrder` and `resumeOrder` join the order state machine with a `suspended` order beside the unit's own, and the status pass puts the order aside while the lifted flag is up and gives it back on the tick it falls, asking for a fresh path from the drop. A cast is cancelled rather than put aside, as the stun would cancel it. Death clears what was put aside.
>
> **A push is a record on the unit.** The unit gains a `push` of a per-tick step and a count of ticks left; the movement system carries it before anything walks and leaves it to the collision pass, which is what stops a push at a wall's edge. A second push on a unit one already has hold of is ignored, as `knockback` ignores.
>
> **Who is hostile is now a rule.** `EffectTargetDef` has said since P2-S07-T02 that a shape or a zone collects hostile units only, and nothing decided what that meant. `src/domain/combat/sides.ts` is the two sides — the hero with its summons against the enemies — as a pure function over the unit kinds. It is what an attack's target rule will read in sprint 09.
>
> **Effect durations are converted where they are read.** An effect list has no record beside it the way a spell and a status do, so a duration in seconds on an entry becomes ticks when the effect runs, through one door, `ticksOfSeconds` in `src/domain/definitions/`. It is a departure from "a system never multiplies by the tick rate" and it is [Q26](../backlog/open-questions.md).

---

### P2-S08-T03 — The zone entity and system, the spawn-zone primitive

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests |
| Size | 1 |
| Depends on | T02 |
| Status | done |

**Build:** The zone pool's shape finished: caster id, ability id, shape, position and facing, lifetime, a delay before it becomes active, a per-tick rule key, per-tick state slots (a travel vector, a hit list for once-per-unit rules), and a tint. `zoneSystem` after movement: each active zone runs its rule (a named function in `domain/abilities/zones/` keyed like an effect: `damage_each_tick`, `aura_status`, `damage_once_then_expire`, `travel_line`, with more added by the spells that need them), expires on its tick, emits `zone_spawned` and `zone_expired`. The `spawn_zone` primitive. A `zone.view.ts` at the ground band drawing the shape frame scaled, and the spell-areas overlay reading the same data. A `spawn_zone` debug command for the panel.

**Acceptance:**
- A zone with a delay applies nothing until the delay; a zone with a lifetime expires exactly on its tick.
- `aura_status` applies its status to every unit inside each tick and the status expires after the unit leaves plus the definition's duration.
- Sixty-four zones live (the pool's capacity) return `null` on the sixty-fifth and count the miss.

**Tests:**
- `tests/simulation/zones/lifecycle.spec.ts`, `rules.spec.ts` — delay, lifetime, each rule.
- `tests/presentation/zone-view.spec.ts` — bind and sync per the view rules.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · Anything under `src/presentation`.

> **Note, 2026-09-21:** the catalogue replaced the zone rule registry with two effect lists on the `spawn_zone` entry, run once on activation and once per tick with the zone as context, so a zone's rules are primitives with `target: zone` or a named effect and there is one registry of named functions, not two. The `aura_status`, `damage_each_tick`, and `damage_once_then_expire` rules become apply-status and damage-area entries in those lists; the travel is the zone's `motion`. Section 7.1 of `docs/product/specs/spell-catalogue.md` has the fields.

> **Note, 2026-09-22:** seven things came out differently and the ticket stands as edited above.
>
> **There is no zone rule registry.** The 2026-09-21 note above is what was built: a zone keeps the two effect lists its entry gives it and the effect runner runs them, so `damage_each_tick`, `aura_status`, `damage_once_then_expire`, and `travel_line` are not functions anywhere. The first three are a damage-area or an apply-status entry with `target: zone`, and the travel is the zone's motion, computed into a per-tick step at spawn.
>
> **A zone holds the ability, not an ability id.** Its lists run with the zone as the cast context, and a context names an `AbilityDef`; the definition carries its own id, so a second field for it would be the same fact twice.
>
> **A zone's shape is held by reference, with a circle of its own behind it.** A zone from an effect entry points at the entry's shape, which is content and never changes. A zone given a radius — the panel's — points at `circle`, the slot's own, so two zones never share one area. `shapeExtent` moved from the target collection into `domain/movement/shapes.ts`, where the collection and the zone view both read it.
>
> **A caster-anchored zone rides the caster.** The catalogue says a zone anchored on the caster moves with it, so the zone carries a `followsCaster` and the system puts it where the caster stands each tick rather than only at spawn.
>
> **Every event gained a `zoneId`.** `zone_spawned` and `zone_expired` are about a zone, not a unit, and the ring is one shape. The definition of done asks that a new event have a reader, so the panel's readouts grew a **Last zone** row beside Last status.
>
> **The system sits between collision and death.** "After movement" leaves two places; it runs after collision so a rule reads where the tick's pushes and walks left every unit, and before death so damage a zone dealt is counted on the tick it dealt it.
>
> **The panel's zone is bare.** `spawn_zone` carries a position, a radius, a delay, and a lifetime, and the zone it makes has no ability and no caster, so it runs nothing. It is its own **Zones** group rather than a row of Units, and it exists to drive the pool, the view, and the spell-areas overlay before a spell casts one.

---

### P2-S08-T04 — Statuses on screen: icons and greyed keys

| Field | Value |
| --- | --- |
| Layer | content, presentation, devtools, tests |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** One baked icon frame per status in the frame list (a small square with a distinct glyph each); a `status-icon.view.ts` pool binding one quad per active status above its unit, at the floating-text band; the HUD greys each slot square whose descriptor reports a blocking flag; the mapper closes an open cursor when the silence or stun flag appears on the world view. The panel's Apply Status control offers all eight with a duration.

**Acceptance:**
- Silence greys six squares; disarm greys none; stun greys six and the cursor closes.
- An icon appears on apply and disappears on expiry, driven by events, with no timer in the view.

**Tests:**
- `tests/presentation/status-icon-view.spec.ts`, `hud.spec.ts` extended.

**Definition of done:** Every change · Anything under `src/presentation` · A developer-panel control.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every disable-versus-action test green through real statuses | |
| Zone pool at capacity behaves | Yes: the sixty-fifth spawn returns nothing, the pool counts the miss, and the effect list runs on |
| Actual days per ticket | T01 0.5 · T02 0.5 · T03 0.5 · T04 |

## Risks in this sprint

- The zone rule registry is a second kind of named function. Keep its signature identical in spirit to a named effect so phase 5 has one pattern to copy.
- Displacement through the movement translate step, not by writing position directly, is what keeps knockback out of walls. Do not shortcut it.
