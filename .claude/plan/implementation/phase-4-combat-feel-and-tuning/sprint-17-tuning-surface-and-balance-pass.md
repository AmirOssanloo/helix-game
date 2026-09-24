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
| Status | done |

**Build:** A Vite hot-module boundary on `src/content/index.ts`: on a change under `src/content/`, rebuild and revalidate the registry and swap it into the running world's tuning defaults for keys not currently overridden by a `set_tuning` command, between ticks; changes under `src/domain/` or `src/simulation/` reload the page. A registry that fails validation on reload keeps the old one and shows the error in the panel.

**Acceptance:**
- Editing a grunt's health and saving changes the next spawned pack's health without a page reload.
- A typo in a key on save shows the error and the game keeps running on the old registry.

**Tests:** none; manual.

**Definition of done:** Every change.

**Note, 2026-09-24: an edit to a content number reaches the running world as a tuning command; anything else reloads the page.** The boundary is `src/app/main.ts` accepting `@content/public`, the door the composition root imports content through, which re-exports `content/index.ts`: the ticket's "boundary on `src/content/index.ts`" read as that door. The fixed-step driver no longer imports content, and reads its step from the world it drives (`stepMsOf`), so a content edit reaches only that boundary. A Vite dev server probe showed a change to `melee-grunt.def.ts` or `tuning.ts` sent as an update to `main.ts`, and a change under `src/domain/`, `src/simulation/`, or to the driver sent as a full reload. `reloadContent` in `src/app/content-reload.ts` validates the new registry and, on a fault, keeps the old one and names every fault on a new Content line in the panel's Simulation group. While a replay runs it refuses. `contentChangeOf` in `src/domain/definitions/content-change.ts` calls anything but a changed tunable number a reshape, which reloads the page. Otherwise `Session.retune` takes the registry, so a recreate, a replay check, and the saved stamp read it, and it submits a `set_tuning` per changed number the world still holds at the old default. The commands are in the log, as ADR 0004 asks of every tunable change. A number moved in the panel is kept and named. A retune still waiting for its tick counts as at the default, so two saves inside one tick, or while paused or hidden, both land. A reload that is taken builds the panel again over the new defaults. These readings are decided provisionally in [Q36](../backlog/open-questions.md). The content-and-registries, devtools, and development pages are updated. The ticket lists no tests. It gains `tests/domain/definitions/content-change.spec.ts` (seven cases) and `tests/app/content-reload.spec.ts` (six: the grunt's health edit on the next spawn, by a logged command in the same world; a typo'd behaviour key refused with the fault named and the old content kept; a reshape taking nothing; a panel-tuned number kept; a second save before the first ticked, then a recreate and the saved stamp; a replay refusing). `tests/app/fixed-step-driver.spec.ts` gains the driver stepping at its world's rate. `pnpm check` and `pnpm test:budget` green. The two manual acceptance rows, walked in a browser, are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, under "Waiting on a person" in STATUS.md.

---

### P4-S17-T03 — Content version refusal and a replay recorded across a reload

| Field | Value |
| --- | --- |
| Layer | simulation, tests |
| Size | 0.5 |
| Depends on | T02 |
| Status | done |

**Build:** The content version stamp covers every definition's converted numbers; a hot-reload that changes it marks the current input log as spanning two versions, and saving it produces a log the loader refuses with both versions named. A log recorded entirely within one version replays.

**Acceptance:**
- Save after a reload that changed a number: load refuses with a message.
- Save with no content change since the session started: replays identically.

**Tests:**
- `tests/simulation/replay-format.spec.ts` extended.

**Definition of done:** Every change · `src/simulation`.

**Note, 2026-09-24: a log that spans a content reload names every version it ran on and is refused.** The stamp already hashed every definition as written, and every converted number is a function of those and the step rate in the tuning table, so it covers every converted number; a new case in the replay-format spec moves each of the 611 definition numbers by one and sees the stamp move every time. The input log file keeps `contentVersion`, now the version the world was created under, and gains `contentReloads`, the version each reload the session took moved it to, in order. The session tracks both: a reload that moves the stamp appends to the list, and a recreate or a load begins a new log on one version and empties it. `checkReplayable` refuses a log with any reload before it looks at the registry, since a replay starts every number at one version and no registry reproduces a session that ran on two, with the message "The log spans a content reload: it was recorded on content version A and then B; …". A reload that comes back to the version it began on is still refused, and one that changes no number marks nothing. These readings are decided provisionally in [Q37](../backlog/open-questions.md). The two stored replays gain `"contentReloads":[]` and still replay. The content-and-registries, simulation-loop, devtools-and-instrumentation, developer-panel, and running-and-debugging pages are updated. `tests/simulation/replay-format.spec.ts` gains seven cases: the stamp over every definition number, the new field refused when it is not a list, a spanning log refused by `checkReplayable` even on the registry it ended on, and through the session a save with no content change replaying to the same units, tuning, and random state; a save after a grunt's health was reloaded refused with both versions named, by `beginReplay` too, and replaying again after a recreate; two reloads named in order; and a reload that changed nothing marking nothing. `pnpm check` and `pnpm test:budget` green. The refusal walked by hand in a browser is deferred until phase 5 is done, by the maintainer's standing instruction of 2026-09-24, under "Waiting on a person" in STATUS.md.

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
| Actual days per ticket | T01 0.5 · T02 0.3 · T03 0.2 · T04 |

## Risks in this sprint

- **R13 lives here.** If the key format or the read-through-tuning-state change touches every system, T01 grows. Scope to numeric fields and copy-on-create; do not build a live registry proxy.
- **R14** is handled by T03; a replay is only ever valid within one content version.
