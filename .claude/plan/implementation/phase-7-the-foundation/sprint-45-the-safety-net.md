# Sprint 45 — The safety net

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

Every later ticket in the phase can be judged by a machine:

- A stored log verifies the full world state at every tick, not only the units.
- A re-stamp is one command that touches only what the simulation reads.
- Lint and the typecheck catch the ambient time, randomness, and DOM that slip past them today.
- A switch over a union fails the build when a new kind is added and not handled.

Nothing is refactored in this sprint.

## Playable outcome

None in the browser: the build plays as phase 6 left it. Headless:

- `pnpm restamp` rewrites the seven logs' stamps and nothing else.
- Every stored log replays to its stored checksums.
- `pnpm lint` fails on each hole this sprint closes, shown on a branch and deleted.

---

## Tickets

### P7-S45-T01 — `pnpm restamp`, and a stamp over simulation data only

| Field | Value |
| --- | --- |
| Layer | simulation, devtools, tests, tooling, docs |
| Size | 1 |
| Depends on | none |
| Status | done |

**Selection rule:** a seam phase 8 names. P8-S32-T04 adds glyphs and P8-S35-T03 adds icon frames, and today each would re-stamp every log. The loot plan implies about eleven re-stamps, and 37 commits have edited the stored replays by hand.

**Build:**

- **The narrow stamp.** `contentVersionOf` in `src/simulation/replay/content-version.ts` hashes the whole registry today (`:51`). It hashes only what the simulation reads:
  - the registry without its atlas frame list and glyph set;
  - without the definition fields a named list marks as presentation-only: icon frame, tint, and any label text.
- **The field list.** It lives beside the stamp. A test holds it: no path under `src/domain` or `src/simulation` reads a listed field.
- **Feedback files keep the strict stamp** over the whole registry, alongside the narrow one. A feedback file is read against the build it was played on and already names its commit, so a strict mismatch there warns and loading goes on.
- **The script.** A `pnpm restamp` script under `tooling` rewrites the stamp of every stored log under `tests/simulation/replays/` to the current narrow stamp. It touches no other field, prints each file's old and new stamp, and refuses to write if a log fails to replay for any reason other than its stamp.
- **The one re-stamp.** This ticket runs the script once, because the stamp's definition changed. It is the phase's only planned re-stamp.
- **Docs.** The [testing standards](../../../../docs/standards/testing.md) log rule and the [development workflow](../../../../docs/workflows/development.md) name the script as the only way a stamp is rewritten.

**Acceptance:**
- An edit to an atlas frame, a glyph, or a listed presentation field leaves the narrow stamp unchanged; an edit to any other definition field changes it.
- `pnpm restamp` on a clean tree writes nothing. After a tuning edit, it rewrites exactly the seven stamps.
- A feedback file recorded before an atlas change loads and warns with its commit; a replay log recorded before it loads silently.
- `pnpm check` green.

**Tests:**
- `tests/simulation/replay/content-version.spec.ts`: the narrow stamp ignores the atlas, glyphs, and each listed field, and moves on a simulation field.
- `tests/architecture.spec.ts`: no listed presentation field is read under `src/domain` or `src/simulation`.
- `tests/tooling/restamp.spec.ts`, in a folder the Vitest config gains if it does not cover it: the script rewrites only stamps, writes nothing when current, and refuses a log that diverges.
- `tests/devtools/feedback.spec.ts`: the strict stamp still warns.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Built, 2026-09-27:** the list is `PRESENTATION_FIELDS`, `atlasFrame` and `tint`, beside the stamp; no definition has label text yet, so none is listed. The glyphs are atlas frames, so leaving out the frame list leaves them out. The stamp moved from `08d1c2e4` to `96752802` by the one planned `pnpm restamp`, which rewrote the seven stamps and nothing else, and a second run wrote nothing.
>
> **Edited in place, 2026-09-27:** "no path under `src/domain` or `src/simulation` reads a listed field" is not literally true today and is held in the form that matters. A spawn copies the definition's frame and tint onto the projectile, zone, or basic-attack shot it makes, for the view to draw (`attack.system.ts`, `spawn-projectile.ts`, `spawn-zone.ts`), and the registry's validation checks each frame is one the atlas has. The architecture test allows exactly those: a line `foo.frame = bar.atlasFrame;` or `foo.tint = bar.tint;`, a write of a constant to the copy, and `validate-registry.ts` by name with its reason; any other read of a listed field, or any read of a copy's `frame` or `tint`, fails it. Before T02's checksums, "a log that diverges" is one that does not replay to its last tick: malformed, on a map the content has not got, spanning a reload, or throwing on a tick. T02 adds a checksum mismatch to the refusals.
>
> **Also built:** a feedback file names its `strictContentVersion` beside its `contentVersion`, and a load whose strict stamp differs gives `contentDiffers`, a status line that names the commit. A feedback file saved before this change has no strict stamp and is refused as malformed; its log carries the old whole-registry stamp and would be refused as any such log is. `tests/tooling/` is its own Vitest project, `tooling`, and the testing standards name it as a tier, which T03's lint-rule spec joins.

