# Sprint 47 — No god objects in the rules

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

The domain modules that loot must grow are no longer god objects:

- The unit record is grouped by concern.
- A definition kind is a descriptor, not ten edits across the registry.
- The AI machine is split by state.
- No domain module holds mutable state at module level.

The engineering architect decides whether the event record changes. The seven logs match their checksums after every ticket.

## Playable outcome

None new in the browser: the build plays as before. Headless, a toy definition kind added in a test touches three files or fewer.

---

## Tickets

### P7-S47-T01 — The unit record in grouped sub-records, and stats from one key list

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P7-S46-T01, P7-S46-T02 |
| Status | done |

**Selection rule:** a god object a feature must grow, and a seam. `domain/entities/unit.ts` is 521 lines and 35 fields. P8-S34-T01 adds magic damage %, a new stat, which today costs five hand-written edits: the form definition, `clearStats` (`unit.ts:272`), `createUnit`, `derived.ts`, and `unit-spawn.ts`.

**Build:**
- **Sub-records.** The unit's attack, cast, AI, pack, and summon state become sub-records, each with its own create and clear, in files of their own under `domain/entities/`.
- **One key list.** `Stats` is built from one key list, and create, clear, derive, and spawn iterate it.
- **Docs.** The unit stays one plain-object shape with a kind tag, as the [entities and pools](../../../../docs/architecture/entities-and-pools.md) page requires, and that page states the grouping.
- **Lint.** `unit.ts`'s line comes off the `max-lines` exception list.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **Sub-records are created once with the pool slot, and cleared in place.** No sub-record is replaced or reallocated on acquire or release.
- **`Stats` stays a plain object with named fields**, so the views and the docs keep reading `stats.armour`. The key list is a `readonly` array built at module load, next to a fixed table of each stat's base reader and attribute conversion. Derivation loops over it with one keyed write per stat. There is no `Object.keys`, `for…in`, or closure made per tick.
- **The checksum's sequence does not change.** Its accessors follow the fields into their sub-records (P7-S45-T02), so no stored checksum is re-recorded by this ticket.

**Acceptance:**
- A stat added to the key list in a test is created, cleared, derived, and spawned with no other edit.
- `unit.ts` is under 500 lines, and no sub-record file is over it.
- The seven logs match their checksums; the stress tier's tick and heap are within a per cent of before.

**Tests:**
- `tests/domain/entities/unit.spec.ts`: each sub-record created and cleared, and a stat from the key list end to end.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:**
> - **The ADR 0003 line is replaced.** Its fallback is typed arrays after a profile, which this ticket does not touch; entities and pools' one-shape rule is what applies.
> - **Hot-path constraints added** for iterating the key list, which runs for every unit every tick after P7-S46-T01.
> - **Ordering confirmed:** after P7-S46-T01 and T02, so the new stat of T02 is added once the old way and then folded in, and before P7-S48-T03, so brands are written into the final layout.
>
> Size unchanged.

> **Note, 2026-09-27, at close:** four choices the Build did not settle.
> - **Which fields each sub-record holds is fixed by the checksum's order.** A sub-record hashes its fields together where the unit's table places it, so a sub-record may only take fields that are adjacent in the canonical sequence. The attack's is the attack-move point and the ready tick; the pack's is the pack id alone; the summon's is the owner and the expiry. The tier and the attack damage multiplier stay on the unit, since the spawn point and the AI record sit between the pack id and them. The cast record and the AI record were already sub-records; both moved to files of their own under `domain/entities/` (`unit-cast.ts`, `unit-ai.ts`), with the AI's provoke and death rules left in `domain/ai/ai-state.ts`. Leaf paths now follow the layout (`attack.readyAtTick`, `pack.id`, `summon.ownerId`); the hashed values and their order are unchanged, so no log was re-recorded.
> - **The key list lives in `domain/definitions/stat-keys.ts`, and `Stats` is derived from it by type,** so the stats and the base keep one named field per entry. Each entry holds its field, its modifier stat, its attribute worth on a form, its base reader for a definition, and a copy that names its field. The copy is there because a keyed copy of every stat for the two hundred units with no live row measured about 27 µs a tick against 1.5 µs for named writes; the named copies run at about 8 µs, and the tick is back inside a per cent.
> - **Derivation over rows is one pass per derived value over the live rows**, each value's sums taken in row order, so every number is bit for bit what the single pass gave; the ability pipeline page says so.
> - **A stats record is created by parsing its zeroed text,** not left as built key by key. A record built key by key holds its later fields outside the object, which boxed every number of the pool's stats and bases at creation: about 140 KB a world, and the stress heap 1.0 to 1.1 per cent over before. Parsed, the fields sit in the object as a literal's do.

