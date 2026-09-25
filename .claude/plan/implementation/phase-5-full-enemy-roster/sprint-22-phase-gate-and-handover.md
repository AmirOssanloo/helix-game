# Sprint 22 — The phase gate and handover

**Phase:** 5 · **Sized days:** 4 · **Buffer:** 1

## Goal

The phase 5 gate recorded in four browsers, every document in sync with the code, every door for "beyond phase 5" verified by a test, and a leadership-facing account of what exists and what comes next.

## Playable outcome

The game as the roadmap's five phases describe it. Milestone M8.

---

## Tickets

### P5-S22-T01 — The full gate

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 1 |
| Depends on | P5-S21-T04 |
| Status | done |

**Build:** Walk every row of the [phase 5 gate](../04-phase-exit-gates.md#phase-5-gate) in four browsers: the boss encounter, the bench, the stress test in every variant, replay, the disable matrix suite, the pipeline diff review. Replay tests for gate bugs. Exit record and sized-versus-actual in the phase README.

**Acceptance:**
- Every gate row holds with evidence, or the phase does not close.

**Tests:** any replay test from a gate bug.

**Definition of done:** Every change · A documentation change.

**Note, 2026-09-25: the gate walked on what an agent can verify, one gate bug.** The evidence per row is in the [phase 5 gate walk](#phase-5-gate-walk). Five of the eight rows hold outright: the pipeline diff, the disable matrix, the tiers, the roster, and the bar's headless half. The boss encounter holds headless, and its readouts in four browsers wait on a person. The reference-laptop rows are all a person's. Both are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24. The docs row is read from T02's checklist, so the phase closes with T02 and not before.

- **The gate bug.** `pnpm check:ci` failed on its own, with no load. Under coverage, two cases of `tests/simulation/corridor-200.spec.ts` replay the corridor session to the press's end and hit Vitest's default 5 seconds, the first taking 8.9. The file's other four cases already pass its own 30-second replay timeout. Unplanned P5-S22-T05 passes it to the three that did not, and `check:ci` is green. No replay test comes from it: the world was never wrong. `pnpm check` runs uninstrumented and never showed it.
- **Definition of done.** Every change: `pnpm check` green, 188 files and 3387 tests with one todo. `pnpm check:ci` green, 186 files and 3382 tests with one todo at 93.43 % of statements, then the budget project 5 of 5. No optional property, non-null assertion, or ticket reference added. The one code change replaces nothing. A documentation change: the plan files are dated and live under `.claude/`, with no page under `docs/` changed. The development workflow page already says that a replay spec carries a timeout that survives instrumentation, and the fix follows it. The link test passes.

---

### P5-S22-T02 — Documentation sync and decision records

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** World model rows for every kind that exists; every where-to-look pointer run and corrected; feature pages for enemies, status effects, spells, hero, HUD, and the developer panel checked row by row against the build; the three catalogues linked from the product README; decision records written for choices made during the phases that meet the ADR page's bar: summon expiry on owner death, the on-damage and on-deal-damage hooks as status capabilities, the definition-field tuning key format, and any other that was argued twice.

**Acceptance:**
- The definition of done's documentation rows hold for the whole repository, not just the last change.

**Tests:** none.

**Definition of done:** Every change · A documentation change.

**Note, 2026-09-25: the docs synced against the build, three decision records written.** The checklist below is the phase 5 gate's docs row. Every page named was read against the code, sentence by sentence, and corrected in place. Four things the docs did not settle are Q49, decided provisionally.

- [x] **World model.** A row for every entity kind and definition kind under `src/domain/entities/` and `src/domain/definitions/`. Corrected: the hero unit's orbs and slots live on its form records, an enemy an ability spawns has an owner and a lifetime, the hero definition carries the attack and the level table, an enemy definition its attack, tier lists, and carried statuses, a map one spawn point and its packs, and the panel's stress body is named as the one unit with no definition. A new relationship says a spawned unit's kind follows its definition. The attack block, the level table, and the schema files are shapes inside a kind, not kinds, and get no row.
- [x] **Where to look.** Every pointer run: each named file and folder exists and answers its question. Corrected: an enemy's tier from a map's pack under `src/content/maps/`, a named effect or a behaviour registered under its key by an index rather than keyed by file name, the disable matrix as data under `src/content/statuses/`, the panel's controls in its group files rather than `DevApi`, the views row, and the acceptance specs' `at-` prefix. Added: tier multipliers and tier ability lists, a spawned unit's kind and end, the ability selection rule, the spell level, the HUD, the atlas bake, and the draw-call counter.
- [x] **Feature pages, row by row.** Enemies, status effects, spells and attack, hero, HUD, and the developer panel, as the ticket names, and controls and orders, orbs and Invoke, and map and camera beside them. The largest corrections: the hero page gave Whorl an attack-speed passive it does not have; the tier table drew a boss as a larger square, where it wears its archetype's body in a larger outline; the stack rules said refresh restarts the duration, where the longer remaining wins, and gave stacking an example no status uses; the imp, the charge, the damage hooks, carried statuses, and the live cap were missing; the panel page listed a views count that does not exist and missed view misses, and apply damage skips no mitigation. Every panel group, control, readout, and debug command is on the developer panel page, and nothing that does not exist is.
- [x] **The catalogues.** The spell, enemy, and disable-matrix catalogues are linked from the product README. The spell catalogue's status icons are `icon_<status id>`, as the frame list builds them; its stun is also an archetype's bash, Updraft's lift comes from the catch, the hexer and the summoner carry mana too, and section 7.5 says which of what the ten do not need the enemy abilities brought. The enemy catalogue's `square_dot` and the spell catalogue's `cone_60` exist.
- [x] **Decision records.** [ADR 0007](../../../../docs/adr/0007-a-spawned-unit-ends-with-its-owner.md), a unit an ability spawns ends on the tick its owner dies, from Q1 and Q42. [ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md), doing something on damage is a hook on a status written as an effect list, from Q3 and its amendment. [ADR 0009](../../../../docs/adr/0009-definition-tuning-key-is-the-field-path.md), a definition number's tuning key is its field path verbatim, from Q5, Q18, and Q35. Each is linked from the architecture page that states its rule and indexed. Of the others answered in the phases, Q12's driver operations and Q17's composition root were written into ADR 0004 and the layers page when they were answered, Q20 and Q22 are control and design rules the mechanics spec owns, Q36's hot reload is ADR 0004 applied and the content page owns it, and Q24 is still open; none was argued twice.
- [x] **The vocabulary.** "Add" is a term of its own beside "summon", as the build makes a summoner's imps enemies; "behaviour", "carried status", and "disable matrix" are added. "Auto-attack", which the vocabulary rules out, is gone from every page but the vocabulary's own "not" column.
- [x] **The documentation rows of the definition of done, over the whole repository.** Every page is one of the five types. Every architecture and standards page ends with its anti-patterns, its quick reference, and its related documentation, in that order, and no page links more than five related pages; the devtools page's quick reference now holds what `DevApi` does. No architecture or standards page names a real spell or archetype outside the two pages allowed to. No page under `docs/` names a sprint or a ticket, other than as the rule against it or the STATUS.md pointer. The link test walks every link.

- **Definition of done.** Every change: `pnpm check` green, 188 files and 3391 tests with one todo. No code changed, so no optional property, non-null assertion, or ticket reference could be added, and nothing is replaced. A documentation change: the rows above.

---

### P5-S22-T03 — The doors kept open, verified by test

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** One test per door in the roadmap's "doors kept open": a map transition (`loadMap` to a second map definition) keeps the hero's id, level, orbs, slots, and clocks; a view pool sized to the screen binds by rectangle with a fake world larger than the pool; a tile-layer view kind can be registered without the domain map changing (a presentation test with a stub); dormant packs activate by proximity on a large fake map; a second modifier source kind (a fixture "item") changes a derived stat through the same stack; a second kit (`hotbar`) fills the HUD from a fixture form. Each test is named after the door.

**Acceptance:**
- Six green tests named after the six doors; any door that fails is a finding for leadership, not a fix in this sprint.

**Tests:**
- `tests/simulation/doors/*.spec.ts`, `tests/presentation/doors/*.spec.ts`.

**Definition of done:** Every change.

---

### P5-S22-T04 — Retrospective and the account for leadership

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T02, T03 |
| Status | planned |

**Build:** A dated note under `.claude/plan/` with: sized versus actual per phase and the ratio; the three largest misses and why; every risk in the register with what happened; the headroom table as it stands; the door tests' results; and a first-order sizing of the "beyond phase 5" list (items and inventory, loot, procedural dungeons, a town, difficulty tiers, art, audio, saves) using the same unit and the same anchors, marked as direction, not commitment.

**Acceptance:**
- Leadership can read it in ten minutes and decide what to fund next.

**Tests:** none.

**Definition of done:** Every change.

---

### P5-S22-T05 — The corridor replay's timeouts under coverage

| Field | Value |
| --- | --- |
| Layer | tests |
| Size | 0.05 |
| Depends on | none |
| Status | done |

**Note:** unplanned. The T01 gate walk found `pnpm check:ci` red on its own.

**Build:** The three cases of `tests/simulation/corridor-200.spec.ts` that replay the corridor session without a timeout of their own take the file's `REPLAY_TIMEOUT_MS`, as its other four do and as the [development workflow](../../../../docs/workflows/development.md) asks of a replay spec in the coverage pass.

**Acceptance:**
- `pnpm check:ci` green with nothing else running.

**Tests:** none new; the three cases are unchanged but for their timeout.

**Definition of done:** Every change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Phase 5 gate rows per browser | Walked headless 2026-09-25 by T01, in the [gate walk](#phase-5-gate-walk): five rows hold outright, the boss encounter holds headless, and the docs row holds since T02 on 2026-09-25. Every row per browser and on the reference laptop waits on a person, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24 |
| Six door tests | |
| Milestone M8 | Reached 2026-09-25 on what an agent can verify, when T02 made the docs row hold: every gate row holds headless, and the rows per browser and on the reference laptop wait on a person, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24 |
| Actual days per ticket | T01 0.3 · T02 0.4 · T03 · T04 · T05 0.05 (unplanned) |

### Phase 5 gate walk

Walked 2026-09-25 on the Apple M1 laptop, headless, by the engineer running the plan. The rows of the [phase 5 gate](../04-phase-exit-gates.md#phase-5-gate), in order. Anything that needs a person, by hand, in a GPU browser, or on the reference laptop, is deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24.

| Row | Holds | Evidence |
| --- | --- | --- |
| Every enemy ability is an ability definition cast through the pipeline; nothing enemy-specific was added to the pipeline | Yes | `git diff 5e15106 HEAD -- src/domain/abilities/` touches ten files and adds no branch on the caster's kind. What it adds is general to any caster. `holdsAbility` reads a formless unit's definition list at its tier. `spawnsFit` holds a cast whose own list would spawn enemies past `ENEMY_LIVE_CAP`, and a spawned enemy joins its caster's pack. Both read the kind of the definition spawned, not of the caster, as sprint 19's exit found. The others: the `charge_to` named effect, registered by key like the hero's; a projectile that can leave from the caster; the matrix's cast-point cell in place of the stun check; per-unit turn rates; and `Vec2` arguments to the hash. The content tier is green: `tests/content`, 9 files, 443 tests |
| The disable matrix exists as data, and every cell is a test | Yes | `pnpm test tests/domain/orders/disable-matrix.spec.ts`: 120 green, one per cell of nine rows by thirteen columns, 117, plus a completeness check and two combined-disable cases |
| Elite and boss tiers multiply health and add abilities; a boss is stunned like a grunt | Yes | `tests/simulation/enemies/tiers.spec.ts`, 16 green: health at 1, 3, and 10 times, a retuned multiplier read at the next spawn, each tier's list after the archetype's own, and Hoarfrost's stun landing for the same ticks on a normal and a boss grunt |
| The roster is complete per the enemy catalogue | Yes | `ls src/content/enemies/` holds fifteen definitions. The four of section 3 and the nine of [section 7](../../../../docs/product/specs/enemy-catalogue.md#7-the-long-roster) make the thirteen, and the dummy and the imp stand outside the roster, as the catalogue says. Every definition's id is its catalogue id. `tests/content/catalogues.spec.ts` checks the same |
| A boss encounter with adds runs within budget alongside 200 enemies | Headless, yes; per browser, waiting on a person | Every variant of the stress test is green under `pnpm test:budget`, 5 of 5: 300 generic units, the cap chasing with a hundred projectiles, twenty zones and one dummy, nothing lost to the panel through twenty zones, and the boss with its adds among the cap, never past it. `tests/simulation/boss-encounter.spec.ts` replays identically. The production-build readings are P5-S21-T04's, in the [phase README](./README.md#live-cap-for-the-boss-encounter). The session below had a boss brute and a boss summoner in the fight, and the live count never passed 200. The panel readouts in Chrome, Firefox, Safari, and Edge are a person's |
| The docs are in sync: world model rows, where-to-look pointers, feature pages, any ADR taken during the phases | Yes, 2026-09-25 | The docs-sync ticket's checklist, in P5-S22-T02 above: every world model row and where-to-look pointer checked against the code, nine feature pages and three catalogues corrected against the build, and ADRs 0007, 0008, and 0009 written. Four disagreements the docs did not settle are Q49, decided provisionally |
| The reference-laptop rows carried from phases 1 to 4 hold | Waiting on a person | Every row of [Deferred](../backlog/deferred.md) that waits on the phase 5 gate needs the reference laptop or a GPU browser. They are the phase 1 and phase 2 bars, the phase 3 and phase 4 browser and by-hand rows, M1's bench, and the sprint 12 and 13 benches. Each is an open box in STATUS.md with its steps, and the phase 5 box there gathers them for one sitting |
| The bar | Headless, yes; per browser, waiting on a person | Tick: the boss variant's mean held under 4 ms, and its worst tick is in P5-S21-T04's reading. Determinism: `vitest run -t replay` green, 11 files and 23 tests, and the session below replays identically. Tests in Node: `pnpm check:ci` green after T05. Stress: 5 of 5. Frame rate, sync, render, draw calls, the allocation sampler, and `pnpm bench` are a person's |

**The recorded session.** [`notes/2026-09-25-phase-5-gate-session.json`](../notes/2026-09-25-phase-5-gate-session.json): seed 20260926, content version `d2f44862`, the arena, 3600 ticks, 913 commands, every one of a kind the panel or the player sends. There are 360 heals, 324 slot presses, 81 casts, 81 attacks, 50 pack spawns, 12 moves, the orb levels and the two switches, and two `set_tuning` in the fight: `elite_health_multiplier` 4 at tick 1200 and `def:enemy:hexer:health` 300 at 2400. A boss brute stands 550 west of the spawn point at tick 1, and a boss summoner 550 east at tick 1800. Every 150 ticks, packs of five from all thirteen archetypes refill a ring 700 round the spawn point toward 196, a third of them elite. The hero, every orb at 7 with mana and clocks unbound, invokes and throws Hoarfrost, Bolide, Zenith, Updraft, and Glacier in turn at the nearest enemy, then attacks it. After the first spawn, the live enemies ran between 101 and 200. The enemies committed every cast ability: `charge` 627, `arrow` 393, `silence_curse` 276, `summon_adds` 256, `root_net` 174, `slam` 153, and `self_heal` 95. The hero wore silence 276 times, root 143, slow 48, stun 29, and knockback 24, so the carried `frost_attack` and `bash` landed too. The heaviest tick announced 159 events, and nothing was overwritten. Replayed into two fresh worlds, the chain of per-tick SHA-256 digests agrees with the recording at every tick, `c8b29451…`, and the last tick is byte for byte the recording's, `32d5a7af…`. It was recorded in Node, not from the panel in a browser, for the reason above.

## Risks in this sprint

- A door test that fails is the most valuable output of this sprint. Do not fix it quietly; write it up.
