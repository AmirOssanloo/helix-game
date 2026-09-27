import type { AffixDef } from "@domain/public";
import { armour1Def } from "./armour-1.def";
import { armour2Def } from "./armour-2.def";
import { armour3Def } from "./armour-3.def";
import { attackDamage1Def } from "./attack-damage-1.def";
import { attackDamage2Def } from "./attack-damage-2.def";
import { attackSpeed1Def } from "./attack-speed-1.def";
import { attackSpeed2Def } from "./attack-speed-2.def";
import { cooldownReduction1Def } from "./cooldown-reduction-1.def";
import { cooldownReduction2Def } from "./cooldown-reduction-2.def";
import { health1Def } from "./health-1.def";
import { health2Def } from "./health-2.def";
import { health3Def } from "./health-3.def";
import { healthRegen1Def } from "./health-regen-1.def";
import { healthRegen2Def } from "./health-regen-2.def";
import { magicDamage1Def } from "./magic-damage-1.def";
import { magicDamage2Def } from "./magic-damage-2.def";
import { magicDamage3Def } from "./magic-damage-3.def";
import { magicResistance1Def } from "./magic-resistance-1.def";
import { magicResistance2Def } from "./magic-resistance-2.def";
import { mana1Def } from "./mana-1.def";
import { mana2Def } from "./mana-2.def";
import { mana3Def } from "./mana-3.def";
import { manaRegen1Def } from "./mana-regen-1.def";
import { manaRegen2Def } from "./mana-regen-2.def";
import { movementSpeed1Def } from "./movement-speed-1.def";
import { movementSpeed2Def } from "./movement-speed-2.def";

/**
 * Every affix, the tiers of each stat together in affix level order, as the item catalogue
 * lists them. An affix not listed here does not exist.
 */
export const affixes = [
  health1Def,
  health2Def,
  health3Def,
  healthRegen1Def,
  healthRegen2Def,
  mana1Def,
  mana2Def,
  mana3Def,
  manaRegen1Def,
  manaRegen2Def,
  armour1Def,
  armour2Def,
  armour3Def,
  attackSpeed1Def,
  attackSpeed2Def,
  attackDamage1Def,
  attackDamage2Def,
  magicDamage1Def,
  magicDamage2Def,
  magicDamage3Def,
  magicResistance1Def,
  magicResistance2Def,
  movementSpeed1Def,
  movementSpeed2Def,
  cooldownReduction1Def,
  cooldownReduction2Def,
] as const satisfies readonly AffixDef[];
