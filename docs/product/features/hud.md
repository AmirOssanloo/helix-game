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
| Orb buffer | Three squares, oldest on the left, newest on the right, each coloured by orb, and an outline where a slot is empty |
| Ability squares | Q, W, E, R, D, F in a row. Each shows its key, a cooldown sweep while cooling, and a mana cost for R, D, and F |
| Level | The hero's level, with an experience bar beneath it and a marker when a skill point is unspent |

Skill points are spent by clicking the Q, W, or E square while a point is unspent. Each square shows its orb level as a small number.

D and F show the prepared spell's colour and a short label. Empty slots show an empty socket. A key a disable blocks is greyed out while the disable lasts, and every key and the orb buffer grey while the hero is dead.

## Around the hero

- **Floating orbs.** The three orb instances orbit the hero, matching the bar's order, so the player reads the buffer without looking down.
- **Hit flash.** A unit that takes damage goes white for a moment, body and facing marker together. Like every flash it ends on a tick, so it holds while the simulation is paused. How long it shows, like every feedback timing on this page, is a tunable the developer panel moves.
- **Status icons.** A row of small icons above a unit, one per status on it — stun, slow, silence, and the rest — each an outlined square with its own glyph, so two statuses read apart at a glance. An icon is there while the status is and shows no duration.
- **Damage numbers.** A hit raises a number above the unit it landed on that rises and fades over a second. It shows the amount that landed after mitigation, even where the health it removed was less. Further hits of the same type on that unit inside a short window add to that number instead of raising their own, so damage taken every tick reads as one number a window worth what the window cost; the number keeps the rise it began with, and the hit after it starts a fresh one. Each number takes the colour of its damage type — physical red, magical blue, pure gold — so the window is one per unit per type: a burn and an attack on the same unit rise as two numbers, each in its own colour.
- **Facing.** The hero's triangle points where the hero faces, which is what the turn rate acts on.

## Targeting preview

When a targeted spell's cursor is open: a range ring around the hero at the spell's cast range, and under the pointer the spell's shape, the frame its definition names, drawn translucent. Both are in the spell's colour. A direction spell's shape sits on the hero and turns toward the pointer instead. Glacier has no shape: the ring alone, and once its held press is dragged, a line from the press to the pointer. The preview turns red outside range; a direction spell is never out of range. It closes on commit, Esc, or S.

## Placeholder art

Flat colour, no gradients, no textures, no animation. Every shape is a tinted quad from a generated atlas; art arrives later as a content swap.

| Thing | Shape | Colour |
| --- | --- | --- |
| Hero | Circle with a triangle for facing | White |
| Enemies | Squares, some with a dot, one size per archetype | One colour per archetype |
| Elites and bosses | The same square with a thicker outline | Archetype colour |
| Summons | Small circle | Hero white, dimmer |
| Projectiles | Small circles | The caster's colour |
| Orb instances | Small circles | Quartz blue, Whorl purple, Ember orange |
| Spell areas and zones | Outlined circles, rings, rotated rectangles, cones | The spell's colour, translucent |
| Targeting preview | Ring and outline | The spell's colour, red when out of range |
| Obstacles and walls | Rectangles | Grey |
| Damage numbers | Bitmap text | Physical red, magical blue, pure gold |
| Status icons | Small outlined squares with a glyph | White; the glyph tells them apart |
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

There is no sorting by vertical position: everything lies flat on the floor and nothing is tall, so nothing can stand in front of what is behind it. Tall sprite art changes that; [ADR 0006](../../adr/0006-isometric-view-over-a-square-world.md) says what it adds.

## States and edge cases

| State | What's shown |
| --- | --- |
| Empty slot | An empty socket, with no key label |
| Re-invoking a spell whose cooldown is running | The spell moves to D with its sweep still running |
| Refused cast | The square flashes: red for mana, grey for cooldown, striped for a disable or death, white for any other reason |
| Click on an orb square with no skill point unspent | Nothing; the HUD takes the click and sends no command |
| Refused skill point, because the orb is at its cap | The orb square flashes white |
| Click on the bottom bar | The HUD takes it; the world never sees it, so a right click on the bar is not a move |
| Simulation paused with a flash showing | The flash holds until the simulation resumes; it ends on a tick, not a frame |
| More damage numbers than the pool holds | The oldest number is recycled early; nothing is dropped silently |
| Health at zero | The health bar is empty; the six ability squares and the orb buffer grey until respawn, as death refuses every key |
| Skill point unspent at level cap | The marker stays until spent |
| Tab hidden | The HUD freezes with the simulation |

## Deferred

- **A second kit's layout.** The six squares are filled from whatever kit the hero's active form uses; today that is only Invoke. A hotbar form fills the same six squares from its ability list and hides the orb display.
- **Minimap.** The arena fits on screen.
- **Item slots, inventory, and equipment.** No items exist.
- **Tooltips** on hover for spells and statuses.
- **Sound cues.** No audio.
- **Crit styling** for damage numbers. Nothing crits yet.
- **Animated art.** Shapes only until the sprite atlas arrives.

---

## Related documentation

- [Orbs and Invoke](./orbs-and-invoke.md) — what the orb buffer and the D and F squares reflect
- [Status effects](./status-effects.md) — what the icons and the greyed keys mean
- [Developer panel](./developer-panel.md) — the overlays and readouts that are not part of the HUD
- [Presentation](../../architecture/presentation.md) — the atlas, the depth bands, and the HUD scene
- [ADR 0001 — Phaser renderer and quad atlas](../../adr/0001-phaser-renderer-and-quad-atlas.md) — why everything is a tinted quad