---

### P7-S45-T02 — A full-state comparison and a per-tick state checksum

| Field | Value |
| --- | --- |
| Layer | simulation, tests, docs |
| Size | 1.5 |
| Depends on | T01 |
| Status | done |

**Selection rule:** a seam phase 8 names. P8-S32-T02 and P8-S35-T01 prove that loot never moves a fight by comparing the world with loot on and emptied, and that comparison must reach ground items, the inventory, and gold. It is also the phase's own proof.

**Build:**

- **The comparison.** `tests/helpers/world/tick-difference.ts` compares units and some run fields today, with no projectiles, zones, effects, or packs. It becomes a full-state comparison of every pool, every field of run scope, and every field of map scope. It is driven by one field list per record, so a new pool or field that is not listed fails a test rather than being skipped.
- **The checksum.** A state checksum hashes the same fields in pool-slot order, allocation-free. Each stored log gains its checksums at every 30th tick and at its last tick, so a divergence is found within a second of play. A replay spec verifies them.
- **Recording checksums.** `pnpm restamp --checksums` rewrites them, and a ticket may run it only when its Build names an intended behaviour change. This ticket runs it once to record the first checksums, which changes no stamp.
- **Docs.** The [testing standards](../../../../docs/standards/testing.md) page states the checksum and when it may be re-recorded.

**Constraints the engineer follows** (architect review, 2026-09-27):
- **A canonical sequence, not the record's layout.** The checksum hashes a fixed, named sequence of field paths, each read through an accessor. P7-S47-T01 regroups the unit into sub-records and P7-S48-T03 reshapes the order's target; each updates the accessors and keeps the sequence, so neither moves a stored checksum. A layout change that moves a checksum is a defect in the ticket, not an intended change.
- **Where it lives and runs.** The checksum and its sequence live in `src/simulation/replay/`, since they read the domain's shapes. They run in the replay verifier, the restamp tool, and tests, never in the driver or a session in the game. A log saved from the panel carries an empty checksum list, and `pnpm restamp --checksums` fills it when a log is promoted to a stored log. No optional field: an empty list means none.
- **Completeness in the typecheck.** Each record's list is typed against the record's keys, as `satisfies Record<keyof Foo, …>`, so a new field fails the typecheck, not only a test.
- **Derived caches and scratch are listed as excluded, each with its reason.** These are the walkability grid (derived from the map and tuning), the spatial hash's buckets, the path search, and the world-owned scratch of P7-S47-T03. The walk covers the included list; the exclusions are named so that nothing is silently absent.
- **Allocation-free hashing.** Floats are hashed by their bits through one preallocated `Float64Array` and `Uint32Array` pair. Strings are hashed by `charCodeAt`. The unit's cooldown `Map` is walked with `forEach` and a callback made once, never `for…of`.
- **The copied art is excluded** (note from P7-S45-T01, 2026-09-27). A spawn copies a definition's `atlasFrame` and `tint` onto the projectile, zone, or shot as `frame` and `tint`. The narrow stamp leaves those definition fields out, so an art edit moves no stamp. These pool fields are listed as excluded, with that reason, or an art edit would move a checksum under an unchanged stamp. `pnpm restamp` also refuses a log whose checksums do not match, beside the failures T01 refuses.

**Acceptance:**
- Changing any one field of any pool, run scope, or map scope by the smallest step changes the checksum and is named by the comparison, walked over every field in the lists.
- A record gaining a field not in its list fails the typecheck, naming the record.
- The seven stored logs replay and match their checksums at every stored tick.
- No allocation in the checksum after warm-up.
- `pnpm check` green, the stress tier included.

**Tests:**
- `tests/helpers/world/tick-difference.spec.ts`: every field of every list is compared, and an unlisted field fails.
- `tests/simulation/replay/state-checksum.spec.ts`: a one-step change to each field moves the checksum, the checksum is stable across two replays, and it does not allocate.
- `tests/simulation/replay-determinism.spec.ts`: each stored log matches its checksums.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> **Architect review, 2026-09-27:** added the constraints block. Without a canonical sequence, sprint 47's regrouping of the unit and sprint 48's tagged target would each move every stored checksum with no change in behaviour, and the gate's "no re-record but an intended change" row could not hold. The checksum runs only in tests and tools, so it costs the game nothing. Field-list completeness moves from a test to the typecheck. Size unchanged.

