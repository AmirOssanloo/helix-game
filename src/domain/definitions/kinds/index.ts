import { abilityKind } from "./ability.kind";
import { atlasFrameKind } from "./atlas-frame.kind";
import { disableMatrixKind } from "./disable-matrix.kind";
import { enemyKind } from "./enemy.kind";
import { formKind } from "./form.kind";
import { heroKind } from "./hero.kind";
import { mapKind } from "./map.kind";
import { spellKind } from "./spell.kind";
import { statusKind } from "./status.kind";
import { summonKind } from "./summon.kind";
import { tuningKind } from "./tuning.kind";

/**
 * Every definition kind, in validation order: the gates first, then every other kind's schema,
 * cross-references, and duplicate ids in this order, and the tunable kinds' numbers in this
 * order on the tuning surface. The registry has one field per entry, and a kind is added by a
 * descriptor file beside these and one line here.
 */
export const DEFINITION_KINDS = [
  tuningKind,
  heroKind,
  atlasFrameKind,
  formKind,
  spellKind,
  abilityKind,
  statusKind,
  disableMatrixKind,
  enemyKind,
  summonKind,
  mapKind,
] as const;
