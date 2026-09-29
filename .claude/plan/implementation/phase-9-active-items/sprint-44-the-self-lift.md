# Sprint 44 — The self-lift

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)).

## Goal

The first exceptions to "a boss is health", each read in exactly one place: a unit can be invulnerable, a status remembers which side put it on, one primitive dispels, Gyre Sceptre lifts an enemy or the hero, enemies hold under a lifted hero, and an item in the bank can carry a status.

## Playable outcome

On the long road, get silenced and rooted by a hexer and a trapper, press Gyre Sceptre's key and left-click the hero: it rises, the silence and the root are gone, the pack stands facing it and does nothing, and Q, W, E, R set orbs and invoke in the air. It lands and the fight resumes. Lift an enemy with it instead and land Zenith as it drops.

---

## Tickets

### P9-S44-T01 — `invulnerable`, the applier's side, and the dispel

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P9-S41-T01, P9-S41-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** the rules are written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("The exceptions, and where each is read", the `dispel` row, "A status" and its one apply path) and [entities and pools](../../../../docs/architecture/entities-and-pools.md) (the status table); this ticket checks them against the build. `invulnerable` is read in two places, the damage function and the apply path, and the page says so. The entry gains two fields, not one: the applier's side, and the applier's **level** beside its orb levels, which the apply path copies from the cast context, so a status definition's amounts read `base + perLevel × L` at the level its cast committed at (P9-S43-T03 put the term on them at zero). Gyre Sceptre's landing damage and Skyfall Maul's burn read it. The content test's lists are the page's: only the self-lift carries `invulnerable`, only the ethereal status `physical_immune`, only `gyre_lift` runs `dispel`. **Moves a stored checksum on purpose:** the entry's shape, both fields in the one `--checksums` re-record already planned. **Size holds at 1.5**: the second field is written where the first is and re-recorded with it.

> **Note, 2026-09-29, from P9-S43-T03:** the term is on a status's damage and heal over time as `perLevel`, divided per tick in the status record, and the status system reads it at `ENTRY_LEVEL`, zero, in `src/domain/statuses/status.system.ts`; `fillHookCast` in `src/domain/abilities/cast-context.ts` runs a hook's and an expiry's list at `HOOK_LEVEL`, zero. This ticket replaces both with the entry's recorded level. The cast context carries `level`, so the apply path copies `cast.level`. Zones and projectiles already carry the level and the checksum hashes it. **Size holds at 1.5.**

**Build:**
- **`invulnerable`,** a derived disable flag, read first in the one damage function in `src/domain/combat/damage.ts`: no damage and no hooks. The status apply path reads it too: an invulnerable unit takes no new hostile status from any source, zones and areas included (Q125).
- **The applier's side,** recorded on a status entry when it lands, since the applier's id may be stale by the time it is read. The entry's new field joins the checksum's list.
- **`dispel`,** a primitive in `src/domain/abilities/primitives/`: it removes every entry of the target's status table whose applier was hostile to the target, and nothing the target put on itself.
- A content test: only the statuses the ability pipeline page names carry `invulnerable`, and only the named effect `gyre_lift` uses `dispel`. Until P9-S44-T02 writes them, the test's lists are empty and a fixture proves it fails on a stray.

The stored logs' checksums move with the entry's shape only; `pnpm restamp --checksums` records them after the replay proves the play unchanged every 50 ticks on the parent commit and this one.

**Acceptance:**
- An invulnerable unit takes no damage, runs no taken hook, and takes no hostile status; a friendly one still lands.
- `dispel` removes every hostile entry, silence, root, disarm, slow, damage over time, and leaves the hero's own.
- It plays: in a simulation spec, a silenced and rooted hero dispelled keeps its Hoarfrost and loses both.
- The bar: the flag is one read per damage and per application; the stress and budget tiers green.

**Tests:**
- `tests/domain/combat/damage.spec.ts`: `invulnerable` first, no hook.
- `tests/simulation/statuses/applying.spec.ts`: no hostile status on an invulnerable unit, the side recorded.
- `tests/domain/abilities/primitives/dispel.spec.ts`: hostile removed, own kept, a stale applier's entry by its side.
- `tests/content/statuses.spec.ts`: the two lists.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the three exceptions and where each is read; [entities and pools](../../../../docs/architecture/entities-and-pools.md), the entry's side; [status effects](../../../../docs/product/features/status-effects.md#dispel), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S44-T02 — Gyre Sceptre on either side, the self-lift, and the hold

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P9-S43-T01, P9-S43-T03, P9-S42-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** `gyre_lift`, the self-lift's row, and the hold are written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Active items", "Disables", "Enemies under an untargetable hero"); this ticket checks them against the build. Gyre Sceptre's target is the **unit or self** targeting kind P9-S42-T03 builds. Its enemy list's landing damage, as a lift's expiry list, reads the level the entry records (T01). The hold is a reading inside the chase and attack states, not a state of its own, with `aggro_hidden` read first. No stored checksum moves: no stored log has an untargetable hero, and the enemy lift is a new list. **Size holds at 1.5.**

