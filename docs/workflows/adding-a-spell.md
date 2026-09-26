# Adding a spell

> **Entry point:** [Workflows](./README.md)

**Purpose:** add one ability to the game — a hero spell, or an enemy ability, which goes through the same pipeline — from definition file to a green check and a cast in the arena. In order; each step says what you type and what you should see.

The example below adds a made-up spell called **Frost Lance**: a point-targeted bolt that damages and slows. It exists only on this page. Three orbs give exactly ten recipes and the hero has ten spells, so a new hero spell always takes the recipe of one it replaces: Frost Lance takes Wane's. Steps 1 to 9 write and prove the new spell; [Replacing a spell](#replacing-a-spell) is the rest of the swap. An enemy ability has no recipe and replaces nothing.

---

## 1. Read the two pages that own the shape

[Ability pipeline](../architecture/ability-pipeline.md) says what a definition may ask the pipeline to do — targeting kinds, cast point, cooldown clocks, and the effect primitives. [Content and registries](../architecture/content-and-registries.md) says how a definition points at a named effect by string key and how the registry validates it. Five minutes now saves a round of review.

---

## 2. Write the definition

One file per spell. Hero spells live under `src/content/spells/`; enemy abilities under `src/content/abilities/`. The file name is the id.

```bash
touch src/content/spells/frost-lance.def.ts
```

```typescript
import type { SpellDef } from '@domain/public'

export const frostLanceDef = {
  id: 'frost_lance',
  recipe: ['quartz', 'quartz', 'whorl'],          // The orb multiset; order is ignored
  targeting: 'point',                             // 'none' | 'unit' | 'point' | 'direction' | 'vector'
  castPointSeconds: 0.1,                          // Before the effect fires; the hero must face the target first
  backswingSeconds: 0.2,                          // After the effect fires; a new order cancels it
  cooldownSeconds: [20, 18, 16, 14, 12, 10, 8],   // Indexed by the lowest orb level in the recipe, 1 to 7
  manaCost: [100, 110, 120, 130, 140, 150, 160],
  range: 1000,
  effects: [
    {
      kind: 'spawn_projectile',
      origin: 'caster',                           // Leaves from the hero toward the click, not from the click
      speed: 1200,
      radius: 40,
      homing: false,
      maxRange: 1000,
      onHit: [{ kind: 'named', key: 'frost_lance_hit', fields: { slowSeconds: 2 } }],
      atlasFrame: 'disc',
      tint: 0x66ccff,
    },
  ],
  preview: { kind: 'circle', radius: 40, atlasFrame: 'ring_thin' },
  atlasFrame: 'disc',
  tint: 0x66ccff,
} as const satisfies SpellDef
```

`recipe` is what R compares against the three held orb instances. `effects` is a list of primitives; the projectile's `onHit` list names a domain effect by string key with the fields that effect declares, so this file imports a type and nothing else. A number that scales writes a level table naming its orb, `{ orb: 'quartz', byLevel: [/* seven */] }`. Durations are seconds, converted to ticks once at load; a definition never holds a tick count. The id is snake_case and matches the file name. A cooldown, mana, or level table without seven entries fails validation.

---

## 3. Add the named effect, if the primitives are not enough

Damage and a slow are both primitives, so Frost Lance could be written without a named effect. Anything with its own rules — a wall placed in segments, a updraft that lifts units — is a named effect under `src/domain/abilities/effects/`:

```bash
touch src/domain/abilities/effects/frost-lance-hit.effect.ts
```

```typescript
export const frostLanceHitFields = objectOf({ slowSeconds: nonNegativeSchema })
export const frostLanceHitEffect: NamedEffect = (world, cast, fields) => { /* … */ }
```

Register the key in `src/domain/abilities/effects/index.ts` with the schema of its fields beside it:

```typescript
['frost_lance_hit', { fields: frostLanceHitFields, run: frostLanceHitEffect }],
```

The effect runs inside the tick with the world and the cast context, which carries the caster, the ability, the orb levels at commit, the anchor and facing, the direction a vector cast was dragged along if it was, the target, and the zone that ran it if one did. It allocates nothing, reads no clock, and gets every number from `cast.ability`, its own fields, or the tuning table. The registry validates the fields against the schema when content loads, so a typo in a field name fails the content tier, not the first cast.

---

## 4. Add an atlas frame, if the spell needs a new shape

A disc, a ring, a rectangle, or a line is already a frame. A cone is baked per angle, so a new cone angle is a new frame:

```typescript
// src/content/atlas-frames.ts
{ name: 'cone-45', kind: 'cone', angleDeg: 45, size: 256 },
```

Reload the page and click **Download atlas PNG** in the developer panel to confirm the frame is there.

---

## 5. Register the definition

```typescript
// src/content/spells/index.ts
export const spells = [hoarfrostDef, frostLanceDef, /* … */]   // In the place of the spell it replaces
```

The registry assembles this list at startup, validates every definition against the schema, and fails loudly on an unresolved key or a missing frame.

---

## 6. Run the content tier

```bash
pnpm test tests/content/
```

You should see the schema test pass for `frost_lance`, the key test find `frost_lance_hit`, and the frame test find `disc`. A typo in the key fails here with the key named, before the world is ever created.

---

## 7. Write the simulation test

```bash
touch tests/simulation/spells/frost-lance.spec.ts
```

Build a world with the hero, a training dummy at range, and the registry. Then, at orb level 1 and at orb level 7:

