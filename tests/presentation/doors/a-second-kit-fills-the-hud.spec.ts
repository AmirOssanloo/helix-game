import { describe, expect, it } from "vitest";
import { heroDef, WEDGE_STEPS } from "@content/public";
import type { Kit, SpellDef } from "@domain/public";
import { Hud, SlotFlashes, SQUARES_CENTRE_Y } from "@presentation/public";
import {
  CommandRecorder,
  LabelRecorder,
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  QuadRecorder,
  spawnHero,
} from "../../helpers";

/** Every frame the test atlas holds is this wide. */
const FRAME_WIDTH = 128;

/** How far above the ability squares the orb row sits, at least. */
const ORB_ROW_ABOVE = 60;

/** Six abilities, each its own colour, for the hotbar form to list one per slot. */
const abilities: readonly SpellDef[] = [
  makeSpellDef.build({
    recipe: ["quartz", "quartz", "quartz"],
    tint: 0x110000,
  }),
  makeSpellDef.build({ recipe: ["whorl", "whorl", "whorl"], tint: 0x220000 }),
  makeSpellDef.build({ recipe: ["ember", "ember", "ember"], tint: 0x330000 }),
  makeSpellDef.build({ recipe: ["quartz", "whorl", "ember"], tint: 0x440000 }),
  makeSpellDef.build({ recipe: ["quartz", "quartz", "whorl"], tint: 0x550000 }),
  makeSpellDef.build({ recipe: ["ember", "ember", "whorl"], tint: 0x660000 }),
];

const abilityIds = abilities.map((ability) => ability.id);

/** The fixture form: a plain hotbar of six abilities, no orbs. */
const hotbarForm = makeFormDef.build({
  id: "hotbar_form",
  kit: "hotbar",
  abilities: abilityIds,
});

/**
 * The fixture kit: slot `n` is the form's `n`th ability, a cast, never an orb. The kit
 * interface hands a kit its form's kit state and not the form's definition, so the list is
 * read from the fixture form directly.
 */
const hotbar: Kit = {
  key: "hotbar",
  resolveSlot: (slot, _state, out) => {
    const abilityId = hotbarForm.abilities[slot - 1];

    out.kind = abilityId === undefined ? "empty" : "cast";
    out.orb = -1;
    out.abilityId = abilityId ?? null;

    return out;
  },
  describeSlot: (
    slot,
    _state,
    cooldowns,
    _disables,
    _matrix,
    _spells,
    _tuning,
    out,
  ) => {
    const abilityId = hotbarForm.abilities[slot - 1] ?? null;

    out.kind = "prepared";
    out.abilityId = abilityId;
    out.readyAtTick = abilityId === null ? 0 : (cooldowns.get(abilityId) ?? 0);
    out.clockTicks = 0;
    out.cost = 0;
    out.level = 1;
    out.blockedBy = null;

    return out;
  },
  refreshPassives: () => {},
};

describe("the door: a later kit lands in the layers that already exist", () => {
  it("fills the six HUD squares from a hotbar form's abilities and hides the orb row, the HUD naming no kit", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [hotbarForm.id] },
        forms: [hotbarForm],
        spells: abilities,
      }),
    });
    const quads: QuadRecorder[] = [];
    const hud = new Hud({
      makeQuad: (frame) => {
        const quad = new QuadRecorder(frame);

        quads.push(quad);

        return quad;
      },
      makeLabel: (size) => new LabelRecorder(size),
      frameSizes: () => FRAME_WIDTH,
      kits: (key) => (key === hotbar.key ? hotbar : null),
      flashes: new SlotFlashes(),
      driver: new CommandRecorder(world),
      wedgeSteps: WEDGE_STEPS,
      orbSlots: 3,
    });

    spawnHero(world);
    hud.sync(world.view);

    const descriptors = [1, 2, 3, 4, 5, 6].map((slot) =>
      hud.descriptorOf(slot),
    );
    const squareTints = quads
      .filter(
        (quad) =>
          quad.frame === "square" &&
          quad.visible &&
          quad.y === SQUARES_CENTRE_Y,
      )
      .map((quad) => quad.tint);
    const orbRow = quads.filter(
      (quad) => quad.y > 0 && quad.y < SQUARES_CENTRE_Y - ORB_ROW_ABOVE,
    );

    expect(descriptors.map((descriptor) => descriptor?.abilityId)).toEqual(
      abilityIds,
    );
    expect(descriptors.map((descriptor) => descriptor?.kind)).toEqual([
      "prepared",
      "prepared",
      "prepared",
      "prepared",
      "prepared",
      "prepared",
    ]);
    expect(
      abilities.map(
        (ability) => squareTints.filter((tint) => tint === ability.tint).length,
      ),
    ).toEqual([1, 1, 1, 1, 1, 1]);
    expect(orbRow.length).toBeGreaterThan(0);
    expect(orbRow.every((quad) => !quad.visible)).toBe(true);
  });
});
