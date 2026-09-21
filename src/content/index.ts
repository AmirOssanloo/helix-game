import type { Registry } from "@domain/public";
import { abilities } from "./abilities/index";
import { atlasFrames } from "./atlas-frames";
import { enemies } from "./enemies/index";
import { forms } from "./forms/index";
import { heroDef } from "./hero";
import { maps } from "./maps/index";
import { spells } from "./spells/index";
import { statuses } from "./statuses/index";
import { summons } from "./summons/index";
import { tuningTable } from "./tuning";

/**
 * Every definition of every kind, assembled into the one registry a world receives, in the
 * designer's units. It is data and nothing else: the domain validates it, at startup in the
 * composition root and in the content test, and refuses it with every fault named, so a
 * definition that is missing here or wrong here never reaches a player.
 */
export const contentRegistry: Registry = {
  tuning: tuningTable,
  hero: heroDef,
  forms,
  spells,
  abilities,
  statuses,
  enemies,
  summons,
  maps,
  atlasFrames,
};
