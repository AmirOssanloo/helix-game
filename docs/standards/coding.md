# Coding standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Simulation coding standards](./simulation-coding.md) · [Presentation coding standards](./presentation-coding.md) · [Content authoring standards](./content-authoring.md)

Naming, file suffixes, exports, function style, comments, imports, and composition. These apply to every layer under `src/`, to `tests/`, and to `bench/`. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each one.

---

## File and folder naming

**Everything is kebab-case.** Files, folders, no exceptions. It survives moving between case-sensitive and case-insensitive filesystems.

The suffix says what the file is, and lint rules and the architecture test match on it:

| Pattern | Holds |
| --- | --- |
| `*.def.ts` | One content definition — a spell, an enemy, a status, a map |
| `*.system.ts` | One per-tick system, a function over world state |
| `*.effect.ts` | One named effect the ability pipeline looks up by string key |
| `*.behaviour.ts` | One AI behaviour looked up by string key |
| `*.view.ts` | The pooled view for one entity kind |
| `*.scene.ts` | A scene |
| `*.spec.ts` | A test |

Commands and events have no suffix of their own: each union lives in one file under its folder, and a variant is a member of that union, never a file.

A file with no suffix is a plain module — a pool, a state machine, a helper. The suffix is for the kinds tooling needs to find.

---

## Exports and names

**The file name matches its main export.** `foo-bar.def.ts` exports `fooBarDef`; `foo.system.ts` exports `fooSystem`. Find a file by the thing you're looking for.

| Kind | Case | Example |
| --- | --- | --- |
| Types, interfaces, classes, definition types | Pascal | `FooDef`, `FooPool`, `FooScene` |
| Functions | camel | `fooSystem`, `applyFoo` |
| Constant objects, including definitions | camel | `fooBarDef`, `defaultFooTuning` |
| Primitive constants | Screaming snake | `MAX_FOO_COUNT` |
| Properties, including definition fields | camel | `fooBarSeconds`, `atlasFrame` |
| Ids, effect keys, and behaviour keys: string values | snake | `'foo_bar'`, `'foo_bar_hit'` |