---

### P7-S47-T02 — The registry validator by descriptor, one per definition kind

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P7-S45-T04 |
| Status | done |

**Selection rule:** a god object a feature must grow. P8-S31-T03 adds an item base, an affix, a rarity table, and a loot table, four kinds. At today's cost of about ten touch points each, that is some forty edits in one ticket:

- a Registry field, a schema, and a validator block;
- an id space;
- `DefinitionKind` and its key list in `definition-keys.ts`;
- a `rebuildRecord` case in `definition-tuning.ts:110`;
- the run-scope builder, content assembly, and exports.

**Build:**
- **The descriptor.** `domain/definitions/validate-registry.ts` (1030 lines, one hand-sequenced function at `:804-1011`) becomes one descriptor per definition kind. Each descriptor holds:
  - its schema, its cross-reference checks, and its id space;
  - its tuning rebuild;
  - its place in validation order.
- **Folding in.** `definition-schemas.ts` (574 lines) splits into the descriptors. The `as HeroDef`-style casts in `definition-tuning.ts:112-150` go where the descriptor's type makes them unnecessary.
- **Docs.** The [content and registries](../../../../docs/architecture/content-and-registries.md) page states how a kind is added. Both files come off the `max-lines` list.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **The route a real kind takes.** A kind is one descriptor file under `domain/definitions/` and one line in the descriptor list. The `Registry` field and `DefinitionKind` derive from the list by type, not by hand. The content side adds its own data files and one line in the content index.
- **Tuning is a descriptor field, not optional.** A kind with no tunable numbers says so with `tuning: null`, since P8-S31-T02 may decide items are untunable.
- **The registry's shape is kept.** The stamp sorts object keys but hashes field names and list order (`simulation/replay/content-version.ts:15-31`). So the `Registry`'s field names, and the order of each list in it, stay as they are. A rename or reorder would re-stamp every log, which the phase allows only in P7-S45-T01.
- **"Reaches the run scope" means the definition copies and the tuning slots.** The typed tables built from them, such as the spell, status, and unit tables, stay hand-written per kind. A descriptor does not grow a generic table builder.

**Acceptance:**
- A toy definition kind validates, cross-references, tunes, and reaches the run scope's definition copies and tuning slots. It is registered by the same route a real kind takes, not by reaching into the registry's internals from the test. The count is of files under `src/` the kind needs: its descriptor, the descriptor list, and the content index. No other file under `src/` changes, shown by the toy kind's diff on a branch and counted in the sprint exit.
- Every refusal message the registry gives today is given unchanged, walked over the existing refusal tests.
- The seven logs match their checksums, with the stamp unchanged.

