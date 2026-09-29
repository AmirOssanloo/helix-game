# Content and registries

> **Entry point:** [Architecture](./README.md)
> **See also:** [World model](./world-model.md) · [Ability pipeline](./ability-pipeline.md) · [Content authoring standards](../standards/content-authoring.md)

How spells, enemies, statuses, and maps are described as data, how that data finds the code it needs, and how a bad definition fails before a player sees it. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**A definition is immutable data. An entity holds only what changes. The two meet by id.**

Replacing a spell or adding the fortieth enemy is a new file under `content/`, a new named effect if the spell does something no primitive covers, and a test. No new class, no new system.

---

## Definitions

A definition is a typed constant, one per file, under `content/<kind>/`. Its type lives in `domain/definitions/`, and its schema in its kind's descriptor, below. Content imports those types and nothing else from the domain.

```typescript
// content/spells/foo-bar.def.ts
export const fooBarDef = {
  id: 'foo_bar',
  targeting: 'point',
  effects: [{ kind: 'damage_area', /* … */ }, { kind: 'named', key: 'foo_bar_lift' }],
  preview: { kind: 'circle', /* … */ atlasFrame: 'foo_ring' },
  /* … */
} as const satisfies SpellDef
```

Three things every definition holds:

- **An id**, the string other definitions and entities use to name it.
- **Its numbers**, written in the designer's units — seconds, world units, percentages. The registry keeps them as written; the world converts them to ticks, per-tick rates, and radians once, when it is created and builds its records.
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
- A damage rate per second anywhere but a zone's each-tick list, or anywhere under a named effect's fields, which the world does not convert.
- An enemy or summon that carries a status twice, more than two statuses, or a status that raises a flag, which it would hold until it died.
- A level table without one entry per orb level.
- A disable matrix that leaves a status out of every row or puts one in two, names a status that does not exist, lacks a column, writes a row's flags other than the flags its statuses raise, or gives a reason to a row that refuses nothing or none to one that refuses.
- An atlas frame name that is not in the frame list.
- An item definition that names an armory slot or a stat that does not exist, a base whose size does not fit the inventory, an affix on an armory slot it may not roll on, a loot table naming a rarity that does not exist or holding more item rolls than a drop has room for, a Legendary piece on a base that does not exist, or a map pack naming a Legendary piece that does not exist or naming one at a tier other than boss. An affix may roll only on the armory slots of its stat's first tier, in list order, since a roll draws a stat by the slot and then a tier of it. An affix or a loot table's weight that names Legendary, a rarity of fixed pieces, is refused as one naming no rarity; so is a chance above one, a range whose least value is above its greatest, and a quality level, affix level, or requirement below one.
- Two definitions of one kind sharing an id. Spells and enemy abilities share one id space, as do enemies and summons, and bases and Legendary pieces.

A world receives the registry when it is created. The domain never imports content; a test hands a world three definitions, and the game hands it all of them.

```typescript
assertRegistryValid(registry)
const world = createWorld({ seed, registry, /* … */ })
```

---

## Definition kinds

A definition kind is one descriptor, a file under `domain/definitions/kinds/`, and one line in the kind list beside it. The descriptor holds everything the domain does with the kind:

| Field | Holds |
| --- | --- |
| Field | The registry field the kind's definitions sit under |
| Shape | A list of many, with the content folder a definition's file sits in and the name other definitions reference one by; or exactly one, with its file |
| Stage | Its place in validation order: a gate, checked first, or a kind whose schema is built for the orb level cap |
| Schema | The shape a definition must have |
| Check | Its cross-references: every id, key, and frame it names |
| Namespace | For a list, the id space a duplicate is refused in; kinds that share one, such as spells and enemy abilities, name the same one |
| Tuning | The word its tuning keys name it by, its panel folder's title, and how the record read from a definition is rebuilt after a tuning command; `null` for a kind with no number the tuning surface reaches |

The kind list is the one place kinds are enumerated. The registry's type, the kinds a tuning key may name, and the definitions a world copies are derived from it by type, so nothing else is edited by hand. Validation walks it in order: the gate kinds first, since the hero's orb level cap fixes every table's length, and a fault in a gate stops there; then every other kind's schema; then each kind's check over the definitions whose shape passed; then every namespace for a duplicate. A world walks it once at creation, copying every tunable kind's definitions and putting each number under its key.

```typescript
// domain/definitions/kinds/foo.kind.ts
export const fooKind: ListKind<'foos', FooDef, 'foo'> = {
  field: 'foos', shape: 'list', folder: 'foos', namespace: 'a foo',
  nameOf: (def) => def.id, stage: 'levelled',
  schema: (levels) => objectOf<FooDef>({ id: idSchema, bar: levels.levelTable }),
  check: (context, file, def) => checkReference(context, file, 'bazId', def.bazId, context.space('baz', ['bazs'])),
  tuning: { kind: 'foo', title: 'Foos', rebuild: (run, id, def, simHz) => { /* … */ } },
}
```