**Build:**
- **Gyre Sceptre,** one ability targeting the hero or an enemy within 600, 23 s, 100 mana, 1600 gold. The named effect `gyre_lift` chooses its list by the target: on an enemy, a lift where it stands for 2.5 s, then `60 + 5 × L` magical damage on landing; on the hero, `dispel`, then the self-lift.
- **`gyre_self_lift`,** a status of its own for 2.5 s with the flags `lifted`, `untargetable`, and `invulnerable`, and its disable-matrix row: Q, W, E, and R allowed; D, F, orders, the attack, and the six active-item keys refused (Q121's rule 4). The row is tested per cell.
- **The hold.** In `src/domain/ai/states/`, the chase and attack states read an untargetable hero as hold: stand, face it, keep aggro, start nothing at it, and take it up again on the tick it lands. `aggro_hidden` still sends them home. The [enemies](../../../../docs/product/features/enemies.md#states-and-edge-cases) page's rule already reads so.

**Acceptance:**
- Cast on an enemy: lifted 2.5 s, the damage on landing at two hero levels.
- Cast on the hero: every hostile status gone on the tick it rises, untouched by damage or a new status for 2.5 s, orbs set and a spell invoked in the air, D, F, and an item refused.
- A pack chasing the hero holds for the 2.5 s and attacks again the tick it lands; a hero hidden by Wane still sends them home.
- It plays: the sprint's playable outcome, driven in a simulation spec on the long road's hexer and trapper, and in Chrome by an agent.
- The bar: the hold adds no path request; the stress and budget tiers green.

**Tests:**
- `tests/simulation/actives/gyre-sceptre.spec.ts`: both sides, the dispel on rising, the let-through, the landing damage.
- `tests/domain/orders/disable-matrix.spec.ts`: the self-lift row's cells.
- `tests/simulation/ai/transitions.spec.ts`: the hold, the resume on landing, `aggro_hidden` still homing.

**Pages:** the [disable matrix](../../../../docs/product/specs/disable-matrix.md) and [status effects](../../../../docs/product/features/status-effects.md), checked against the row; [ability pipeline](../../../../docs/architecture/ability-pipeline.md), `gyre_lift`.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · A documentation change.

---

### P9-S44-T03 — Bank passives and the hook's source-tier filter

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P9-S42-T02, P9-S41-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** both are written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("A bank passive", the damage hook's filter, and their quick-reference rows), and [ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md)'s second revisit point is marked read; this ticket checks them against the build. Two refinements of the build above: a bank change does not remove and re-apply every passive but makes the table hold one entry of each banked item's status, keeping one already there so no hook's ready-at tick is handed back; and a status listed as a bank passive is listed nowhere else, a content check, so its entries are known by status id and need no field. The filter is on the damage-taken hook only; a source with no tier, the hero or a summon, meets `any` alone. No stored checksum moves. **Size holds at 1.**

**Build:**
- **Bank passives.** An active item's definition lists the statuses it carries while it sits in the bank. The lifetime-status module applies them again whenever the bank changes and on respawn, and removes them when the item leaves the bank, as a form's carried statuses are applied (ADR 0008's second revisit point). An item in the inventory carries nothing.
- **The source-tier filter.** A damage-taken hook gains a required filter on the damage source's tier, `any`, `elite_or_boss`, and so on, `any` on every existing hook, so no stored checksum moves.

Its two consumers are Slipknife's lockout (P9-S51-T01) and Rimeward's armour (P9-S51-T03); this ticket proves both mechanisms on a fixture.

**Acceptance:**
- A fixture item's status is on the hero while it is in the bank, gone when it moves to the inventory, back after a respawn.
- A hook filtered to `elite_or_boss` runs on an elite's damage and not on a normal's.
- It plays: nothing a player sees until P9-S51.
- The bar: re-applying on a bank change allocates nothing; the stress tier green.

**Tests:**
- `tests/simulation/items/bank-passives.spec.ts`: on, off, and on respawn.
- `tests/domain/combat/on-damage-hook.spec.ts`: the filter by tier.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), bank passives and the filter, in body and quick reference.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| `invulnerable`, the side, and the dispel by their specs; the content test's two lists | |
| Gyre Sceptre on either side; the self-lift's row per cell; the hold | |
| Bank passives and the tier filter on a fixture | |
| The self-lift out of a silence and a root, in Chrome by an agent | |
| The render benchmark, by an agent | |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The first exceptions to "a boss is health"** ([R33](../02-risks-and-hidden-work.md)): three flags, each read in one place, and a content test that only the named statuses carry them.
- **The cursor that takes the hero** comes from P9-S42-T03; if it slipped, T02 waits on it rather than building its own.
- **Updraft already lifts enemies.** The lift here is Updraft's status on another list; if an existing log moves, T01's or T02's note traces it before any re-record (R36).
