import type { SlotDescriptor, Tick } from "@domain/public";
import { ORB_IDS } from "@domain/public";
import { clamp } from "@shared/public";
import type { FrameSizes, Label, Quad, QuadFactory } from "../views/quad";
import { SQUARE_SIZE } from "./hud-layout";
import {
  BACKDROP_ALPHA,
  BACKDROP_TINT,
  COMPOSER_TINT,
  DIMMED_TINT,
  FLASH_ALPHA,
  FLASH_COOLDOWN_TINT,
  FLASH_DISABLE_TINT,
  FLASH_MANA_TINT,
  FLASH_REFUSED_TINT,
  GREYED_ALPHA,
  KEY_LABEL_TINT,
  OPAQUE,
  orbTint,
  SOCKET_TINT,
  WEDGE_ALPHA,
  WEDGE_TINT,
  WHITE,
} from "./palette";
import type { FlashKind } from "./slot-flashes";

const SQUARE_FRAME = "square";
const SOCKET_FRAME = "square_outline";
const STRIPES_FRAME = "stripes";
const WEDGE_FRAME_PREFIX = "wedge_";

/** The key labels, by slot from one. */
const KEY_LABELS: readonly string[] = ["", "Q", "W", "E", "R", "D", "F"];

/** How much of the square the wedge sweep covers. */
const WEDGE_SHARE = 0.9;

/** How many letters of an ability's id make its short label. */
const NAME_LENGTH = 3;

/** Where the small labels sit inside the square, as fractions of its half size from the centre. */
const KEY_OFFSET_X = -0.6;
const KEY_OFFSET_Y = -0.6;
const COST_OFFSET_X = 0.55;
const COST_OFFSET_Y = 0.6;
const LEVEL_OFFSET_X = 0.6;
const LEVEL_OFFSET_Y = -0.6;
const NAME_OFFSET_Y = 0.15;

const HALF = 0.5;

/** The wedge step for `fraction` of the clock left: one to `steps`, so a clock still running never shows nothing. */
export const wedgeStepFor = (fraction: number, steps: number): number =>
  Math.min(steps, Math.max(1, Math.ceil(fraction * steps)));

/**
 * The wedge frame, one to `sheetSteps`, for `fraction` of the clock left when the sweep moves
 * in `sweepSteps` steps: the sweep's step, drawn with the sheet's frame nearest to it. A sweep
 * of the sheet's own count is the sheet frame by frame; fewer steps is a coarser sweep, and a
 * count outside one to the sheet's is held inside it.
 */
export const wedgeFrameFor = (
  fraction: number,
  sweepSteps: number,
  sheetSteps: number,
): number => {
  const steps = clamp(Math.floor(sweepSteps), 1, sheetSteps);

  return Math.max(
    1,
    Math.round((wedgeStepFor(fraction, steps) * sheetSteps) / steps),
  );
};

/** What the square shows: read from a descriptor and the spell table each frame. */
export type SquareInput = Readonly<{
  descriptor: Readonly<SlotDescriptor>;
  /** The tint a prepared spell is drawn in, or `null` for an empty socket and the other kinds. */
  spellTint: number | null;
  tick: Tick;
  flash: FlashKind;
  /** How many steps the wedge sweeps in, from the tuning table: at most the sheet's, which is the smoothest. */
  sweepSteps: number;
}>;

/**
 * One ability square: a backdrop, a fill coloured by what the slot holds, a socket outline
 * for an empty slot, a wedge over it sweeping down as the clock runs, a flash over that for
 * a refusal, and four labels for the key, the cost, the level, and a prepared spell's short
 * name. Every quad and label is made once; the sync writes fields and rewrites a label only
 * when its text changes. The wedge's frame changes as the clock runs, at most once per step.
 */
export class AbilitySquareView {
  private readonly backdrop: Quad;

  private readonly fill: Quad;

  private readonly socket: Quad;

  private readonly wedge: Quad;

  private readonly flash: Quad;

  private readonly keyLabel: Label;

  private readonly costLabel: Label;

  private readonly levelLabel: Label;

  private readonly nameLabel: Label;

  private readonly wedgeSteps: number;

  private readonly scalePerPixel: number;

  private readonly wedgeScalePerPixel: number;

