import type { ActiveItemDef } from "@domain/public";

/** An active item casting Quicken, a spell with no target, a clock, and a cost, at Scorchglass's price. */
export const GLASS: ActiveItemDef = {
  id: "glass",
  name: "Glass",
  price: 1800,
  width: 1,
  height: 2,
  active: { abilityId: "quicken", refusedWhileRooted: false },
};

/** An active item casting the self heal, refused to a rooted hero as Slipknife is, at its price. */
export const KNIFE: ActiveItemDef = {
  id: "knife",
  name: "Knife",
  price: 1400,
  width: 1,
  height: 2,
  active: { abilityId: "self_heal", refusedWhileRooted: true },
};

/** An active item casting the arrow, which takes a unit, at Gyre Sceptre's price. */
export const SHAFT: ActiveItemDef = {
  id: "shaft",
  name: "Shaft",
  price: 1600,
  width: 1,
  height: 2,
  active: { abilityId: "arrow", refusedWhileRooted: false },
};

/** The fixture active items, one for each of the bank's rules a spec reads. */
export const FIXTURE_ACTIVES: readonly ActiveItemDef[] = [GLASS, KNIFE, SHAFT];