> **Built, 2026-09-27:** the lists are in `src/simulation/replay/state-fields.ts` and `unit-fields.ts`, over primitives in `field-list.ts`, `field-collections.ts`, and `hash-words.ts`; each record's list is built by `fieldsOf<Foo>`, whose table takes exactly the record's keys, so an unlisted field fails the typecheck at that list (shown by adding a field to the AI record and deleting it). The checksum is MurmurHash3's body over every value's words, folded to 30 bits so it is a small integer the engine never boxes, and a log writes it as a plain number beside its tick. Numbers are read by accessors that write into a preallocated `Float64Array` rather than return, since a returned fraction is a heap number; `tests/simulation/replay/state-checksum.spec.ts` takes ten thousand checksums with no collection and no heap growth past a small allowance. A log holds checksums at tick 0, every 30th, and its last; a document with no checksum key reads as a log with none. `pnpm restamp --checksums` records them and the stamp with them; plain `pnpm restamp` now refuses a log whose replay misses one. It was run once: 0 stamps and 7 checksum lists recorded, and a plain run afterwards wrote nothing.
>
> **Edited in place, 2026-09-27:** also left out, each with its reason in the list: run scope's records built from content (the hero definition, its attack, spells, statuses, the disable matrix, the unit records, the definition slots), since the stamp fixes the registry and every number a command can change is a tuning key, which is hashed; the map's bounds, obstacles, spawn point, and checkpoints, which `mapId` names; the pack and form definitions; the always-null armory; the effect pool's frame, with the copied art; the zone's own circle, hashed through `shape` whenever it is the shape in use; and a pool's capacity, live count, misses, and free-list order, the last not readable through its view and showing as a different slot at the next acquire. An ability is hashed by its id and an effect list by its entries' kinds. The comparison moved from the world view to the world, since the view has no `nextPackId`. The field lists' own spec sits beside the helper, `tests/helpers/world/tick-difference.spec.ts`, and the simulation project gains `tests/helpers/**/*.spec.ts`; besides naming each leaf, it walks the arranged world's objects and fails on any value no list names or leaves out.

---

### P7-S45-T03 — Close the lint and type holes

| Field | Value |
| --- | --- |
| Layer | tooling, tests, docs |
| Size | 1 |
| Depends on | none |
| Status | done |

