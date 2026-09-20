---
name: add-an-enemy
description: "Use when adding an enemy archetype or an AI behaviour - a new definition under src/content/enemies/, a behaviour under src/domain/ai/behaviours/, and their tests. Triggers on: add an enemy, new enemy, archetype, enemy definition, behaviour key, AI behaviour, pack, aggro, leash."
---

# Add an enemy

The steps are owned by the runbook [Adding an enemy](../../../docs/workflows/adding-an-enemy.md). Follow it in order. This skill adds only what an automated worker needs beyond the page.

## Before step 1

- Load the quick references of [Content and registries](../../../docs/architecture/content-and-registries.md#quick-reference), [Movement, collision, and pathing](../../../docs/architecture/movement-collision-pathing.md#quick-reference), and [Content authoring standards](../../../docs/standards/content-authoring.md#quick-reference).
- Where the runbook's example and the content authoring standard differ on a field's shape, unit, or casing, the standard wins and the runbook gets fixed in the same change.
- Open the shortest existing file in `src/content/enemies/` and in `src/domain/ai/behaviours/` and match their shapes.

## While building

- A definition adds numbers and keys. It never adds movement code; every unit gets turn-then-move, push-out, and pathing for free.
- Every field is required. Do not add a default to make a definition shorter.
- A behaviour drives the state machine, reads the spatial hash, asks the pathing module for a path, allocates nothing, and takes every number from the unit's definition.
- An enemy ability follows the `add-a-spell` skill, under `src/content/abilities/`, without a recipe.
- Every archetype gets the six simulation tests the runbook lists: aggro on sight, aggro on damage, range holding, kiting or closing, leash, death with experience.

## Before reporting

Walk the "A new enemy or behaviour" rows of [the definition of done](../../../docs/workflows/definition-of-done.md), and the spell rows for any ability added. The developer panel dropdown must list the archetype with no code change. If a player can tell it apart from the others, the [enemies](../../../docs/product/features/enemies.md) page gets a row.

The panel check in the runbook's step 8 needs a browser and a person. Report it as not run if you cannot do it.
