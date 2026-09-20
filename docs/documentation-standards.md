# Documentation standards

> **Entry point:** [Documentation](./README.md)

The contract for every other page in this folder. Read it before you write or edit a doc.

If you only remember one thing: **each page has one job, and says that job in its first lines.**

---

## The five document types

Every page is exactly one of these. If you can't tell which one you're writing, you're writing two pages.

| Type | Answers | Lives in | Example question it settles |
| --- | --- | --- | --- |
| **Architecture** | What exists, and how do the parts connect? | `architecture/` | "Where does a new per-tick system go, and what may it import?" |
| **Standards** | What rule must my code follow? | `standards/` | "May I allocate inside a system?" |
| **Decision record** | Why is it this way, and when would we change it? | `adr/` | "Why does the simulation run its own fixed step instead of Phaser physics?" |
| **Runbook** | What do I type to make this work? | `onboarding/`, `workflows/` | "How do I replay a recorded session?" |
| **Product** | What are we building, and how does it behave? | `product/` | "What happens when the hero presses Q with three orbs already out?" |

### Choosing the type

The reader wants to **place** something → architecture. To **check** something → standards. To know **why**, or to argue → decision record. To **do** something now → runbook. To know **what the player sees** → product.

Two tests: a sentence starting "we chose" or "instead of" belongs in a decision record; a sentence telling you what to type belongs in a runbook.

---

## Write for the reader who wasn't in the room

Three people read these pages: an engineer who just joined, a principal engineer judging an approach, and a designer costing a change. All three are smart. None lives in this code.

- **Short, common words.** Spell out a term the first time, in the same sentence.
- **Say "we" and "you".** Short sentences, short paragraphs.
- **Name who is affected.** Not "this improves determinism" but "a bug report comes with a replay file, and the engineer sees the exact tick it went wrong."

No slogans, no padding.

---

## Write the target, not the history

**Every page describes how things must work. Present tense, no exceptions.** No "we used to", "this replaces", "moved from", "today versus later". No migration notes, phase numbers, branch names, tickets, or sprints.

**These pages are the standard the code is held to, not a report on the code's current state.** Where the code hasn't caught up, write the target and let the code come to it.

History belongs in a decision record, where "what we rejected" is the point. What arrives when belongs in the [roadmap](./product/roadmap.md), the one page allowed to say "phase".

---

## Invariants, pointers, and facts

Every sentence in this folder is one of three kinds:

| Kind | What it says | How it's written | Where it lives |
| --- | --- | --- | --- |
| **Invariant** | How something must be shaped, whatever exists today | By hand, placeholder names | `architecture/`, `standards/`, `adr/` |
| **Pointer** | Where a fact lives, as a path pattern | By hand, no real names | `architecture/where-to-look.md` |
| **Fact** | What exists right now — a spell, a system, a tunable | Confined to the places below | `architecture/world-model.md`, runbooks, product pages |

**If the code already knows it, don't write it. Write where to look.** A copied fact has two owners, and the copy loses.

- Fact, stale on the next change: "Hoarfrost has a 20 second cooldown at orb level 1."
- Pointer, still true a year later: "A spell's cooldown table is the `cooldown` field of its definition under `src/content/spells/`."

Three deliberate exceptions:

- **`architecture/world-model.md`** names the entity kinds and definition kinds and which module owns each, at that altitude. No fields.
- **Reference flows** — [Casting a spell](./architecture/casting-a-spell-flow.md) — use the product's own words (orb, Invoke, slot), because a worked example in placeholders teaches nothing. They still name no file.
- **Runbooks, product pages, and the [mechanics spec](./product/specs/character-movement-and-mechanics.md)** name everything, including numbers, because the reader has to type, click, or tune it.

---

## Use placeholder names in architecture and standards

**Architecture pages, standards pages, and the code examples inside decision records use made-up names for our own things** — never a real spell, enemy, system, or tunable. A real name in an example becomes a second copy of the codebase, stale on the next rename.

```text
foo, bar, baz            general placeholders
foo-bar, foo-baz         two-word placeholders, so casing is visible
FooBarDef, fooBarSystem, foo-bar.def.ts, foo_bar_radius
```