Snake case for string values is deliberate: an id or a key is data, not code. It lives in the registry, the input log, and a developer-panel label, and it never changes once shipped. A property on a definition is code: the compiler checks it and a rename is a refactor, so it takes camelCase like every other property. A tuning key is built from both and each segment keeps its own case, `def:foo:foo_bar:bar.bazSeconds`, so the path is the property name verbatim and a rename fails to compile. [Content and registries](../architecture/content-and-registries.md#tunables) owns the key's format.

**Named exports everywhere.** A default export can be imported under any name, so a rename stops being a compile error.

**Names carry meaning, not derivation:**

- Short role-based identifiers: `target_id`, not `targeted_unit_id`.
- Product words over engine-flavoured ones: `Unit`, not `Actor`; `Zone`, not `AreaTrigger`. Which word is in [Product vocabulary](../product/vocabulary.md).
- Symmetric names for paired concepts, so each side disambiguates the other: `acquire` and `release`, `prev` and `curr`.
- The name matches the full behaviour: a system that also applies damage is not `fooMovementSystem`.

---

## Function style

**Arrow functions by default.** A class is for something with identity that lives across ticks or frames — the world, a pool, a scene, a view. Everything else is a plain function over data.

**Always write the return type.** It's documentation that can't go stale, and it catches a changed shape at the definition rather than at some call site far away.

**Braces and multiple lines for control flow** — a single-line `if` is one careless edit away from a bug that reads correctly. **Breathe between blocks**: a blank line before a return, around a branch, between the setup and the work.

```typescript
export const fooSystem = (world: World): void => {
  /* … */
}
```

---

## Composition over inheritance

**No subclass trees for behaviour.** A unit is not a class hierarchy of `Unit → Enemy → RangedEnemy`; it is pooled state plus a definition. Shared behaviour is a system that runs over every entity whose state qualifies, or a function two callers share. A definition selects behaviour by string key; it never extends another definition.

Inheritance is reserved for a genuine is-a relationship a framework demands — a scene extending Phaser's scene class is the one you will meet.

---

## Strictness

**Strict TypeScript, no `any`.** An unknown shape is `unknown` and narrowed. A shape you cannot name is a shape you do not understand yet.

**No optional properties.** Absence is `Type | null`, written on purpose. An optional property is a decision someone skipped, and it makes every reader ask whether missing means "not set" or "not applicable".

**No non-null assertions.** The problem isn't the operator. It's that `!` lets you skip a decision: *what should happen when this is missing?*

| What you mean | Write |
| --- | --- |
| There's a sensible default | `value ?? DEFAULT_FOO` |
| Missing changes what happens | `if (value === null) { return handleMissing() }` |
| Missing is a refused command | Return the refusal reason; [Simulation coding standards](./simulation-coding.md#quick-reference) |
| Missing is impossible, and if it happens we're broken | `assert(value !== null, 'what was violated')` |
| The caller can decide better | Return `T \| null` and let them |

---

## Comments

**Explain why, never what.** The code says what it does. A comment repeating it is a second thing to keep true, and it's the one that rots.

```typescript
// Four passes, not three: three let a crowd in a corridor press two discs onto one point.
```

Comments worth writing: a non-obvious constraint, a deliberate choice that looks wrong at a glance, a workaround, a warning about something the next person would break, the source of a number taken from the reference game.

**A docblock goes on anything a caller needs to understand from outside** — a public door, a pool's acquire contract, an exported function with a subtle rule. Not on everything.

**Never reference a ticket, a sprint, or a branch in code.** Write the reason instead; that stays true. **`TODO` needs an owner and a condition** — who removes it, and what has to be true first.

---

## Imports

**All imports at the top of the file.** A dynamic import inside a function hides a dependency and makes load order something you have to reason about.

**Cross-layer imports use the path aliases** — `@shared`, `@domain`, `@simulation`, `@content`, `@presentation`, `@devtools`, `@app` — and go through that layer's `public.ts`. A relative path that climbs out of a layer is a lint failure. Which layer may import which is in [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md#quick-reference).

**Order them** in four groups with no blank line between: Node built-ins, external packages, aliased layers, relative imports. Alphabetical inside each group, case ignored. Lint sorts them, so nobody arranges imports by hand. **`import type` for anything used only as a type**, so the build can drop it and the domain's type-only view of content stays type-only.

---

## Replacing code

**Old code a change replaces is deleted in the same change.** Not kept behind a flag, not left as a fallback, not renamed `-legacy`. Two implementations of one behaviour means every reader has to work out which one runs, and the one nobody meant to keep is the one that gets called.

If the old path must survive for a while, the reason and the removal condition are written next to it, the way a `TODO` is.

---

## Anti-patterns

### A file name that doesn't match its export

`helpers.ts` exporting `fooSystem`. Now finding the system means grepping instead of looking, and the architecture test that lists systems by suffix never sees it.

### A base class to share one method

`BaseEnemy` with `takeDamage`, extended four times. The fifth enemy needs a different rule, overrides it, and now the same call does five things. A damage system over unit state does it once.

### `!` to get past a type error

It skips the only question worth asking — what should happen when this is missing. Answer it in the code.

---

## Quick reference

| Thing | Rule |
| --- | --- |
| Files and folders | kebab-case, always; the suffix says what the file is |
| Suffixes | `.def.ts` definition · `.system.ts` system · `.effect.ts` named effect · `.behaviour.ts` AI behaviour · `.view.ts` view · `.scene.ts` scene · `.spec.ts` test |
| Commands and events | Variants of one union in one file per folder, never a file per variant |
| Main export | Matches the file name; named, never default |
| Casing | Types, classes, definition types PascalCase; functions and constant objects camelCase; primitive constants SCREAMING_SNAKE_CASE; properties, including definition fields, camelCase; ids and keys, as string values, snake_case |
| Identifiers | Role-based and short; product words over engine words; symmetric for pairs; matching the full behaviour |
| Function style | Arrow by default; classes only for things with identity across ticks or frames; return types always written |
| Control flow | Braced and multi-line; a blank line before a return, around a branch, between setup and work |
| Sharing behaviour | A system over data or a shared function. No subclass trees; a definition selects by string key |
| Inheritance | Only where a framework demands an is-a, such as a scene |
| Strictness | Strict compiler, no `any`; `unknown` and narrow |
| Optional properties | Never. Absence is `Type \| null` |
| Missing values | Handled on purpose. No `!` |
| Comments | Why, not what; docblocks only on what a caller must understand from outside; `TODO` needs an owner and a condition; never a ticket, sprint, or branch |
| Imports | Top of file; cross-layer through aliases and `public.ts`; grouped built-in → external → aliased → relative, alphabetical, no blank lines between groups; `import type` for types |
| Replaced code | Deleted in the same change; a temporary survivor names its reason and removal condition |

---

## Related documentation

- [Simulation coding standards](./simulation-coding.md) — determinism, allocation, and failures in the two Node-only layers
- [Presentation coding standards](./presentation-coding.md) — the rules for the one layer that draws
- [Content authoring standards](./content-authoring.md) — how a definition file is written
- [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md) — which alias may import which
- [Product vocabulary](../product/vocabulary.md) — which word the product uses
