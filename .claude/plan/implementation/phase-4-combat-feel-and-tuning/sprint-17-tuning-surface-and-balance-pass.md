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
| Status | planned |

**Build:** A tuning key format for definition fields: `def:<kind>:<id>:<field path>[:<index>]`, numeric fields only. At world creation the registry's converted numbers are copied into run scope's tuning state under those keys, and every system reads a definition number through the tuning state, never the registry, so a `set_tuning` command on a definition key changes the next cast or spawn. The panel generates a slider per key from the registry with the default beside it, grouped by kind and id, searchable. Non-numeric fields are out of scope. The tuning table's existing keys keep their format.

**Acceptance:**
- Three keys picked at random (a hero stat, a spell table entry, an archetype stat) change on the next use from the panel and appear in the log.
- A key that does not exist is a type error at the command, not a runtime miss.
- The world's tuning state allocates once at creation.

**Tests:**
- `tests/simulation/tuning.spec.ts` extended: definition keys, next-use semantics, replay of a session with definition tuning.
- `tests/domain/definitions/tuning-keys.spec.ts` — key generation over a fixture registry.

**Definition of done:** Every change · `src/domain` · A new command, event, or system · A developer-panel control.

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
| Actual days per ticket | T01 · T02 · T03 · T04 |

## Risks in this sprint

- **R13 lives here.** If the key format or the read-through-tuning-state change touches every system, T01 grows. Scope to numeric fields and copy-on-create; do not build a live registry proxy.
- **R14** is handled by T03; a replay is only ever valid within one content version.
