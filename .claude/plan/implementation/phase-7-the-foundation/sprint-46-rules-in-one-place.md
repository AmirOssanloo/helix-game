# Sprint 46 — Rules in one place

**Phase:** 7 · **Sized days:** 3.5, was 4 until the architect review of 2026-09-27 cut T02 to 1 · **Buffer:** 1

## Goal

Each rule is decided once, where the docs say it lives:

- Stats are derived for every unit.
- The modifier table has one overflow policy, and the attacker-side read exists.
- Only the state machine writes an order.
- Seconds become ticks at load.
- Presentation asks the domain rather than deciding for itself.

The seven logs match their checksums after every ticket.

## Playable outcome

The build plays as before, with one visible difference. The targeting preview no longer shows red on a unit-targeted cast the domain accepts: aim at the edge of an enemy's body at the spell's range and the preview reads legal, as the cast does.

---

## Tickets

### P7-S46-T01 — Stats derived every tick for every unit

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 1 |
| Depends on | P7-S45-T02 |
| Status | done |

**Selection rule:** a verified violation, and a seam. The [ability pipeline](../../../../docs/architecture/ability-pipeline.md) says stats are modifier-driven for every unit. Only the hero's are derived each tick (`domain/stats/stats.system.ts:31-48`). Every other unit gets its stats once at spawn (`domain/entities/unit-spawn.ts:30-67`). The gap is latent today and goes live the moment anything shreds an enemy's armour or magic resistance, which phase 8's affixes and phase 9's Veilblade can.

**Build:**
- The stats system derives every live unit's stats from its base and its modifier table each tick, with no allocation. Units with no modifier rows take a path that costs no more than a copy.
- Spawn stores the base, derives once through the same function the system calls, and fills health and mana from those maxima, as `fillFromDefinition` does today.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **The base is stored on the unit at spawn.** For a unit spawned from a definition, it is the definition's values with the tier's health multiplier and the record's per-tick regeneration applied. It is not re-read from the definition each tick. Today a retune reaches only units spawned after it (`unit.ts:231`), and re-reading would change that silently. The hero's base still comes from its active form each tick.
- **The spawn tick has real maxima.** A unit spawned mid-tick, after the stats system has run, carries derived values at once. `death.system.ts:89` and the resource fill read `maxHealth` on that tick.
- **A falling maximum clamps.** When a derived maximum falls below current health or mana, the current value is clamped as the hero's already is. Regeneration is not extended to any unit that does not regenerate today; the AI keeps its own (`ai/machine.ts:606,695`).
- **Cost.** One pass over a unit's rows accumulates every stat, rather than one pass per stat. The table keeps a live-row count, so a unit with none skips the pass. The plain stress bodies, with no definition, derive nothing.

**Acceptance:**
- A modifier row added to an enemy moves its derived stat on the same tick, and removing it restores the stat.
- A unit spawned by a pack or a cast after the stats system has run carries its derived maxima on its spawn tick.
- A retune of an archetype's health leaves live units of it as they were.
- The seven logs match their checksums. If one does not, the difference is a latent bug made live: the ticket names it as an intended change, re-records the checksums of the logs it moves with `pnpm restamp --checksums`, and records the finding in the sprint exit.
- The stress tier holds the tick budget at 200 enemies with no new allocation.