**Tests:**
- `tests/domain/definitions/toy-kind.spec.ts`: the toy kind end to end.
- `tests/domain/definitions/*.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** "three files or fewer" was satisfiable by a test that builds a descriptor inline and injects it, touching one file. It now counts the files under `src/` a real kind needs, reached by the real route. The run-scope requirement stops at the definition copies and tuning slots, which keeps the descriptor from growing into a table framework (R37). Size unchanged.

> **Note, 2026-09-27, at close:** five choices the Build did not settle.
> - **The descriptors live under `domain/definitions/kinds/`,** one `*.kind.ts` per kind and the list in `kinds/index.ts`. The pieces several kinds share sit beside them in `domain/definitions/`: the shapes no table depends on (`common-schemas.ts`), the level table and effect schemas built for the orb cap (`level-schemas.ts`), the effect-list and unit checks (`effect-checks.ts`, `unit-checks.ts`), and the fault type, the check context, and the reference and frame checks (`registry-checks.ts`). `definition-schemas.ts` is gone; `validate-registry.ts` is 229 lines and walks the list.
> - **Validation order is one list order, not three.** The gates (the tuning table and the hero) come first and stop validation on a fault, as before. The other kinds' schemas, their checks, and the duplicate-id namespaces then run in list order, so a registry with faults in several kinds lists them in a different order than before: the hero's threshold fault now comes after the schema faults, the disable matrix's schema faults before the checks, and the duplicate namespaces in the order their first kind is listed. Every fault's file, path, and message is unchanged, and every refusal test passes as it was.
> - **A single kind's definition is named by its kind's word** in its tuning keys, which for the hero is `hero`, as before. The panel's folder title moved from the definitions group into each descriptor's tuning, since a table keyed by `DefinitionKind` in `devtools/` would have been a fourth file for a tunable kind.
> - **A tuning slot holds its rebuild, made once at world creation.** `setDefinitionTunable` moved to `definition-slot.ts`, which does not import the list, so the command system does not load the descriptors. The content-change shape takes every untuned kind but the tuning table from the list, rather than naming the maps, the matrix, and the frames.
> - **The toy kind's diff.** On a detached worktree of this change, a toy kind with a number and a status reference took `src/domain/definitions/kinds/toy.kind.ts` (new), one line in `kinds/index.ts` and its import, and one line in `src/content/index.ts` holding its one definition: three files under `src/`. It validated, refused a missing status, was keyed `def:toy:toy_one:strength` in a new world's tuning state and slots, and was listed by `definitionFields`. Outside `src/`, the test helper `makeRegistry` and a test fixture typed as `TunableDefinitions` needed the field too, as they list every kind; a kind that checks a frame adds its file to the architecture test's list of files that may.

---

### P7-S47-T03 — The AI machine split by state, and module-level state moved to world-owned scratch

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests, docs |
| Size | 1 |
| Depends on | P7-S45-T02 |
| Status | planned |

**Selection rule:**
- **The split** is a file over the size limit. No phase 8 feature grows the AI, but the descent's roster will (R34), and the limit holds for the whole of `src/`.
- **The module state** is a verified violation of the [simulation coding](../../../../docs/standards/simulation-coding.md#quick-reference) rule that a system's state belongs to the world. Two worlds in one process, as the loot-on-and-emptied comparison runs, share it today.

**Build:**
- **The split.** `domain/ai/machine.ts` (765 lines) splits into one file per state, and the behaviour flags are kept as they are.
- **Module-level state.** Mutable state held at module level in about 18 domain files moves to scratch the world owns and passes in:
  - `abilities/primitives/targets.ts:37`, `let depth`;
  - `combat/damage-hooks.ts:28`, `let running`;
  - `statuses/status.system.ts:48-58`;
  - `combat/damage.ts:29,80,117`;
  - `orders/command.system.ts:28`;
  - and every other `let` or mutable `const` at module scope under `src/domain/`.
- **Lint.** A lint rule or an architecture check refuses new ones.
- **Scratch or state** (architect review, 2026-09-27). Each binding moved is sorted by one test:
  - a value that is dead at the end of every tick, such as a buffer or a re-entrancy guard, is scratch. It goes to one world-owned scratch record made at world creation, and it is named in the checksum's exclusions;
  - a value read on a later tick is state. It goes into run or map scope and into the checksum's sequence.

  A scratch value found live across a tick is a latent bug: it is fixed with an intended-change note.

**Acceptance:**
- No mutable binding at module scope under `src/domain/` or `src/simulation/`, held by the check.
- Two worlds ticked in turn in one process agree with two ticked alone, over the boss encounter log.
- `machine.ts`'s line comes off the `max-lines` list.
- The seven logs match their checksums.

**Tests:**
- `tests/architecture.spec.ts`: no module-scope mutable state in domain or simulation.
- `tests/simulation/two-worlds.spec.ts`: interleaved worlds agree with separate ones.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** added the test for sorting scratch from state, so that each moved binding lands in one of two places, and so the checksum's exclusions from P7-S45-T02 are exactly the scratch record. Size unchanged.

---

### P7-S47-T04 — The event record: the architect's decision

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 0.5 |
| Depends on | none |
| Status | planned |

> **Note, 2026-09-27:** a structural question. It belongs to the engineering architect; the delivery strategist sizes it and does not answer it.

**Selection rule:** a seam phase 8 names. `domain/events/domain-event.ts` is one flat record carrying every event's fields, so each new field widens every ring slot. P8-S32-T02's `item_dropped` and the pickup, armory, and store events of sprints 33 to 36 each add fields.

**Build:** the engineering architect decides between two options and writes the decision into the [commands and events](../../../../docs/architecture/commands-and-events.md) page, or into a decision record if it reverses one:
- (a) typed readers per event variant over the flat, allocation-free storage;
- (b) leaving the record as it is, with the cost of a new field stated.

Only what is decided is built. The build, if (a), is sized at 1 and is the bucket's second claim in sprint 50. If the bucket is spent, it goes to Deferred with the phase 8 ticket that would first need it.

**Acceptance:**
- The decision, its reason, and the ring slot's size before and after are written down.
- If (a), a ticket or the bucket carries the build; if (b), the page states the cost.

**Tests:** none here.

**Definition of done:** Every change · A documentation change.

> **Architect review, 2026-09-27: a lean, not yet the decision.** The lean is (b).
> - **Brands fit the flat slot.** It already holds a separate field per id kind (`unitId`, `sourceId`, `zoneId`, `projectileId`, `domain-event.ts:23-29`), so P7-S48-T03's brands type each one without readers.
> - **Readers already exist in the union.** `DomainEvent` (`:41`) is a discriminated union over the slot, which already gives a per-variant read.
> - **Loot's growth is small.** It adds an item-id field and perhaps a definition-id field: a few numbers per slot across a fixed ring.
>
> The ticket still measures the slot before and after loot's fields, and writes the cost on the commands and events page. If it confirms (b), the bucket's second claim falls away.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A stat added from one key list | Yes, 2026-09-27 (T01): `tests/domain/entities/unit.spec.ts` adds a toy stat to the key list in the test alone and has it created, cleared, stored from a definition at spawn, derived from the base through the rows for its modifier stat and no others, and derived on a form from its attribute's worth; each sub-record is created and cleared in place, and a released slot keeps every sub-record object |
| A toy kind in three files or fewer | Yes, 2026-09-27 (T02): a toy kind on the real route touched three files under `src/`: its descriptor, the kind list, and the content index, the diff counted on a detached worktree and not kept. `tests/domain/definitions/toy-kind.spec.ts` validates, cross-references, and refuses a duplicate of a toy kind added to the list in the test, and has it copied, keyed into the tuning state and slots, and rebuilt by a tuning command |
| No module-scope mutable state; interleaved worlds agree | |
| The event record's decision | |
| `max-lines` exceptions removed this sprint | T01: `src/domain/entities/unit.ts`, now 485 lines; no sub-record file is over 60. T02: `src/domain/definitions/validate-registry.ts`, now 229 lines, and `src/domain/definitions/definition-schemas.ts`, removed; no descriptor file is over 210 |
| The seven logs match their checksums | T01: all seven match, nothing re-recorded. Stress tier, medians of eight runs each on the M1: mean tick 2.142 → 2.139 ms (300 bodies), 1.820 → 1.798 (live cap chasing), 2.158 → 2.154 (with zones), 2.263 → 2.266 (boss and adds), long road 0.087 → 0.086; heap after a forced collection at each case's end 29.9 → 30.1, 31.1 → 31.4, 31.8 → 32.0, 32.0 → 32.2 MB, 0.6 to 0.75 per cent, the three new objects a slot hold most of it. T02: all seven match with the content version stamp unchanged, nothing re-recorded; the change runs at validation and world creation, not in the tick |
| Actual days per ticket | T01: 0.5 of 1. T02: 0.5 of 1.5 |
| Sprint total | |

## Risks in this sprint

- T02 is the likeliest ticket in the phase to double (R37): a descriptor abstraction can grow a framework. Its acceptance is three files for a toy kind and every refusal message unchanged, nothing more general. A descriptor feature no current kind uses is cut.
- T03 moves state that is read deep in call stacks, and passing scratch down can change a function's shape in many callers. The split by state is mechanical; the scratch move is the half that may run over, and it takes the sprint's buffer before anything else does.
