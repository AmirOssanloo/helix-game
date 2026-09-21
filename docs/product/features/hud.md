# HUD

> **Entry point:** [Features](./README.md)

## Overview

Everything the player reads during a fight: the bars, the orbs, the ability squares, floating damage numbers, status icons, and the targeting preview. The HUD reads the simulation and never changes it. Everything on it is drawn from the same atlas of flat shapes as the world.

## The bottom bar

Centred at the bottom of the screen.

| Element | Shows |
| --- | --- |
| Health bar | Current and maximum health as a bar and as numbers |
| Mana bar | Current and maximum mana, the same way |
| Orb buffer | Three squares, oldest on the left, newest on the right, each coloured by orb |
| Ability squares | Q, W, E, R, D, F in a row. Each shows its key, a cooldown sweep while cooling, and a mana cost for R, D, and F |
| Level | The hero's level, with an experience bar beneath it and a marker when a skill point is unspent |

Skill points are spent by clicking the Q, W, or E square while a point is unspent. Each square shows its orb level as a small number.

D and F show the prepared spell's colour and a short label. Empty slots show an empty socket. A key a disable blocks is greyed out while the disable lasts.

## Around the hero

- **Floating orbs.** The three orb instances orbit the hero, matching the bar's order, so the player reads the buffer without looking down.
- **Hit flash.** A unit that takes damage flashes white for a few frames.
- **Status icons.** A small icon above a unit for each status on it — stun, slow, silence, and the rest.
- **Damage numbers.** Every hit spawns a number at the point of impact that rises and fades. White for now; a colour per damage type when the balance pass needs it.
- **Facing.** The hero's triangle points where the hero faces, which is what the turn rate acts on.

## Targeting preview

When a targeted spell's cursor is open: a range ring around the hero at the spell's cast range, and under the pointer the spell's shape, the frame its definition names, drawn translucent. A direction spell's shape sits on the hero and turns toward the pointer instead. The preview turns red outside range; a direction spell is never out of range. It closes on commit, Esc, or S.

## Placeholder art

Flat colour, no gradients, no textures, no animation. Every shape is a tinted quad from a generated atlas; art arrives later as a content swap.

| Thing | Shape | Colour |
| --- | --- | --- |
| Hero | Circle with a triangle for facing | White |
| Enemies | Squares, one size per archetype | One colour per archetype |
| Elites and bosses | The same square with a thicker outline | Archetype colour |
| Summons | Small circle | Hero white, dimmer |
| Projectiles | Small circles | The caster's colour |
| Orb instances | Small circles | Quartz blue, Whorl purple, Ember orange |
| Spell areas and zones | Outlined circles, rings, rotated rectangles, cones | The spell's colour, translucent |
| Targeting preview | Ring and outline | White, red when out of range |
| Obstacles and walls | Rectangles | Grey |
| Damage numbers | Bitmap text | White |
| Status icons | Small squares with a glyph | One per status |
| Overlays | The same shapes at low alpha | One per overlay |

## Depth order

From the bottom up, so a projectile is never hidden by the ground it flies over:

1. Ground effects and zones
2. Obstacles
3. Units
4. Projectiles
5. Air effects and lifted units
6. Floating text and status icons
7. Overlays

There is no sorting by vertical position; the view is top-down and nothing is tall.

## States and edge cases

| State | What's shown |
| --- | --- |
| Empty slot | An empty socket, no key label greyed |
| Re-invoking a spell whose cooldown is running | The spell moves to D with its sweep still running |
| Refused cast | The square flashes: red for mana, grey for cooldown, striped for a disable |
| Refused skill point, because none is unspent or the orb is at its cap | The orb square flashes white |
| Click on the bottom bar | The HUD takes it; the world never sees it, so a right click on the bar is not a move |
| Simulation paused with a flash showing | The flash holds until the simulation resumes; it ends on a tick, not a frame |
| More damage numbers than the pool holds | The oldest number is recycled early; nothing is dropped silently |
| Health at zero | The bar is empty; the bottom bar greys until respawn |
| Skill point unspent at level cap | The marker stays until spent |
| Tab hidden | The HUD freezes with the simulation |

## Deferred

- **A second kit's layout.** The six squares are filled from whatever kit the hero's active form uses; today that is only Invoke. A hotbar form fills the same six squares from its ability list and hides the orb display.
- **Minimap.** The arena fits on screen.
- **Item slots, inventory, and equipment.** No items exist.
- **Tooltips** on hover for spells and statuses.
- **Sound cues.** No audio.
- **Damage number colours** by type and crit styling. White until the balance pass needs more.
- **Animated art.** Shapes only until the sprite atlas arrives.

---

## Related documentation

- [Orbs and Invoke](./orbs-and-invoke.md) — what the orb buffer and the D and F squares reflect
- [Status effects](./status-effects.md) — what the icons and the greyed keys mean
- [Developer panel](./developer-panel.md) — the overlays and readouts that are not part of the HUD
- [Presentation](../../architecture/presentation.md) — the atlas, the depth bands, and the HUD scene
- [ADR 0001 — Phaser renderer and quad atlas](../../adr/0001-phaser-renderer-and-quad-atlas.md) — why everything is a tinted quad