Adding a kind is three files under `src/`: its descriptor, its line in the kind list, and its line in `content/index.ts`, beside the content's own definition files. The typed tables run scope builds from the copies, such as the spell and unit tables, are written by hand per kind and are not part of the descriptor; the descriptor's tuning rebuild writes the one record a tuning command changes. Past the gates, validation order decides only which fault is listed first; each fault's file, path, and message are the kind's own.

---

## Tunables

Every number design may retune is a tunable: the hero's body values, the turn rate, pool activation radii, and every definition number. Tunables live in the tuning table under `content/`, with a default beside each. At world creation the table is copied into run scope, and a system reads tunables through the world, never through the content module. A tuning change is a command, so it lands in the input log and replays. [Commands and events](./commands-and-events.md) has the mechanism.

A tuning command carries its value in the designer's units, the same seconds or degrees the definition file writes, and the world converts it exactly as it converts at creation, once, when the command is applied. The panel shows designer units, the log records designer units, and a system still reads ticks and radians. A definition field's tuning key names the field by its property path verbatim, so a stale key fails to compile; the format is below, and [ADR 0009](../adr/0009-definition-tuning-key-is-the-field-path.md) records why.

Every numeric field of every definition a world reads a number from — the hero, forms, spells, abilities, statuses, enemies, summons, loot tables — is a tunable too, keyed `def:<kind>:<id>:<field path>`, with `:<index>` after a table entry. A colour is not. At world creation the world copies each of those definitions, builds its records from the copies, and puts every number of the copies into the tuning state under its key, converted. A tuning command on a definition key writes the world's copy, updates the tuning state, and rebuilds the one record read from that definition, so the next cast or spawn reads the new number and a unit already spawned keeps what it was dressed with. The copy is taken per world, so a retune never reaches the registry, another world, or a restart. The unit a field is converted from is read from its name, as the coding standard names fields: `fooSeconds` is seconds, a regeneration or a speed a body or a shot moves at is per second, the turn rate is radians per turn step, `fooDegrees` is degrees, and anything else is read as written. Content derives the exact union of its definition keys from its own constants, so a key naming a field, an id, or a table entry that does not exist is a compile error wherever content's key type is used; the domain's command type checks only the `def:<kind>:` shape, and the world refuses a key it does not hold.

A definition key is four segments joined by colons, and a fifth for a table entry:

```text
def:<kind>:<id>:<field path>[:<index>]

def:enemy:foo_bar:baz                          a number at the top of a definition
def:spell:foo_bar:bazSeconds:2                 the third entry of a table of numbers
def:spell:foo_bar:effects.0.baz.byLevel:2      a table inside the first entry of a list of objects
def:spell:foo_bar:effects.0.baz.perLevel       the per-level term of that entry's amount
def:hero:hero:foo.barSeconds                   the hero, the one definition with no id of its own
```

The kind is one of `hero`, `form`, `spell`, `ability`, `status`, `enemy`, `summon`, `loot`. A map, an item base, an affix, the rarity table, a Legendary piece, and an active item reach no tuning surface: their descriptors' tuning is `null`, since their numbers shape the map a world is built on or the items the player already holds, and they change by editing content, which reloads the page under the dev server. A roll reads a tuned loot table defensively, a chance clamped to between none and always and a rarity by its weight over the sum of the weights it allows, and no retune takes away an elite's item or a boss's Rare or better: their first item roll is made whatever its chance, the boss's over the Rare and rarer weights alone. [ADR 0014](../adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md) records why. The id is the definition's id as written; the hero has none and is named `hero`. The field path is the property path verbatim, a dot per nesting level, each property keeping its own case, and an entry of a list of objects is a path segment of its own, its position counted from zero. A table is a list of numbers, and its entry goes after a colon, not a dot, counted from zero, so `:2` is level 3. The name the unit is read from is the last property in the path that is not `byLevel`, `perLevel`, or a position, so `effects.0.bazSeconds.byLevel:2` is in seconds, and an amount's per-level term is in its amount's unit: `bar.perSecond.perLevel` is per second, as `bar.perSecond.byLevel:2` is. `definitionFields` in the definitions module walks every definition and yields every key with its default and its unit; [Where to look](./where-to-look.md) points at it.