- Press Q, Q, W, R. Slot D holds `frost_lance`. Mana dropped by the Invoke cost.
- Press D and click a point. The hero turns until the bearing is inside the action cone, then a projectile spawns once `castPointSeconds` has elapsed, counted in ticks.
- Tick until the projectile reaches the dummy. The dummy's health dropped by the magical damage after its magic resistance, and it carries the slow status for the stated duration.
- Cooldown is `cooldownSeconds[level - 1]` converted to ticks, and counts down one per tick.

And the refusals:

- Press D with too little mana: refused, nothing spawns, no cooldown starts.
- Press D while silenced: refused with `silenced`.
- Press D, then Escape before the click: no mana spent, no cooldown, no projectile.

```bash
pnpm test -t "frost-lance"
```

---

## 8. Check it in the arena

```bash
pnpm dev
```

In the developer panel: **Infinite mana** on, **No cooldowns** on, choose **training_dummy** in the Enemies dropdown and spawn one. Press Q Q W R, then D, click the dummy. You should see the projectile leave the hero, the dummy flash on hit, a damage number rise, and a slow icon above it. A spell that puts a zone down shows its area under **Spell areas**, as the simulation tests it; a projectile has no area there. Record the session and keep the input log if anything looks off; it becomes the bug report.

---

## 9. Definition of done

Walk the "A new spell, effect, or enemy ability" rows in the [definition of done](./definition-of-done.md). The two that are easy to miss: the test covers orb levels 1 and 7, and the [spells and attack](../product/features/spells-and-attack.md) page describes the new behaviour if a player can tell it apart from the others.

---

## Replacing a spell

Every recipe is one spell's, and the content tier holds it: `tests/content/spells.spec.ts` fails when two spells compose one recipe or a recipe composes none, and names the recipe. So a swap is a removal and an addition in the same change, never an eleventh spell. A spell that needs a recipe of its own is a redesign of the Skein, not content; take it to the engineering architect. In order, with Frost Lance replacing Wane:

1. **The definition files.** Write `src/content/spells/frost-lance.def.ts` by steps 2 to 4, with Wane's recipe in any order, and delete `src/content/spells/wane.def.ts`. Delete what only the old spell used: its statuses under `src/content/statuses/` and their lines in that folder's `index.ts`, their glyphs in `STATUS_ICON_GLYPHS` in `src/content/atlas-frames.ts`, a named effect under `src/domain/abilities/effects/` and its key, a summon under `src/content/summons/`, a frame no one else draws with. `grep -rn "wane" src/` lists them. A status or frame another definition names stays.
2. **The spell list.** In `src/content/spells/index.ts`, `frostLanceDef` goes where `waneDef` was, and the import with it.
3. **The form's ability list.** In `src/content/forms/skein.def.ts`, `frost_lance` goes where `wane` was in `abilities`. The content tier fails when the form lists a spell the list does not hold, or leaves one out.
4. **The disable matrix.** Every status definition sits in exactly one row of `src/content/statuses/disable-matrix.ts`. Take the old spell's statuses out of their rows and put each new one in the row that answers for it, and change the table in the [disable matrix spec](../product/specs/disable-matrix.md) cell for cell in the same change. `tests/content/disable-matrix.spec.ts` fails on a status in no row or two.
5. **The spell catalogue.** In the [spell catalogue](../product/specs/spell-catalogue.md), the new entry replaces the old one under the same recipe heading in section 3, with the statuses it applies in section 4, its frames in section 6, and any new piece in section 7. `tests/content/catalogues.spec.ts` holds the entry's tables to the definition file. The [spells and attack](../product/features/spells-and-attack.md) page, the [mechanics spec](../product/specs/character-movement-and-mechanics.md), and the [vocabulary](../product/vocabulary.md) name the spells; `grep -rln "Wane" docs/` finds each line to change.
6. **The content tier.** `pnpm test tests/content/` is green: the recipe check, the form's list, the matrix, and the catalogue.
7. **The specs that used the old spell.** `grep -rln "wane" tests/` lists them. The old spell's own spec under `tests/simulation/spells/` is deleted, and the new one from step 7 above takes its place. A shared spec that used the old spell only as a real spell to hand, a status spec casting it for its slow or a tuning spec reading its cooldown, moves onto a test-only fixture spell built with `makeSpellDef` from `tests/helpers/`, carrying the one field the spec is about. Nothing else in that spec changes, and no spec is moved that does not name the old spell.
8. **The balance session.** `tests/simulation/replays/balance-spells.json` was recorded with the old spell's keys, which now compose the new one. Record the session again with the developer panel as section 8 of the catalogue describes it, save it over the old file with **Save input log**, and move the section's table, and the fights and numbers `tests/simulation/replays/balance.spec.ts` checks, with it. Any other log under `tests/simulation/replays/` that casts the old spell names it by id in its cast commands, and `grep -l '"abilityId":"wane"' tests/simulation/replays/*.json` lists it; record each one again the same way, under the session its spec describes.
9. **The check.** `pnpm check` is green. Then walk the "A new spell, effect, or enemy ability" rows in the [definition of done](./definition-of-done.md) for the new spell, and play it in the arena by step 8.

---

## Related documentation

- [Ability pipeline](../architecture/ability-pipeline.md) — what a definition may ask for
- [Content and registries](../architecture/content-and-registries.md) — how the registry validates it
- [Content authoring standards](../standards/content-authoring.md) — the rules a definition file follows
- [Spells and attack](../product/features/spells-and-attack.md) — how spells behave for the player
- [Definition of done](./definition-of-done.md) — the rows this change must pass
