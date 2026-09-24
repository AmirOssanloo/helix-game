# Content and registries

> **Entry point:** [Architecture](./README.md)
> **See also:** [World model](./world-model.md) · [Ability pipeline](./ability-pipeline.md) · [Content authoring standards](../standards/content-authoring.md)

How spells, enemies, statuses, and maps are described as data, how that data finds the code it needs, and how a bad definition fails before a player sees it. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**A definition is immutable data. An entity holds only what changes. The two meet by id.**

Adding the eleventh spell or the fortieth enemy is a new file under `content/`, a new named effect if the spell does something no primitive covers, and a test. No new class, no new system.

---

## Definitions

A definition is a typed constant, one per file, under `content/<kind>/`. Its type lives in `domain/definitions/`, together with the validation schema for it. Content imports those types and nothing else from the domain.

```typescript
// content/spells/foo-bar.def.ts
export const fooBarDef = {
  id: 'foo_bar',
  targeting: 'point',
  effects: [{ kind: 'damage-area', /* … */ }, { kind: 'named', key: 'foo_bar_lift' }],
  atlasFrame: 'disc',
  /* … */
} as const satisfies SpellDef
```

Three things every definition holds:

- **An id**, the string other definitions and entities use to name it.
- **Its numbers**, written in the designer's units — seconds, world units, percentages. The registry converts to ticks and radians once at load.
- **Its keys** into the domain: effect keys, a behaviour key, an atlas frame name. Keys are strings, so content never imports a function.

Definitions never change during play. A unit references its definition by id; everything that changes lives on the unit. The one exception is a tuning command, below: it changes the world's own copy of a definition, never the registry.

---

## Registries

The domain holds two registries of code that content may name:

| Registry | Lives at | Holds |
| --- | --- | --- |
| Named effects | `domain/abilities/effects/` | One function per key, for behaviour no effect primitive covers |
| AI behaviours | `domain/ai/behaviours/` | One state-machine driver per key |

A key is the file name. A definition says `key: 'foo'`; the registry maps `'foo'` to the function in `foo.effect.ts`. The domain owns both sides of the lookup, so a rename is a compile error in the domain and a validation error in content, never a silent miss at cast time.

---

## The content registry

`content/index.ts` assembles every definition of every kind into one registry, in the designer's units. It is data and nothing else: content imports domain types only, so the validator lives in `domain/definitions/` beside the schemas, and it runs twice. The composition root runs it at startup before a world exists, and the content test runs it in CI. Either fails, with every fault named by content file, path, and expectation, on:

- A definition that does not match its schema, a field the schema does not know included.
- An effect key or behaviour key that resolves to nothing, or a named effect's fields that fail the schema declared beside the effect.
- A referenced id that does not exist: a status, a summon, an ability, a form, an archetype.
- A level table without one entry per orb level.
- An atlas frame name that is not in the frame list.
- Two definitions of one kind sharing an id. Spells and enemy abilities share one id space, as do enemies and summons.

A world receives the registry when it is created. The domain never imports content; a test hands a world three definitions, and the game hands it all of them.

```typescript
assertRegistryValid(registry)
const world = createWorld({ seed, registry, /* … */ })
```

---

## Tunables

Every number design may retune is a tunable: the hero's body values, the turn rate, pool activation radii, and every definition number. Tunables live in the tuning table under `content/`, with a default beside each. At world creation the table is copied into run scope, and a system reads tunables through the world, never through the content module. A tuning change is a command, so it lands in the input log and replays. [Commands and events](./commands-and-events.md) has the mechanism.

A tuning command carries its value in the designer's units, the same seconds or degrees the definition file writes, and the registry converts it exactly as it converts at load, once, when the command is applied. The panel shows designer units, the log records designer units, and a system still reads ticks and radians. A definition field's tuning key names the field by its property path verbatim, so a stale key fails to compile; [Coding standards](../standards/coding.md) has the key shape.

