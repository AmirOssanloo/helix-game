import type { Stats } from "./stat-keys";

export type { Stats } from "./stat-keys";

/** The three attributes a form grows: each drives two derived values. */
export type Attributes = {
  strength: number;
  agility: number;
  intelligence: number;
};

/**
 * A record of attributes, made from a class of its own: the schema that validates a form's
 * attributes has the same keys in the same order, and a plain literal would share its shape,
 * whose fields hold objects, so every fractional attribute written each tick would be boxed.
 */
class AttributeRecord implements Attributes {
  strength = 0;
  agility = 0;
  intelligence = 0;
}

/** A fresh record of attributes, every one at zero. */
export const createAttributes = (): Attributes => new AttributeRecord();

/** Every attribute back to zero, in place. */
export const clearAttributes = (attributes: Attributes): void => {
  attributes.strength = 0;
  attributes.agility = 0;
  attributes.intelligence = 0;
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
