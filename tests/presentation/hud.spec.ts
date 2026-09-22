import { describe, expect, it } from "vitest";
import { heroDef, WEDGE_STEPS } from "@content/public";
import type {
  FormRecord,
  Kit,
  RefusalReason,
  SlotDescriptor,
  Unit,
} from "@domain/public";
import { resolveKit } from "@domain/public";
import type { KitResolver } from "@presentation/public";
import {
  FLASH_TICKS,
  Hud,
  ORB_TINTS,
  SlotFlashes,
  squareCentreX,
  SQUARES_CENTRE_Y,
} from "@presentation/public";
import type { Simulation, WorldView } from "@simulation/public";
import {
  CommandRecorder,
  LabelRecorder,
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  QuadRecorder,
  spawnHero,
} from "../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** The slot keys, as the HUD numbers them. */
const Q = 1;
const R = 4;
const D = 5;
const F = 6;

/** The DOM buttons. */
const LEFT = 0;
const RIGHT = 2;

/** Somewhere well off the bar. */
const OFF_BAR_X = 100;
const OFF_BAR_Y = 100;

/** A clock that has not run out by the tick the test reads it. */
const CLOCK_END_TICK = 300;

/** The factory's cooldown: ten seconds at 30 Hz, so a clock ending at 300 read at tick 0 is full. */
const CLOCK_TICKS = 300;

const preparedSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  tint: 0x123456,
});

const form = makeFormDef.build({ abilities: [preparedSpell.id] });

type Arranged = {
  world: Simulation;
  hero: Unit;
  hud: Hud;
  driver: CommandRecorder;
  flashes: SlotFlashes;
  quads: QuadRecorder[];
  labels: LabelRecorder[];
  /** A view a test may replace, so the HUD reads a world only a test builds. */
  view: WorldView;
};

/** A HUD over a world whose hero holds `preparedSpell` in D, every orb at level one, one skill point unspent. */
const arrange = (kits: KitResolver = resolveKit): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [preparedSpell],
    }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  record.kit.prepared[0] = preparedSpell.id;

  const quads: QuadRecorder[] = [];
  const labels: LabelRecorder[] = [];
  const driver = new CommandRecorder(world);
  const flashes = new SlotFlashes();
  const hud = new Hud({
    makeQuad: (frame) => {
      const quad = new QuadRecorder(frame);

      quads.push(quad);

      return quad;
    },
    makeLabel: (size) => {
      const label = new LabelRecorder(size);

      labels.push(label);

      return label;
    },
    frameSizes: () => FRAME_WIDTH,
    kits,
    flashes,
    driver,
    wedgeSteps: WEDGE_STEPS,
    orbSlots: 3,
  });

  return { world, hero, hud, driver, flashes, quads, labels, view: world.view };
};

/** The quads made with `frame`, in creation order. */
const quadsOf = (arranged: Arranged, frame: string): QuadRecorder[] =>
  arranged.quads.filter((quad) => quad.frame === frame);

/** The labels showing `text`. */
const labelsShowing = (arranged: Arranged, text: string): LabelRecorder[] =>
  arranged.labels.filter((label) => label.visible && label.text === text);

