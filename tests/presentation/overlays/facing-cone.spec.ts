import { describe, expect, it } from "vitest";
import { arrangeOverlays, visibleQuads } from "../../helpers";

const LINE_FRAME = "pixel";

describe("the facing cone", () => {
  it("draw the hero's heading and the two edges of its cone as three lines", () => {
    const arranged = arrangeOverlays();

    arranged.toggles.facingCone = true;
    arranged.sync();

    expect(visibleQuads(arranged.quads, LINE_FRAME)).toHaveLength(3);
  });
});
