# ADR 0009 — A definition number's tuning key is its field path, verbatim

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                         |
| ----------------- | --------------------------------------------- |
| **Status**        | Accepted                                      |
| **Date**          | 2026-09-20                                    |
| **Deciders**      | Amir Ossanloo, with the engineering architect |
| **Supersedes**    | None                                          |
| **Superseded by** | None                                          |

## Context

[ADR 0004](./0004-all-mutation-enters-as-commands.md) makes every change to world state a command, a retune included, so a slider moved in the developer panel lands in the input log and replays. The tuning table's own entries have flat keys. But a designer retuning a fight wants the numbers on the definitions too: a spell's cooldown at level 3, an archetype's health, the seconds a status lasts inside the third entry of an effect list. Each of those needs a key a command can carry.

The key is written in three places that must agree: the input log, which outlives every rename; the developer panel, which builds its sliders by walking the definitions at run time; and a test or a hand-written command, where a stale key should fail before it runs. A key that means one thing today and nothing tomorrow is a replay that silently stops reproducing.

The format was argued twice: once for its shape, and again when the first panel built on it found the corners the shape did not settle — numbers inside a list of objects, the one definition with no id, and whether a colour is a number a designer tunes.

## Decision

**A definition key is `def:<kind>:<id>:<field path>`, with `:<index>` after a table entry.** The kind is the definition kind. The id is the definition's id as written; the hero, which has none, is `hero`. The field path is the property path verbatim, each property keeping its own case, with a dot per nesting level, and an entry of a list of objects is a segment of its own, counted from zero. An entry of a table of numbers goes after a colon, counted from zero, so `:2` is level 3.

```text
def:spell:foo_bar:bazSeconds:2
def:spell:foo_bar:effects.0.baz.byLevel:2
```

Only numbers are keyed, and a colour is not one. The value a command carries is in the designer's units, the ones the definition file writes, and the unit is read from the field's name; the world converts it once, when the command applies. Content derives the exact union of its keys from its own definitions, so a hand-written key naming nothing fails to compile. The domain's command type checks only the `def:<kind>:` prefix, and the world refuses a key it does not hold.

## Consequences

### What this makes easy

**A rename is a compile error.** Because the key is the property path verbatim, renaming a field in a definition type breaks every hand-written key that names it, in content and in tests, before anything runs.

**The panel needs no list of sliders.** It walks every definition, yields every numeric field with its key, its default, and its unit, and builds the controls from that. A new spell's numbers are tunable the moment its file exists.

**A log reads without the code.** `def:enemy:foo_bar:health` in a log says what was changed, in the unit the designer wrote it in. A bug report with a retune in it is legible to the designer who made it.

**One path rule for every kind.** A spell, an ability, a status, an archetype, a summon, a form, and the hero are all keyed by the same four segments, so the conversion and the refusal are one function.

### What this makes hard

**A rename breaks old logs.** The key is the field path, so a log recorded before a field was renamed carries a key the world no longer holds, and its retune is refused on replay. The content version stamp already refuses a log recorded against other content and names the version it needs, so this is caught, not silent, but the log replays only on a checkout of the content it was recorded on.

**List positions are part of the key.** Reordering a spell's effect list changes the key of every number in it. The designer who reorders a list is, in effect, renaming its fields.

**Non-numeric fields are out of reach.** A colour, a key, or a flag cannot be tuned live. A designer who wants to try a tint edits the file and the content reloads.

## Alternatives considered

**Snake case keys, mapped from camelCase fields.** It matches the tuning table's own keys and reads like the rest of the log. It lost because the map is a second name for every field, and a renamed field whose map is not updated keeps working under its old key until someone notices the slider moves nothing. The verbatim path has no map to forget.

**An id per number, written into the definition.** Every tunable number carries a stable id beside it, and the key names the id. It would survive renames and reordering. It lost because it doubles every number in every definition file with a string nobody reads, and the rename it guards against is caught at compile time anyway.

**A dot for a table entry, the same as a list of objects.** One separator is simpler to parse. It lost because a table is what the panel shows as "level 3", while a list-of-objects position is a path the designer never sees; the colon keeps a table entry recognisable as a level at a glance.

## Revisit when

- Saved sessions must survive content edits, so a log recorded on one content version replays on the next. Then keys need to outlive a rename, and a stable id per number is reopened.
- A non-numeric field needs to be tuned live, such as a tint or a behaviour key.
- A definition kind appears whose numbers are not on a record the world copies, and the path no longer names one place.

## References

Enforced by:

- The definition key type and the field walk under `src/domain/definitions/`, which shape the prefix, yield every key with its unit, and leave colours out.
- The content key union under `src/content/`, derived from the definitions as written, so a key that names nothing fails to compile.
- The world's tuning command, which refuses a key it does not hold.
- The tuning key spec under `tests/domain/definitions/` and the tuning spec under `tests/simulation/`.

---

## Related documentation

- [Content and registries](../architecture/content-and-registries.md) — the key format and how a retune reaches a record
- [Commands and events](../architecture/commands-and-events.md) — the tuning command that carries the key
- [Developer panel](../product/features/developer-panel.md) — the sliders built from the keys
- [ADR 0004 — All mutation enters as commands](./0004-all-mutation-enters-as-commands.md) — why a retune is a command at all