  private readonly stripesScalePerPixel: number;

  private wedgeStep = 0;

  private flashFrame: string = SQUARE_FRAME;

  private shownCost = -1;

  private shownLevel = -1;

  private shownName: string | null = null;

  constructor(
    makeQuad: QuadFactory,
    frameSizes: FrameSizes,
    keyLabel: Label,
    costLabel: Label,
    levelLabel: Label,
    nameLabel: Label,
    wedgeSteps: number,
  ) {
    this.backdrop = makeQuad(SQUARE_FRAME);
    this.fill = makeQuad(SQUARE_FRAME);
    this.socket = makeQuad(SOCKET_FRAME);
    this.wedge = makeQuad(`${WEDGE_FRAME_PREFIX}${wedgeSteps}`);
    this.flash = makeQuad(SQUARE_FRAME);
    this.keyLabel = keyLabel;
    this.costLabel = costLabel;
    this.levelLabel = levelLabel;
    this.nameLabel = nameLabel;
    this.wedgeSteps = wedgeSteps;
    this.scalePerPixel = 1 / frameSizes(SQUARE_FRAME);
    this.wedgeScalePerPixel =
      1 / frameSizes(`${WEDGE_FRAME_PREFIX}${wedgeSteps}`);
    this.stripesScalePerPixel = 1 / frameSizes(STRIPES_FRAME);
    this.backdrop.tint = BACKDROP_TINT;
    this.backdrop.alpha = BACKDROP_ALPHA;
    this.socket.tint = SOCKET_TINT;
    this.wedge.tint = WEDGE_TINT;
    this.wedge.alpha = WEDGE_ALPHA;
    this.flash.alpha = FLASH_ALPHA;
    this.keyLabel.tint = KEY_LABEL_TINT;
    this.costLabel.tint = WHITE;
    this.levelLabel.tint = WHITE;
    this.nameLabel.tint = WHITE;
  }

  /** Puts the square's centre at (`x`, `y`) and writes its key label. Once, at layout. */
  place(x: number, y: number, slot: number): void {
    const half = SQUARE_SIZE * HALF;
    const scale = SQUARE_SIZE * this.scalePerPixel;

    this.backdrop.x = x;
    this.backdrop.y = y;
    this.backdrop.scale = scale;
    this.fill.x = x;
    this.fill.y = y;
    this.fill.scale = scale;
    this.socket.x = x;
    this.socket.y = y;
    this.socket.scale = scale;
    this.wedge.x = x;
    this.wedge.y = y;
    this.wedge.scale = SQUARE_SIZE * WEDGE_SHARE * this.wedgeScalePerPixel;
    this.flash.x = x;
    this.flash.y = y;
    this.flash.scale = scale;
    this.keyLabel.x = x + half * KEY_OFFSET_X;
    this.keyLabel.y = y + half * KEY_OFFSET_Y;
    this.keyLabel.setText(KEY_LABELS[slot] ?? "");
    this.costLabel.x = x + half * COST_OFFSET_X;
    this.costLabel.y = y + half * COST_OFFSET_Y;
    this.levelLabel.x = x + half * LEVEL_OFFSET_X;
    this.levelLabel.y = y + half * LEVEL_OFFSET_Y;
    this.nameLabel.x = x;
    this.nameLabel.y = y + half * NAME_OFFSET_Y;
  }

  sync(input: SquareInput): void {
    const { descriptor, tick, flash, sweepSteps } = input;
    const empty = descriptor.abilityId === null;
    const greyed = descriptor.blockedBy !== null;
    const alpha = greyed ? GREYED_ALPHA : OPAQUE;

    this.backdrop.visible = true;
    this.socket.visible = empty;
    this.socket.alpha = alpha;
    this.fill.visible = !empty;
    this.fill.tint = this.fillTintOf(input);
    this.fill.alpha = alpha;
    this.keyLabel.visible = !empty;
    this.keyLabel.alpha = alpha;
    this.syncWedge(descriptor, tick, sweepSteps);
    this.syncFlash(flash);
    this.syncCost(descriptor, alpha);
    this.syncLevel(descriptor, alpha);
    this.syncName(descriptor, alpha);
  }

