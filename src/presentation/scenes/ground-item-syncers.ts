import { ScratchRect } from "../camera/scratch";
import { DEPTH_GROUND_ITEMS, DEPTH_ITEM_LABELS } from "../views/depth-bands";
import { createGroundItemLabels } from "../views/ground-item-label.view";
import { createGroundItemIcons } from "../views/ground-item.view";
import {
  GROUND_ITEM_LABEL_COUNT,
  GROUND_ITEM_VIEW_COUNT,
} from "../views/view-counts";
import type { PlayViewSyncer } from "./play-stage";
import { SYNC_ORDER } from "./sync-order";

/** A glyph of the atlas font: every glyph is one cell, so its size is every glyph's. */
const GLYPH_FRAME = "glyph_A";

/** The icons of what lies on the ground, and where each is drawn on the canvas for a pick. */
export const groundItems: PlayViewSyncer = {
  name: "ground items",
  order: SYNC_ORDER.groundItems,
  band: DEPTH_GROUND_ITEMS,
  create: ({
    world,
    makeQuad,
    frameSizes,
    projection,
    camera: worldCamera,
    frame,
    picks,
  }) => {
    const icons = createGroundItemIcons(
      GROUND_ITEM_VIEW_COUNT,
      makeQuad,
      frameSizes,
      world,
      projection,
    );
    const canvas = new ScratchRect();

    return {
      sync: () => {
        worldCamera.screenRect(0, canvas);
        icons.sync(world, frame, canvas, picks.icons);
      },
      misses: () => icons.misses,
    };
  },
};

/** The labels of what lies on the ground, every one while Alt is held and any a refusal flashes, moved apart, and where each is drawn for a pick. */
export const groundItemLabels: PlayViewSyncer = {
  name: "ground item labels",
  order: SYNC_ORDER.groundItemLabels,
  band: DEPTH_ITEM_LABELS,
  create: ({
    context,
    world,
    makeLabel,
    projection,
    camera: worldCamera,
    frame,
    mapper,
    picks,
    itemFlashes,
  }) => {
    const labels = createGroundItemLabels(
      GROUND_ITEM_LABEL_COUNT,
      makeLabel,
      world,
      projection,
      context.atlas.frameWidth(GLYPH_FRAME) /
        context.atlas.frameHeight(GLYPH_FRAME),
    );
    const canvas = new ScratchRect();

    return {
      sync: () => {
        worldCamera.screenRect(0, canvas);
        labels.sync(
          world,
          frame,
          mapper.showsEveryLabel,
          itemFlashes,
          canvas,
          picks.labels,
        );
      },
      misses: () => labels.misses,
    };
  },
};
