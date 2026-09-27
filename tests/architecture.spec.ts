import { join } from "node:path";
import { PRESENTATION_FIELDS } from "@simulation/public";
import { LAYER_IMPORTS } from "../eslint/matrix.js";
import {
  describeGameConfig,
  describeLayerImports,
  describeNoSpecUnderSrc,
  describePresentationFieldsUnread,
  SOURCE_DIR,
} from "./helpers";

describeLayerImports({ srcDir: SOURCE_DIR, layerImports: LAYER_IMPORTS });

describeNoSpecUnderSrc({ srcDir: SOURCE_DIR });

describeGameConfig({
  configFile: join(SOURCE_DIR, "app", "game-config.ts"),
  absentUntilCreated: false,
});

describePresentationFieldsUnread({
  srcDir: SOURCE_DIR,
  fields: PRESENTATION_FIELDS,
  copiedInto: ["frame", "tint"],
  checkedIn: {
    "src/domain/definitions/validate-registry.ts":
      "checks each frame a definition names is one the atlas has",
  },
});
