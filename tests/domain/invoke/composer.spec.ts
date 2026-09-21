import { describe, expect, it } from "vitest";
import type { KitState, SpellDef } from "@domain/public";
import { composeSpell, createSpellTable } from "@domain/public";
import { makeSpellDef } from "../../helpers";

const QUARTZ = 0;
const WHORL = 1;
const EMBER = 2;

const qqw = makeSpellDef.build({ recipe: ["quartz", "quartz", "whorl"] });
const qwe = makeSpellDef.build({ recipe: ["quartz", "whorl", "ember"] });
const wee = makeSpellDef.build({ recipe: ["whorl", "ember", "ember"] });
const eee = makeSpellDef.build({ recipe: ["ember", "ember", "ember"] });

const spells = createSpellTable([qqw, qwe, wee, eee]);
const abilities = [qqw.id, qwe.id, wee.id, eee.id];

/** A full buffer holding `orbs`, oldest first. */
const holding = (orbs: number[]): KitState => ({
  orbLevels: [1, 1, 1],
  orbs,
  orbCount: orbs.length,
  prepared: [null, null],
});

describe("composeSpell", () => {
  it("names the spell whose recipe holds the same count of each orb", () => {
    expect(
      composeSpell(holding([QUARTZ, QUARTZ, WHORL]), abilities, spells),
    ).toBe(qqw.id);
    expect(
      composeSpell(holding([QUARTZ, WHORL, EMBER]), abilities, spells),
    ).toBe(qwe.id);
    expect(
      composeSpell(holding([EMBER, EMBER, EMBER]), abilities, spells),
    ).toBe(eee.id);
  });

  it("ignores the arrangement: every permutation of one multiset is one spell", () => {
    expect(
      composeSpell(holding([WHORL, EMBER, EMBER]), abilities, spells),
    ).toBe(wee.id);
    expect(
      composeSpell(holding([EMBER, WHORL, EMBER]), abilities, spells),
    ).toBe(wee.id);
    expect(
      composeSpell(holding([EMBER, EMBER, WHORL]), abilities, spells),
    ).toBe(wee.id);
  });

  it("ignores the arrangement of the recipe as well", () => {
    const ewq: SpellDef = makeSpellDef.build({
      recipe: ["ember", "whorl", "quartz"],
    });

    expect(
      composeSpell(
        holding([QUARTZ, WHORL, EMBER]),
        [ewq.id],
        createSpellTable([ewq]),
      ),
    ).toBe(ewq.id);
  });

  it("names nothing when no recipe on the ability list matches", () => {
    expect(
      composeSpell(holding([QUARTZ, QUARTZ, QUARTZ]), abilities, spells),
    ).toBeNull();
  });

  it("reads only the form's ability list, not every spell in the table", () => {
    expect(
      composeSpell(holding([QUARTZ, QUARTZ, WHORL]), [qwe.id], spells),
    ).toBeNull();
  });

  it("skips an ability id with no spell behind it", () => {
    expect(
      composeSpell(
        holding([QUARTZ, QUARTZ, WHORL]),
        ["nobody", qqw.id],
        spells,
      ),
    ).toBe(qqw.id);
  });
});
