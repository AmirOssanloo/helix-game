import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { layerAliases } from "./vite.config.ts";

/**
 * A test slower than this prints its duration. A marker, not a failure: a unit test over 50 ms
 * is usually at the wrong tier or doing setup a helper should do.
 */
const SLOW_TEST_THRESHOLD_MS = 50;

/**
 * Floors, not targets, on the two layers where a break costs the most. They apply whenever
 * coverage is collected, and only `check:ci` collects it; `check` and `test` stay uninstrumented.
 *
 * A key that matches no file contributes an empty coverage map, which reports 100% and passes
 * forever, so `KNOWN_MATCHES` names one file each key is known to match and the config refuses
 * to load without it.
 */
const COVERAGE_FLOORS = {
  "src/domain/**": { statements: 90, branches: 85, functions: 90, lines: 90 },
  "src/simulation/**": {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
};

const KNOWN_MATCHES: Record<keyof typeof COVERAGE_FLOORS, string> = {
  "src/domain/**": "src/domain/public.ts",
  "src/simulation/**": "src/simulation/public.ts",
};

for (const [key, file] of Object.entries(KNOWN_MATCHES)) {
  if (!existsSync(fileURLToPath(new URL(file, import.meta.url)))) {
    throw new Error(
      `The coverage floor "${key}" is checked against ${file}, which does not exist. A key that matches no file passes forever; point KNOWN_MATCHES at a file the key matches.`,
    );
  }
}

/** `phaser` resolves here in every project, so no spec mocks a module. */
const PHASER_STUB = fileURLToPath(
  new URL("./tests/helpers/doubles/phaser-stub.ts", import.meta.url),
);

/**
 * The stress tests measure wall time, so they run in a group of their own after every other
 * project has finished, one file at a time: a tick timed while other workers hold the cores is
 * not the tick the budget is about. The simulation project excludes the files so each runs once.
 */
const STRESS_SPECS = [
  "tests/simulation/stress.spec.ts",
  "tests/simulation/stress-zones.spec.ts",
];
const STRESS_GROUP_ORDER = 1;

/** One project per tier, each inheriting the root aliases and settings. */
const project = (
  name: string,
  environment: "node" | "jsdom",
  include: string[],
  exclude: string[] = [],
) => ({
  test: { name, environment, include, exclude },
});

export default defineConfig({
  // Every test runs as a development build: `assert` throws, so a broken invariant fails the test
  // that broke it instead of passing in silence.
  define: {
    __DEV__: "true",
    __PANEL__: "true",
  },
  resolve: {
    alias: {
      ...layerAliases(),
      phaser: PHASER_STUB,
    },
  },
  test: {
    passWithNoTests: true,
    retry: 0,
    slowTestThreshold: SLOW_TEST_THRESHOLD_MS,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Barrels and ambient declarations carry no executable code of their own.
      exclude: ["src/**/public.ts", "src/**/*.d.ts"],
      thresholds: COVERAGE_FLOORS,
    },
    projects: [
      project("unit", "node", [
        "tests/domain/**/*.spec.ts",
        "tests/shared/**/*.spec.ts",
        "tests/instrumentation/**/*.spec.ts",
      ]),
      project(
        "simulation",
        "node",
        ["tests/simulation/**/*.spec.ts", "tests/app/**/*.spec.ts"],
        STRESS_SPECS,
      ),
      {
        test: {
          name: "stress",
          environment: "node",
          include: STRESS_SPECS,
          fileParallelism: false,
          sequence: { groupOrder: STRESS_GROUP_ORDER },
        },
      },
      project("content", "node", ["tests/content/**/*.spec.ts"]),
      project("architecture", "node", [
        "tests/architecture.spec.ts",
        "tests/docs-links.spec.ts",
      ]),
      project("presentation", "jsdom", [
        "tests/presentation/**/*.spec.ts",
        "tests/devtools/**/*.spec.ts",
      ]),
    ],
  },
});
