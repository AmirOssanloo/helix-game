---
name: add-a-spell
description: "Use when adding a hero spell, an enemy ability, or a named effect - a new definition under src/content/spells/ or src/content/abilities/, an effect under src/domain/abilities/effects/, and their tests. Triggers on: add a spell, new spell, new ability, enemy ability, named effect, effect key, spell definition."
---

# Add a spell

The steps are owned by the runbook [Adding a spell](../../../docs/workflows/adding-a-spell.md). Follow it in order. This skill adds only what an automated worker needs beyond the page.

## Before step 1

- Load the quick references of [Ability pipeline](../../../docs/architecture/ability-pipeline.md#quick-reference), [Content and registries](../../../docs/architecture/content-and-registries.md#quick-reference), and [Content authoring standards](../../../docs/standards/content-authoring.md#quick-reference).
- Where the runbook's example and the content authoring standard differ on a field's shape, unit, or casing, the standard wins and the runbook gets fixed in the same change.
- Open the shortest existing file in the target folder and match its shape before writing a new one.

## While building

- Content names effects by string key and imports domain types only. If the primitives cover the spell, add no named effect.
- A named effect runs inside the tick: no allocation, no clock, every number from the cast's definition or the tuning table.
- One simulation test per effect, at orb levels 1 and 7 where the ability scales, plus the refusals the runbook lists.
- An enemy ability is the same shape without a recipe, under `src/content/abilities/`, listed in the enemy's `abilities`.

## Before reporting

Walk the "A new spell, effect, or enemy ability" rows of [the definition of done](../../../docs/workflows/definition-of-done.md). If a player can tell the spell apart from the others, the [spells and attack](../../../docs/product/features/spells-and-attack.md) page describes it.

The arena check in the runbook's step 8 needs a browser and a person. Report it as not run if you cannot do it.
