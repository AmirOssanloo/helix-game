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

Definitions never change during play. A unit references its definition by id; everything that changes lives on the unit.

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

`content/index.ts` assembles every definition into one registry and validates it. Validation runs at startup and in CI, and it fails on:

- A definition that does not match its schema.
- An effect key or behaviour key that resolves to nothing.
- An atlas frame name that is not in the frame list.
- Two definitions sharing an id.

A world receives the registry when it is created. The domain never imports content; a test hands a world three definitions, and the game hands it all of them.

```typescript
const world = createWorld({ seed, registry, /* … */ })
```

---

## Tunables

Every number design may retune is a tunable: the hero's body values, the turn rate, pool activation radii, and every definition number. Tunables live in the tuning table under `content/`, with a default beside each. At world creation the table is copied into run scope, and a system reads tunables through the world, never through the content module. A tuning change is a command, so it lands in the input log and replays. [Commands and events](./commands-and-events.md) has the mechanism.

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

A system writing a stack count back into the status definition. The next unit that gets that status starts with someone else's stacks. Definitions are frozen; state lives on the entity.

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
| The content registry | Assembled and validated in `content/index.ts`, at startup and in CI |
| Validation fails on | A schema mismatch, an unresolved key, an unknown atlas frame, a duplicate id |
| Units in a definition | The designer's: seconds, world units, percentages; converted to ticks and radians once at load |
| The domain and content | The domain never imports content; the world receives the registry at creation |
| A number in a system | Never a literal; a tunable or a definition field |
| Tunables | The tuning table under `content/`, copied into run scope, read through the world, changed by command |
| Atlas frames | One list in `content/atlas-frames.ts`, read by the bake and the views |
| Mutating a definition | Never; state lives on the entity |

---

## Related documentation

- [Ability pipeline](./ability-pipeline.md) — what the effect primitives and named effects a definition names actually do
- [World model](./world-model.md) — which definition kinds exist
- [Content authoring standards](../standards/content-authoring.md) — how to write a definition file
- [ADR 0005 — Content references code by string key](../adr/0005-content-references-by-string-key.md) — why keys instead of functions
- [Adding a spell](../workflows/adding-a-spell.md) — the runbook this page underpins
