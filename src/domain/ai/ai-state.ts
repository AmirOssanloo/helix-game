import type { EntityId } from "@shared/public";
import type { AiRecord } from "../entities/unit-ai";

/**
 * Something hit the unit: the machine reads it on the unit's next driving tick, which is what
 * aggro on damage is. Damage from nobody, a debug kill or a burn with no caster, provokes
 * nothing.
 */
export const provoke = (ai: AiRecord, sourceId: EntityId | null): void => {
  if (sourceId !== null) {
    ai.provoked = true;
  }
};

/** The death system took the unit: the machine holds it in Dead until its slot is released. */
export const enterDead = (ai: AiRecord): void => {
  ai.state = "dead";
  ai.provoked = false;
};
