import { describe, expect, it } from "vitest";
import type { BuildStamp, BuildStampSource } from "@app/public";
import { readBuildStamp, UNKNOWN_COMMIT } from "@app/public";
import viteConfig from "../../vite.config.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

const FULL_COMMIT = /^[0-9a-f]{40}$/;

/** Git answering `rev-parse` with `head` and `status` with `status`; `null` for either is git failing at it. */
const gitAnswering = (
  head: string | null,
  status: string | null,
): BuildStampSource["git"] => {
  return (args: readonly string[]): string | null =>
    args[0] === "rev-parse" ? head : status;
};

/** The stamp the Vite config defines for a build in `mode`, read back from its define. */
const stampOfBuild = (mode: string): BuildStamp => {
  if (typeof viteConfig !== "function") {
    throw new Error("vite.config.ts no longer exports a config per mode");
  }

  const config = viteConfig({ command: "build", mode });

  if (config instanceof Promise) {
    throw new Error("vite.config.ts no longer builds its config synchronously");
  }

  const stamp = config.define?.["__BUILD_STAMP__"];

  if (typeof stamp !== "string") {
    throw new Error("The build defines no __BUILD_STAMP__");
  }

  return JSON.parse(stamp) as BuildStamp;
};

describe("readBuildStamp", () => {
  it("names the commit git has at HEAD, clean when git reports no change", () => {
    const stamp = readBuildStamp({
      git: gitAnswering(`${COMMIT}\n`, ""),
      ciCommit: null,
    });

    expect(stamp).toEqual({ commit: COMMIT, dirty: false });
  });

  it("marks a dirty tree when git reports any change", () => {
    const stamp = readBuildStamp({
      git: gitAnswering(COMMIT, " M src/app/main.ts\n"),
      ciCommit: null,
    });

    expect(stamp).toEqual({ commit: COMMIT, dirty: true });
  });

  it("counts a tree git cannot report on as dirty", () => {
    const stamp = readBuildStamp({
      git: gitAnswering(COMMIT, null),
      ciCommit: null,
    });

    expect(stamp.dirty).toBe(true);
  });

  it("takes the CI runner's commit, clean, where git cannot run", () => {
    const stamp = readBuildStamp({
      git: gitAnswering(null, null),
      ciCommit: COMMIT,
    });

    expect(stamp).toEqual({ commit: COMMIT, dirty: false });
  });

  it("names no commit, and counts the tree dirty, with neither", () => {
    const stamp = readBuildStamp({
      git: gitAnswering(null, null),
      ciCommit: null,
    });

    expect(stamp).toEqual({ commit: UNKNOWN_COMMIT, dirty: true });
  });
});

describe("the build's stamp", () => {
  it.each(["production", "playtest", "development"])(
    "is defined in a %s build, naming a full commit",
    (mode) => {
      const stamp = stampOfBuild(mode);

      expect(stamp.commit).toMatch(FULL_COMMIT);
      expect(typeof stamp.dirty).toBe("boolean");
    },
  );
});