**Any identifier containing `foo`, `bar`, or `baz` is a placeholder. Every other identifier in a code example is real** — a platform technology (`Phaser`, `Vite`, `vitest`, `pnpm`, `BitmapText`) or a name the architecture fixes: `World`, `tick`, `Command`, `DebugCommand`, `DomainEvent`, `DevApi`, `ShapeAtlas`, `RetroFont`, `BootScene`, `PlayScene`, `HudScene`, `public.ts`, `systems.ts`, `fixed-step-driver.ts`. If you are not sure a name is fixed, use a placeholder.

**Runbooks and product pages do the opposite.** Real names, real paths, real numbers.

### Reading a placeholder

The kind suffix is real; only the `foo`/`bar`/`baz` stem is made up. Read the stem as "any". One vocabulary, used on every page:

| Placeholder | Stands for | Real ones live at |
| --- | --- | --- |
| `Foo`, `FooPool` | One entity kind and its pool | `src/domain/entities/` — one file per kind |
| `FooDef`, `foo-bar.def.ts` | One content definition — a spell, an enemy, a status, a map | `src/content/<kind>/` — one file each |
| `fooSystem`, `foo.system.ts` | One per-tick system, a function over world state | The module that owns it under `src/domain/`, listed in `src/simulation/systems.ts` |
| `fooEffect`, `foo.effect.ts`, key `"foo"` | One named effect a definition references by string key | `src/domain/abilities/effects/` |
| `fooBehaviour`, `foo.behaviour.ts`, key `"foo"` | One AI behaviour a definition references by string key | `src/domain/ai/behaviours/` |
| `FooCommand` | One variant of the command union | `src/domain/commands/` |
| `FooEvent` | One variant of the domain event union | `src/domain/events/` |
| `FooView`, `foo.view.ts` | The pooled view for one entity kind | `src/presentation/views/` |
| `FooScene`, `foo.scene.ts` | A scene | `src/presentation/scenes/` |
| `foo_bar` | A tuning parameter | The tuning table in `src/content/` |
| `atlas frame "foo"` | A baked atlas frame | The frame list in `src/content/atlas-frames.ts` |