describe("the six ability squares", () => {
  it("describe the slots through the active kit: three orbs, the composer, a prepared spell, an empty socket", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    expect(
      [Q, 2, 3, R, D, F].map((slot) => arranged.hud.descriptorOf(slot)?.kind),
    ).toEqual(["orb", "orb", "orb", "composer", "prepared", "prepared"]);
    expect(arranged.hud.descriptorOf(D)?.abilityId).toBe(preparedSpell.id);
    expect(arranged.hud.descriptorOf(F)?.abilityId).toBeNull();
  });

  it("show the key labels Q W E R D F on the filled squares and none on the empty socket", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    for (const key of ["Q", "W", "E", "R", "D"]) {
      expect(labelsShowing(arranged, key)).toHaveLength(1);
    }

    expect(labelsShowing(arranged, "F")).toHaveLength(0);
  });

  it("show the mana cost on the composer and the prepared spell, and the orb level on the orbs", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    expect(labelsShowing(arranged, "7")).toHaveLength(1);
    expect(labelsShowing(arranged, "50")).toHaveLength(1);
    expect(labelsShowing(arranged, "1")).toHaveLength(4);
  });

  it("colour a prepared spell's square with the spell's tint and show a short label", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    const fills = quadsOf(arranged, "square").filter(
      (quad) => quad.visible && quad.tint === preparedSpell.tint,
    );

    expect(fills).toHaveLength(1);
    expect(labelsShowing(arranged, "SPE")).toHaveLength(1);
  });

  it("sweep a wedge over a slot whose clock is running, the fraction the clock has left", () => {
    const arranged = arrange();

    arranged.hero.cooldowns.set(preparedSpell.id, CLOCK_END_TICK);
    arranged.hud.sync(arranged.view);

    const wedges = quadsOf(arranged, `wedge_${WEDGE_STEPS}`).filter(
      (quad) => quad.visible,
    );

    expect(wedges).toHaveLength(1);

    for (let tick = 0; tick < CLOCK_TICKS / 2; tick += 1) {
      arranged.world.tick();
    }

    arranged.hud.sync(arranged.view);

    expect(quadsOf(arranged, `wedge_${WEDGE_STEPS / 2}`)).toHaveLength(1);
  });

  it("grey every square while the hero is silenced, as the descriptor says", () => {
    const arranged = arrange();

    arranged.hero.disables.silenced = true;
    arranged.hud.sync(arranged.view);

    expect(arranged.hud.descriptorOf(Q)?.blockedBy).toBe("silenced");

    const keyLabels = arranged.labels.filter((label) => label.text === "Q");

    expect(keyLabels[0]?.alpha).toBeLessThan(1);
  });

  it("rewrite a label only when its number changes", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);
    arranged.hud.sync(arranged.view);
    arranged.hud.sync(arranged.view);

    const [cost] = labelsShowing(arranged, "50");

    expect(cost?.rewrites).toBe(1);
  });
});

describe("the bars and the level", () => {
  it("read health and mana from the view, as current over maximum", () => {
    const arranged = arrange();
    const record = arranged.world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    arranged.world.tick();
    record.resources.health = 40;
    arranged.hud.sync(arranged.view);

    const maxHealth = Math.round(arranged.hero.stats.maxHealth);
    const maxMana = Math.round(arranged.hero.stats.maxMana);

    expect(labelsShowing(arranged, `40/${maxHealth}`)).toHaveLength(1);
    expect(
      labelsShowing(
        arranged,
        `${Math.round(record.resources.mana)}/${maxMana}`,
      ),
    ).toHaveLength(1);
  });

  it("scale the health fill by the fraction, from the left edge", () => {
    const arranged = arrange();
    const record = arranged.world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    arranged.world.tick();
    arranged.hud.sync(arranged.view);

    const [, fullFill] = quadsOf(arranged, "square");
    const fullScale = fullFill?.scaleX ?? 0;

    record.resources.health = arranged.hero.stats.maxHealth / 2;
    arranged.hud.sync(arranged.view);

    expect(fullFill?.scaleX).toBeCloseTo(fullScale / 2);
  });

  it("show the level, and the marker while a skill point is unspent", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    const [marker] = quadsOf(arranged, "disc");

    expect(labelsShowing(arranged, "1").length).toBeGreaterThan(0);
    expect(marker?.visible).toBe(true);

    arranged.hero.progression.skillPoints = 0;
    arranged.hud.sync(arranged.view);

    expect(marker?.visible).toBe(false);
  });
});

