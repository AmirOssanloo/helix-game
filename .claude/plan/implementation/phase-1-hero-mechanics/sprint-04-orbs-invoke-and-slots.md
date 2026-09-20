# Sprint 04 — Hero definition, orbs, Invoke, slots, and cooldowns

**Phase:** 1 · **Sized days:** 4 · **Buffer:** 1

## Goal

The kit exists as rules: a three-instance buffer, a composer, two slots, per-ability clocks, and a cast-point skeleton so that pressing D on a targeted stub faces, waits, spends, and starts a clock. Every orb and Invoke acceptance test is green.

## Playable outcome

Still no hero on screen. In tests, AT-O1 to AT-O5, AT-I1 to AT-I9, AT-M4, and AT-C5 are green.

---

## Tickets

### P1-S04-T01 — Hero and form definitions, stats, modifiers, levels

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | P1-S02-T02 |
| Status | planned |

**Build:** `HeroDef` and `FormDef` in `domain/definitions/`; `src/content/hero.ts` with the shared values and the form list; `src/content/forms/skein.def.ts` with body (collision 27, bound 24, selection size), base attributes, per-level gains, the ability list (the ten spell ids), the kit key `invoke`, and the atlas frame, every number carrying a `// tunable` comment. Under `src/domain/stats/`: the modifier stack (a fixed-size array of sources on the unit, each with a kind, a stat, a flat and a percentage value), derived values from attributes (health, health regen, mana, mana regen, armour, attack speed, magic resistance), the level table 1 to 30 with experience thresholds, skill points, orb levels capped at 7, regeneration per tick with clamping. Run scope holds one form record per form (definition id, health, mana, kit state, armory placeholder) and the unit holds the active index; systems read the body through the active form each tick. `statsSystem` registered first in the tick, computing derived values from the stack.

**Acceptance:**
- Every derived value comes from a table-driven test at three attribute levels; no literal in the module.
- A modifier source added to the stack changes the derived value on the same tick; removed, it reverts.
- Level 30 stops accumulating experience; an unspent skill point persists.
- The hero's definition is read through the active form; a test that swaps the active index to a second form record sees the second body on the next tick with the hero's id, position, and facing unchanged.

**Tests:**
- `tests/domain/stats/derived.spec.ts`, `modifiers.spec.ts`, `levels.spec.ts` — every row of the table.
- `tests/simulation/hero/forms.spec.ts` — the swap keeps the id.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability (definition file rows).

---

### P1-S04-T02 — The Invoke kit: orb buffer, composer, slots, hidden clocks

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Under `src/domain/kits/`: the kit registry keyed by string (`invoke` now, `hotbar` later), a kit as a function from a slot index and the unit's kit state to an ability request, and the six slot descriptors the world view exposes (ability id or null, clock, cost, kind: orb, composer, prepared). Under `src/domain/invoke/`: the orb buffer with capacity from the tunable, append, FIFO eviction, age order; each held instance as a modifier source (Whorl movement speed per instance from the tunable table by Whorl level, plus placeholders for Quartz regen and Ember damage as sources with their values from `hero.ts`); the composer hashing counts to a spell id via the form's ability list and each spell's recipe; first invoke versus re-invoke (swap if in F, nothing if in D); the insert, shift, and evict algorithm; the hidden cooldown map keyed by ability id; refusal when fewer than three instances are held. `slot` commands resolve through the active form's kit. Events: `orb_added`, `spell_invoked`, `slots_changed`, `command_refused` with a reason.