**Selection rule:** a verified violation. The [layers](../../../../docs/architecture/layers-and-dependency-rule.md#quick-reference) page says there is no clock, DOM, or ambient randomness under domain or simulation, and lint and the typecheck do not enforce it in full.

**Build:**

- **Ambient time and randomness.** `eslint/rules/no-ambient-time-in-simulation.js` (`:14-38`) catches `Math.random` and `Date.now` only as direct calls. It also catches:
  - a member read that is not called (`const r = Math.random`);
  - a destructure (`const { now } = Date`);
  - a computed access (`Math["random"]`);
  - `globalThis.`, `self.`, and `window.` prefixed forms;
  - `performance.now` in each of these forms.
- **The DOM.** `eslint/rules/no-dom-in-simulation.js` (`:14-19`) bans window, document, navigator, and requestAnimationFrame. It also bans setTimeout, setInterval, queueMicrotask, globalThis, self, localStorage, sessionStorage, fetch, crypto, and structuredClone.
- **A DOM-free typecheck.** `src/domain/`, `src/simulation/`, and `src/shared/` get their own `tsconfig` with no DOM lib and no Node types (`"types": []`), so neither `document` nor `setTimeout` resolves there. `pnpm typecheck` checks both projects.
- **A size limit.** A `max-lines` limit of 500 per file under `src/`, counting raw lines, blank and comment lines included, so the figures in this plan match `wc -l`.
  - Its exceptions are listed in the lint config, each with a one-line reason.
  - Seeded today with the files over the limit: `debug-overlays.ts`, `validate-registry.ts`, `ai/machine.ts`, `spatial-hash.ts`, `domain/public.ts`, `definition-schemas.ts`, and `entities/unit.ts`.
  - Each ticket that splits a file removes its line.
  - Map definitions under `src/content/maps/` are exempt as data.
- **Docs.** The [layers](../../../../docs/architecture/layers-and-dependency-rule.md) quick reference names the widened bans and the limit.

**Acceptance:**
- Each form and global listed above, written in a domain file on a branch, fails `pnpm lint`; the same line in presentation passes.
- `document` referenced in a domain file fails `pnpm typecheck`.
- A new 501-line file under `src/` fails lint; each listed exception passes with its reason.
- `pnpm check` green on the tree as it is: any real hit the widened rules find is fixed here and named in the sprint exit.

**Tests:**
- `tests/tooling/lint-rules.spec.ts`, new, since no custom rule has a spec today: ESLint's `RuleTester` over both rules, each new form and global refused under domain and simulation and allowed in presentation; `max-lines` refusing a 501-line file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

> The architecture test's public-door and types-only rules, which the proposal put here, move to P7-S49-T01, where the doors they test are narrowed.

> **Architect review, 2026-09-27:** the DOM-free project also drops Node's types, since `setTimeout` and `structuredClone` would otherwise typecheck there through `@types/node`. The size limit counts raw lines. Size unchanged.

> **Built, 2026-09-27:** the two files under `eslint/rules/` are option lists for ESLint's core `no-restricted-syntax` and `no-restricted-globals`, not rule implementations, so the spec runs `RuleTester` over those core rules with our lists, and also lints each line through the real config at a path under `src/domain/`, `src/simulation/`, and `src/presentation/`, which is what proves the refusal is scoped. Each source (`Math.random`, `Date.now`, `performance.now`) is matched on ten spellings: called, read, destructured in a declaration or an assignment, computed, and through `globalThis`, `self`, or `window`, with `globalThis.Math` destructured and a computed global too; an argument-less `new Date()` and a bare `Date()` call are refused in both the plain and the global-prefixed form. The limit is `eslint/size-limit.js`: `MAX_LINES_PER_FILE` and `OVER_THE_LIMIT`, the seven files with their reasons, and the spec fails on a listed file that is no longer over the limit, so the line leaves with the split. ESLint's `max-lines` drops the empty line after a final newline, so its count is `wc -l`'s; `state-machine.ts`, at exactly 500, passes. The DOM-free project is `tsconfig.dom-free.json` over `src/shared`, `src/domain`, `src/simulation`, and the build flags' declaration, with `lib: ["ESNext"]` and `types: []`; `pnpm typecheck` runs it after the root project. The widened rules found no real hit under `src/`. Besides the layers page, the development workflow, the simulation coding standards, and `eslint/README.md` name the widened bans, the second typecheck, and the limit.

---

### P7-S45-T04 — Exhaustive switches

| Field | Value |
| --- | --- |
| Layer | tooling, domain, tests |
| Size | 0.5 |
| Depends on | none |
| Status | done |

**Selection rule:** a verified violation, and a seam. Phase 8 adds command, event, order, and definition kinds, and every one must fail the build where it is not handled.

**Build:**

- **The check is the typecheck, not type-aware lint.** Lint has no type information on purpose (`eslint.config.js:108-109`, kept fast for the commit hook), and this ticket does not reverse that. Instead:
  - a `assertNever(value: never)` helper in `shared/`;
  - a syntactic custom rule under `eslint/rules/`, with no type information: every `switch` under `src/domain/` and `src/simulation/` has a `default` that calls `assertNever`.
- **Switches that fall through silently.** Each switch over a union that returns nothing gets an exhaustive `default` with a never-check:
  - `domain/orders/command.system.ts:73`;
  - `domain/abilities/primitives/index.ts:82`;
  - `domain/ai/machine.ts:738`;
  - `domain/statuses/status.system.ts:333`;
  - any other the rule finds.
- **The debug command kinds.** `DEBUG_COMMAND_KINDS` (`domain/commands/command.ts:364`) becomes a `Record<DebugCommand["kind"], true>`, so a debug command added to the union and not to the record fails the typecheck.

**Acceptance:**
- A new member added to the command union on a branch fails `pnpm typecheck` at every switch that does not handle it.
- A switch under domain or simulation with no `assertNever` default fails `pnpm lint`.
- A debug command missing from the record fails the typecheck.
- `pnpm check` green; the seven logs match their checksums.

**Tests:**
- `tests/domain/commands/command.spec.ts`: every debug command kind is in the record, and nothing else is.
- `tests/tooling/lint-rules.spec.ts`: the switch-default rule refuses a switch without the never-check.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation`.

> **Architect review, 2026-09-27:** type-aware `switch-exhaustiveness-check` replaced with a never-check the typecheck enforces and a syntactic rule that requires it. Turning on type-aware lint would reverse the config's standing choice and slow every commit hook for one rule. Size unchanged.

> **Built, 2026-09-27:** `assertNever` is `src/shared/assert-never.ts`, behind the shared door; it throws in every build, since a value typed `never` that arrives is a broken invariant. The rule is `eslint/rules/switch-needs-never-check.js`, two `no-restricted-syntax` entries in the domain and simulation blocks: a switch with no `default` of its own, and a `default` whose one statement is not `return assertNever(x);` or `assertNever(x);` with one argument. Two entries, because esquery's `:has` does not follow a chain of child combinators, so one selector could not tell a switch's own `default` from a nested switch's. The rule found 25 switches, all under `src/domain/` and none under `src/simulation/`: the four the Build names and 21 more, every one over a union, so each got the check and none became `if` statements. A switch on a discriminant passes the narrowed union itself (`assertNever(command)`); three whose union is not discriminated by that field pass the field (`slot.kind`, `request.kind`, `unit.order.kind`). Two lines changed besides: `mitigateRecord` in `combat/damage.ts` gained the `return` its last case lacked, which `no-fallthrough` asked for once a `default` followed it, and `isInCastRange` declares `reach` without its dead `= 0`. `DEBUG_COMMAND_KINDS` is exported through the domain door for its spec, and `isDebugCommand` reads it with `Object.hasOwn`, so an inherited key is not a kind. Shown on the tree and reverted: a player member and a debug member added to the unions failed `pnpm typecheck` at `command.system.ts`, both switches in `validator.ts`, `ordering.ts`, `debug-commands.ts`, and the record, and at the player-kind record in the spec. The rule is stated in the [simulation coding standards](../../../../docs/standards/simulation-coding.md#quick-reference) and [where to look](../../../../docs/architecture/where-to-look.md), so the documentation rows were walked too. Behaviour is unchanged: `pnpm restamp` wrote nothing and every stored log matched its checksums.

---

## Sprint exit

| Check | Result |
| --- | --- |
| `pnpm restamp` rewrites the seven stamps and nothing else | Yes, 2026-09-27 (T01): `08d1c2e4` to `96752802` on all seven, one line each in the diff; a second run printed "0 of 7 stamps rewritten". `tests/tooling/restamp.spec.ts` holds the rules |
| An atlas or glyph edit leaves the stamp unchanged | Yes (T01): `tests/simulation/replay/content-version.spec.ts` resizes a frame, drops every glyph, and nudges every `atlasFrame` and `tint` in the registry, with no stamp moved; every other leaf of every definition moves it |
| Every field of every pool and scope moves the checksum | Yes, 2026-09-27 (T02): all 159 leaves of `STATE_LEAVES`, beside 25 keys left out with reasons,, each nudged by one step at its first instance in a world with a live slot in every pool, move the checksum and are named by the comparison, and a world walk finds no value unlisted |
| The seven logs match their checksums | Yes (T02): recorded once by `pnpm restamp --checksums`, 0 stamps moved; `tests/simulation/replay-determinism.spec.ts` replays each to every stored checksum |
| Each widened lint rule shown failing on a branch | Yes, 2026-09-27 (T03): one planted file under `src/domain/` with every form on its own line and every banned global, linted by `eslint`: 33 `no-restricted-syntax` on 33 lines and 30 `no-restricted-globals`; the same file under `src/presentation/`, none of either; a 501-line file under `src/domain/`, one `max-lines`. Deleted afterwards. `tests/tooling/lint-rules.spec.ts` holds the same, 125 cases, and fails when a destructure selector or an exception path is broken |
| Real hits the widened rules found | None (T03): `pnpm lint` and the DOM-free typecheck were green on the tree as it was |
| Each switch without the never-check shown failing lint | Yes, 2026-09-27 (T04): the rule refused the 25 switches under `src/domain/` before the fix, and a member added to the command unions failed the typecheck at every switch over them; `tests/tooling/lint-rules.spec.ts` holds nine refused shapes and four allowed, in the real config under domain and simulation and not under presentation |
| Actual days per ticket | T01: 0.5 · T02: 1 · T03: 0.5 · T04: 0.5 |
| Sprint total | Closed 2026-09-27: sized 4 with 1 of buffer, done in 2.5; the buffer unspent. No unplanned ticket, no deferral, no open question |

## Risks in this sprint

- T02's field lists are the phase's whole proof. A list that misses a field is a refactor that can break unseen, so the one-step walk over every field is the acceptance, not a sample.
- T03's widened rules may find real hits in `src/` today. Each is fixed in the ticket if it is a line or two; anything larger is a new ticket in this sprint with a note, and its day comes from the buffer.
- A checksum over floats is exact. Any later ticket that reorders arithmetic will move it, which is the point; R36 names what a ticket does then.
