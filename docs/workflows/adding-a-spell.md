# Adding a spell

> **Entry point:** [Workflows](./README.md)

**Purpose:** add one ability to the game — a hero spell, or an enemy ability, which goes through the same pipeline — from definition file to a green check and a cast in the arena. In order; each step says what you type and what you should see.

The example below adds a made-up spell called **Frost Lance**: a point-targeted bolt that damages and slows. It exists only on this page.

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
  name: 'Frost Lance',
  recipe: ['quartz', 'quartz', 'whorl'],          // The orb multiset; order is ignored
  targeting: 'point',                             // 'none' | 'unit' | 'point' | 'direction'
  castPointSeconds: 0.1,                          // Before the effect fires; the hero must face the target first
  cooldownSeconds: [20, 18, 16, 14, 12, 10, 8],   // Indexed by orb level 1 to 7
  manaCost: [100, 110, 120, 130, 140, 150, 160],
  range: 1000,
  effects: [
    { kind: 'projectile', speed: 1200, radius: 40, onHit: 'frost_lance_hit' },
  ],
  atlasFrame: 'disc',
  tint: 0x66ccff,
} as const satisfies SpellDef
```

`recipe` is what R compares against the three held orb instances. `effects` is a list of primitives; `onHit` names a domain effect by string key, so this file imports a type and nothing else. Durations are seconds, converted to ticks once at load; a definition never holds a tick count. The id is snake_case and matches the file name. A cooldown or mana table shorter than seven entries fails validation.

---

## 3. Add the named effect, if the primitives are not enough

Damage and a slow are both primitives, so Frost Lance could be written without a named effect. Anything with its own rules — a wall placed in segments, a updraft that lifts units — is a named effect under `src/domain/abilities/effects/`:

```bash
touch src/domain/abilities/effects/frost-lance-hit.effect.ts
```

```typescript
export const frostLanceHitEffect: NamedEffect = (world, cast, hit) => { /* … */ }
```

Register the key in `src/domain/abilities/effects/index.ts`:

```typescript
'frost_lance_hit': frostLanceHitEffect,
```

The effect runs inside the tick with the world, the cast, and the hit. It allocates nothing, reads no clock, and gets every number from `cast.def` or the tuning table.

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
export const spells = [hoarfrostDef, /* … */, frostLanceDef]
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

In the developer panel: **Infinite mana** on, **No cooldowns** on, choose **training_dummy** in the Enemies dropdown and spawn one. Press Q Q W R, then D, click the dummy. You should see the projectile leave the hero, the dummy flash on hit, a damage number rise, and a slow icon above it. Toggle **Spell areas** to see the projectile's hit radius. Record the session and keep the input log if anything looks off; it becomes the bug report.

---

## 9. Definition of done

Walk the "A new spell, effect, or enemy ability" rows in the [definition of done](./definition-of-done.md). The two that are easy to miss: the test covers orb levels 1 and 7, and the [spells and attack](../product/features/spells-and-attack.md) page describes the new behaviour if a player can tell it apart from the others.

---

## Related documentation

- [Ability pipeline](../architecture/ability-pipeline.md) — what a definition may ask for
- [Content and registries](../architecture/content-and-registries.md) — how the registry validates it
- [Content authoring standards](../standards/content-authoring.md) — the rules a definition file follows
- [Spells and attack](../product/features/spells-and-attack.md) — how spells behave for the player
- [Definition of done](./definition-of-done.md) — the rows this change must pass
