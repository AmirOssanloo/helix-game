import { describe, expect, it } from "vitest";
import { assert } from "@shared/public";

describe("assert", () => {
  it("throws the message when the condition is false", () => {
    expect(() => {
      assert(false, "the invariant did not hold");
    }).toThrow("the invariant did not hold");
  });

  it("returns when the condition is true", () => {
    expect(() => {
      assert(true, "never thrown");
    }).not.toThrow();
  });

  it("narrows the asserted value for the code after it", () => {
    const value: number | null = [7][0] ?? null;

    assert(value !== null, "the value is present");

    expect(value + 1).toBe(8);
  });
});