Open the shortest file in the folder named and match its shape. The naming rules these placeholders follow are in [Coding standards](./standards/coding.md#quick-reference); this legend only decodes.

---

## Directory trees

Show **one entry per folder**, with a comment saying what belongs there. Two entries only where the plural is the point. The comment carries the meaning; the filename is just a shape.

```text
domain/
├── entities/      # Entity kinds, their pools, and their state shapes
│   └── foo.ts
├── commands/      # The command union and its ordering rule
└── public.ts      # The one door into the domain from other layers
```

A tree that mirrors real folders is the single biggest source of drift in a documentation set.

---

## Code examples

Show the **shape**, not a working implementation.

- One function where one makes the point. Two only if the second differs in kind.
- Replace bodies with `/* … */` unless the body *is* the lesson.
- No imports unless the import path is the thing being taught.
- If the prose below already states the rule, cut the example to the line the prose is about.

```typescript
export const fooSystem = (world: World): void => { /* … */ }
```

Full-size examples live in the code, where they compile and get tested.

---

## Page shape

Every page follows this skeleton. The middle changes; the opening and closing don't.

```markdown
# Page title

> **Entry point:** [Parent page](./parent.md)
> **See also:** [Sibling](./sibling.md) · [Sibling](./sibling.md)

One or two sentences: what this page is for, and what it is not.

## …sections…

## Anti-patterns

## Quick reference

---

## Related documentation

- [Page](./page.md) — why you'd go there
```

Architecture and standards pages carry `## Anti-patterns` and `## Quick reference`, in that order, with nothing between them and `## Related documentation`. Runbooks, product pages, and decision records omit both.

- **One `#` heading**, and it's the title. **No skipped levels.**
- **Architecture and standards pages end with `## Quick reference`, and it's a complete table.** Every rule the body states is a row; nothing in the table the body doesn't say. Tooling links the `#quick-reference` anchor, so the heading text never changes.
- **One summary section, never two.** The Quick reference table is it.
- **`## Anti-patterns` holds at most three entries**, each a failure story a Quick reference row doesn't already tell.
- **A page that is itself one table** — `architecture/where-to-look.md`, `architecture/world-model.md` — says so in one line where the Quick reference would go, and links the table.
- **`## Related documentation` closes every page**, at most five links, a reason next to each.
- **Every section stands alone.** If it carries no decision, no risk, and no next step, cut it.

Short enough to read in one sitting is the test. If a page can't be, it's two pages.

---

## Where a rule belongs

The same rule written in two places becomes two different rules. Check which page owns it:

| The rule is about | It belongs in |
| --- | --- |
| Where code goes and what it may import | Architecture |
| How code must be written | Standards |
| Why we picked this over the alternative | Decision record |
| What to type | Runbook |
| How the game behaves for the player | Product |
| A number the design tunes | The mechanics spec or a definition file, pointed at from a product page |
| Where a fact about the running system lives | A pointer in `architecture/where-to-look.md` |

The page that doesn't own it gets one sentence and a link, never a summary.

---

## Formatting

- **Headings** are sentence case: `## Core responsibilities`. Real names and short forms keep their casing.
- **Labels** put the colon inside the bold: `**Purpose:** …`.
- **Lists** use `-`. Fragments take no full stop; full sentences do.
- **Code blocks** always name a language. Use `text` if there isn't one.
- **Links** are relative: `[Title](./file.md)` or `[Title](../other/file.md)`.
- **Filenames** are kebab-case. `README.md` is the one exception.
- **Horizontal rules** are `---`.

---

## Anti-patterns

### Writing a fact the code owns

A cooldown, a pool capacity, or a system order on an architecture page. Right the day it's written, wrong the day something is retuned, and nothing tells you which day you're reading it on. Write the pointer.

### Explaining the journey

"Originally this used Arcade physics, but we moved to a custom tick when…" The reader doesn't need the trip. They need to know where it is. The trip belongs in a decision record.

### Leaving a placeholder page

An empty file, or one that says "to be written". It shows up in searches, gets linked, and teaches readers that pages here can't be trusted. Write it or leave it out.

---

## Quick reference

| Rule | Do |
| --- | --- |
| One job per page | Pick one of the five types; if you can't, you're writing two pages |
| Audience | Write for someone smart who has never seen this code; plain words, short sentences |
| Tense | Present, always. No history, no migrations, no phase numbers outside the roadmap |
| Facts the code owns | Don't write them. Write the pointer to where they live |
| Names in `architecture/` and `standards/` | Placeholders (`foo`, `FooDef`, `fooSystem`) for our spells, enemies, systems, and tunables |
| What marks a placeholder | `foo`, `bar`, or `baz` in the identifier. Every other identifier is real: a platform technology or a name the architecture fixes |
| Decoding a placeholder | [The legend](#reading-a-placeholder): one vocabulary on every page, each entry naming the kind, the real-name shape, and the folder to list |
| Reference flows | [Casting a spell](./architecture/casting-a-spell-flow.md) uses product words, and still names no file |
| Names in runbooks, product pages, and the mechanics spec | Real, every time, numbers included |
| Directory trees | One entry per folder, with a comment; never a real tree |
| Code examples | Shape only; bodies as `/* … */`; no imports unless the import is the lesson |
| Headings | One `#`; no skipped levels; sentence case |
| Closing sections | `## Anti-patterns` → `## Quick reference` → `## Related documentation`, architecture and standards pages only |
| Anti-patterns | At most three, each a failure story a row doesn't already tell |
| Related documentation | At most five links, each with a reason |
| Quick reference completeness | Every rule in the body is a row; the heading text never changes |
| Breadcrumb | `> **Entry point:** [Parent](./parent.md)` under the title, decision records included |
| Duplicated rule | One owning page keeps the explanation; the others keep one sentence and a link |
| Links | Relative, with a reason next to each one under `## Related documentation` |

---

## Related documentation

- [Documentation index](./README.md) — the map of everything these rules govern
- [Architecture decision records](./adr/README.md) — the shape a decision record takes, and when to write one
- [Coding standards](./standards/coding.md) — the kebab-case and naming rules, applied to code
- [Roadmap](./product/roadmap.md) — the one page that says what arrives when