describe("spending a skill point", () => {
  it("a left click on an orb square with a point unspent submits a spend naming the slot, and the bar keeps the click", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    const taken = arranged.hud.click(
      squareCentreX(Q),
      SQUARES_CENTRE_Y,
      LEFT,
      arranged.view,
    );

    expect(taken).toBe(true);
    expect(arranged.driver.commands).toEqual([
      { kind: "spend_skill_point", tick: 0, timestamp: 1, slot: Q },
    ]);
  });

  it("a left click on an orb square with no point unspent submits nothing", () => {
    const arranged = arrange();

    arranged.hero.progression.skillPoints = 0;
    arranged.hud.sync(arranged.view);
    arranged.hud.click(squareCentreX(Q), SQUARES_CENTRE_Y, LEFT, arranged.view);

    expect(arranged.driver.commands).toEqual([]);
  });

  it("a click on the composer or a prepared square submits nothing, and is still the bar's", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    expect(
      arranged.hud.click(
        squareCentreX(R),
        SQUARES_CENTRE_Y,
        LEFT,
        arranged.view,
      ),
    ).toBe(true);
    expect(
      arranged.hud.click(
        squareCentreX(D),
        SQUARES_CENTRE_Y,
        LEFT,
        arranged.view,
      ),
    ).toBe(true);
    expect(arranged.driver.commands).toEqual([]);
  });

  it("a right click on an orb square submits nothing, and is still the bar's", () => {
    const arranged = arrange();

    arranged.hud.sync(arranged.view);

    expect(
      arranged.hud.click(
        squareCentreX(Q),
        SQUARES_CENTRE_Y,
        RIGHT,
        arranged.view,
      ),
    ).toBe(true);
    expect(arranged.driver.commands).toEqual([]);
  });

  it("a click off the bar is not the bar's", () => {
    const arranged = arrange();

    expect(arranged.hud.click(OFF_BAR_X, OFF_BAR_Y, LEFT, arranged.view)).toBe(
      false,
    );
  });
});

describe("refusal flashes", () => {
  /** The flash quads over the six squares, in slot order: the fifth `square` quad of each square. */
  const flashQuadOf = (arranged: Arranged, slot: number): QuadRecorder => {
    const quad = arranged.quads.find(
      (candidate) =>
        candidate.x === squareCentreX(slot) &&
        candidate.y === SQUARES_CENTRE_Y &&
        arranged.quads.indexOf(candidate) ===
          arranged.quads.findIndex(
            (other) =>
              other.x === squareCentreX(slot) && other.y === SQUARES_CENTRE_Y,
          ) +
            4,
    );

    if (quad === undefined) {
      throw new Error("Every square has a flash quad");
    }

    return quad;
  };

  const refuse = (arranged: Arranged, slot: number, reason: RefusalReason) => {
    arranged.hud.react({
      kind: "command_refused",
      tick: arranged.view.tick,
      orb: -1,
      abilityId: null,
      statusId: null,
      slot,
      reason,
      unitId: null,
      sourceId: null,
      amount: 0,
      damageType: null,
    });
  };

  it("a refused R for mana flashes the R square red", () => {
    const arranged = arrange();

    refuse(arranged, R, "not_enough_mana");
    arranged.hud.sync(arranged.view);

    const flash = flashQuadOf(arranged, R);

    expect(flash.visible).toBe(true);
    expect(flash.tint).toBe(0xff3030);
    expect(flash.frame).toBe("square");
  });

  it("a refused R for its clock flashes the R square grey", () => {
    const arranged = arrange();

    refuse(arranged, R, "on_cooldown");
    arranged.hud.sync(arranged.view);

    expect(flashQuadOf(arranged, R).tint).toBe(0x9a9a9a);
  });

  it("a refused key under a disable flashes its square striped", () => {
    const arranged = arrange();

    refuse(arranged, D, "silenced");
    arranged.hud.sync(arranged.view);

    expect(flashQuadOf(arranged, D).frame).toBe("stripes");
    expect(flashQuadOf(arranged, D).visible).toBe(true);
  });

  it("a flash ends after its ticks and pauses with the simulation", () => {
    const arranged = arrange();

    refuse(arranged, R, "not_enough_mana");
    arranged.hud.sync(arranged.view);
    arranged.hud.sync(arranged.view);

    expect(flashQuadOf(arranged, R).visible).toBe(true);

    for (let tick = 0; tick < FLASH_TICKS; tick += 1) {
      arranged.world.tick();
    }

    arranged.hud.sync(arranged.view);

    expect(flashQuadOf(arranged, R).visible).toBe(false);
  });

  it("a cursor the mapper would not open flashes the same square through the shared record", () => {
    const arranged = arrange();

    arranged.flashes.flash(D, "on_cooldown", arranged.view.tick);
    arranged.hud.sync(arranged.view);

    expect(flashQuadOf(arranged, D).visible).toBe(true);
  });

  it("a refused command that names no slot flashes nothing", () => {
    const arranged = arrange();

    refuse(arranged, 0, "rooted");
    arranged.hud.sync(arranged.view);

    for (let slot = Q; slot <= F; slot += 1) {
      expect(flashQuadOf(arranged, slot).visible).toBe(false);
    }
  });
});

