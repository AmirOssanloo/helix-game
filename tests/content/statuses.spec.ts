import { describe, expect, it } from "vitest";
import { atlasFrames, contentRegistry, statusIconFrame } from "@content/public";
import { ID_SHAPE, validateRegistry } from "@domain/public";

/** The statuses as the registry holds them, typed as any status rather than as the literal each file writes. */
const { statuses } = contentRegistry;

/** The eight status kinds the status page names, the six spell-specific definitions the catalogue adds, and the two an archetype carries. */
const STATUS_COUNT = 16;

/** The generic definitions every spell status is a variant of, which the panel and enemy abilities apply. */
const GENERIC_STATUSES = [
  "stun",
  "silence",
  "root",
  "disarm",
  "slow",
  "burn",
  "knockback",
  "lift",
];

const faultsOf = (id: string) =>
  validateRegistry(contentRegistry).filter((fault) =>
    fault.file.endsWith(`/${id.replace(/_/g, "-")}.def.ts`),
  );

describe("the statuses", () => {
  it("are the sixteen the catalogues name, each listed once", () => {
    const ids = statuses.map((status) => status.id);

    expect(statuses).toHaveLength(STATUS_COUNT);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("include every generic status kind the status page names", () => {
    const ids = statuses.map((status) => status.id);

    for (const id of GENERIC_STATUSES) {
      expect(ids).toContain(id);
    }
  });
});

describe("every status", () => {
  it.each(statuses.map((status) => [status.id, status] as const))(
    "%s validates in the registry",
    (id) => {
      expect(faultsOf(id)).toEqual([]);
    },
  );

  it.each(statuses.map((status) => [status.id, status] as const))(
    "%s has a snake_case id and carries no duration of its own",
    (_id, status) => {
      expect(status.id).toMatch(ID_SHAPE);
      expect(status).not.toHaveProperty("seconds");
      expect(status).not.toHaveProperty("durationSeconds");
    },
  );
});

describe("the status icons", () => {
  it("give every status a frame of its own, and share none", () => {
    const frames = statuses.map((status) => status.atlasFrame);

    expect(new Set(frames).size).toBe(statuses.length);

    for (const status of statuses) {
      expect(status.atlasFrame).toBe(statusIconFrame(status.id));
    }
  });

  it("are in the frame list, each an icon square with a glyph no other icon shows", () => {
    const glyphs: string[] = [];

    for (const status of statuses) {
      const frame = atlasFrames.find(
        (entry) => entry.name === status.atlasFrame,
      );

      expect(frame?.shape.kind).toBe("icon");

      if (frame?.shape.kind === "icon") {
        glyphs.push(frame.shape.glyph);
      }
    }

    expect(glyphs).toHaveLength(statuses.length);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("leave no icon frame in the list that no status names", () => {
    const named = new Set(statuses.map((status) => status.atlasFrame));
    const orphans = atlasFrames
      .filter((entry) => entry.shape.kind === "icon")
      .map((entry) => entry.name)
      .filter((name) => !named.has(name));

    expect(orphans).toEqual([]);
  });
});

describe("the catalogue's capabilities", () => {
  it("give hoarfrost a damage-taken hook that stuns and hurts, running on the holder", () => {
    const hoarfrost = statuses.find((status) => status.id === "hoarfrost");

    expect(
      hoarfrost?.onDamageTaken?.effects.map((effect) => effect.kind),
    ).toEqual(["apply_status", "damage_area"]);
    expect(hoarfrost?.onDamageDealt).toBeNull();
  });

  it("give the lift statuses the lifted, stunned, and untargetable flags and the ignore rule", () => {
    const lifts = statuses.filter((status) => status.flags.includes("lifted"));

    expect(lifts.map((status) => status.id).sort()).toEqual([
      "lift",
      "updraft_lift",
    ]);

    for (const lift of lifts) {
      expect(lift.flags).toContain("stunned");
      expect(lift.flags).toContain("untargetable");
      expect(lift.stack).toBe("ignore");
    }
  });

  it("give updraft's lift an expiry list and the generic lift none", () => {
    const updraft = statuses.find((status) => status.id === "updraft_lift");
    const lift = statuses.find((status) => status.id === "lift");

    expect(updraft?.onExpiry).toHaveLength(1);
    expect(lift?.onExpiry).toHaveLength(0);
  });

  it("give wane the aggro-hidden flag and knockback the displaced flag", () => {
    const wane = statuses.find((status) => status.id === "wane");
    const knockback = statuses.find((status) => status.id === "knockback");

    expect(wane?.flags).toEqual(["aggro_hidden"]);
    expect(knockback?.flags).toEqual(["displaced"]);
  });

  it("name an orb on every table a status carries", () => {
    for (const status of statuses) {
      for (const modifier of status.modifiers) {
        expect(["quartz", "whorl", "ember"]).toContain(modifier.amount.orb);
      }

      if (status.damageOverTime !== null) {
        expect(["quartz", "whorl", "ember"]).toContain(
          status.damageOverTime.perSecond.orb,
        );
      }
    }
  });
});
