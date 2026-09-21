/** The three attributes a form grows: each drives two derived values. */
export type Attributes = {
  strength: number;
  agility: number;
  intelligence: number;
};

/**
 * The seven values the attributes and the modifier table derive. A definition writes the
 * level-independent base of each; the unit carries the current value of each. Regeneration
 * is per second in a definition and per tick on a unit.
 */
export type Stats = {
  maxHealth: number;
  healthRegen: number;
  maxMana: number;
  manaRegen: number;
  armour: number;
  attackSpeed: number;
  magicResistance: number;
};

/** How much of a derived value one attribute point is worth. Regeneration is per second here. */
export type AttributeConversions = Readonly<{
  healthPerStrength: number;
  healthRegenPerStrength: number;
  manaPerIntelligence: number;
  manaRegenPerIntelligence: number;
  armourPerAgility: number;
  attackSpeedPerAgility: number;
}>;

/** The three radii a form's body has. The spec keeps them apart: collision blocks, bound buffers range, selection is the click test. */
export type BodyDef = Readonly<{
  collisionRadius: number;
  boundRadius: number;
  selectionRadius: number;
}>;

/**
 * One shape the hero can take: the body it wears, the attributes it starts with at level one
 * and gains per level after it, what each attribute point is worth, the level-independent
 * bases, the abilities the kit composes from, the kit that turns a slot key into one of
 * them, and the frame it is drawn with. The hero definition lists forms by id.
 */
export type FormDef = Readonly<{
  id: string;
  body: BodyDef;
  attributes: Readonly<Attributes>;
  attributeGains: Readonly<Attributes>;
  conversions: AttributeConversions;
  baseStats: Readonly<Stats>;
  abilities: readonly string[];
  kit: string;
  atlasFrame: string;
}>;