**Tests:**
- `tests/domain/stats/stats-system.spec.ts`: an enemy's armour and magic resistance follow a modifier row added and removed.
- `tests/simulation/stress.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** "Spawn leaves derivation to the system" was unsafe. A unit spawned after the stats system would hold zero maxima for its first tick, and `death.system.ts:89` and the resource fill read them. The Build now derives at spawn as well. Added the constraints on where the base lives, clamping, and cost, and two acceptance rows. Size unchanged.

---

### P7-S46-T02 — The modifier table: one overflow policy, today's capacity, and the attacker-side read

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Selection rule:** a verified violation (two overflow policies) and a seam phase 8 names: P8-S34-T01's magic damage % through the attacker-side read. Where item rows live, and so whether a row needs a source identity, is record (a)'s decision (P7-S48-T04), and P8-S34-T01 builds what it decides.

**Build:**
- **Each source kind owns its rows whole.** The [ability pipeline](../../../../docs/architecture/ability-pipeline.md) page states the rule the code already follows: the status system rewrites every status row each tick (`status.system.ts:227`), and the orb passives rewrite every orb row on a refresh (`invoke/passives.ts:47`). Two sources of one kind therefore never clear each other today. No per-row source identity is added here.
- **One overflow policy.** Today `domain/statuses/status.system.ts:154` ignores `addModifier`'s false return while `domain/invoke/passives.ts:67,87` asserts on it, and `abilities/primitives/spawn-unit.ts:43` is a third caller. The policy becomes one rule, stated on the ability pipeline page: refuse and count a miss, as a pool does. The count is world state, in the checksum's sequence.
- **Capacity for today's sources.** `MODIFIER_TABLE_SIZE` (`domain/entities/unit.ts:42`, 16) is checked against the hero's worst case today: every status row at its definition's most modifiers, every orb instance with Whorl's second row, and the summon rows. The arithmetic is written beside the constant, and the constant is raised if it falls short. Item rows are not sized for here.
- **The attacker-side read.** `dealDamage` (`domain/combat/damage.ts:136`) reads one stat from the attacker before mitigation: a magical amplification, applied to magical instances only (Q93), 0 for every unit today. The attacker is the damage's resolved source; a source that no longer resolves contributes 0. It is one stat, not a family per damage type, since only magic damage % is named.

**Acceptance:**
- A row past capacity is refused and counted by every caller alike; nothing asserts.
- The capacity arithmetic holds the hero's worst case today, held by a test that fills it.
- The attacker-side amplification at 0 leaves every damage number as it was, and a non-zero value moves magical damage only.
- The seven logs match their checksums.
- No allocation in the stats or damage path after warm-up.

**Tests:**
- `tests/domain/stats/modifiers.spec.ts`: overflow refused and counted, and the hero's worst case fitting.
- `tests/domain/combat/damage.spec.ts`: the attacker-side amplification applied before mitigation to magical damage only, and 0 changing nothing.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** narrowed, and sized from 1.5 to 1.
> - **The source identity is out.** Its stated cause, "two sources of one kind clear each other", does not occur: statuses and orbs each rewrite their rows whole. Items are its only consumer.
> - **Armory capacity is out.** Whether item rows sit on every unit's table (ten slots' worth of rows × 512 units, scanned on every derivation) or in a run-scope table beside the armory that only the hero's derivation reads is record (a)'s decision. This ticket runs before that record exists.
> - **Retitled** from "a source per row, one overflow policy, room for the armory".
>
> P8-S34-T01, already the ticket that adds the armory as a source, builds what record (a) decides. The half day comes off the phase: 23.5 sized days, 22.5 in tickets.

---

### P7-S46-T03 — Orders written only by the state machine, a refused tuning command announced, seconds at load

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | P7-S45-T02 |
| Status | done |

**Selection rule:** verified violations, and a seam for P8-S40-T01's `pick_up`, a new order kind whose walk and take must go through the state machine like every other.

**Build:**
- **Order writes.** `domain/abilities/cast.system.ts:151-152` and `domain/attack/attack.system.ts:137-138` write `order.destination` directly, contrary to `domain/orders/state-machine.ts:30`. Each asks the state machine instead. What they write is the walk goal toward a unit target, the approach point, not what the order is aimed at. The state machine's setter names it that way, so P7-S48-T03's tagged target never has to hold both a unit and a point.
- **A refused tuning command.** It is dropped silently today (`domain/orders/command.system.ts:161`). It announces a refusal event, as every other refused command does.
- **Seconds at load.** `domain/abilities/primitives/damage-area.ts:40-43` divides by `sim_hz` at run time. The conversion happens once at registry load, as the [simulation loop](../../../../docs/architecture/simulation-loop.md#quick-reference) says.

**Acceptance:**
- No file but the state machine assigns to an order's fields. A test greps for it.
- A refused tuning command announces its refusal with a reason.
- The seven logs match their checksums. If the load-time conversion moves a value in its last place, the ticket names it as an intended change and re-records only the logs it moves (R36).

**Tests:**
- `tests/architecture.spec.ts`: no assignment to an order field outside `domain/orders/`.
- `tests/domain/orders/command-system.spec.ts`: the tuning refusal announced.
- `tests/domain/abilities/primitives/damage-area.spec.ts`: the tick values read from the converted definition.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

> **Architect review, 2026-09-27:** named the two writes as the approach point, a walk goal written through the state machine. An `attack_target` order today holds both a target id and an approach point in `destination`, and P7-S48-T03's tagged target must not have to carry both in one tag. Size unchanged.

---

### P7-S46-T04 — Presentation stops deciding

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests, docs |
| Size | 1 |
| Depends on | none |
| Status | planned |

**Selection rule:** verified violations of the [presentation](../../../../docs/architecture/presentation.md#quick-reference) rule that presentation reads and never decides. Loot's screens and labels copy whatever pattern the HUD sets.

**Build:**
- **The targeting preview.** `presentation/input/targeting-preview.ts:142` uses bare `def.range`, while the domain uses `range + boundRadius + targetBound` for unit targets (`domain/abilities/cast.ts:122`). The preview calls the domain's range predicate through the queries the domain exposes, so it never disagrees with the cast.
- **The HUD's refusals.** `presentation/hud/hud.ts:235` hard-codes `blockedBy = "dead"`, and `hud.ts:312` pre-checks skill points. The HUD calls a domain query for each slot's reason instead.
  - **The query.** A pure, read-only function in the domain returns a slot's target-independent refusal reason, or none: dead, mana, clock, disabled, no skill point. It is the check stage `requestCast` (`domain/abilities/cast.ts:146`) already runs, split out, and `requestCast` calls it before it writes, so the HUD and the command cannot disagree.
  - **Not world state.** No refusal is written into world state, so the checksum and the tick carry no derived HUD data.
  - **The range predicate** the preview calls is `isInCastRange` (`cast.ts:102`). The preview hands it the hero's and the target's current positions, which the validator reads, and still draws the ring at the interpolated position.
- **Rise.** `presentation/views/hit-feedback.ts:215` and `presentation/views/checkpoint.view.ts:166` offset world y by `boundRadius`. They use `riseOf`, as every other view does.
- **Picking.** `presentation/input/pick-unit.ts:43` picks against `curr`, not the drawn, interpolated position. It picks against what is drawn.
- **Dead code.** `Hud.slotRefused` (`hud.ts:282`) is removed. `refusalFlashTicks` moves out of the HUD, so the play scene no longer imports it from there.

**Acceptance:**
- A unit-targeted cast at the edge of range reads legal in the preview exactly when the validator accepts it, walked over a sweep of distances.
- The HUD shows each refusal reason the validator gives, with no reason computed in presentation.
- A click on a moving unit between ticks picks the unit drawn under the pointer.
- The seven logs match their checksums.

**Tests:**
- `tests/presentation/targeting-preview.spec.ts`: the preview's verdict against the domain's over a sweep of distances and bounds.
- `tests/presentation/hud.spec.ts`: each refusal reason read from the view.
- `tests/presentation/pick-unit.spec.ts`: the interpolated position picked.
- `tests/domain/abilities/cast.spec.ts`: the readiness query agrees with `requestCast`'s refusal for every reason, and changes nothing.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

> **Architect review, 2026-09-27:** the HUD's reason is now a pure domain query split out of `requestCast`'s check stage, not a field the tick writes into the world view. A field would add a per-tick pass, put derived HUD data into the checksum, and still be a second copy of the rule. The query is the kind of function P7-S49-T01's queries door exists for. Size unchanged.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every unit's stats derived each tick, within budget | Yes, 2026-09-27 (T01): the stats system derives every unit with a definition from the base it stored at spawn, in one pass over its rows by `applyModifiers`, or a copy when its live-row count is 0; spawn derives through the same `deriveFromBase`. `tests/domain/stats/stats-system.spec.ts` moves an enemy's armour and magic resistance with a row on the tick it lands and back, clamps health under a falling maximum, gives a unit spawned after the system its maximums at once, and leaves a standing grunt at its health after a retune. The stress tier is green unchanged at the live cap; the pass allocates nothing, locals only. The base and the live-row count are left out of the checksum with reasons: the stats derived from them are hashed every tick |
| One overflow policy; the hero's worst case fits the table | Yes, 2026-09-27 (T02): `addModifier` refuses a row past the table and counts it on the unit's `modifierMisses`, which the checksum hashes; the orb passives' two asserts are gone, so the status system, the orb passives, and spawn-unit take a refusal alike. The hero's worst case today is 8 status rows × 2, the most modifiers a status carries (Quicken), plus 3 orb instances × 2 for Whorl's second row: 22, over the 16 held, so `MODIFIER_TABLE_SIZE` is 22 with the arithmetic beside it; a summon's is 18. `tests/domain/stats/modifiers.spec.ts` fills a table with the hero's worst case read from content and counts a miss from every source kind. The attacker-side read is `magic_damage`, a stat read off the attacker's rows at each magical hit over a base of 0, before mitigation; `tests/domain/combat/damage.spec.ts` holds it at 0 changing nothing, raising magical hits only, and 0 from a released source. No allocation: no literal, closure, or spread on the path; `applyModifiers` now takes the table and stops at its last live row. **Heap:** a world is 6387 KiB at 16 rows and 6658 KiB at 22, +271 KiB or +4.2%, measured with `--expose-gc` over five arena worlds, so it went to the engineering architect. **Architect ruling, 2026-09-27:** "Accept 22. The table size comes from arithmetic over today's content, and a smaller number on the grounds that the worst case never happens would be a claim about content that nothing enforces; the stored logs using at most 7 rows shows only what those logs happened to do. The +271 KiB is a fixed cost paid once at pool construction, not per tick, acceptable on two conditions: derivation scans only the rows in use, never all 22, and one table size stays across unit kinds. The refuse-and-count policy stays as the backstop, and record (a) may not treat this headroom as room for items." The first condition is met in this ticket by the bounded pass; the second is a note on P7-S48-T04 |
| Only the state machine writes an order | Yes, 2026-09-27 (T03): the attack and the cast write their walk goal through `setApproachPoint`, a transition that names it the approach point and is legal while the order is a cast, an attack on a unit, or an attack-move holding one; the pool reset and the lift's forgetting go through `resetOrder` in `domain/orders/order.ts`. `tests/architecture.spec.ts` greps `src/` for any assignment to an order field, the unit's or the one put aside, outside `domain/orders/`, and finds none. The state machine's shared write steps moved to `domain/orders/order-steps.ts`, so the file stays under the size limit. A refused tuning command is announced as a refused-command event with its reason, slot 0, hero or no hero (`tests/domain/orders/command-system.spec.ts`). A damage rate content writes per second is divided into a rate per tick once, when the world builds its spell and status records (`effectsPerTick`), and the primitive asserts it never sees a rate per second (`tests/domain/abilities/primitives/damage-area.spec.ts`). A named effect's fields are not converted, so the content tier now refuses a rate per second anywhere under them; none is written there today (`tests/content/registry.spec.ts`). A zone's and a projectile's speed are still divided at spawn: cut to [Deferred](../backlog/deferred.md) |
| The preview agrees with the cast at the edge of range | |
| The seven logs match their checksums, or each intended change named | T01: all seven match, nothing re-recorded. No stored log puts a row on a unit other than the hero after its spawn, so no latent bug went live. T02: an intended change to what the checksum hashes, not to behaviour. The checksum hashes every row of the table and now the miss count, so the six new rows and the count move every checksum. Before re-recording, all seven logs matched their stored checksums with the table at 22 and the hash held to its first 16 rows without the count, and a probe over every tick of every log found no unit using more than 7 rows and no miss. Then `pnpm restamp --checksums` re-recorded all seven lists; no content stamp moved. T03: all seven match, nothing re-recorded. The load-time division is the same division by the same step rate of the same table entry, so no value moved even in its last place |
| Actual days per ticket | T01: 0.5 · T02: 0.5 · T03: 0.5 |
| Sprint total | |

## Risks in this sprint

- T01 can make a latent bug live in a stored log. That is a finding, not a failure: it is named and re-recorded, and the bucket in sprint 50 takes a fix larger than the ticket.
- T02's capacity check may raise the table for today's sources, which grows every unit record. The stress tier's heap is read before and after, and a growth past a few per cent goes to the engineering architect before the ticket closes. Items' rows are record (a)'s question, not this sprint's.
