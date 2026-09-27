# Phase 7 — The foundation

**Sprints:** 45–50 · **Sized days:** 23.5: 22.5 in tickets and 1 of bucket appetite; was 24 until the architect review of 2026-09-27 cut P7-S46-T02 from 1.5 to 1 · **Gate:** [Phase 7 gate](../04-phase-exit-gates.md#phase-7-gate)
**Written:** 2026-09-27 · **Author:** delivery strategist role, from the maintainer's approval of 2026-09-27 to insert a foundation phase before loot

## Goal

Before loot grows the codebase by an entity kind, a run-scope model, a screen, and a dozen commands, the codebase is made ready to take them. At the end of the phase:

- every verified violation in the proposal of 2026-09-27 is fixed;
- every documented drift is fixed in the code or written into the docs;
- the seams phases 8 and 9 name are in place: the modifier model, typed ids, the keyed draw's draw index, a map change as a command, input capture for screens, and the two decision records loot's architect ticket would otherwise write;
- no module a phase 8 or 9 feature must grow is a god object.

**Behaviour does not change.** The player sees one new thing, a pause screen on Esc, the capture layer's first consumer. Everything else is proved unchanged by the stored logs, which replay with no re-stamp for the whole phase after P7-S45-T01, and by the per-tick state checksum P7-S45-T02 adds, which each stored log verifies. A ticket that changes behaviour on purpose says so in its Build and names what it re-records; no other ticket may.

The maintainer inserted this phase on 2026-09-27, after phase 6 closed and before loot started. Loot and the store became [phase 8](../phase-8-loot-and-the-store/README.md) and active items [phase 9](../phase-9-active-items/README.md), with every ticket id renumbered and sprint numbers kept global: loot keeps 31 to 40 with 39 still first inside it, active items keep 41 to 44, and this phase takes the next free numbers, 45 to 50.

## Seven stored logs, not six

Phase 8 speaks of six stored logs because its sprint 39 retires the phase 6 playtest log. This phase runs before sprint 39, so the logs it holds unchanged are seven: `phase-1-session`, `balance-hero`, `balance-spells`, `balance-archetypes`, `corridor-200`, `boss-encounter`, and `long-road-playtest`, all under `tests/simulation/replays/`. The long-road log is the longest, 13 164 ticks, and the one most likely to catch a refactor that moves a fight.

## The order inside the phase

1. **The safety net** (sprint 45) runs first, because every later ticket is judged by it: `pnpm restamp` and a stamp that covers only simulation data, a full-state comparison and a per-tick checksum, the lint and type holes closed, and exhaustive switches. Nothing is refactored before the net exists.
2. **Rules in one place** (sprint 46): stats derived for every unit, the modifier table with a source identity, orders written only by the state machine, and presentation that stops deciding what the domain decides.
3. **No god objects in the rules** (sprint 47): the unit record, the registry validator, the AI machine and the module-level state, and the architect's call on the event record.
4. **The screen's god objects and the seams ahead** (sprint 48): the debug overlays and the play scene, branded ids, the two decision records, and the draw index.
5. **The doors and the map change** (sprint 49): narrow public doors and their test, and a map change that is a command, keeps run scope, and replays.
6. **Capture, the docs, and the gate** (sprint 50): the capture layer with the pause screen, the documentation sync, the bucket, and the gate.

## Cut-line

**The selection rule.** A ticket belongs in this phase only if it does one of three things, and its Build says which:

1. **fixes a verified violation**: a line in the code that breaks a rule a page under `docs/` states, found and cited in the proposal of 2026-09-27;
2. **removes a documented drift**: a page that says one thing while the code does another, fixed in whichever of the two is wrong;
3. **builds a seam a phase 8 or 9 ticket names**: a ticket id in phase 8 or phase 9 that would otherwise build it, or build around its absence.

Anything else, however tidy, goes to [Deferred](../backlog/deferred.md) with the rule it failed. This applies to the bucket and to anything found mid-sprint as well.

**In:**
- the narrower stamp and `pnpm restamp`;
- the full-state comparison and the checksum;
- the lint rules' missing forms and globals, and a DOM-free typecheck for domain and simulation;
- exhaustive switches, and the debug command kinds checked against the union;
- stats for every unit;
- the modifier table: one overflow policy, capacity for today's sources, and the attacker-side stat read. Where item rows live, with any source identity they need, is record (a)'s decision, and P8-S34-T01 builds it (architect review, 2026-09-27);
- orders written only by the state machine, a refused tuning command announced, and seconds converted at load;
- presentation reading the domain's predicates;
- the unit record grouped, and the registry validator by descriptor;
- the AI machine split by state, and module-level state moved to world-owned scratch;
- the architect's decision on the event record;
- the debug overlays split and gated on the panel build, and the play scene's syncers;
- branded ids and the order's tagged target;
- the two decision records, item placement and identity, and the first screen and input capture;
- the draw index;
- narrow doors and their architecture test;
- the map change as a command;
- the capture layer with a pause screen;
- a `max-lines` limit of 500;
- the docs sync;
- a bucket of one day.

**Out, deliberately:**
- an ECS rewrite or a split into packages;
- behaviour trees in place of AI flags;
- the inventory UI;
- the descent's generator port;
- performance work beyond the overlays;
- tuning-as-state at item scale.

Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

## What the engineer can do at the end

Play the build exactly as phase 6 left it: every stored log replays to the same checksum at every tick. Press Esc with nothing to close and see the world stop under a pause screen, and click on it without the hero moving. Choose another map from the panel mid-run and keep the hero's level and experience; replay that session with the map change in it. Add a definition kind in a test by touching three files. See `pnpm lint` fail on a file over 500 lines, on `const r = Math.random; r()` in the domain, and on `setTimeout` in the simulation.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [45](./sprint-45-the-safety-net.md) | The safety net | 4 |
| [46](./sprint-46-rules-in-one-place.md) | Rules in one place | 3.5 |
| [47](./sprint-47-no-god-objects-in-the-rules.md) | No god objects in the rules | 4 |
| [48](./sprint-48-the-screens-god-objects-and-the-seams-ahead.md) | The screen's god objects and the seams ahead | 4 |
| [49](./sprint-49-the-doors-and-the-map-change.md) | The doors and the map change | 4 |
| [50](./sprint-50-capture-the-docs-and-the-gate.md) | Capture, the docs, and the gate | 3 + 1 bucket |

## Why 24 days and six sprints, not 20 and five

The proposal the maintainer approved named about 20 days in five sprints, 45 to 49. Its scope, sized on the plan's scale, is 23 days in tickets. The largest items:

- the doors and the map change, 2 each;
- the registry validator and the full-state comparison, 1.5 each.

At most four sized days fit a sprint, so 23 days do not fit in five sprints. The plan keeps the approved scope and takes a sixth sprint, 50, rather than cutting a seam loot names. If the maintainer holds the phase to 20, [Q96](../backlog/open-questions.md) names the cut: the map-change command, 2, which the descent needs more than loot does; the event record's decision, 0.5; and the play scene's syncers, 0.5, all three to Deferred. **Answered 2026-09-27:** the maintainer holds the scope; nothing is cut.

Phase 8 shrinks by 1 in return. P8-S31-T02 goes from 1.5 to 1, because the decision records and the modifier model arrive done. P8-S34-T02 goes from 1 to 0.5, because the capture layer arrives built. The net cost of inserting the phase is 23 sized days.

> **Architect review, 2026-09-27:** P7-S46-T02 went from 1.5 to 1.
> - **The source identity per row is dropped.** Its stated cause does not occur, since statuses and orbs each rewrite their rows whole.
> - **Items' capacity waits on record (a).** Whether item rows sit on every unit's table or in a run-scope table beside the armory is that record's decision.
>
> The phase is 23.5, 22.5 in tickets, and its net cost 22.5. For Q96, a 20-day phase now needs only 2.5 cut, the map-change command and the event record's decision. The syncers stay, since P7-S48-T01's overlay gate now registers on them.

## The bucket

This phase has no playtest: behaviour is unchanged by construction and proved by the logs, so there is nothing for play to judge but the pause screen, which an agent checks in Chrome. The bucket is for what a refactor uncovers that no one can size ahead. It holds **an appetite of one sized day**, in sprint 50 before the gate, spent in this order:

1. A gate row that fails.
2. The event record's typed readers, if P7-S47-T04's decision is to build them (sized at 1, the whole bucket). P7-S47-T04 decided (b) on 2026-09-27, no readers, so this claim falls away.
3. A latent bug a refactor makes live, such as an enemy's stats that were stale before P7-S46-T01. It is fixed with an intended-change note and the logs it moves re-recorded.

Whatever does not fit goes to [Deferred](../backlog/deferred.md) as "the foundation, after the bucket". An unspent day is recorded as unspent.

## Hidden work this phase carries

Named here so no ticket is surprised by it. Each is inside the ticket that names it.

- **The stamp changes once, on purpose.** Narrowing it changes every stored log's stamp. P7-S45-T01 re-stamps the seven logs through its own script; after that the stamp is frozen for the phase.
- **Which definition fields are simulation data.** An item base's icon frame and tint sit inside a definition, not only in the atlas. The narrow stamp needs a named list of presentation-only fields, held by a test (P7-S45-T01).
- **A checksum that sees everything.** A field no pool walk reaches is a field a refactor can break unseen. P7-S45-T02 proves the checksum moves when any field of any pool, run scope, or map scope is changed by one.
- **The log format gains checksums**, and later map changes. The header's `mapId` stays as the starting map, so no stored log needs migrating (P7-S45-T02, P7-S49-T02).
- **Floating point.** Converting `damage-area`'s seconds at load rather than at run time can move a value by a unit in the last place. The checksum decides whether it does. If it does, the ticket names an intended change and re-records only what moved (P7-S46-T03).
- **A DOM-free typecheck** needs its own `tsconfig` for domain and simulation, and the typecheck script runs both (P7-S45-T03).
- **Files over 500 lines that nobody proposed splitting.**
  - `domain/movement/spatial-hash.ts`, at 654, is listed as an exception: one cohesive structure that no phase 8 or 9 feature grows.
  - `domain/definitions/definition-schemas.ts`, at 574, splits with the registry descriptors.
  - `src/content/maps/*.def.ts` are exempt as data, since the long road grows past 500 in P8-S39-T01.
  - `domain/orders/state-machine.ts` sits at 500 exactly, so P8-S40-T01's `pick_up` must split it by state.
- **Every importer of `domain/public.ts`** moves to the types door or the queries door, which is most of presentation and devtools (P7-S49-T01).
- **The pause screen is new behaviour** and a new product rule. Esc with nothing to close pauses, as the maintainer answered [Q97](../backlog/open-questions.md) on 2026-09-27, and the controls page states it (P7-S50-T01).

## Exit record

Not yet walked.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| The stored logs and the checksum | | |
| `max-lines` exceptions and their reasons | | |
| Findings closed or deferred | | |
| The bucket | | |
| Sized versus actual | | |
| Largest miss | | |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 7 | 23.5 | | | |
