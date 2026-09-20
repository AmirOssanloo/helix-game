# Definition of done

> **Entry point:** [Workflows](./README.md)

**Purpose:** the checklist a change passes before it is offered for review. Every row links the rule it comes from, so a reviewer can point at a row instead of writing a paragraph.

A change is done when every applicable row holds. "Not applicable" is a legitimate answer — say it, don't skip it.

---

## Every change

| Check | The rule |
| --- | --- |
| `pnpm check` passes locally — lint, typecheck, every test tier, build | [Development workflow](./development.md#what-youll-use-most) |
| No optional property; absence is `Type \| null` | [Coding standards](../standards/coding.md#quick-reference) |
| No non-null assertion; every missing case is handled on purpose | [Coding standards](../standards/coding.md#quick-reference) |
| No ticket, sprint, or branch reference in code or comments | [Coding standards](../standards/coding.md#quick-reference) |
| Old code the change replaces is deleted, not kept behind a flag | [Coding standards](../standards/coding.md#quick-reference) |
| Names follow the vocabulary: hero, unit, enemy, spell, ability, order, command, tick | [Product vocabulary](../product/vocabulary.md) |
| A documentation page that states a rule this change affects is updated in the same change | [Documentation standards](../documentation-standards.md#quick-reference) |

## A change under `src/domain` or `src/simulation`

| Check | The rule |
| --- | --- |
| No Phaser, DOM, `window`, `Math.random`, `Date.now`, or `performance.now` | [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md#quick-reference) |
| No allocation inside a system in steady state; pools are acquired and released, never `new` per tick | [Simulation coding standards](../standards/simulation-coding.md#quick-reference) |
| Time is a tick count; no seconds, no milliseconds inside the domain | [Simulation loop](../architecture/simulation-loop.md#quick-reference) |
| Every number comes from a tunable or a definition, never a literal in a system | [Content authoring standards](../standards/content-authoring.md#quick-reference) |
| A rule has a unit test; a sequence has a simulation test | [Testing standards](../standards/testing.md#quick-reference) |
| A bug that came with an input log now ships with a replay test under `tests/simulation/` | [Testing standards](../standards/testing.md#quick-reference) |
| The replay determinism test still passes | [ADR 0002](../adr/0002-custom-fixed-step-simulation.md) |
| The stress test still holds the mean tick under 4 ms | [Performance standards](../standards/performance.md#quick-reference) |

## A new command, event, or system

| Check | The rule |
| --- | --- |
| The variant is added to the `Command`, `DebugCommand`, or `DomainEvent` union, never handled outside it | [Commands and events](../architecture/commands-and-events.md#quick-reference) |
| The command validator refuses illegal cases with a reason, and a test covers each refusal | [Commands and events](../architecture/commands-and-events.md#quick-reference) |
| A new system is registered once, in `src/simulation/systems.ts`, at a stated position in the order | [Simulation loop](../architecture/simulation-loop.md#quick-reference) |
| A new event is drained by the presentation or the developer panel; an event nobody reads is removed | [Commands and events](../architecture/commands-and-events.md#quick-reference) |

## A new spell, effect, or enemy ability

| Check | The rule |
| --- | --- |
| One definition file under `src/content/`, added to the registry index | [Content and registries](../architecture/content-and-registries.md#quick-reference) |
| Every effect and behaviour key resolves; the content tier passes | [ADR 0005](../adr/0005-content-references-by-string-key.md) |
| Every atlas frame the definition names exists in `src/content/atlas-frames.ts` | [Presentation](../architecture/presentation.md#quick-reference) |
| One simulation test per effect, at orb levels 1 and 7 where the ability scales | [Testing standards](../standards/testing.md#quick-reference) |
| Targeting, cast point, cooldown, and mana come from the definition; the pipeline adds no special case | [Ability pipeline](../architecture/ability-pipeline.md#quick-reference) |
| The spell is checked in the arena against the training dummy with the panel | [Adding a spell](./adding-a-spell.md) |

## A new enemy or behaviour

| Check | The rule |
| --- | --- |
| One definition file under `src/content/enemies/`, added to the registry index | [Content and registries](../architecture/content-and-registries.md#quick-reference) |
| A new behaviour lives under `src/domain/ai/behaviours/` and is referenced by key | [ADR 0005](../adr/0005-content-references-by-string-key.md) |
| The developer panel dropdown lists it without a code change | [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md#quick-reference) |
| Simulation tests cover aggro on sight, aggro on damage, pack sharing, leash, and death with experience | [Testing standards](../standards/testing.md#quick-reference) |
| Abilities reuse the pipeline; nothing enemy-specific is added to it | [Ability pipeline](../architecture/ability-pipeline.md#quick-reference) |

## Anything under `src/presentation`

| Check | The rule |
| --- | --- |
| No Shape, no Graphics, no `Text` updated during sync; everything is a quad from the atlas or a `BitmapText` | [Presentation coding standards](../standards/presentation-coding.md#quick-reference) |
| No game object is created or destroyed during play; views are bound from a pool | [Presentation](../architecture/presentation.md#quick-reference) |
| Colour is a tint; a new shape is a new atlas frame, never drawn at runtime | [Presentation coding standards](../standards/presentation-coding.md#quick-reference) |
| Depth is one of the fixed bands | [Presentation](../architecture/presentation.md#quick-reference) |
| The sync reads the world view and writes sprites; it never reads a sprite back or decides anything | [Layers and the dependency rule](../architecture/layers-and-dependency-rule.md#quick-reference) |
| The render benchmark was rerun if the atlas or any view changed, with before and after numbers in the change description | [Performance standards](../standards/performance.md#quick-reference) |

## A developer-panel control

| Check | The rule |
| --- | --- |
| The control issues a `DebugCommand`; it touches no world state directly | [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) |
| The command appears in the input log, and a recorded panel session replays identically | [Commands and events](../architecture/commands-and-events.md#quick-reference) |
| A readout reads an instrumentation ring or the world view, never a sprite | [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md#quick-reference) |
| The [developer panel](../product/features/developer-panel.md) page lists the control | [Features](../product/features/README.md) |

## A documentation change

| Check | The rule |
| --- | --- |
| The page is exactly one of the five types | [Documentation standards](../documentation-standards.md#quick-reference) |
| An architecture or standards page's Quick reference holds every rule the body states | [Documentation standards](../documentation-standards.md#quick-reference) |
| Placeholders in architecture and standards; real names in runbooks and product pages | [Documentation standards](../documentation-standards.md#quick-reference) |
| Every link is relative and resolves | [Documentation standards](../documentation-standards.md#quick-reference) |
| A new term is in the vocabulary, one word per concept | [Product vocabulary](../product/vocabulary.md) |

---

## Related documentation

- [Development workflow](./development.md) — the commands the first rows run
- [Testing standards](../standards/testing.md) — what to test at which tier
- [Performance standards](../standards/performance.md) — the budgets the numbers are held to
- [Documentation standards](../documentation-standards.md) — when a change must update a page
