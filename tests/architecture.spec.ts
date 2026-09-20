import { join } from "node:path";
import { LAYER_IMPORTS } from "../eslint/matrix.js";
import {
  describeGameConfig,
  describeLayerImports,
  describeNoSpecUnderSrc,
  SOURCE_DIR,
} from "./helpers";

describeLayerImports({ srcDir: SOURCE_DIR, layerImports: LAYER_IMPORTS });

describeNoSpecUnderSrc({ srcDir: SOURCE_DIR });

describeGameConfig({
  configFile: join(SOURCE_DIR, "app", "game-config.ts"),
  // The composition root has no game config yet. Set this to false in the change that creates it.
  absentUntilCreated: true,
});