Under the dev server the content hot-reloads. The composition root is the one hot-module boundary, and it accepts `content/public.ts`, so an edit under `content/` reaches it and nothing else does; an edit anywhere else reloads the page, because a world cannot be patched mid-tick. The new registry is validated first, and one that fails is refused with every fault named in the panel while the game runs on the registry it had. A registry that changes anything but numbers the tuning surface reaches, or the step rate, reloads the page. Otherwise the session takes it, so a recreate, a replay check, and a saved log's stamp read it from then on, and every number it changes becomes a tuning command for the next tick, in the log like a slider's. A number a tuning command has moved from its old default is the person's and is kept. A replay runs on the content it was recorded against, so nothing is taken while one runs. The content version stamp hashes what the simulation reads of the registry as written, so it covers every number a world converts from it; the atlas frame list, and every field that only says how a thing is drawn, its frame and its tint, are left out, so an art or colour edit leaves every stored log valid. A reload that moves the stamp is written into the saved log beside the version the world was created under, and a log that spans two versions is refused, until a recreate or a load begins a log on one.

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
| Definition types | `domain/definitions/` |
| A definition kind | One descriptor under `domain/definitions/kinds/` holding its registry field, shape, stage, schema, checks, id namespace, and tuning, and one line in the kind list; the registry's type, the tunable kinds, and the definitions a world copies derive from the list |
| Adding a kind | Its descriptor, its line in the kind list, and its line in `content/index.ts`; no other file under `src/` but the content's own definition files. The typed tables run scope builds are written by hand per kind |
| Content may import | Domain types only, never domain functions |
| Naming code from content | By string key: effect keys, behaviour keys, atlas frame names |
| Named effects | `domain/abilities/effects/`, one file per key |
| AI behaviours | `domain/ai/behaviours/`, one file per key |
| The content registry | Assembled in `content/index.ts`, data only; validated by the domain's validator at startup and in the content test, every fault named by file, path, and expectation |
| Validation order | The kind list's: the gate kinds first, and a fault in one stops there; then every schema, then each kind's checks over what passed, then every namespace for a duplicate |
| Validation fails on | A schema mismatch or unknown field, an unresolved key, a named effect's fields failing its schema, a missing referenced id, an enemy or summon carrying a status twice, more than two, or one that raises a flag, a damage rate per second outside a zone's each-tick list or under a named effect, a short level table, a disable matrix that leaves a status out or puts one in two or disagrees with its statuses' flags, an unknown atlas frame, an unknown armory slot or stat, a base too large for the inventory, an affix on a slot its stat's first tier may not roll on, a weight or affix naming a rarity that does not roll, a chance above one, a loot table of more than eight item rolls, a pack naming a Legendary piece that does not exist or at a tier other than boss, a duplicate id in a namespace |
| Which definitions are tunable | The hero, forms, spells, abilities, statuses, enemies, summons, and loot tables; never maps, item bases, affixes, the rarity table, or Legendary pieces, whose descriptors' tuning is `null` |
| A tuned loot table | Read defensively by the roll: a chance clamped to between none and always, a rarity by its weight over the sum of the weights it allows, a weight below zero as zero; an elite's first item roll and a boss's are made whatever their chance, and a boss's allows only Rare or better |
| Units in a definition | The designer's: seconds, world units, percentages; the registry keeps them as written, and the world converts them to ticks, per-tick rates, and radians once, at creation |
| The domain and content | The domain never imports content; the world receives the registry at creation |
| A number in a system | Never a literal; a tunable or a definition field |
| Tunables | The tuning table under `content/`, copied into run scope, read through the world, changed by command |
| A definition number | A tunable keyed `def:<kind>:<id>:<field path>[:<index>]`; the world copies the definition at creation, and a tuning command writes the copy and rebuilds its record for the next use |
| A definition key | `def:<kind>:<id>:<field path>[:<index>]`; the hero's id is `hero`; the path is property names verbatim joined by dots, a list-of-objects entry its own segment; a table entry after a colon, counted from zero; the unit read from the last property name, so an amount's `perLevel` is in its table's unit; a stale key fails to compile in content, and the world refuses a key it does not hold |
| A tuning value in a command | Designer units, converted once by the world when the command is applied, exactly as at creation; systems read ticks and radians |
| Atlas frames | One list in `content/atlas-frames.ts`, read by the bake and the views |
| The content version stamp | A hash of what the simulation reads of the registry as written; the atlas frame list, frames, and tints left out |
| Content hot-reload | The composition root accepts `content/public.ts`; a registry that validates and changes only numbers is taken, its changes submitted as tuning commands, a number the panel moved kept, and the saved log marked as spanning two versions; one that fails validation is refused in the panel; any other change reloads the page |
| Mutating a definition | Never, except a tuning command on the world's own copy; state lives on the entity |

---

## Related documentation

- [Ability pipeline](./ability-pipeline.md) — what the effect primitives and named effects a definition names actually do
- [World model](./world-model.md) — which definition kinds exist
- [Content authoring standards](../standards/content-authoring.md) — how to write a definition file
- [ADR 0005 — Content references code by string key](../adr/0005-content-references-by-string-key.md) — why keys instead of functions
- [Adding a spell](../workflows/adding-a-spell.md) — the runbook this page underpins
