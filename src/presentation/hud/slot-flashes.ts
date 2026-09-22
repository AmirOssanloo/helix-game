import type { RefusalReason, Tick } from "@domain/public";
import { SLOT_COUNT } from "@domain/public";

/** What a square flashes for: mana is red, a clock grey, a disable or death striped, and any other refusal a plain white blink. */
export type FlashKind = "none" | "mana" | "cooldown" | "disable" | "refused";

/** How long a flash shows, in ticks: a third of a second at thirty ticks a second. */
export const FLASH_TICKS = 10;

/** The kind of flash `reason` earns. */
export const flashKindOf = (reason: RefusalReason): FlashKind => {
  switch (reason) {
    case "not_enough_mana":
      return "mana";

    case "on_cooldown":
      return "cooldown";

    case "stunned":
    case "silenced":
    case "rooted":
    case "disarmed":
    case "dead":
      return "disable";

    case "invalid_slot":
    case "invalid_destination":
    case "invalid_amount":
    case "invalid_damage_type":
    case "invalid_orb_level":
    case "invalid_count":
    case "invalid_duration":
    case "orb_not_learned":
    case "buffer_not_full":
    case "no_spell_for_recipe":
    case "empty_slot":
    case "unknown_ability":
    case "unknown_archetype":
    case "ability_not_held":
    case "invalid_target":
    case "target_not_found":
    case "out_of_range":
    case "no_skill_point":
    case "unknown_skill":
    case "skill_at_cap":
    case "at_level_cap":
    case "pool_full":
    case "already_channeling":
    case "unknown_status":
    case "target_untargetable":
    case "status_table_full":
      return "refused";
  }
};

/**
 * The refusal flash on each of the six squares: what it shows and the tick it stops. Two
 * writers share one record: the play scene's input mapper, for a cursor it would not open,
 * which never reaches the buffer to be refused there, and the HUD, for a refused-command
 * event. The end is a tick, not a frame count, so a flash pauses with the simulation.
 */
export class SlotFlashes {
  private readonly kinds: FlashKind[] = [];

  private readonly untilTicks: Tick[] = [];

  constructor() {
    for (let slot = 0; slot <= SLOT_COUNT; slot += 1) {
      this.kinds.push("none");
      this.untilTicks.push(0);
    }
  }

  /** Starts a flash on `slot` for `reason` at tick `now`. A slot outside the six is ignored. */
  flash(slot: number, reason: RefusalReason, now: Tick): void {
    if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) {
      return;
    }

    this.kinds[slot] = flashKindOf(reason);
    this.untilTicks[slot] = now + FLASH_TICKS;
  }

  /** What `slot` flashes at tick `now`, or `none`. */
  kindAt(slot: number, now: Tick): FlashKind {
    const until = this.untilTicks[slot];
    const kind = this.kinds[slot];

    if (until === undefined || kind === undefined || now >= until) {
      return "none";
    }

    return kind;
  }
}