**Acceptance:**
- AT-O1, AT-O2, AT-O3 (an orb press during a move keeps the move), AT-O5 (edge-triggered: the mapper's job, but the domain applies one command per command).
- AT-I1 to AT-I5 exactly as the spec traces them.
- AT-I6: an evicted spell re-invoked with its clock running returns with the remaining time.
- AT-M4: three Whorl at level 1 give 285.04 before clamps.
- Orb level raised while instances are out updates their passives on the same tick.
- R with too little mana is refused with a flash event and the buffer untouched; R on cooldown is refused unless it would be a swap.

**Tests:**
- `tests/simulation/at-orbs.spec.ts` — `AT-O1`, `AT-O2`, `AT-O3`, `AT-O5`.
- `tests/simulation/at-invoke.spec.ts` — `AT-I1` to `AT-I6`.
- `tests/simulation/at-locomotion.spec.ts` — `AT-M4`.
- `tests/domain/invoke/buffer.spec.ts`, `composer.spec.ts`, `slots.spec.ts` — the rules alone.
- `tests/domain/kits/invoke-kit.spec.ts` — slot index to request, descriptors.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

---

### P1-S04-T03 — The cooldown pipeline and the ten stub spell definitions

| Field | Value |
| --- | --- |
| Layer | domain, content, tests |
| Size | 1 |
| Depends on | T02 |
| Status | planned |

**Build:** Under `src/domain/abilities/cooldowns.ts`: per-ability clocks on the unit in ticks, `CD_final = (base − Σflat) × Π(1 − pct) − Σcurrent_flat` computed once at commit with the Whorl percentage snapshotted then, Invoke's own clock as `7.0 − 0.3 × total orb levels` from the tunables, a running clock never rewritten by a later level or orb change, and the "no cooldowns" and "infinite mana" debug flags on run scope that the validator consults. A minimal `SpellDef` type sufficient for phase 1 (id, recipe, targeting kind, cast point seconds, cooldown table, mana table, range, a tint, an atlas frame, an empty effects list); seconds converted to ticks at world creation for now (the registry proper arrives in sprint 07). Ten definition files under `src/content/spells/` with their final ids, real recipes, real targeting kinds from the spells page, short cast points (0.05 to 0.3 s), placeholder cooldown and mana tables of length 7, and a distinct tint each.

**Acceptance:**
- A clock started at level 1 does not change when the level rises to 7 mid-clock.
- Whorl CDR is read at commit; swapping orbs afterwards does not change the running clock.
- Invoke's clock at total orb level 0, 10, and 21 matches the spec table.
- Every stub's tables have length 7 (a content test, minimal for now).

**Tests:**
- `tests/domain/abilities/cooldowns.spec.ts` — the formula at boundaries, snapshot behaviour, the Invoke table.
- `tests/content/spells.spec.ts` — ten files, ten recipes covering every multiset, table lengths.

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability.

---

### P1-S04-T04 — Cast-point skeleton: request, validate, face, cast point, commit, backswing

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 0.5 |
| Depends on | T03 |
| Status | planned |

**Build:** Under `src/domain/abilities/cast.ts` and `castSystem`: the six stages from the ability pipeline page over a `cast` command, with commit spending mana, starting the clock, and emitting `cast_committed`; the effect list is run but empty. Facing reuses the movement module's turn. An interrupt (stop, a debug stun flag, death) during the cast point cancels with nothing spent; a new order during the backswing cancels the backswing only. A `cast` command for a targeted slot is what the mapper sends after the click; the domain never sees the cursor. Targeted stubs whose target is out of range path toward it and cast on arrival, like an attack.

**Acceptance:**
- AT-I7: throwing D starts only D's clock.
- AT-I8: a cancelled cursor spends nothing (the domain receives no command; the test asserts the mapper contract by submitting nothing and checking state).
- AT-I9: a point-target stub commits only after facing the point.
- AT-C5: a `cast` command arriving while moving does not stop the move until the cast point begins; a cursor open (no command) never does.
- Killed during a cast point: nothing spent.

**Tests:**
- `tests/simulation/at-invoke.spec.ts` — `AT-I7`, `AT-I8`, `AT-I9`.
- `tests/simulation/at-commands.spec.ts` — `AT-C5`.
- `tests/simulation/cast-skeleton.spec.ts` — each stage's timing; cancel during cast point; backswing cancel.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

---

## Sprint exit

| Check | Result |
| --- | --- |
| AT-O1 to O5 (O4 pending the channel stub in sprint 06), AT-I1 to I9, AT-M4, AT-C5 green | |
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **Stub ids are final ids.** Do not name a file `spell-qqq.def.ts`. The rename in phase 2 would invalidate every phase 1 replay.
- The kit registry is the thing that keeps the HUD from hard-coding Invoke. If it is skipped "for now", sprint 05 builds a fixed layout and the forms door closes.
