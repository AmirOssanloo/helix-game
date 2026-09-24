# Sprint 17 — The tuning surface and the balance pass

**Phase:** 4 · **Sized days:** 4 · **Buffer:** 1

## Goal

Every numeric field of every definition is retunable from the panel with no code change, definitions hot-reload in development, a replay against a changed content version is refused, and a first balance pass is recorded.

## Playable outcome

Drag Hoarfrost's level-3 stun duration, throw it, and see the difference. Edit the grunt's health in its file, save, and spawn the new number without a reload.

---

## Tickets

### P4-S17-T01 — The generic tuning surface over definition fields

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, devtools, tests |
| Size | 1.5 |
| Depends on | P2-S07-T02 |
| Status | done |

**Build:** A tuning key format for definition fields: `def:<kind>:<id>:<field path>[:<index>]`, numeric fields only, the field path the property path verbatim with a dot per nesting level, the index the array index verbatim so `:2` is level 3 (Q5). The value in a `set_tuning` command and in the log is in the field's designer units, seconds or degrees as the definition writes them; the registry converts it exactly as it converts at load, once per command when the command is applied, so systems keep reading ticks and radians and the key names the source field. At world creation the registry's converted numbers are copied into run scope's tuning state under those keys, and every system reads a definition number through the tuning state, never the registry, so a `set_tuning` command on a definition key changes the next cast or spawn. The panel generates a slider per key from the registry with the default beside it in designer units, labelled "level n" for a table index, grouped by kind and id, searchable. Non-numeric fields are out of scope. The tuning table's existing keys keep their format.

**Acceptance:**
- Three keys picked at random (a hero stat, a spell table entry, an archetype stat) change on the next use from the panel and appear in the log.
- A key that does not exist is a type error at the command, not a runtime miss.
- A seconds field set to 2 from the panel reads as 60 ticks in the world and as 2 in the log.
- The world's tuning state allocates once at creation.

**Tests:**
- `tests/simulation/tuning.spec.ts` extended: definition keys, next-use semantics, replay of a session with definition tuning.
- `tests/domain/definitions/tuning-keys.spec.ts` — key generation over a fixture registry.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A developer-panel control.

**Note, 2026-09-24: 611 definition numbers on the surface, each a key, a slider, and a command.** `definitionFields` in `src/domain/definitions/definition-keys.ts` walks the hero, forms, spells, abilities, statuses, enemies, and summons and keys every number `def:<kind>:<id>:<field path>[:<index>]`, with the unit read from the field's name. A world copies those definitions at creation and builds every record from its copies, and each number goes into the tuning state under its key, converted, so the state takes all its keys at creation and never grows. A `set_tuning` on a definition key writes the world's copy, sets the tuning state, and rebuilds the one record read from that definition (`setDefinitionTunable`). The next cast or spawn reads the new number, and a unit already standing keeps its own. That is the ticket's "every system reads a definition number through the tuning state" taken as R13's copy-on-create: records built from the world's copies, not a string lookup per read. The domain's command key is `TuningKey | DefinitionKey`, which checks the `def:<kind>:` shape. The exact key union is content's, `ContentTuningKey`, derived from its constants, so a hand-written `ContentTuningCommand` with a key that names nothing fails to compile. The content index lists are now `as const satisfies` so the union sees each definition. The panel's new Definitions group makes a definition's sliders the first time its folder opens or a search reaches it. Each slider is labelled with its path, "level n", and its default, and the reset sends every moved slider back. Colours are left off, lists of objects take a dot segment, and the hero is `def:hero:hero`. These readings are decided provisionally in [Q35](../backlog/open-questions.md). The content-and-registries, world-model, commands-and-events, developer-panel, and where-to-look pages are updated. The content version does not change and both stored replays still replay. Tests: `tests/domain/definitions/tuning-keys.spec.ts` is new, over a fixture registry. `tests/simulation/tuning.spec.ts` gains eleven cases: a seconds field at 2 reads 60 ticks and logs 2, a Hoarfrost table entry changes the next cast, a hero stat and a form stat, a grunt's health on the next spawn but not the last, the registry and a second world untouched, a restart back to content, a key that names nothing refused at run time and at compile time, the state's size fixed, and a replay of a session with definition tuning. `tests/devtools/panel.spec.ts` gains four cases: no slider until opened, a search then a typed 2 logging 2 and reading 60, a search opening only its matches, and the reset. `pnpm check` and `pnpm test:budget` green. The three-random-keys walk from the panel by hand is deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, under "Waiting on a person" in STATUS.md.

---

### P4-S17-T02 — Content hot-reload

| Field | Value |
| --- | --- |
| Layer | app, content, tooling |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

**Build:** A Vite hot-module boundary on `src/content/index.ts`: on a change under `src/content/`, rebuild and revalidate the registry and swap it into the running world's tuning defaults for keys not currently overridden by a `set_tuning` command, between ticks; changes under `src/domain/` or `src/simulation/` reload the page. A registry that fails validation on reload keeps the old one and shows the error in the panel.

**Acceptance:**
- Editing a grunt's health and saving changes the next spawned pack's health without a page reload.
- A typo in a key on save shows the error and the game keeps running on the old registry.

**Tests:** none; manual.

**Definition of done:** Every change.

---

### P4-S17-T03 — Content version refusal and a replay recorded across a reload

| Field | Value |
| --- | --- |
| Layer | simulation, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | planned |

**Build:** The content version stamp covers every definition's converted numbers; a hot-reload that changes it marks the current input log as spanning two versions, and saving it produces a log the loader refuses with both versions named. A log recorded entirely within one version replays.

**Acceptance:**
- Save after a reload that changed a number: load refuses with a message.
- Save with no content change since the session started: replays identically.

**Tests:**
- `tests/simulation/replay-format.spec.ts` extended.

**Definition of done:** Every change · `src/simulation`.

---

### P4-S17-T04 — The balance pass

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | T01 |
| Status | planned |

**Build:** Three recorded sessions with the panel: hero stats against a pack of each archetype at levels 1, 10, and 20; every spell against packs at orb levels 1, 4, and 7; archetype stats so that the grunt is kited, the runner is not, the archer punishes standing still, the tank takes a combo. Each session's findings written into the definitions and the catalogues, with the input logs kept under `tests/simulation/replays/balance-*.json` and a spec that replays each. Numbers that changed cite "balance pass 1" beside the patch citation.

**Acceptance:**
- The three logs replay; the catalogues match the definitions; the product owner has played the result.

**Tests:**
- `tests/simulation/replays/balance.spec.ts`.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Three random keys retuned from the panel with no code change | |
| Hot reload and version refusal by hand | |
| Actual days per ticket | T01 0.5 · T02 · T03 · T04 |

## Risks in this sprint

- **R13 lives here.** If the key format or the read-through-tuning-state change touches every system, T01 grows. Scope to numeric fields and copy-on-create; do not build a live registry proxy.
- **R14** is handled by T03; a replay is only ever valid within one content version.