Every numeric field of every definition a world reads a number from — the hero, forms, spells, abilities, statuses, enemies, summons — is a tunable too, keyed `def:<kind>:<id>:<field path>`, with `:<index>` after a table entry. A colour is not. At world creation the world copies each of those definitions, builds its records from the copies, and puts every number of the copies into the tuning state under its key, converted. A tuning command on a definition key writes the world's copy, updates the tuning state, and rebuilds the one record read from that definition, so the next cast or spawn reads the new number and a unit already spawned keeps what it was dressed with. The copy is taken per world, so a retune never reaches the registry, another world, or a restart. The unit a field is converted from is read from its name, as the coding standard names fields: `fooSeconds` is seconds, a regeneration or a speed a body or a shot moves at is per second, the turn rate is radians per turn step, `fooDegrees` is degrees, and anything else is read as written. Content derives the exact union of its definition keys from its own constants, so a key naming a field, an id, or a table entry that does not exist is a compile error wherever content's key type is used; the domain's command type checks only the `def:<kind>:` shape, and the world refuses a key it does not hold.

---

## Atlas frames

The frame list in `content/atlas-frames.ts` is the one list both the boot-time bake and the views read. A definition names its frame; the view looks it up; the bake produces it. A frame name that no definition uses is still baked; a definition naming a frame that is not in the list fails validation. When real art arrives the list stays and the bake is replaced by a file, and no definition changes.

---

## Anti-patterns

### A definition that calls the domain

`effects: [liftUnits]` instead of `effects: [{ kind: 'named', key: 'lift_units' }]`. The content test now needs the whole domain, validation can no longer check the key, and the layer table is broken by one import.

### A number in a system

A radius or a duration written as a literal inside a system body. Design can't tune it, the panel can't show it, and it is the one number nobody remembers to change when the definition next to it moves. Every number is a tunable or a definition field.

### A definition that changes

A system writing a stack count back into the status definition. The next unit that gets that status starts with someone else's stacks. Definitions are frozen; state lives on the entity. Only a tuning command writes a definition number, and only the world's own copy.

---

## Quick reference

| Rule | Do |
| --- | --- |
| A definition | An immutable typed constant, one per file, under `content/<kind>/` |
| Definition types and schemas | `domain/definitions/` |
| Content may import | Domain types only, never domain functions |
| Naming code from content | By string key: effect keys, behaviour keys, atlas frame names |
| Named effects | `domain/abilities/effects/`, one file per key |
| AI behaviours | `domain/ai/behaviours/`, one file per key |
| The content registry | Assembled in `content/index.ts`; validated by the domain's validator at startup and in the content test |
| Validation fails on | A schema mismatch, an unresolved key, a named effect's fields failing its schema, a missing referenced id, a short level table, an unknown atlas frame, a duplicate id |
| Units in a definition | The designer's: seconds, world units, percentages; converted to ticks and radians once at load |
| The domain and content | The domain never imports content; the world receives the registry at creation |
| A number in a system | Never a literal; a tunable or a definition field |
| Tunables | The tuning table under `content/`, copied into run scope, read through the world, changed by command |
| A definition number | A tunable keyed `def:<kind>:<id>:<field path>[:<index>]`; the world copies the definition at creation, and a tuning command writes the copy and rebuilds its record for the next use |
| A tuning value in a command | Designer units, converted once by the registry when the command is applied; systems read ticks and radians |
| Atlas frames | One list in `content/atlas-frames.ts`, read by the bake and the views |
| Mutating a definition | Never, except a tuning command on the world's own copy; state lives on the entity |

---

## Related documentation

- [Ability pipeline](./ability-pipeline.md) — what the effect primitives and named effects a definition names actually do
- [World model](./world-model.md) — which definition kinds exist
- [Content authoring standards](../standards/content-authoring.md) — how to write a definition file
- [ADR 0005 — Content references code by string key](../adr/0005-content-references-by-string-key.md) — why keys instead of functions
- [Adding a spell](../workflows/adding-a-spell.md) — the runbook this page underpins
