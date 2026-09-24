# Content authoring standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Coding standards](./coding.md) · [Content and registries](../architecture/content-and-registries.md) · [Adding a spell](../workflows/adding-a-spell.md)

How a file under `src/content/` is written so that a designer can retune it, the registry can validate it, and the domain never has to know it exists. What content is and how the registry works is in [Content and registries](../architecture/content-and-registries.md); the step-by-step is in [Adding a spell](../workflows/adding-a-spell.md) and [Adding an enemy](../workflows/adding-an-enemy.md).

---

## One file, one definition

**One definition per file**, named after the definition's id in kebab-case: id `foo_bar` lives in `foo-bar.def.ts` and exports `fooBarDef`. Two spells in one file is two things to find by grepping.

**Ids are snake_case string keys and match the file name.** The id is what other definitions, commands, events, the developer panel, and the input log use to name the thing. It never changes after content ships, because an input log that names it must still replay.

**Every definition is added to the registry index** for its kind. A file that exists but is not registered is invisible, and the content test says so.

---

## A definition is data

**A definition is an `as const` plain object typed by the domain's definition type.** No functions, no classes, no getters, no computed fields. If a value needs computing, the domain computes it at load.

```typescript
export const fooBarDef = {
  id: 'foo_bar',
  targeting: 'point',
  cooldownSeconds: [/* one per orb level */],
  effects: [{ key: 'foo_burst', radius: 0 /* … */ }],
  atlasFrame: 'disc',
} as const satisfies FooDef
```

**Fields are camelCase, as any property is.** The snake_case strings in a definition are its values: the id, and the effect and behaviour keys. [Coding standards](./coding.md#exports-and-names) hold the rule.

**Named effects and behaviours are referenced by string key only.** A definition never imports the function behind a key. The registry checks every key resolves when it builds, so a typo fails at startup and in the content test rather than the first time a player casts. [ADR 0005](../adr/0005-content-references-by-string-key.md) holds the argument.

**No cross-references between definitions except by id.** A summon names the unit it spawns by id; a status names the status it replaces by id. Importing one definition into another makes the registry's validation order matter.

---

## Every number is a field

**Every number design might tune is a field on the definition, never a literal inside a formula in the domain.** The test is simple: could a designer want this different at orb level 7? Then it is a field, and probably a table.

**Tables by orb level are arrays indexed from level one with an explicit length.** The domain reads `table[level - 1]`; the content test asserts every table has the length the definition type declares, so a spell can never read past the end at max level.

**Units in content are the designer's units.** Durations in seconds, distances in world units, speeds in units per second, chances as fractions of one. The domain converts seconds to ticks at load, once. A content file never contains a tick count.

**A number design may retune carries a `// tunable` comment.** Numbers live in content files so they can change without touching code. A number a balance pass moved says so beside it, `// tunable; balance pass 1`, as a reference number cites its patch, and the catalogue's reason for it cites the same pass.

---

## Where it is drawn

**Every definition that has a visible presence declares its `atlasFrame`.** A spell's zone, an enemy's body, a projectile, a status icon: each names a frame from the frame list in `content/`. The content test asserts the frame exists. A definition with no frame draws nothing, and that is a decision, not a default.

Adding a frame is a content change: add it to the frame list, and the atlas bakes it at boot. [Presentation coding standards](./presentation-coding.md#quick-reference) say why nothing draws at runtime.

---

## What the content test checks

Every definition in the registry, on every run:

- It validates against its definition type's schema.
- Every effect key and behaviour key resolves in the domain's registries.
- Every id it references by string exists in the registry.
- Every table has its declared length.
- Every `atlasFrame` is in the frame list.
- No two definitions share an id.

A definition that fails any of these fails the build. [Testing standards](./testing.md#quick-reference) place the suite.

---

## Anti-patterns

### A formula in a definition

`damage: base * 1.5` inside the object literal. It is a number the designer cannot see as a number, it evaluates once at import time, and the developer panel shows the result with no way to change the factor. Two fields.

### A definition that extends another

`{ ...fooDef, id: 'bar' }`. The second definition now changes whenever the first does, silently, and a designer retuning the first breaks the second. Copy the fields; the duplication is the point.

### A tick count in content

`cooldownTicks: 600`. The tick rate is a simulation decision, and the day it changes every content file is wrong by the same factor. Seconds in content, ticks after load.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Files | One definition per file, kebab-case, named after the id |
| Ids | snake_case string keys matching the file name; never renamed once shipped |
| Fields | camelCase, as any property; only ids and keys are snake_case |
| Registration | Every definition is in its kind's registry index |
| Shape | An `as const` plain object satisfying the domain's definition type; no functions, classes, or computed fields |
| Effects and behaviours | Referenced by string key only; never imported |
| Cross-references | By id only; never import another definition |
| Numbers | Every tunable is a field, never a literal in a formula |
| Level tables | Arrays indexed from level one with the declared length |
| Units | Seconds, world units, units per second, fractions; the domain converts at load; no tick counts in content |
| Reference numbers | Cited with the patch in a comment; a number a balance pass moved cites the pass beside it |
| Drawing | Every visible definition declares an `atlasFrame` from the frame list |
| Validation | Schema, keys, referenced ids, table lengths, frames, unique ids — all in the content test, all build-failing |

---

## Related documentation

- [Content and registries](../architecture/content-and-registries.md) — what the registry does with these files
- [Adding a spell](../workflows/adding-a-spell.md) — the step-by-step for a new spell
- [Adding an enemy](../workflows/adding-an-enemy.md) — the step-by-step for a new enemy
- [ADR 0005 — Content references by string key](../adr/0005-content-references-by-string-key.md) — why a key and not an import
- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the reference numbers the hero's definitions cite
