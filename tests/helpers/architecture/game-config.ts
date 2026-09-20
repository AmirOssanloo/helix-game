import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { displayPath } from "./repository";

/**
 * The simulation is our own fixed-step tick, so the Phaser game config carries no `physics` key.
 * The config is imported for real, in Node, with `phaser` aliased to the stub under
 * `tests/helpers/doubles/`, and the exported object is inspected.
 *
 * ```ts
 * describeGameConfig({ configFile, absentUntilCreated: false })
 * ```
 *
 * @see docs/adr/0002-custom-fixed-step-simulation.md
 */

const DECISION = "docs/adr/0002-custom-fixed-step-simulation.md";

/** The export the config file carries; the main export matches the file name. */
const CONFIG_EXPORT = "gameConfig";

/** Which file holds the config, and whether its absence is still allowed. */
export type GameConfigOptions = Readonly<{
  /** Absolute path to the game config module under `src/app/`. */
  configFile: string;
  /**
   * True while the composition root has no game config yet. The allowance is itself checked:
   * once the file exists, leaving this true is a violation, so it cannot outlive its reason.
   */
  absentUntilCreated: boolean;
}>;

/** One thing wrong with the config module, with the message the failing test prints. */
export type GameConfigViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  message: string;
}>;

const hasKey = (value: unknown, key: string): boolean =>
  typeof value === "object" && value !== null && key in value;

/**
 * What is wrong with the config: missing when it should exist, present while still allowed to
 * be absent, exporting nothing under the expected name, or carrying a `physics` key. Exported so
 * a message can be asserted on directly.
 */
export const collectGameConfigViolations = async ({
  configFile,
  absentUntilCreated,
}: GameConfigOptions): Promise<GameConfigViolation[]> => {
  const file = displayPath(configFile);
  const exists = existsSync(configFile);

  if (!exists) {
    return absentUntilCreated
      ? []
      : [
          {
            file,
            message: `${file} is missing. The Phaser game config lives there, and this rule imports it to check that the physics key is absent; a config nothing can find is a config nothing checks. See ${DECISION}.`,
          },
        ];
  }

  if (absentUntilCreated) {
    return [
      {
        file,
        message: `${file} exists now. Set absentUntilCreated to false where describeGameConfig is mounted so the physics rule runs against it.`,
      },
    ];
  }

  const module: unknown = await import(pathToFileURL(configFile).href);

  if (!hasKey(module, CONFIG_EXPORT)) {
    return [
      {
        file,
        message: `${file} exports no ${CONFIG_EXPORT}. The main export matches the file name, and this rule reads it to check that the physics key is absent.`,
      },
    ];
  }

  const config: unknown = (module as Record<string, unknown>)[CONFIG_EXPORT];

  if (hasKey(config, "physics")) {
    return [
      {
        file,
        message: `${file} sets a physics key on the game config. The simulation is our own fixed-step tick under src/domain/ and src/simulation/; Phaser never owns a position, a velocity, or a collision. Remove the key. See ${DECISION}.`,
      },
    ];
  }

  return [];
};

/** Mounts the rule as one `describe` with one test, named for the file it checks. */
export const describeGameConfig = (options: GameConfigOptions): void => {
  describe("the Phaser game config has no physics key", () => {
    it(`${displayPath(options.configFile)} leaves the physics key absent`, async () => {
      const violations = await collectGameConfigViolations(options);

      expect(violations.map((violation) => violation.message)).toEqual([]);
    });
  });
};
