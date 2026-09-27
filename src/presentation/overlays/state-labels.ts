import type { AiState, OrderState, Unit } from "@domain/public";
import { resolveBehaviour } from "@domain/public";
import type { DeepReadonly, Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenPlacement } from "../camera/projection";
import type { ScreenUnits } from "../camera/screen-units";
import type { Label } from "../views/quad";
import { interpolate } from "../views/quad";
import { LABEL_TINT, OPAQUE } from "./overlay-marks";

/** A state label's line height, and how far above the top of the body it sits, in pixels. */
export const STATE_LABEL_SIZE = 16;
const STATE_LABEL_MARGIN = 14;

/** A state label showing nothing yet. */
const NO_TEXT = "";

/**
 * What a state label shows for each state, written once: the font holds uppercase letters and
 * the hyphen, not lowercase or the underscore, and a table means the sync never builds a string.
 */
const AI_STATE_LABELS: Readonly<Record<AiState, string>> = {
  idle: "IDLE",
  aggro: "AGGRO",
  chase: "CHASE",
  attack: "ATTACK",
  return: "RETURN",
  dead: "DEAD",
};

const ORDER_STATE_LABELS: Readonly<Record<OrderState, string>> = {
  idle: "IDLE",
  turning: "TURNING",
  moving: "MOVING",
  attack_windup: "ATTACK-WINDUP",
  attack_backswing: "ATTACK-BACKSWING",
  ability_cast_point: "CAST-POINT",
  ability_backswing: "CAST-BACKSWING",
  channeling: "CHANNELING",
  dead: "DEAD",
};

/**
 * A label above each unit on screen saying where it stands: an enemy whose behaviour runs the
 * shared machine shows its state in it, the hero its order state. A label stands up off the
 * ground, so it is placed in pixels above where the body is drawn. It is rewritten only when
 * the state under it changes, so a steady fight costs no text rebuild.
 */
export class StateLabels {
  private readonly labels: readonly Label[];

  private readonly placement: ScreenPlacement;

  /** Scratch for where a body is drawn this frame. */
  private readonly drawn: Vec2 = { x: 0, y: 0 };

  /** Per label: the text it shows, so a steady state costs no rewrite. */
  private readonly texts: string[];

  private bound = 0;

  private lastBound = 0;

  private missCount = 0;

  constructor(labels: readonly Label[], placement: ScreenPlacement) {
    this.labels = labels;
    this.placement = placement;
    this.texts = [];

    for (let index = 0; index < labels.length; index += 1) {
      this.texts.push(NO_TEXT);
    }
  }

  get misses(): number {
    return this.missCount;
  }

  sync(world: WorldView, units: ScreenUnits, alpha: number): void {
    const ids = units.ids;

    for (let index = 0; index < units.count; index += 1) {
      const id = ids[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);
      const text = unit === null ? NO_TEXT : labelOf(world, unit);

      if (unit === null || text === NO_TEXT) {
        continue;
      }

      const label = this.labels[this.bound];

      if (label === undefined) {
        this.missCount += 1;

        break;
      }

      this.placement.toScreen(
        interpolate(unit.prev.x, unit.curr.x, alpha),
        interpolate(unit.prev.y, unit.curr.y, alpha),
        this.drawn,
      );
      label.x = this.drawn.x;
      label.y =
        this.drawn.y -
        this.placement.riseOf(unit.boundRadius) -
        STATE_LABEL_MARGIN;
      label.tint = LABEL_TINT;
      label.alpha = OPAQUE;
      label.visible = true;

      if (this.texts[this.bound] !== text) {
        this.texts[this.bound] = text;
        label.setText(text);
      }

      this.bound += 1;
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  private finish(): void {
    for (let index = this.bound; index < this.lastBound; index += 1) {
      const label = this.labels[index];

      if (label !== undefined) {
        label.visible = false;
      }
    }

    this.lastBound = this.bound;
    this.bound = 0;
  }
}

/** What `unit`'s state label says: the hero's order state, a machine enemy's state, or nothing for anything else. */
const labelOf = (world: WorldView, unit: DeepReadonly<Unit>): string => {
  if (unit.kind === "hero") {
    return ORDER_STATE_LABELS[unit.state];
  }

  const definitionId = unit.definitionId;
  const record =
    unit.kind !== "enemy" || definitionId === null
      ? undefined
      : world.run.units.get(definitionId);
  const behaviour =
    record === undefined ? null : resolveBehaviour(record.def.behaviour);

  return behaviour !== null && behaviour.kind === "machine"
    ? AI_STATE_LABELS[unit.ai.state]
    : NO_TEXT;
};