  hide(): void {
    this.backdrop.visible = false;
    this.fill.visible = false;
    this.socket.visible = false;
    this.wedge.visible = false;
    this.flash.visible = false;
    this.keyLabel.visible = false;
    this.costLabel.visible = false;
    this.levelLabel.visible = false;
    this.nameLabel.visible = false;
  }

  private fillTintOf(input: SquareInput): number {
    const { descriptor, spellTint } = input;

    switch (descriptor.kind) {
      case "orb":
        return descriptor.level > 0
          ? orbTint(orbIndexOf(descriptor.abilityId))
          : DIMMED_TINT;

      case "composer":
        return COMPOSER_TINT;

      case "prepared":
        return spellTint ?? WHITE;
    }
  }

  private syncWedge(
    descriptor: Readonly<SlotDescriptor>,
    tick: Tick,
    sweepSteps: number,
  ): void {
    const remaining = descriptor.readyAtTick - tick;

    if (remaining <= 0 || descriptor.clockTicks <= 0) {
      this.wedge.visible = false;

      return;
    }

    const step = wedgeFrameFor(
      Math.min(1, remaining / descriptor.clockTicks),
      sweepSteps,
      this.wedgeSteps,
    );

    if (step !== this.wedgeStep) {
      this.wedgeStep = step;
      this.wedge.setFrame(`${WEDGE_FRAME_PREFIX}${step}`);
    }

    this.wedge.visible = true;
  }

  private syncFlash(flash: FlashKind): void {
    if (flash === "none") {
      this.flash.visible = false;

      return;
    }

    const frame = flash === "disable" ? STRIPES_FRAME : SQUARE_FRAME;

    if (frame !== this.flashFrame) {
      this.flashFrame = frame;
      this.flash.setFrame(frame);
      this.flash.scale =
        SQUARE_SIZE *
        (frame === STRIPES_FRAME
          ? this.stripesScalePerPixel
          : this.scalePerPixel);
    }

    this.flash.tint = flashTintOf(flash);
    this.flash.visible = true;
  }

  private syncCost(descriptor: Readonly<SlotDescriptor>, alpha: number): void {
    const shown =
      descriptor.abilityId !== null &&
      (descriptor.kind === "composer" || descriptor.kind === "prepared");

    if (!shown) {
      this.costLabel.visible = false;

      return;
    }

    if (descriptor.cost !== this.shownCost) {
      this.shownCost = descriptor.cost;
      this.costLabel.setText(String(descriptor.cost));
    }

    this.costLabel.alpha = alpha;
    this.costLabel.visible = true;
  }

  private syncLevel(descriptor: Readonly<SlotDescriptor>, alpha: number): void {
    if (descriptor.kind !== "orb") {
      this.levelLabel.visible = false;

      return;
    }

    if (descriptor.level !== this.shownLevel) {
      this.shownLevel = descriptor.level;
      this.levelLabel.setText(String(descriptor.level));
    }

    this.levelLabel.alpha = alpha;
    this.levelLabel.visible = true;
  }

  private syncName(descriptor: Readonly<SlotDescriptor>, alpha: number): void {
    const id = descriptor.kind === "prepared" ? descriptor.abilityId : null;

    if (id === null) {
      this.nameLabel.visible = false;

      return;
    }

    if (id !== this.shownName) {
      this.shownName = id;
      this.nameLabel.setText(id.slice(0, NAME_LENGTH).toUpperCase());
    }

    this.nameLabel.alpha = alpha;
    this.nameLabel.visible = true;
  }
}

/** An orb descriptor's ability id is its orb id; its index is the orb's colour. `-1` for an id no orb has. */
const orbIndexOf = (abilityId: string | null): number => {
  for (let index = 0; index < ORB_IDS.length; index += 1) {
    if (ORB_IDS[index] === abilityId) {
      return index;
    }
  }

  return -1;
};

const flashTintOf = (flash: FlashKind): number => {
  switch (flash) {
    case "mana":
      return FLASH_MANA_TINT;

    case "cooldown":
      return FLASH_COOLDOWN_TINT;

    case "disable":
      return FLASH_DISABLE_TINT;

    case "refused":
    case "none":
      return FLASH_REFUSED_TINT;
  }
};