describe("the orb row and a second kit", () => {
  it("shows the held instances oldest first in their orb's colour, and a socket where the buffer is short", () => {
    const arranged = arrange();
    const record = arranged.world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.kit.orbs[0] = 2;
    record.kit.orbs[1] = 0;
    record.kit.orbCount = 2;
    arranged.hud.sync(arranged.view);

    const fills = quadsOf(arranged, "square").filter(
      (quad) =>
        quad.visible &&
        (quad.tint === ORB_TINTS[2] || quad.tint === ORB_TINTS[0]),
    );
    const orbRowFills = fills.filter((quad) => quad.y < SQUARES_CENTRE_Y - 60);

    expect(orbRowFills.map((quad) => quad.tint)).toEqual([
      ORB_TINTS[2],
      ORB_TINTS[0],
    ]);
  });

  it("fills the six squares from a hotbar kit's ability list and hides the orb squares, naming no kit", () => {
    const abilities = ["one", "two", "three", "four", "five", "six"];
    const hotbar: Kit = {
      key: "hotbar",
      resolveSlot: (slot, _state, out) => {
        out.kind = "cast";
        out.orb = -1;
        out.abilityId = abilities[slot - 1] ?? null;

        return out;
      },
      describeSlot: (
        slot,
        _state,
        _cooldowns,
        _disables,
        _spells,
        _tuning,
        out,
      ) => {
        out.kind = "prepared";
        out.abilityId = abilities[slot - 1] ?? null;
        out.readyAtTick = 0;
        out.clockTicks = 0;
        out.cost = 0;
        out.level = 1;
        out.blockedBy = null;

        return out;
      },
      refreshPassives: () => {},
    };
    const arranged = arrange((key) => (key === "hotbar" ? hotbar : null));
    const first = arranged.world.state.run.forms[0];

    if (first === undefined) {
      throw new Error("The hero has a form");
    }

    const hotbarForm: FormRecord = {
      ...first,
      def: { ...first.def, id: "hotbar_form", kit: "hotbar" },
      kit: { orbLevels: [], orbs: [], orbCount: 0, prepared: [] },
    };
    const view: WorldView = {
      get tick(): number {
        return arranged.world.view.tick;
      },
      run: { ...arranged.world.view.run, forms: [first, hotbarForm] },
      map: arranged.world.view.map,
    };

    arranged.hero.activeFormIndex = 1;
    arranged.hud.sync(view);

    const descriptors: (SlotDescriptor | null)[] = [];

    for (let slot = Q; slot <= F; slot += 1) {
      descriptors.push(arranged.hud.descriptorOf(slot));
    }

    expect(descriptors.map((descriptor) => descriptor?.abilityId)).toEqual(
      abilities,
    );
    expect(
      descriptors.every((descriptor) => descriptor?.kind === "prepared"),
    ).toBe(true);

    const orbRowQuads = arranged.quads.filter(
      (quad) => quad.y < SQUARES_CENTRE_Y - 60 && quad.y > 0,
    );

    expect(orbRowQuads.length).toBeGreaterThan(0);
    expect(orbRowQuads.every((quad) => !quad.visible)).toBe(true);
    expect(labelsShowing(arranged, "ONE")).toHaveLength(1);
  });

  it("hides everything in a world with no hero", () => {
    const arranged = arrange();
    const view: WorldView = {
      get tick(): number {
        return arranged.world.view.tick;
      },
      run: { ...arranged.world.view.run, heroId: null },
      map: arranged.world.view.map,
    };

    arranged.hud.sync(arranged.view);
    arranged.hud.sync(view);

    expect(arranged.quads.every((quad) => !quad.visible)).toBe(true);
    expect(arranged.labels.every((label) => !label.visible)).toBe(true);
  });
});
