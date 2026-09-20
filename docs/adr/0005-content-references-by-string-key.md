# ADR 0005 — Content references effects and behaviours by string key, never by function

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Status**        | Accepted                                               |
| **Date**          | 2026-09-20                                             |
| **Deciders**      | Amir Ossanloo, with the engineering architect          |
| **Supersedes**    | None                                                   |
| **Superseded by** | None                                                   |

## Context

A spell definition holds numbers — cast point, cooldown per orb level, mana, range — and it holds behaviour. Most behaviour is one of a few primitives: damage an area, apply a status, spawn a projectile, spawn a zone, spawn a unit, displace a unit. Some is bespoke: Updraft lifts units for a duration and drops them; Glacier places a line of segments perpendicular to the cast direction; Clarion is a cone that pushes and disarms. Enemy definitions have the same shape, with an AI behaviour instead of a cast.

Three constraints pull on how a definition names its behaviour. [ADR 0003](./0003-layered-single-package-architecture.md) says content imports domain **types** only, so a definition file cannot import a function from the domain. Adding a spell must not add a class, so the bespoke behaviour cannot be a subclass either. And a typo in a definition must fail at startup and in continuous integration, not at the moment a player throws the spell for the first time.

The people who feel this are the designer authoring the eleventh spell, who should be editing data, and the engineer who wants a renamed effect to be a test failure rather than a silent no-op.

## Decision

**A definition is data. It names the behaviour it needs by string key, and the domain holds the registry that resolves the key.**

Every definition file exports an `as const` object. A spell's `effects` field is a list whose entries are either a primitive with its parameters or a reference to a named effect by key. An enemy's `behaviour` field is a key. Statuses, maps, and the hero follow the same pattern for anything that is not a plain number.

The domain holds two registries: named effects under the ability module, and AI behaviours under the AI module. Each named effect is a plain function over world state and a cast context; each behaviour is a plain function over world state and a unit. Both live in the domain, are tested there, and are looked up by key at cast or tick time.

The content registry assembles every definition at startup, validates each against its schema, and resolves every effect and behaviour key against the domain registries. An unresolved key fails the boot, and the same check runs as a test in continuous integration, so a typo never reaches a player. There is no scripting layer, no expression language, and no interpreter: a key names a TypeScript function, and that is the whole mechanism.

```typescript
// content names behaviour; the domain resolves it
export const fooBarDef = {
  id: 'foo_bar',
  targeting: 'point',
  effects: [
    { kind: 'damage-area', radius: 300, amount: [100, 150, 200] },
    { kind: 'named', key: 'foo_lift' },
  ],
} as const
```

## Consequences

### What this makes easy

**Adding a spell is adding a file.** A definition, a named effect if the spell needs one, and tests for both. No class, no scene change, no registration by hand: the registry finds the file.

**Content is testable without the domain.** A content test loads every definition, validates it, and checks every key resolves, in a Node test that does not run a single tick. The designer gets a red test before the engineer gets a bug.

**A rename is a test failure.** Renaming a named effect and forgetting one definition fails the content test with the file name and the key. Nothing fails quietly.

**Enemies reuse the hero's pipeline for free.** An enemy stun is a definition with a `damage-area` and an `apply-status`, resolved by the same registry the hero's spells use. The pipeline has one set of primitives, not two.

### What this makes hard

**There is a key vocabulary to maintain.** Every named effect and behaviour is a string somewhere, and the list of valid strings is a fact the documentation must not copy. The registry is the list; the [where-to-look](../architecture/where-to-look.md) page points at it.

**Bespoke behaviour is still code.** A designer can author a spell from primitives, but a spell that needs a new named effect needs an engineer. This is the intended line, and it means the primitive set has to be chosen well enough that most spells never cross it.

**A key is a string until the registry checks it.** Inside a definition file the compiler cannot help; a union of valid keys generated from the registry would help, and is a reasonable follow-up, but the startup and test checks are what the rule rests on.

## Alternatives considered

**Function references in content.** A definition imports `fooLift` from the domain and puts it in its `effects` list. This was close: the compiler checks the name, and there is no registry to maintain. It lost because content then imports domain code, not just types, so the content test needs the domain to load, the layer rule breaks, and the registry can no longer validate a definition without executing it. The string key costs one lookup and keeps content as data.

**A scripting or expression layer**, where a definition holds a small program the domain interprets. It would let designers author bespoke behaviour without an engineer. It lost as over-engineering for a fixed list of ten spells and a bounded enemy roster: an interpreter in the hottest path, a second language to test, and a debugging story that runs through it.

**A class per spell.** The classic shape, and it lost before this record was written: composition over inheritance is a standing rule, and ten subclasses become forty the day enemy abilities arrive.

## Revisit when

- **The key vocabulary grows past what a table can hold** and the registries need namespacing or a generated key union to stay navigable.
- **Designers need to author bespoke behaviour without code.** Then the primitive set is not rich enough, and the choice is between more primitives and a scripting layer, argued in a new record.
- **A named effect needs per-definition parameters** beyond what the cast context carries. The likely answer is a parameter object on the reference, which this record allows and does not design.

## References

Enforced by:

- The layer allow-list in the ESLint flat config, which permits `content` to import from `domain` only with `import type`.
- The content registry under `src/content/`, which validates every definition against its schema and resolves every key at startup, failing the boot on the first miss.
- The content test under `tests/content/`, which runs the same validation and resolution in continuous integration.
- The effect and behaviour registries under `src/domain/`, which are the only places a key is bound to a function.

---

## Related documentation

- [Content and registries](../architecture/content-and-registries.md) — the definition shape, the registries, and validation
- [Ability pipeline](../architecture/ability-pipeline.md) — the primitives a definition composes and where named effects live
- [Content authoring standards](../standards/content-authoring.md) — how to write a definition file
- [Adding a spell](../workflows/adding-a-spell.md) — the runbook this decision makes short
- [ADR 0003 — Layered single-package architecture](./0003-layered-single-package-architecture.md) — why content imports domain types only
